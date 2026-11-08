import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('Master Paid Live Classes E2E Test Suite (20 Scenarios)', () => {
  const timestamp = Date.now();
  const adminEmail = `admin_live_${timestamp}@skillup.test`;
  const assignedMentorEmail = `mentor_assigned_${timestamp}@skillup.test`;
  const unassignedMentorEmail = `mentor_other_${timestamp}@skillup.test`;
  const studentEmail = `student_live_${timestamp}@skillup.test`;
  const otherStudentEmail = `student_other_${timestamp}@skillup.test`;
  const password = 'Password123!';

  let adminToken = '';
  let adminId = '';
  let mentorToken = '';
  let mentorId = '';
  let otherMentorToken = '';
  let otherMentorId = '';
  let studentToken = '';
  let studentId = '';
  let otherStudentToken = '';
  let otherStudentId = '';

  let courseId = '';
  let paidLiveClassId = '';
  let cancelledLiveClassId = '';
  let razorpayOrderId = '';
  let razorpayPaymentId = `pay_test_${timestamp}`;

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Assigned Mentor
    const mentor = await prisma.user.create({
      data: {
        name: 'Assigned Mentor',
        email: assignedMentorEmail,
        password: passwordHash,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });
    mentorId = mentor.id;
    mentorToken = jwt.sign({ id: mentor.id, email: mentor.email, role: mentor.role }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Unassigned Mentor
    const otherMentor = await prisma.user.create({
      data: {
        name: 'Unassigned Mentor',
        email: unassignedMentorEmail,
        password: passwordHash,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });
    otherMentorId = otherMentor.id;
    otherMentorToken = jwt.sign({ id: otherMentor.id, email: otherMentor.email, role: otherMentor.role }, config.jwtSecret, { expiresIn: '1d' });

    // 4. Student
    const student = await prisma.user.create({
      data: {
        name: 'Paid Student',
        email: studentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    studentId = student.id;
    studentToken = jwt.sign({ id: student.id, email: student.email, role: student.role }, config.jwtSecret, { expiresIn: '1d' });

    // 5. Other Student
    const otherStudent = await prisma.user.create({
      data: {
        name: 'Other Student',
        email: otherStudentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    otherStudentId = otherStudent.id;
    otherStudentToken = jwt.sign({ id: otherStudent.id, email: otherStudent.email, role: otherStudent.role }, config.jwtSecret, { expiresIn: '1d' });

    // 6. Course
    const course = await prisma.course.create({
      data: {
        title: `FullStack Architecture Masterclass ${timestamp}`,
        slug: `fs-masterclass-${timestamp}`,
        description: 'Comprehensive FullStack Engineering with Node & React',
        price: 999,
        instructorId: mentorId,
        status: 'PUBLISHED',
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    try {
      if (paidLiveClassId) {
        await prisma.liveClassRegistration.deleteMany({ where: { liveClassId: paidLiveClassId } });
        await prisma.payment.deleteMany({ where: { liveClassId: paidLiveClassId } });
        await prisma.liveClass.delete({ where: { id: paidLiveClassId } }).catch(() => {});
      }
      if (cancelledLiveClassId) {
        await prisma.liveClassRegistration.deleteMany({ where: { liveClassId: cancelledLiveClassId } });
        await prisma.payment.deleteMany({ where: { liveClassId: cancelledLiveClassId } });
        await prisma.liveClass.delete({ where: { id: cancelledLiveClassId } }).catch(() => {});
      }
      if (courseId) {
        await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
      }
      const userIds = [adminId, mentorId, otherMentorId, studentId, otherStudentId].filter(Boolean);
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
    await prisma.$disconnect();
  });

  // Scenario 1: Admin creates a paid live class
  it('1. Admin creates a paid live class with course, mentor, fee, and max capacity', async () => {
    // Scheduled 1 hour in future
    const startTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/admin/live-classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Advanced System Design Live Workshop',
        description: 'Deep dive into distributed caching, sharding and event streaming',
        courseId,
        instructorId: mentorId,
        startTime,
        duration: 90,
        fee: 499,
        maxCapacity: 2,
        timezone: 'IST',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price).toBe(499);
    expect(res.body.data.maxCapacity).toBe(2);
    paidLiveClassId = res.body.data.id;
  });

  // Scenario 2: Unauthorized users cannot create or edit a class
  it('2. Unauthorized users cannot create or edit a class', async () => {
    // Anonymous user attempt
    const resAnon = await request(app)
      .post('/api/admin/live-classes')
      .send({ title: 'Hacked Class', fee: 100 });
    expect(resAnon.status).toBe(401);

    // Student role attempt
    const resStudent = await request(app)
      .post('/api/admin/live-classes')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student Class', fee: 100 });
    expect(resStudent.status).toBe(403);
  });

  // Scenario 3: Assigned mentor can update the meeting URL
  it('3. Assigned mentor can update the meeting URL with valid Google Meet/Zoom link', async () => {
    const res = await request(app)
      .patch(`/api/instructor/live-classes/${paidLiveClassId}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
  });

  // Scenario 4: Unassigned mentor cannot update the meeting URL
  it('4. Unassigned mentor cannot update the meeting URL of another mentor class', async () => {
    const res = await request(app)
      .patch(`/api/instructor/live-classes/${paidLiveClassId}`)
      .set('Authorization', `Bearer ${otherMentorToken}`)
      .send({
        meetingUrl: 'https://zoom.us/j/9999999999',
      });

    expect([403, 404]).toContain(res.status);
  });

  // Scenario 5: Student sees published classes with fee and masked meeting URL
  it('5. Student and public visitors see published classes with fee, but meeting URL is masked (null)', async () => {
    const resPublic = await request(app)
      .get('/api/live-classes?public=true');

    expect(resPublic.status).toBe(200);
    const found = resPublic.body.data.find((c: any) => c.id === paidLiveClassId);
    expect(found).toBeDefined();
    expect(Number(found.price)).toBe(499);
    // CRITICAL SECURITY: meetingUrl must be masked / null for public
    expect(found.meetingUrl).toBeNull();
  });

  // Scenario 6: Student creates a valid Razorpay order
  it('6. Student creates a valid Razorpay order calculated strictly from DB price', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        liveClassId: paidLiveClassId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('orderId');
    razorpayOrderId = res.body.data.orderId;

    // Verify a pending Payment record exists in DB
    const pendingPayment = await prisma.payment.findFirst({
      where: { razorpayOrderId, userId: studentId, liveClassId: paidLiveClassId },
    });
    expect(pendingPayment).toBeDefined();
    expect(pendingPayment?.status).toBe('PENDING');
  });

  // Scenario 7: Incorrect payment signatures are rejected
  it('7. Incorrect payment signatures are rejected with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: 'invalid_fraudulent_signature_hash_12345',
        liveClassId: paidLiveClassId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Confirm registration has NOT been granted
    const reg = await prisma.liveClassRegistration.findUnique({
      where: {
        liveClassId_studentId: { liveClassId: paidLiveClassId, studentId },
      },
    });
    expect(reg).toBeNull();
  });

  // Scenario 8: Failed or pending payments do not grant access
  it('8. Failed or pending payments do not grant meeting URL or classroom access', async () => {
    const resMeeting = await request(app)
      .get(`/api/live-classes/${paidLiveClassId}/meeting-url`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect([400, 403]).toContain(resMeeting.status);
    expect(resMeeting.body.meetingUrl).toBeUndefined();
  });

  // Scenario 9: Verified payment activates the registration (PAID)
  it('9. Verified payment activates the registration (PAID) and records payment', async () => {
    // Generate valid signature using configured Razorpay key secret
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret || 'test_secret')
      .update(text)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: validSignature,
        liveClassId: paidLiveClassId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Check DB registration
    const reg = await prisma.liveClassRegistration.findUnique({
      where: {
        liveClassId_studentId: { liveClassId: paidLiveClassId, studentId },
      },
    });
    expect(reg).toBeDefined();
    expect(reg?.status).toBe('PAID');
    expect(Number(reg?.amount)).toBe(499);
  });

  // Scenario 10: Duplicate verification is idempotent
  it('10. Duplicate payment verification is idempotent and does not duplicate registration', async () => {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret || 'test_secret')
      .update(text)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: validSignature,
        liveClassId: paidLiveClassId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const count = await prisma.liveClassRegistration.count({
      where: { liveClassId: paidLiveClassId, studentId },
    });
    expect(count).toBe(1);
  });

  // Scenario 11: Unpaid students cannot obtain meeting URLs
  it('11. Unpaid students receive 403 Forbidden when trying to access meeting URL', async () => {
    const res = await request(app)
      .get(`/api/live-classes/${paidLiveClassId}/meeting-url`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect([400, 403]).toContain(res.status);
    expect(res.body.meetingUrl).toBeUndefined();
  });

  // Scenario 12: Paid students cannot join before the 5-minute joining window
  it('12. Paid students cannot retrieve meeting URL if outside the 5-minute join window', async () => {
    // Session is 1 hour in the future
    const res = await request(app)
      .get(`/api/live-classes/${paidLiveClassId}/meeting-url`)
      .set('Authorization', `Bearer ${studentToken}`);

    // Early access blocked with 403 or 400
    expect([400, 403]).toContain(res.status);
    const errMsg = res.body.error?.message || res.body.error || '';
    expect(errMsg).toMatch(/join window|available.*minute|5 minutes/i);
    expect(res.body.meetingUrl).toBeUndefined();
  });

  // Scenario 13: Paid students can join during the permitted 5-minute window
  it('13. Paid students can retrieve meeting URL and join token during permitted window', async () => {
    // Temporarily adjust session start time to 2 minutes from now (inside the 5m window)
    const imminentTime = new Date(Date.now() + 2 * 60 * 1000);
    await prisma.liveClass.update({
      where: { id: paidLiveClassId },
      data: { startTime: imminentTime },
    });

    const res = await request(app)
      .get(`/api/live-classes/${paidLiveClassId}/meeting-url`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meetingUrl || res.body.data?.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
  });

  // Scenario 14: Cancelled sessions hide the meeting URL and block joins
  it('14. Cancelled sessions hide the meeting URL and block joining for all students', async () => {
    // Create a cancelled class
    const cancelled = await prisma.liveClass.create({
      data: {
        title: 'Cancelled Class',
        instructorId: mentorId,
        courseId,
        startTime: new Date(Date.now() + 2 * 60 * 1000),
        price: 100,
        status: 'CANCELLED',
        meetingUrl: 'https://meet.google.com/secret-cancelled',
      },
    });
    cancelledLiveClassId = cancelled.id;

    // Register student
    await prisma.liveClassRegistration.create({
      data: {
        liveClassId: cancelled.id,
        studentId,
        status: 'PAID',
        amount: 100,
      },
    });

    const res = await request(app)
      .get(`/api/live-classes/${cancelled.id}/meeting-url`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect([400, 403]).toContain(res.status);
    expect(res.body.meetingUrl).toBeUndefined();
  });

  // Scenario 15: Capacity limits are enforced under registration attempts
  it('15. Capacity limits are enforced safely when maxCapacity is reached', async () => {
    // The class maxCapacity is 2. Student 1 is paid.
    // Let's create registration for student 2 to fill capacity.
    await prisma.liveClassRegistration.upsert({
      where: { liveClassId_studentId: { liveClassId: paidLiveClassId, studentId: otherStudentId } },
      create: {
        liveClassId: paidLiveClassId,
        studentId: otherStudentId,
        status: 'PAID',
        amount: 499,
      },
      update: {
        status: 'PAID',
        amount: 499,
      },
    });

    // Third student creates an account and tries to create an order
    const thirdStudentEmail = `student_overflow_${timestamp}@skillup.test`;
    const bcrypt = (await import('bcryptjs')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const thirdStudent = await prisma.user.create({
      data: {
        name: 'Overflow Student',
        email: thirdStudentEmail,
        password: await bcrypt.hash(password, 10),
        role: 'STUDENT',
        isVerified: true,
      },
    });
    const thirdToken = jwt.sign({ id: thirdStudent.id, email: thirdStudent.email, role: thirdStudent.role }, config.jwtSecret, { expiresIn: '1d' });

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${thirdToken}`)
      .send({ liveClassId: paidLiveClassId });

    expect([400, 422]).toContain(res.status);
    const errMsg = res.body.error?.message || res.body.error || '';
    expect(errMsg).toMatch(/full|capacity/i);

    // Cleanup third student
    await prisma.user.delete({ where: { id: thirdStudent.id } });
  });

  // Scenario 16: Successful live-class payments appear in admin payment metrics
  it('16. Successful live-class payments appear in admin payment metrics & orders', async () => {
    const res = await request(app)
      .get('/api/admin/payments/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.breakdown).toHaveProperty('liveClasses');
    expect(res.body.data.breakdown.liveClasses.count).toBeGreaterThanOrEqual(1);

    // Verify order list filtering by productType=LIVE_CLASS
    const resOrders = await request(app)
      .get('/api/admin/payments?productType=LIVE_CLASS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resOrders.status).toBe(200);
    expect(resOrders.body.success).toBe(true);
    const ordersList = Array.isArray(resOrders.body.data) ? resOrders.body.data : resOrders.body.data.orders || [];
    const hasLiveClass = ordersList.some((o: any) => o.liveClassId === paidLiveClassId);
    expect(hasLiveClass).toBe(true);
  });

  // Scenario 17: Live-class CSV export filtering works
  it('17. Live-class CSV export respects productType=LIVE_CLASS filter', async () => {
    const res = await request(app)
      .get('/api/admin/payments/export?productType=LIVE_CLASS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Live Class');
    expect(res.text).toContain('Advanced System Design Live Workshop');
  });

  // Scenario 18: Confirmation email is triggered after verified payment
  it('18. Email service is integrated and invoked on live-class payment verification', async () => {
    // We already verified payment in Scenario 9. Let's verify by inspecting student's notifications in DB
    const notifications = await prisma.notification.findMany({
      where: { userId: studentId },
    });
    // System creates in-app and dispatches email via emailService.liveClassPaymentConfirmation
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifications.some(n => n.title.includes('Live Class') || n.title.includes('Confirmed'))).toBe(true);
  });

  // Scenario 19: Meeting-link update notifications are triggered for eligible students
  it('19. Meeting-link update triggers email and notification for eligible paid students', async () => {
    // Mentor updates meeting link again
    const res = await request(app)
      .patch(`/api/instructor/live-classes/${paidLiveClassId}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        meetingUrl: 'https://meet.google.com/updated-room-xyz',
      });

    expect(res.status).toBe(200);

    // Check notifications for student
    const notifs = await prisma.notification.findMany({
      where: { userId: studentId, title: { contains: 'Meeting Link' } },
    });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 20: Existing course payment workflows continue to pass
  it('20. Existing course payment order creation workflow continues to work seamlessly', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId,
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });
});
