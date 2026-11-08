import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('Course-Wise Payment Management & Financial Telemetry Test Suite', () => {
  const ts = Date.now();
  const studentEmail = `course_pay_student_${ts}@skillup.test`;
  const mentorEmail = `course_pay_mentor_${ts}@skillup.test`;
  const adminEmail = `course_pay_admin_${ts}@skillup.test`;
  const otherStudentEmail = `course_pay_other_${ts}@skillup.test`;
  const password = 'Password123!';

  let studentToken = '';
  let studentId = '';
  let mentorToken = '';
  let mentorId = '';
  let adminToken = '';
  let adminId = '';
  let otherStudentToken = '';
  let otherStudentId = '';

  let courseFullId = '';
  let courseInstallmentId = '';
  let testBatchId = '';

  let testOrderId = '';
  let testPaymentId = '';

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        name: 'Arjun Verma',
        email: studentEmail,
        phone: '+91 98765 43210',
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    studentId = student.id;

    // 2. Create Second Student
    const otherStudent = await prisma.user.create({
      data: {
        name: 'Kavita Nair',
        email: otherStudentEmail,
        phone: '+91 98765 12345',
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    otherStudentId = otherStudent.id;

    // 3. Create Mentor
    const mentor = await prisma.user.create({
      data: {
        name: 'Dr. Vikram Rao',
        email: mentorEmail,
        password: hashedPassword,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });
    mentorId = mentor.id;

    // 4. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Finance Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;

    // 5. Log in all users
    const [sRes, mRes, aRes, oRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: studentEmail, password }),
      request(app).post('/api/auth/login').send({ email: mentorEmail, password }),
      request(app).post('/api/auth/login').send({ email: adminEmail, password }),
      request(app).post('/api/auth/login').send({ email: otherStudentEmail, password }),
    ]);

    studentToken = sRes.body.data.accessToken;
    mentorToken = mRes.body.data.accessToken;
    adminToken = aRes.body.data.accessToken;
    otherStudentToken = oRes.body.data.accessToken;

    // 6. Create Course 1: Full Payment Only
    const course1 = await prisma.course.create({
      data: {
        title: `Full Payment Architecture Course ${ts}`,
        slug: `full-pay-arch-${ts}`,
        description: 'Complete course requiring upfront full fee.',
        price: 3000,
        discountPrice: 2000,
        allowInstallments: false,
        status: 'PUBLISHED',
        instructorId: mentorId,
      },
    });
    courseFullId = course1.id;

    // 7. Create Course 2: Installments Enabled with Restricted policy
    const course2 = await prisma.course.create({
      data: {
        title: `Installment Scalability Mastery ${ts}`,
        slug: `installment-scalability-${ts}`,
        description: 'Course allowing multi-step flexible installment payments.',
        price: 4000,
        discountPrice: 3000,
        allowInstallments: true,
        minInstallmentAmount: 1000,
        installmentPolicy: 'RESTRICTED',
        status: 'PUBLISHED',
        instructorId: mentorId,
      },
    });
    courseInstallmentId = course2.id;

    // 8. Create a Batch & Mentor Assignment for Course 2
    const batch = await prisma.batch.create({
      data: {
        name: `Cohort Oct-${ts}`,
        code: `BATCH-${ts.toString().slice(-4)}`,
        courseId: courseInstallmentId,
        startDate: new Date(),
        maxStudents: 30,
        status: 'ACTIVE',
      },
    });
    testBatchId = batch.id;

    await prisma.mentorAssignment.create({
      data: {
        mentorId,
        courseId: courseInstallmentId,
        batchId: testBatchId,
        scope: 'SPECIFIC_BATCH',
      },
    });
  });

  afterAll(async () => {
    await prisma.mentorAssignment.deleteMany({
      where: { mentorId },
    });
    await prisma.batchEnrollment.deleteMany({
      where: { studentId: { in: [studentId, otherStudentId] } },
    });
    await prisma.batch.deleteMany({
      where: { id: testBatchId },
    });
    await prisma.enrollment.deleteMany({
      where: { userId: { in: [studentId, otherStudentId] } },
    });
    await prisma.payment.deleteMany({
      where: { userId: { in: [studentId, otherStudentId] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [courseFullId, courseInstallmentId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, otherStudentId, mentorId, adminId] } },
    });
  });

  // ==========================================
  // 1. RBAC & SECURITY VERIFICATION
  // ==========================================
  describe('1. Role-Based Access Control on Admin Payment Endpoints', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/admin/payments/overview');
      expect(res.status).toBe(401);
    });

    it('rejects student role accessing admin payment overview (403)', async () => {
      const res = await request(app)
        .get('/api/admin/payments/overview')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects mentor/instructor role accessing admin payment courses (403)', async () => {
      const res = await request(app)
        .get('/api/admin/payments/courses')
        .set('Authorization', `Bearer ${mentorToken}`);
      expect(res.status).toBe(403);
    });

    it('authorizes admin to access payment overview (200)', async () => {
      const res = await request(app)
        .get('/api/admin/payments/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.successfullyCollectedRevenue).toBeDefined();
    });
  });

  // ==========================================
  // 2. PAYMENT CREATION: FULL, MINIMUM & CUSTOM INSTALLMENTS
  // ==========================================
  describe('2. Payment Flows: Full, Minimum, Custom & Subsequent Installments', () => {
    it('rejects installment payment on course where installments are disabled', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseFullId,
          isPartial: true,
          customAmount: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/not enabled/i);
    });

    it('rejects custom installment below course minimum amount (500 < 1000)', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
          isPartial: true,
          customAmount: 500,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/minimum initial payment/i);
    });

    it('rejects payment amount exceeding the total course balance (3500 > 3000)', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
          isPartial: true,
          customAmount: 3500,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/cannot exceed/i);
    });

    it('creates initial installment order of ₹1000 for course 2', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
          isPartial: true,
          customAmount: 1000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(100000); // in paise
      expect(res.body.data.remainingBalance).toBe(2000);

      testOrderId = res.body.data.orderId;
      testPaymentId = res.body.data.paymentId;
    });

    it('verifies initial installment payment signature and auto-assigns batch', async () => {
      const genuinePaymentId = `pay_inst_${Date.now()}`;
      const payload = `${testOrderId}|${genuinePaymentId}`;
      const signature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: testOrderId,
          razorpayPaymentId: genuinePaymentId,
          razorpaySignature: signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify payment in DB
      const p = await prisma.payment.findUnique({ where: { id: testPaymentId } });
      expect(p?.status).toBe('COMPLETED');
      expect(Number(p?.amount)).toBe(1000);

      // Verify Enrollment exists
      const enr = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: studentId, courseId: courseInstallmentId } },
      });
      expect(enr).toBeDefined();

      // Verify Batch enrollment auto-linked
      const bEnr = await prisma.batchEnrollment.findUnique({
        where: { batchId_studentId: { batchId: testBatchId, studentId } },
      });
      expect(bEnr).toBeDefined();
    });

    it('prevents duplicate payment verification from double-crediting', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: testOrderId,
          razorpayPaymentId: 'pay_duplicate_attempt',
          razorpaySignature: 'simulated_test_signature',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already verified/i);
    });

    it('allows student to make subsequent custom installment payment of ₹1500 (balance was 2000)', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
          isPartial: true,
          customAmount: 1500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amount).toBe(150000);
      expect(res.body.data.remainingBalance).toBe(500);

      const secondOrderId = res.body.data.orderId;
      const secondPaymentId = `pay_inst2_${Date.now()}`;
      const signature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${secondOrderId}|${secondPaymentId}`)
        .digest('hex');

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: secondOrderId,
          razorpayPaymentId: secondPaymentId,
          razorpaySignature: signature,
        });

      expect(verifyRes.status).toBe(200);
    });

    it('clears final balance of ₹500 so remaining balance reaches zero', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
        });

      expect(res.status).toBe(201);
      // Outstanding was exactly 500
      expect(res.body.data.amount).toBe(50000);
      expect(res.body.data.remainingBalance).toBe(0);

      const finalOrderId = res.body.data.orderId;
      const finalPaymentId = `pay_inst_final_${Date.now()}`;
      const signature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${finalOrderId}|${finalPaymentId}`)
        .digest('hex');

      await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: finalOrderId,
          razorpayPaymentId: finalPaymentId,
          razorpaySignature: signature,
        });
    });

    it('rejects additional payment orders once course balance reaches zero', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseInstallmentId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/already fully enrolled/i);
    });
  });

  // ==========================================
  // 3. ADMIN COURSE-WISE DASHBOARD & FILTERING
  // ==========================================
  describe('3. Admin Course-Wise Dashboard & Telemetry APIs', () => {
    it('returns course payment summaries including our test course metrics', async () => {
      const res = await request(app)
        .get('/api/admin/payments/courses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((c: any) => c.courseId === courseInstallmentId);
      expect(found).toBeDefined();
      expect(found.enrolledStudentsCount).toBeGreaterThanOrEqual(1);
      expect(found.totalCollectedAmount).toBeGreaterThanOrEqual(3000);
      expect(found.fullyPaidStudentsCount).toBeGreaterThanOrEqual(1);
    });

    it('returns course-specific summary metrics', async () => {
      const res = await request(app)
        .get(`/api/admin/payments/courses/${courseInstallmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.course.id).toBe(courseInstallmentId);
      expect(res.body.data.metrics.totalCollected).toBeGreaterThanOrEqual(3000);
    });

    it('filters enrolled course students by name and balance status', async () => {
      const res = await request(app)
        .get(`/api/admin/payments/courses/${courseInstallmentId}/students?search=Arjun&balanceStatus=CLEARED`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Arjun Verma');
      expect(res.body.data[0].totalVerifiedPaid).toBe(3000);
      expect(res.body.data[0].remainingBalance).toBe(0);
      expect(res.body.data[0].assignedBatch.code).toContain('BATCH-');
      expect(res.body.data[0].assignedMentor.name).toBe('Dr. Vikram Rao');
    });

    it('returns individual student payment profile and full transaction timeline', async () => {
      const res = await request(app)
        .get(`/api/admin/payments/students/${studentId}?courseId=${courseInstallmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.student.id).toBe(studentId);
      expect(res.body.data.paymentCompletionPercentage).toBe(100);
      expect(res.body.data.transactionTimeline.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.transactionTimeline[0].razorpayOrderId).toBeDefined();
    });

    it('exports filtered course payments as CSV', async () => {
      const res = await request(app)
        .get(`/api/admin/payments/export?courseId=${courseInstallmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Transaction ID');
      expect(res.text).toContain('Arjun Verma');
    });
  });

  // ==========================================
  // 4. ADMIN REFUND AND FINANCIAL LEDGER
  // ==========================================
  describe('4. Administrative Refund & Access Revocation Flow', () => {
    it('processes refund on verified transaction and creates audit log', async () => {
      const res = await request(app)
        .post('/api/admin/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: testPaymentId,
          reason: 'Student dropped out before class start date',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const refundedPayment = await prisma.payment.findUnique({ where: { id: testPaymentId } });
      expect(refundedPayment?.status).toBe('REFUNDED');
      expect(refundedPayment?.refundId).toBeDefined();

      // Check audit log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'REFUND_ORDER', resource: `Payment: ${testPaymentId}` },
      });
      expect(audit).toBeDefined();
    });
  });
});
