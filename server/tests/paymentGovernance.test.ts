import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('Master Payment, Course, Internship & Material Governance Suite (20 Scenarios)', () => {
  let adminUser: any;
  let studentUser: any;
  let mentorUser: any;
  let adminToken: string;
  let studentToken: string;
  let mentorToken: string;

  let freeCourseId: string;
  let paidCourseId: string;
  let installmentCourseId: string;
  let freeInternshipId: string;
  let paidInternshipId: string;
  let freeMaterialId: string;
  let paidMaterialId: string;
  let validCouponCode: string;
  let expiredCouponCode: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Setup Admin
    adminUser = await prisma.user.create({
      data: {
        email: `gov.admin.${timestamp}@skillup.test`,
        name: 'Master Platform Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwtSecret, { expiresIn: '2h' });

    // 2. Setup Student
    studentUser = await prisma.user.create({
      data: {
        email: `gov.student.${timestamp}@skillup.test`,
        name: 'Devi Sharma',
        password: 'hashedpassword',
        role: 'STUDENT',
        isVerified: true,
        college: 'PSG College of Technology',
      },
    });
    studentToken = jwt.sign({ id: studentUser.id, role: studentUser.role }, config.jwtSecret, { expiresIn: '2h' });

    // 3. Setup Mentor
    mentorUser = await prisma.user.create({
      data: {
        email: `gov.mentor.${timestamp}@skillup.test`,
        name: 'Prof. Rajesh K',
        password: 'hashedpassword',
        role: 'INSTRUCTOR',
        isVerified: true,
        title: 'Senior Staff Engineer',
      },
    });
    mentorToken = jwt.sign({ id: mentorUser.id, role: mentorUser.role }, config.jwtSecret, { expiresIn: '2h' });
  });

  afterAll(async () => {
    // Teardown created records
    const userIds = [adminUser.id, studentUser.id, mentorUser.id];
    await prisma.couponRedemption.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.enrollment.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.materialPurchase.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.internshipApplication.deleteMany({ where: { userId: { in: userIds } } });

    if (freeMaterialId || paidMaterialId) {
      await prisma.learningMaterial.deleteMany({
        where: { id: { in: [freeMaterialId, paidMaterialId].filter(Boolean) } },
      });
    }

    if (validCouponCode || expiredCouponCode) {
      await prisma.coupon.deleteMany({
        where: { code: { in: [validCouponCode, expiredCouponCode].filter(Boolean) } },
      });
    }

    if (freeInternshipId || paidInternshipId) {
      await prisma.internship.deleteMany({
        where: { id: { in: [freeInternshipId, paidInternshipId].filter(Boolean) } },
      });
    }

    if (freeCourseId || paidCourseId || installmentCourseId) {
      await prisma.course.deleteMany({
        where: { id: { in: [freeCourseId, paidCourseId, installmentCourseId].filter(Boolean) } },
      });
    }

    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  // SCENARIO 1: Admin creates a free course
  it('Scenario 1: Admin creates a free course (₹0)', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Foundations of Cloud Computing',
        description: 'Comprehensive introduction to distributed cloud primitives.',
        price: 0,
        level: 'Beginner',
        status: 'PUBLISHED',
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(0);
    freeCourseId = res.body.data.id;
  });

  // SCENARIO 2: Admin creates a paid course with a correct price
  it('Scenario 2: Admin creates a paid course with verified price', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Advanced Microservices in Node & Go',
        description: 'Production-ready architectures, event buses, and gRPC contracts.',
        price: 2999,
        discountPrice: 2499,
        level: 'Advanced',
        status: 'PUBLISHED',
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(2999);
    expect(Number(res.body.data.discountPrice)).toBe(2499);
    paidCourseId = res.body.data.id;
  });

  // SCENARIO 3: Admin configures installment payments
  it('Scenario 3: Admin configures installment payments on a course', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Full Stack AI Engineering Cohort',
        description: 'Comprehensive 6-month intensive boot camp with installment plan support.',
        price: 12000,
        allowInstallments: true,
        minInstallmentAmount: 4000,
        installmentCount: 3,
        installmentPolicy: 'RESTRICTED',
        status: 'PUBLISHED',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.allowInstallments).toBe(true);
    expect(Number(res.body.data.minInstallmentAmount)).toBe(4000);
    installmentCourseId = res.body.data.id;
  });

  // SCENARIO 4: Admin creates a paid internship
  it('Scenario 4: Admin creates a paid internship with fee configuration', async () => {
    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Full-Stack SDE Internship',
        description: 'Live project delivery across frontend, microservices, and databases.',
        organization: 'SkillUp Enterprise Labs',
        technologies: 'React, Node.js, MySQL, Docker',
        duration: '3 Months',
        deliveryMode: 'HYBRID',
        price: 3500,
        discountPrice: 2999,
        registrationFee: 500,
        allowInstallments: true,
        minInstallmentAmount: 1500,
        availableSeats: 40,
        isPublished: true,
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(3500);
    expect(Number(res.body.data.registrationFee)).toBe(500);
    expect(res.body.data.allowInstallments).toBe(true);
    paidInternshipId = res.body.data.id;
  });

  // SCENARIO 5: Admin creates a free internship
  it('Scenario 5: Admin creates a free internship (₹0)', async () => {
    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Open Source Community Research Internship',
        description: 'Collaborate on community open-source libraries.',
        organization: 'SkillUp Open Foundation',
        technologies: 'TypeScript, Rust, Git',
        duration: '2 Months',
        deliveryMode: 'ONLINE',
        price: 0,
        availableSeats: 50,
        isPublished: true,
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(0);
    freeInternshipId = res.body.data.id;
  });

  // SCENARIO 6: Admin publishes a paid material
  it('Scenario 6: Admin publishes a paid learning material', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'System Design Interview Cheatsheet 2026',
        description: 'Complete high-scale distributed system diagrams and trade-offs.',
        fileUrl: 'uploads/materials/system_design_cheatsheet.pdf',
        type: 'PDF',
        price: 499,
        discountPrice: 399,
        isFree: false,
        isPublished: true,
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.price)).toBe(499);
    expect(res.body.data.isFree).toBe(false);
    paidMaterialId = res.body.data.id;
  });

  // Admin also creates a free material for testing
  it('Pre-requisite: Admin creates a free learning material', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Open Developer Guide',
        description: 'Free starter guide for all students.',
        fileUrl: 'uploads/materials/open_guide.pdf',
        type: 'PDF',
        price: 0,
        isFree: true,
        isPublished: true,
      });

    expect(res.status).toBe(201);
    freeMaterialId = res.body.data.id;
  });

  // Setup valid and expired coupons
  it('Pre-requisite: Admin configures valid and expired coupons', async () => {
    validCouponCode = `TESTSAVE${Date.now()}`;
    expiredCouponCode = `EXPIRED${Date.now()}`;

    await prisma.coupon.create({
      data: {
        code: validCouponCode,
        discountType: 'PERCENTAGE',
        discountVal: 20,
        usageLimit: 100,
        perStudentLimit: 2,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: expiredCouponCode,
        discountType: 'PERCENTAGE',
        discountVal: 50,
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        isActive: true,
      },
    });
  });

  // SCENARIO 7: Student purchases a course successfully
  it('Scenario 7: Student creates checkout order and completes course payment', async () => {
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId: paidCourseId });

    expect(orderRes.status).toBe(201);
    const { orderId } = orderRes.body.data;
    expect(orderId).toBeDefined();

    // Verify payment completion
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: `pay_test_${Date.now()}`,
        razorpaySignature: 'simulated_test_signature',
      });

    expect(verifyRes.status).toBe(200);

    // Verify student is now enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentUser.id, courseId: paidCourseId } },
    });
    expect(enrollment).not.toBeNull();
  });

  // SCENARIO 8: Student purchases an internship successfully
  it('Scenario 8: Student applies and purchases a paid internship', async () => {
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ internshipId: paidInternshipId });

    expect(orderRes.status).toBe(201);
    const { orderId } = orderRes.body.data;

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: `pay_test_intern_${Date.now()}`,
        razorpaySignature: 'simulated_test_signature',
      });

    expect(verifyRes.status).toBe(200);

    const appRecord = await prisma.internshipApplication.findUnique({
      where: { internshipId_userId: { internshipId: paidInternshipId, userId: studentUser.id } },
    });
    expect(appRecord).not.toBeNull();
    expect(appRecord?.status).toBe('ACCEPTED');
  });

  // SCENARIO 9: Student purchases a paid material successfully
  it('Scenario 9: Student purchases a paid learning material', async () => {
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ materialId: paidMaterialId });

    expect(orderRes.status).toBe(201);
    const { orderId } = orderRes.body.data;

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: `pay_test_mat_${Date.now()}`,
        razorpaySignature: 'simulated_test_signature',
      });

    expect(verifyRes.status).toBe(200);

    const purchase = await prisma.materialPurchase.findUnique({
      where: { materialId_userId: { materialId: paidMaterialId, userId: studentUser.id } },
    });
    expect(purchase).not.toBeNull();
  });

  // SCENARIO 10: Student accesses a free material without payment
  it('Scenario 10: Student accesses a free material without payment', async () => {
    const res = await request(app)
      .get(`/api/materials/${freeMaterialId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hasAccess).toBe(true);
  });

  // SCENARIO 11: Student cannot access a paid material without payment
  it('Scenario 11: Unpurchased student cannot access a paid material (hasAccess = false)', async () => {
    // Create a new unpurchased material
    const unpurchasedMat = await prisma.learningMaterial.create({
      data: {
        title: 'Secret DevOps Runbooks',
        fileUrl: 'uploads/materials/secret.pdf',
        price: 999,
        isFree: false,
        uploaderId: adminUser.id,
      },
    });

    // Create a second student who hasn't bought it
    const otherStudent = await prisma.user.create({
      data: {
        email: `other.student.${Date.now()}@skillup.test`,
        name: 'Unpurchased Student',
        password: 'hashedpassword',
        role: 'STUDENT',
      },
    });
    const otherToken = jwt.sign({ id: otherStudent.id, role: otherStudent.role }, config.jwtSecret, { expiresIn: '1h' });

    const res = await request(app)
      .get(`/api/materials/${unpurchasedMat.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.hasAccess).toBe(false);
    expect(res.body.data.fileUrl).toBeUndefined(); // Storage path not leaked

    // Attempting download returns 403 Forbidden
    const dlRes = await request(app)
      .get(`/api/materials/${unpurchasedMat.id}/download`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(dlRes.status).toBe(403);

    // Clean up
    await prisma.learningMaterial.delete({ where: { id: unpurchasedMat.id } });
    await prisma.user.delete({ where: { id: otherStudent.id } });
  });

  // SCENARIO 12: Student applies a valid coupon
  it('Scenario 12: Student validates and applies a valid coupon with server price verification', async () => {
    const res = await request(app)
      .post('/api/payments/validate-coupon')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        couponCode: validCouponCode,
        courseId: installmentCourseId,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.discountAmount).toBeGreaterThan(0);
    expect(res.body.data.finalPrice).toBeLessThan(res.body.data.originalPrice);
  });

  // SCENARIO 13: Invalid and expired coupons are rejected
  it('Scenario 13: Expired or non-existent coupons are rejected (HTTP 400 or 404)', async () => {
    const resExpired = await request(app)
      .post('/api/payments/validate-coupon')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        couponCode: expiredCouponCode,
        courseId: installmentCourseId,
      });

    expect(resExpired.status).toBe(400);

    const resBogus = await request(app)
      .post('/api/payments/validate-coupon')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        couponCode: 'NONEXISTENT_CODE',
        courseId: installmentCourseId,
      });

    expect(resBogus.status).toBe(404);
  });

  // SCENARIO 14: Backend rejects manipulated frontend prices
  it('Scenario 14: Backend strictly derives price from database, ignoring frontend submitted amounts', async () => {
    const res = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: installmentCourseId,
        amount: 1, // Fraudulent manipulated amount
      });

    expect(res.status).toBe(201);
    // Server order amount must be the real database course price (₹12000), not the frontend ₹1
    expect(res.body.data.amount).toBe(12000 * 100); // 12000 INR in paise
  });

  // SCENARIO 15: Failed payment does not grant paid access
  it('Scenario 15: Failed payment signature leaves order failed and does not grant enrollment', async () => {
    const newCourse = await prisma.course.create({
      data: {
        title: 'Security Hardening Masterclass',
        slug: `sec-hard-${Date.now()}`,
        description: 'Comprehensive security hardening for web applications and microservices.',
        price: 4999,
        instructorId: mentorUser.id,
      },
    });

    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ courseId: newCourse.id });

    const orderId = orderRes.body.data.orderId;

    // Fraudulent signature attempt
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_fraudulent_123',
        razorpaySignature: 'invalid_tampered_signature',
      });

    expect(verifyRes.status).toBe(400);

    // Verify enrollment was not created
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentUser.id, courseId: newCourse.id } },
    });
    expect(enrollment).toBeNull();

    await prisma.payment.deleteMany({ where: { courseId: newCourse.id } });
    await prisma.course.delete({ where: { id: newCourse.id } });
  });

  // SCENARIO 16: Duplicate webhook events do not duplicate payment records or enrollments
  it('Scenario 16: Duplicate payment verification or webhook calls are idempotent', async () => {
    // Use the already verified course payment from Scenario 7
    const existingPayment = await prisma.payment.findFirst({
      where: { userId: studentUser.id, courseId: paidCourseId, status: 'COMPLETED' },
    });
    expect(existingPayment).not.toBeNull();

    const initialEnrollmentCount = await prisma.enrollment.count({
      where: { userId: studentUser.id, courseId: paidCourseId },
    });

    // Re-verify the same order
    const repeatVerify = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: existingPayment!.razorpayOrderId,
        razorpayPaymentId: existingPayment!.razorpayPaymentId,
        razorpaySignature: 'simulated_test_signature',
      });

    expect(repeatVerify.status).toBe(200);
    expect(repeatVerify.body.message).toMatch(/already verified/i);

    // Ensure enrollment was not duplicated
    const afterEnrollmentCount = await prisma.enrollment.count({
      where: { userId: studentUser.id, courseId: paidCourseId },
    });
    expect(afterEnrollmentCount).toBe(initialEnrollmentCount);
  });

  // SCENARIO 17: Installment payments update remaining balance correctly
  it('Scenario 17: Installment payments accurately compute and update remaining balances', async () => {
    // Student pays partial installment of ₹4000 on the ₹12000 course
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: installmentCourseId,
        isPartial: true,
        customAmount: 4000,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.isPartial).toBe(true);
    expect(orderRes.body.data.remainingBalance).toBe(8000); // 12000 - 4000 = 8000
  });

  // SCENARIO 18: Students can view only their own payment history
  it('Scenario 18: Student payment history endpoint strictly isolates records to authenticated user', async () => {
    const res = await request(app)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Every payment returned must belong to the calling student
    for (const payment of res.body.data) {
      expect(payment.userId).toBe(studentUser.id);
    }
  });

  // SCENARIO 19: Admin can filter and export payment reports
  it('Scenario 19: Admin can query payment transactions and export unified CSV report', async () => {
    const listRes = await request(app)
      .get('/api/admin/payments/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toBeDefined();

    const csvRes = await request(app)
      .get('/api/admin/payments/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toContain('Transaction ID');
    expect(csvRes.text).toContain('Student Email');
  });

  // SCENARIO 20: Existing mentor, course, internship, and enrollment functionality continues to work
  it('Scenario 20: Full regression check for mentors, live classes, and offline payment recording', async () => {
    // 1. Verify offline payment recording works
    const offlineRes = await request(app)
      .post('/api/admin/payments/offline')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: studentUser.id,
        courseId: installmentCourseId,
        amount: 12000,
        receiptNumber: 'VOUCHER-TEST-2026',
        paymentMethod: 'CASH_RECEIPT',
        adminNotes: 'Settled remaining balance at admissions desk',
      });

    expect(offlineRes.status).toBe(201);
    expect(offlineRes.body.data.status).toBe('COMPLETED');
    expect(Number(offlineRes.body.data.remainingBalance)).toBe(0);

    // 2. Verify mentor listings continue to work
    const mentorsRes = await request(app)
      .get('/api/admin/mentors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(mentorsRes.status).toBe(200);
    expect(mentorsRes.body.data).toBeDefined();

    // 3. Verify public courses listing continues to work
    const coursesRes = await request(app).get('/api/courses');
    expect(coursesRes.status).toBe(200);
    expect(coursesRes.body.data).toBeDefined();
  });
});
