import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('College Coupon & Payment Integration Test Suite', () => {
  const uniqueId = Date.now();
  const testStudentEmail = `coupon_student_${uniqueId}@skillup.test`;
  const otherStudentEmail = `other_student_${uniqueId}@skillup.test`;
  const testAdminEmail = `coupon_admin_${uniqueId}@skillup.test`;
  const password = 'Password123!';

  let studentToken = '';
  let studentId = '';
  let otherStudentToken = '';
  let otherStudentId = '';
  let adminToken = '';
  let adminId = '';

  let course1Id = '';
  let course2Id = '';

  let percentCouponCode = `TEST_PCT_${uniqueId}`;
  let fixedCouponCode = `TEST_FIX_${uniqueId}`;
  let freeCouponCode = `FREE_COLLEGE_${uniqueId}`;
  let expiredCouponCode = `EXPIRED_${uniqueId}`;
  let inactiveCouponCode = `INACTIVE_${uniqueId}`;
  let limitCouponCode = `LIMIT_${uniqueId}`;

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Student 1 with college: "ABC College of Engineering"
    const student = await prisma.user.create({
      data: {
        name: 'Alex Student',
        email: testStudentEmail,
        password: hashedPassword,
        role: 'STUDENT',
        college: 'ABC College of Engineering',
        isVerified: true,
      },
    });
    studentId = student.id;

    // 2. Create Student 2 with different college: "XYZ Institute of Tech"
    const otherStudent = await prisma.user.create({
      data: {
        name: 'Bob Student',
        email: otherStudentEmail,
        password: hashedPassword,
        role: 'STUDENT',
        college: 'XYZ Institute of Tech',
        isVerified: true,
      },
    });
    otherStudentId = otherStudent.id;

    // 3. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Coupon SuperAdmin',
        email: testAdminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;

    // Logins
    const res1 = await request(app).post('/api/auth/login').send({ email: testStudentEmail, password });
    studentToken = res1.body.data.accessToken;

    const res2 = await request(app).post('/api/auth/login').send({ email: otherStudentEmail, password });
    otherStudentToken = res2.body.data.accessToken;

    const res3 = await request(app).post('/api/auth/login').send({ email: testAdminEmail, password });
    adminToken = res3.body.data.accessToken;

    // Create 2 Test Courses
    const c1 = await prisma.course.create({
      data: {
        title: `SQL and Database Management ${uniqueId}`,
        slug: `sql-db-${uniqueId}`,
        description: 'Complete SQL mastery',
        price: 1299.0,
        level: 'All Levels',
        status: 'PUBLISHED',
        instructorId: adminId,
      },
    });
    course1Id = c1.id;

    const c2 = await prisma.course.create({
      data: {
        title: `Advanced Cloud Architecture ${uniqueId}`,
        slug: `cloud-arch-${uniqueId}`,
        description: 'Cloud design patterns',
        price: 2499.0,
        level: 'All Levels',
        status: 'PUBLISHED',
        instructorId: adminId,
      },
    });
    course2Id = c2.id;

    // Setup Test Coupons in DB
    // Coupon 1: 30% discount, maxDiscount 300, college ABC, course 1
    await prisma.coupon.create({
      data: {
        code: percentCouponCode,
        name: 'ABC College SQL 30%',
        college: 'ABC College of Engineering',
        courseId: course1Id,
        discountType: 'PERCENTAGE',
        discountVal: 30,
        maxDiscount: 300,
        minSpend: 500,
        usageLimit: 50,
        perStudentLimit: 2,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000 * 30),
        isActive: true,
      },
    });

    // Coupon 2: Fixed Rs. 400 discount
    await prisma.coupon.create({
      data: {
        code: fixedCouponCode,
        name: 'Flat 400 Off',
        discountType: 'FIXED',
        discountVal: 400,
        usageLimit: 10,
        perStudentLimit: 1,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });

    // Coupon 3: 100% Free Coupon for ABC College
    await prisma.coupon.create({
      data: {
        code: freeCouponCode,
        name: '100% Scholarship ABC',
        college: 'ABC College of Engineering',
        discountType: 'PERCENTAGE',
        discountVal: 100,
        usageLimit: 5,
        perStudentLimit: 1,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });

    // Coupon 4: Expired Coupon
    await prisma.coupon.create({
      data: {
        code: expiredCouponCode,
        name: 'Old Expired Coupon',
        discountType: 'PERCENTAGE',
        discountVal: 20,
        validFrom: new Date(Date.now() - 86400000 * 10),
        validUntil: new Date(Date.now() - 86400000),
        isActive: true,
      },
    });

    // Coupon 5: Inactive Coupon
    await prisma.coupon.create({
      data: {
        code: inactiveCouponCode,
        name: 'Disabled Coupon',
        discountType: 'PERCENTAGE',
        discountVal: 50,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: false,
      },
    });

    // Coupon 6: Limit 1 coupon
    await prisma.coupon.create({
      data: {
        code: limitCouponCode,
        name: 'Exhaustible Coupon',
        discountType: 'FIXED',
        discountVal: 100,
        usageLimit: 1,
        perStudentLimit: 1,
        usedCount: 1, // Already exhausted
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup in order of relations
    await prisma.couponRedemption.deleteMany({
      where: {
        userId: { in: [studentId, otherStudentId] },
      },
    });
    await prisma.enrollment.deleteMany({
      where: {
        userId: { in: [studentId, otherStudentId] },
      },
    });
    await prisma.payment.deleteMany({
      where: {
        userId: { in: [studentId, otherStudentId] },
      },
    });
    await prisma.coupon.deleteMany({
      where: {
        code: {
          in: [
            percentCouponCode,
            fixedCouponCode,
            freeCouponCode,
            expiredCouponCode,
            inactiveCouponCode,
            limitCouponCode,
          ],
        },
      },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [course1Id, course2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, otherStudentId, adminId] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Coupon Validation API (/api/payments/validate-coupon)', () => {
    it('successfully validates eligible college coupon with capped discount', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: percentCouponCode,
          courseId: course1Id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.originalPrice).toBe(1299);
      // 30% of 1299 is 389.70, but capped at maxDiscount 300!
      expect(res.body.data.discountAmount).toBe(300);
      expect(res.body.data.finalPrice).toBe(999);
      expect(res.body.data.college).toBe('ABC College of Engineering');
    });

    it('rejects coupon if non-existent or invalid code', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: 'INVALID_CODE_999',
          courseId: course1Id,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/not found/i);
    });

    it('rejects coupon if expired', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: expiredCouponCode,
          courseId: course1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/expired/i);
    });

    it('rejects coupon if deactivated / inactive', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: inactiveCouponCode,
          courseId: course1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/inactive/i);
    });

    it('rejects coupon when applied to the wrong course', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: percentCouponCode,
          courseId: course2Id, // Coupon is locked to course1Id
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/valid only for the course/i);
    });

    it('rejects college-specific coupon when used by student of another college', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${otherStudentToken}`) // otherStudent has XYZ college
        .send({
          couponCode: percentCouponCode,
          courseId: course1Id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/exclusively reserved for students of/i);
    });

    it('rejects coupon when redemption limit has been reached', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          couponCode: limitCouponCode,
          courseId: course1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/redemption limit/i);
    });
  });

  describe('2. Order Creation with Razorpay & Reservation (/api/payments/orders)', () => {
    it('creates a discounted Razorpay order in integer paise and reserves coupon', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course1Id,
          couponCode: percentCouponCode,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderId).toBeDefined();
      expect(res.body.data.amount).toBe(99900); // 999 * 100 paise
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.discountAmount).toBe(300);
      expect(res.body.data.couponCode).toBe(percentCouponCode);

      // Verify a RESERVED redemption record exists
      const reservation = await prisma.couponRedemption.findFirst({
        where: {
          userId: studentId,
          coupon: { code: percentCouponCode },
          status: 'RESERVED',
        },
      });
      expect(reservation).not.toBeNull();
      expect(Number(reservation?.discountAmount)).toBe(300);
    });
  });

  describe('3. 100% Free Coupon Redemption Flow', () => {
    it('instantly enrolls student and completes free transaction without Razorpay order', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course2Id,
          couponCode: freeCouponCode,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isFree).toBe(true);
      expect(res.body.data.amount).toBe(0);
      expect(res.body.data.orderId).toMatch(/^free_/);

      // Verify enrollment created
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: studentId,
            courseId: course2Id,
          },
        },
      });
      expect(enrollment).not.toBeNull();

      // Verify payment recorded as 0 with coupon code
      const payment = await prisma.payment.findFirst({
        where: {
          userId: studentId,
          courseId: course2Id,
          amount: 0,
        },
      });
      expect(payment).not.toBeNull();
      expect(payment?.couponCode).toBe(freeCouponCode);
      expect(Number(payment?.discountAmount)).toBe(2499);
      expect(payment?.status).toBe('COMPLETED');

      // Verify coupon redemption is COMPLETED
      const redemption = await prisma.couponRedemption.findFirst({
        where: {
          userId: studentId,
          coupon: { code: freeCouponCode },
          status: 'COMPLETED',
        },
      });
      expect(redemption).not.toBeNull();
    });

    it('prevents student from exceeding perStudentLimit on free coupon', async () => {
      // freeCouponCode has perStudentLimit: 1
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course1Id,
          couponCode: freeCouponCode,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/limit/i);
    });
  });

  describe('4. Payment Verification & Signature Security', () => {
    it('rejects fake or mismatched Razorpay signatures', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: 'order_test_fake_123',
          razorpayPaymentId: 'pay_test_fake_456',
          razorpaySignature: 'invalid_cryptographic_hash',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toMatch(/signature verification failed/i);
    });

    it('accepts legitimate cryptographic signature, activates enrollment and completes reservation', async () => {
      // Create fresh payment and reservation to test
      const testOrderId = `order_int_${uniqueId}`;
      const testPaymentId = `pay_int_${uniqueId}`;
      const secret = config.razorpay.keySecret;

      // Generate HMAC SHA256 signature matching server algorithm
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      // Create a pending Payment record in DB as would happen during order
      const newPayment = await prisma.payment.create({
        data: {
          userId: studentId,
          courseId: course1Id,
          razorpayOrderId: testOrderId,
          amount: 999.0,
          currency: 'INR',
          status: 'PENDING',
          couponCode: percentCouponCode,
          discountAmount: 300.0,
          originalAmount: 1299.0,
        },
      });

      // Execute verification
      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: testOrderId,
          razorpayPaymentId: testPaymentId,
          razorpaySignature: generatedSignature,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Verify enrollment is created
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: studentId,
            courseId: course1Id,
          },
        },
      });
      expect(enrollment).not.toBeNull();

      // Verify coupon redemption transitioned to COMPLETED
      const redemption = await prisma.couponRedemption.findFirst({
        where: {
          paymentId: newPayment.id,
        },
      });
      expect(redemption).not.toBeNull();
      expect(redemption?.status).toBe('COMPLETED');
    });

    it('handles duplicate payment verification idempotently without double-enrolling', async () => {
      const testOrderId = `order_int_${uniqueId}`;
      const testPaymentId = `pay_int_${uniqueId}`;
      const secret = config.razorpay.keySecret;

      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${testOrderId}|${testPaymentId}`)
        .digest('hex');

      const dupRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: testOrderId,
          razorpayPaymentId: testPaymentId,
          razorpaySignature: generatedSignature,
        });

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.success).toBe(true);
      expect(dupRes.body.message).toMatch(/already verified|active/i);
    });
  });

  describe('5. Admin Management, Analytics & CSV Export', () => {
    it('allows admin to fetch coupon list with analytics KPIs', async () => {
      const res = await request(app)
        .get('/api/admin/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analytics).toBeDefined();
      expect(res.body.analytics.totalCoupons).toBeGreaterThan(0);
      expect(res.body.analytics.activeCoupons).toBeGreaterThan(0);
      expect(res.body.analytics.totalRedemptionsCount).toBeGreaterThanOrEqual(1);
    });

    it('allows admin to query redemption audit history with filters', async () => {
      const res = await request(app)
        .get('/api/admin/coupons/redemptions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const studentRedemption = res.body.data.find(
        (r: any) => r.user?.email === testStudentEmail
      );
      expect(studentRedemption).toBeDefined();
    });

    it('allows admin to export redemptions to CSV', async () => {
      const res = await request(app)
        .get('/api/admin/coupons/export-csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('Redemption ID,Coupon Code,College');
      expect(res.text).toContain(testStudentEmail);
    });

    it('allows admin to toggle coupon active status', async () => {
      const coupon = await prisma.coupon.findUnique({
        where: { code: fixedCouponCode },
      });

      const res = await request(app)
        .patch(`/api/admin/coupons/${coupon?.id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
    });

    it('forbids students from creating or editing coupons', async () => {
      const res = await request(app)
        .post('/api/admin/coupons')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: 'HACKED_COUPON',
          name: 'Hacked',
          discountType: 'PERCENTAGE',
          discountVal: 90,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('6. Refund & Quota Restoration', () => {
    it('restores coupon usedCount and marks redemption as REFUNDED on order refund', async () => {
      const testPayment = await prisma.payment.findFirst({
        where: {
          userId: studentId,
          courseId: course1Id,
          status: 'COMPLETED',
        },
      });

      expect(testPayment).not.toBeNull();

      // Check coupon usage count prior to refund
      const couponBefore = await prisma.coupon.findUnique({
        where: { code: percentCouponCode },
      });
      const initialCount = couponBefore?.usedCount || 0;

      // Execute admin refund
      const refundRes = await request(app)
        .post(`/api/admin/orders/${testPayment?.id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Student transferred colleges' });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.success).toBe(true);

      // Verify coupon count decremented
      const couponAfter = await prisma.coupon.findUnique({
        where: { code: percentCouponCode },
      });
      expect(couponAfter?.usedCount).toBe(Math.max(0, initialCount - 1));

      // Verify redemption status is now REFUNDED
      const redemptionAfter = await prisma.couponRedemption.findFirst({
        where: { paymentId: testPayment?.id },
      });
      expect(redemptionAfter?.status).toBe('REFUNDED');

      // Verify student enrollment was deleted upon refund
      const enrollmentAfter = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: studentId,
            courseId: course1Id,
          },
        },
      });
      expect(enrollmentAfter).toBeNull();
    });
  });
});
