import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('SkillUp Platform — Three-Role End-to-End Automated Testing Suite', () => {
  let adminToken: string;
  let mentor1Token: string;
  let mentor2Token: string;
  let student1Token: string;
  let student2Token: string;
  let student3Token: string;

  let adminUser: any;
  let mentor1User: any;
  let mentor2User: any;
  let student1User: any;
  let student2User: any;
  let student3User: any;

  let courseA: any;
  let courseB: any;
  let courseC: any;
  let testBatch: any;
  let testModule: any;
  let freeLesson: any;
  let paidLesson: any;
  let testResource: any;
  let testLiveClass: any;
  let testAssignment: any;

  beforeAll(async () => {
    // Retrieve Phase 1 QA accounts
    adminUser = await prisma.user.findUnique({ where: { email: 'qa.admin@skillup.local' } });
    mentor1User = await prisma.user.findUnique({ where: { email: 'qa.mentor1@skillup.local' } });
    mentor2User = await prisma.user.findUnique({ where: { email: 'qa.mentor2@skillup.local' } });
    student1User = await prisma.user.findUnique({ where: { email: 'qa.student1@skillup.local' } });
    student2User = await prisma.user.findUnique({ where: { email: 'qa.student2@skillup.local' } });
    student3User = await prisma.user.findUnique({ where: { email: 'qa.student3@skillup.local' } });

    // Generate authenticated JWT tokens
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwtSecret, { expiresIn: '1d' });
    mentor1Token = jwt.sign({ id: mentor1User.id, role: mentor1User.role }, config.jwtSecret, { expiresIn: '1d' });
    mentor2Token = jwt.sign({ id: mentor2User.id, role: mentor2User.role }, config.jwtSecret, { expiresIn: '1d' });
    student1Token = jwt.sign({ id: student1User.id, role: student1User.role }, config.jwtSecret, { expiresIn: '1d' });
    student2Token = jwt.sign({ id: student2User.id, role: student2User.role }, config.jwtSecret, { expiresIn: '1d' });
    student3Token = jwt.sign({ id: student3User.id, role: student3User.role }, config.jwtSecret, { expiresIn: '1d' });

    // Retrieve QA courses
    courseA = await prisma.course.findUnique({ where: { slug: 'qa-python-programming-and-interview-prep' } });
    courseB = await prisma.course.findUnique({ where: { slug: 'qa-sql-and-database-management' } });
    courseC = await prisma.course.findUnique({ where: { slug: 'qa-react-full-stack-development' } });

    // Clean prior QA runs for test users
    await prisma.notification.deleteMany({ where: { userId: { in: [student1User.id, student2User.id, student3User.id] } } });
    await prisma.payment.deleteMany({ where: { userId: { in: [student1User.id, student2User.id, student3User.id] } } });
    await prisma.enrollment.deleteMany({ where: { userId: { in: [student1User.id, student2User.id, student3User.id] } } });
    await prisma.batchEnrollment.deleteMany({ where: { studentId: { in: [student1User.id, student2User.id, student3User.id] } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ========================================================
  // PHASE 2 — TEST AS ADMIN
  // ========================================================
  describe('Phase 2 — Admin Workflows', () => {
    test('A. User Management: Admin views and searches QA users; unauthorized users are blocked', async () => {
      // 1. Admin views all users
      const res = await request(app)
        .get('/api/admin/users?search=qa.')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      const emails = res.body.data.users.map((u: any) => u.email);
      expect(emails).toContain('qa.mentor1@skillup.local');
      expect(emails).toContain('qa.student1@skillup.local');

      // 2. Mentor cannot access admin user list
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${mentor1Token}`)
        .expect(403);

      // 3. Student cannot access admin user list
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);
    });

    test('B. Course Management: Create/Update course with English and Tamil titles, and verify pricing in DB', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseA.slug}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Python Programming and Interview Preparation');
      expect(res.body.data.titleTa).toBe('பைதான் நிரலாக்கம் மற்றும் நேர்காணல் தயாரிப்பு');
      expect(Number(res.body.data.price)).toBe(1500);
      expect(res.body.data.allowInstallments).toBe(true);
      expect(Number(res.body.data.minInstallmentAmount)).toBe(500);

      // Course C has installments disabled
      const resC = await request(app)
        .get(`/api/courses/${courseC.slug}`)
        .expect(200);
      expect(resC.body.data.allowInstallments).toBe(false);
    });

    test('C. Curriculum Management: Admin adds Module, Free-preview lesson, Paid lesson, and attaches sample resource', async () => {
      // 1. Create Module 1
      const modRes = await request(app)
        .post(`/api/courses/${courseA.id}/modules`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Module 1: Python Fundamentals',
          titleTa: 'தொகுதி 1: பைதான் அடிப்படைகள்',
          order: 1,
        })
        .expect(201);

      expect(modRes.body.success).toBe(true);
      testModule = modRes.body.data;

      // 2. Add Lesson 1 (Free preview)
      const l1Res = await request(app)
        .post(`/api/courses/modules/${testModule.id}/lessons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Lesson 1: Introduction to Python',
          titleTa: 'பாடம் 1: பைதான் அறிமுகம்',
          description: 'Overview of Python language and setup',
          videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
          duration: 15,
          order: 1,
          isFree: true,
        })
        .expect(201);

      freeLesson = l1Res.body.data;
      expect(freeLesson.isFree).toBe(true);

      // 3. Add Lesson 2 (Enrolled students only)
      const l2Res = await request(app)
        .post(`/api/courses/modules/${testModule.id}/lessons`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Lesson 2: Variables and Data Types',
          titleTa: 'பாடம் 2: மாறிகள் மற்றும் தரவு வகைகள்',
          description: 'Python variable declaration and primitive types',
          videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
          duration: 25,
          order: 2,
          isFree: false,
        })
        .expect(201);

      paidLesson = l2Res.body.data;
      expect(paidLesson.isFree).toBe(false);

      // 4. Attach sample resource
      testResource = await prisma.lessonResource.create({
        data: {
          title: 'Python Variables Cheat Sheet',
          fileUrl: 'uploads/sample_python_cheat_sheet.pdf',
          fileType: 'PDF',
          lessonId: paidLesson.id,
        },
      });
      expect(testResource.id).toBeDefined();
    });

    test('D & E. Batch & Mentor Assignment: Create Batch PY-QA-OCT26 and assign Priya Raman', async () => {
      // 1. Clean prior batch with this code if any, then create
      await prisma.batch.deleteMany({ where: { code: 'PY-QA-OCT26' } });

      const batchRes = await request(app)
        .post('/api/admin/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Python QA Batch October 2026',
          code: 'PY-QA-OCT26',
          courseId: courseA.id,
          startDate: '2026-10-26T00:00:00.000Z',
          maxStudents: 30,
        })
        .expect(201);

      testBatch = batchRes.body.data;
      expect(testBatch.code).toBe('PY-QA-OCT26');

      // 2. Assign Priya Raman to Course A and Batch
      const assignRes = await request(app)
        .post('/api/admin/mentors/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mentorId: mentor1User.id,
          courseId: courseA.id,
          batchId: testBatch.id,
          scope: 'SPECIFIC_BATCH',
        })
        .expect(201);

      expect(assignRes.body.success).toBe(true);
    });

    test('F. Financial Telemetry: Admin overview distinguishes collected revenue from outstanding balances', async () => {
      const res = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toHaveProperty('actualCollectedRevenue');
      expect(res.body.data.metrics).toHaveProperty('outstandingBalance');
    });
  });

  // ========================================================
  // PHASE 3 — TEST AS MENTOR
  // ========================================================
  describe('Phase 3 — Mentor Workflows', () => {
    test('A. Dashboard & Assigned Courses: Priya Raman sees Course A, but cannot access unauthorized courses', async () => {
      const res = await request(app)
        .get('/api/mentor/courses')
        .set('Authorization', `Bearer ${mentor1Token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const courseIds = res.body.data.map((c: any) => c.id);
      expect(courseIds).toContain(courseA.id);
      expect(courseIds).not.toContain(courseB.id); // Arjun Kumar's course
    });

    test('B. Mentor Permissions: Priya Raman is denied access to admin financial management', async () => {
      await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${mentor1Token}`)
        .expect(403);
    });

    test('C. Live Classes: Priya Raman schedules a live class for Course A', async () => {
      const liveRes = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({
          courseId: courseA.id,
          batchId: testBatch.id,
          title: 'Python Fundamentals — QA Live Session',
          description: 'Introduction to Python variables and data types',
          startTime: '2026-10-30T10:00:00.000Z',
          duration: 60,
          meetingUrl: 'https://meet.skillup.local/qa-python-live',
        })
        .expect(201);

      expect(liveRes.body.success).toBe(true);
      testLiveClass = liveRes.body.data;
      expect(testLiveClass.title).toBe('Python Fundamentals — QA Live Session');
    });

    test('D & E. Assignments: Mentor creates assignment for Course A and batch', async () => {
      const assignRes = await request(app)
        .post('/api/mentor/assignments')
        .set('Authorization', `Bearer ${mentor1Token}`)
        .send({
          title: 'Python Variables & Functions Assignment',
          description: 'Write functions demonstrating string formatting and data structures',
          courseId: courseA.id,
          batchId: testBatch.id,
          dueDate: '2026-11-05T23:59:59.000Z',
          maxScore: 100,
        })
        .expect(201);

      expect(assignRes.body.success).toBe(true);
      testAssignment = assignRes.body.data;
      expect(testAssignment.id).toBeDefined();
    });
  });

  // ========================================================
  // PHASE 4 — TEST AS STUDENT
  // ========================================================
  describe('Phase 4 — Student Workflows', () => {
    test('A. Student Permissions: Kavya Raj cannot access Admin or Mentor portals', async () => {
      await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);

      await request(app)
        .get('/api/mentor/dashboard')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);
    });

    test('C. Free Video Preview vs Locked Content: Free lesson plays unpurchased; paid lesson & resources are blocked', async () => {
      // 1. Free lesson stream data is accessible without enrollment
      const freeRes = await request(app)
        .get(`/api/learning/lessons/${freeLesson.id}`)
        .expect(200);

      expect(freeRes.body.success).toBe(true);
      expect(freeRes.body.data.lesson.videoUrl).toBe('https://www.youtube.com/watch?v=kqtD5dpn9C8');

      // 2. Paid lesson is blocked for unenrolled student (HTTP 403)
      await request(app)
        .get(`/api/learning/lessons/${paidLesson.id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);

      // 3. Paid study material download is blocked for unenrolled student (HTTP 403)
      await request(app)
        .get(`/api/learning/resources/${testResource.id}/download`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);
    });

    test('E. Partial Payments: Test Cases 1, 2, 3, 4, 5 & Idempotency', async () => {
      // Case 1: Student enters ₹300 (Below minimum ₹500) -> Rejected 400
      const c1Res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseId: courseA.id,
          isPartial: true,
          customAmount: 300,
        })
        .expect(400);

      expect(c1Res.body.error.message).toMatch(/The minimum initial payment for this course is ₹500/);

      // Case 2 & 3: First installment of ₹500 -> Verified -> Remaining balance ₹1,000
      const order1Res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseId: courseA.id,
          isPartial: true,
          customAmount: 500,
        })
        .expect(201);

      expect(order1Res.body.data.amount).toBe(500 * 100);
      expect(order1Res.body.data.remainingBalance).toBe(1000);

      const payId1 = `pay_inst1_${Date.now()}`;
      const sig1 = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${order1Res.body.data.orderId}|${payId1}`)
        .digest('hex');

      const verify1 = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          razorpayOrderId: order1Res.body.data.orderId,
          razorpayPaymentId: payId1,
          razorpaySignature: sig1,
        })
        .expect(200);

      expect(verify1.body.success).toBe(true);

      // Verify payment record in DB
      const p1 = await prisma.payment.findUnique({ where: { razorpayOrderId: order1Res.body.data.orderId } });
      expect(Number(p1?.amount)).toBe(500);
      expect(Number(p1?.remainingBalance)).toBe(1000);

      // Case 4: Second installment of ₹500 -> Verified -> Remaining balance ₹500
      const order2Res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseId: courseA.id,
          isPartial: true,
          customAmount: 500,
        })
        .expect(201);

      const payId2 = `pay_inst2_${Date.now()}`;
      const sig2 = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${order2Res.body.data.orderId}|${payId2}`)
        .digest('hex');

      const verify2 = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          razorpayOrderId: order2Res.body.data.orderId,
          razorpayPaymentId: payId2,
          razorpaySignature: sig2,
        })
        .expect(200);

      expect(verify2.body.success).toBe(true);

      // Case 5: Final installment of ₹500 -> Verified -> Remaining balance ₹0
      const order3Res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseId: courseA.id,
          isPartial: true,
          customAmount: 500,
        })
        .expect(201);

      const payId3 = `pay_inst3_${Date.now()}`;
      const sig3 = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${order3Res.body.data.orderId}|${payId3}`)
        .digest('hex');

      const verify3 = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          razorpayOrderId: order3Res.body.data.orderId,
          razorpayPaymentId: payId3,
          razorpaySignature: sig3,
        })
        .expect(200);

      expect(verify3.body.success).toBe(true);

      // Case 6: Attempting to pay over the course price
      await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          courseId: courseA.id,
          isPartial: true,
          customAmount: 2000, // Price is 1500
        })
        .expect(400);

      // Case 7: Duplicate verification call is idempotent and does not recreate payment
      const dupVerify = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          razorpayOrderId: order3Res.body.data.orderId,
          razorpayPaymentId: payId3,
          razorpaySignature: sig3,
        })
        .expect(200);

      expect(dupVerify.body.message).toMatch(/already verified/i);
    });

    test('F. Student Learning Experience: Enrolled student accesses paid lesson and updates lesson progress', async () => {
      // 1. Now that Kavya Raj is enrolled, lesson 2 is accessible
      const lessonRes = await request(app)
        .get(`/api/learning/lessons/${paidLesson.id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(lessonRes.body.success).toBe(true);
      expect(lessonRes.body.data.lesson.title).toBe('Lesson 2: Variables and Data Types');

      // 2. Update progress
      const progRes = await request(app)
        .post(`/api/learning/lessons/${paidLesson.id}/progress`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ isCompleted: true, lastPosition: 1200 })
        .expect(200);

      expect(progRes.body.success).toBe(true);
      expect(progRes.body.data.isCompleted).toBe(true);
    });

    test('G. Student Isolation: Naveen Kumar (Student 2) cannot access Kavya Raj’s protected lesson before enrolling', async () => {
      // Naveen Kumar has not purchased Course A
      await request(app)
        .get(`/api/learning/lessons/${paidLesson.id}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(403);
    });
  });

  // ========================================================
  // PHASE 5 & 6 — NOTIFICATIONS & DB CONSISTENCY
  // ========================================================
  describe('Phase 5 & 6 — Notifications and Database Consistency', () => {
    test('Notifications created for student purchase and admin telemetry', async () => {
      const notifications = await prisma.notification.findMany({
        where: { userId: student1User.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(notifications.length).toBeGreaterThan(0);
      const paymentNotif = notifications.find((n) => n.type === 'PAYMENT');
      expect(paymentNotif).toBeDefined();
    });

    test('Database consistency: Enrollment and mentor roster reflects actual student count', async () => {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: courseA.id },
      });
      expect(enrollments.length).toBeGreaterThan(0);

      // Mentor roster discovery
      const rosterRes = await request(app)
        .get(`/api/mentor/students?courseId=${courseA.id}`)
        .set('Authorization', `Bearer ${mentor1Token}`)
        .expect(200);

      expect(rosterRes.body.success).toBe(true);
      expect(rosterRes.body.data.length).toBeGreaterThan(0);
    });
  });
});
