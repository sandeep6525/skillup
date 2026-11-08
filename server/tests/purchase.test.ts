import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('Multi-Product Purchase & Entitlement Suite (Courses, Internships, Materials, Hackathons)', () => {
  const ts = Date.now();
  const studentEmail = `purchaser_${ts}@skillup.test`;
  const hackerEmail = `hacker_${ts}@skillup.test`;
  const adminEmail = `purchase_admin_${ts}@skillup.test`;
  const password = 'Password123!';

  let studentToken = '';
  let studentId = '';
  let hackerToken = '';
  let hackerId = '';
  let adminToken = '';

  let courseId = '';
  let paidInternshipId = '';
  let freeInternshipId = '';
  let paidMaterialId = '';
  let freeMaterialId = '';
  let paidHackathonId = '';

  let courseCoupon = `COURSE_DISC_${ts}`;
  let internshipCoupon = `INTERN_DISC_${ts}`;
  let materialCoupon = `MAT_DISC_${ts}`;

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        name: 'Purchasing Student',
        email: studentEmail,
        password: hashedPassword,
        role: 'STUDENT',
        college: 'National Engineering College',
        isVerified: true,
      },
    });
    studentId = student.id;

    // 2. Create Second Student (Hacker / Unauthorized)
    const hacker = await prisma.user.create({
      data: {
        name: 'Sneaky Student',
        email: hackerEmail,
        password: hashedPassword,
        role: 'STUDENT',
        college: 'Other University',
        isVerified: true,
      },
    });
    hackerId = hacker.id;

    // 3. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // 4. Log in users to get tokens
    const sLogin = await request(app).post('/api/auth/login').send({ email: studentEmail, password });
    studentToken = sLogin.body.data.accessToken;

    const hLogin = await request(app).post('/api/auth/login').send({ email: hackerEmail, password });
    hackerToken = hLogin.body.data.accessToken;

    const aLogin = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = aLogin.body.data.accessToken;

    // 5. Seed Test Course
    const course = await prisma.course.create({
      data: {
        title: `Full-Stack Architecture Mastery ${ts}`,
        slug: `full-stack-mastery-${ts}`,
        description: 'Deep dive into full-stack modern architecture.',
        price: 3999,
        discountPrice: 2499,
        status: 'PUBLISHED',
        instructorId: admin.id,
      },
    });
    courseId = course.id;

    // 6. Seed Paid & Free Internships
    const pIntern = await prisma.internship.create({
      data: {
        title: `AI & Cloud Internship ${ts}`,
        description: 'Comprehensive industry internship with real client projects.',
        technologies: 'React, Node.js, Python, AWS',
        price: 4999,
        availableSeats: 30,
        isPublished: true,
      },
    });
    paidInternshipId = pIntern.id;

    const fIntern = await prisma.internship.create({
      data: {
        title: `Open Source Summer Internship ${ts}`,
        description: 'Free open source skill development program.',
        technologies: 'TypeScript, Docker',
        price: 0,
        availableSeats: 100,
        isPublished: true,
      },
    });
    freeInternshipId = fIntern.id;

    // 7. Seed Paid & Free Learning Materials
    const pMat = await prisma.learningMaterial.create({
      data: {
        title: `Production System Design Guide ${ts}`,
        description: 'High-availability architecture blueprints and diagrams.',
        fileUrl: 'uploads/system-design-guide.pdf',
        type: 'PDF',
        price: 499,
        discountPrice: 299,
        isFree: false,
        uploaderId: admin.id,
        isPublished: true,
      },
    });
    paidMaterialId = pMat.id;

    const fMat = await prisma.learningMaterial.create({
      data: {
        title: `SkillUp Starter Cheat Sheet ${ts}`,
        description: 'Free reference sheet for beginners.',
        fileUrl: 'uploads/starter-cheatsheet.pdf',
        type: 'PDF',
        price: 0,
        isFree: true,
        uploaderId: admin.id,
        isPublished: true,
      },
    });
    freeMaterialId = fMat.id;

    // 8. Seed Paid Hackathon
    const pHack = await prisma.hackathon.create({
      data: {
        title: `National AI Hackathon ${ts}`,
        description: 'Build production-ready agentic AI systems.',
        theme: 'Autonomous Agents',
        startDate: new Date(Date.now() + 86400000 * 7),
        endDate: new Date(Date.now() + 86400000 * 9),
        registrationDeadline: new Date(Date.now() + 86400000 * 5),
        registrationFee: 500,
        isPublished: true,
      },
    });
    paidHackathonId = pHack.id;

    // 9. Seed targeted coupons
    await prisma.coupon.create({
      data: {
        code: courseCoupon,
        name: 'Course 20% Off',
        courseId,
        discountType: 'PERCENTAGE',
        discountVal: 20,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: internshipCoupon,
        name: 'Internship ₹1000 Off',
        internshipId: paidInternshipId,
        discountType: 'FIXED',
        discountVal: 1000,
        isActive: true,
      },
    });

    await prisma.coupon.create({
      data: {
        code: materialCoupon,
        name: 'Material ₹100 Off',
        materialId: paidMaterialId,
        discountType: 'FIXED',
        discountVal: 100,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup seeded records
    await prisma.couponRedemption.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.coupon.deleteMany({
      where: { code: { in: [courseCoupon, internshipCoupon, materialCoupon] } },
    });
    await prisma.materialPurchase.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.internshipApplication.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.hackathonRegistration.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.enrollment.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.payment.deleteMany({
      where: { userId: { in: [studentId, hackerId] } },
    });
    await prisma.learningMaterial.deleteMany({
      where: { id: { in: [paidMaterialId, freeMaterialId] } },
    });
    await prisma.internship.deleteMany({
      where: { id: { in: [paidInternshipId, freeInternshipId] } },
    });
    await prisma.hackathon.deleteMany({
      where: { id: paidHackathonId },
    });
    await prisma.course.deleteMany({
      where: { id: courseId },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [studentId, hackerId] } },
    });
  });

  // ==========================================
  // 1. PUBLIC BROWSING & UNPROTECTED ACCESS
  // ==========================================
  describe('1. Public Browsing vs Protected Endpoints', () => {
    it('allows guest to list public learning materials without token', async () => {
      const res = await request(app).get('/api/materials');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((m: any) => m.id === paidMaterialId);
      expect(found).toBeDefined();
      expect(found.title).toContain('Production System Design');
      // Must not leak private storage path in public listing
      expect(found.fileUrl).toBeUndefined();
    });

    it('allows guest to view single material details without token', async () => {
      const res = await request(app).get(`/api/materials/${paidMaterialId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(paidMaterialId);
      expect(res.body.data.hasAccess).toBe(false);
      expect(res.body.data.fileUrl).toBeUndefined();
    });

    it('rejects unauthenticated file download (401)', async () => {
      const res = await request(app).get(`/api/materials/${paidMaterialId}/download`);
      expect(res.status).toBe(401);
    });

    it('rejects unauthorized student download of unpurchased paid material (403)', async () => {
      const res = await request(app)
        .get(`/api/materials/${paidMaterialId}/download`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error?.message).toMatch(/Access denied/i);
    });
  });

  // ==========================================
  // 2. COUPON VALIDATION ACROSS PRODUCT TYPES
  // ==========================================
  describe('2. Multi-Product Coupon Validation', () => {
    it('validates course coupon on course purchase', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ couponCode: courseCoupon, courseId });
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(courseCoupon);
      // Original 2499, 20% discount = 500
      expect(res.body.data.discountAmount).toBe(500);
      expect(res.body.data.finalPrice).toBe(1999);
    });

    it('rejects course-specific coupon when applied to an internship', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ couponCode: courseCoupon, internshipId: paidInternshipId });
      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/valid only for the course/i);
    });

    it('validates internship coupon on internship checkout', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ couponCode: internshipCoupon, internshipId: paidInternshipId });
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(internshipCoupon);
      // Original 4999, 1000 off = 3999
      expect(res.body.data.discountAmount).toBe(1000);
      expect(res.body.data.finalPrice).toBe(3999);
    });

    it('validates learning material coupon on material checkout', async () => {
      const res = await request(app)
        .post('/api/payments/validate-coupon')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ couponCode: materialCoupon, materialId: paidMaterialId });
      expect(res.status).toBe(200);
      expect(res.body.data.code).toBe(materialCoupon);
      // Original 299, 100 off = 199
      expect(res.body.data.discountAmount).toBe(100);
      expect(res.body.data.finalPrice).toBe(199);
    });
  });

  // ==========================================
  // 3. LEARNING MATERIAL ORDER & VERIFICATION
  // ==========================================
  describe('3. Learning Material Purchase & Access Entitlement', () => {
    let orderId = '';
    let paymentId = '';

    it('creates Razorpay order in integer paise for learning material with coupon', async () => {
      const res = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ materialId: paidMaterialId, couponCode: materialCoupon });

      expect(res.status).toBe(201);
      expect(res.body.data.orderId).toBeDefined();
      expect(res.body.data.paymentId).toBeDefined();
      // Final price is 199 -> 19900 paise
      expect(res.body.data.amount).toBe(19900);
      expect(res.body.data.couponCode).toBe(materialCoupon);

      orderId = res.body.data.orderId;
      paymentId = res.body.data.paymentId;
    });

    it('rejects fraudulent or tampered HMAC signature', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: 'pay_tampered_123',
          razorpaySignature: 'bad_signature_fraud_blocked',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/signature verification failed/i);
    });

    it('verifies genuine payment signature and creates MaterialPurchase entitlement', async () => {
      const genuinePaymentId = `pay_mat_${Date.now()}`;
      const payload = `${orderId}|${genuinePaymentId}`;
      const signature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: genuinePaymentId,
          razorpaySignature: signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify MaterialPurchase record exists in DB
      const purchase = await prisma.materialPurchase.findUnique({
        where: {
          materialId_userId: { materialId: paidMaterialId, userId: studentId },
        },
      });
      expect(purchase).toBeDefined();
      expect(Number(purchase?.paidAmount)).toBe(199);
    });

    it('authorizes purchasing student to view and download material after payment', async () => {
      // 1. Detail endpoint now reports hasAccess: true
      const detailRes = await request(app)
        .get(`/api/materials/${paidMaterialId}`)
        .set('Authorization', `Bearer ${studentToken}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.hasAccess).toBe(true);

      // 2. Purchased materials appear in Student Dashboard -> My Materials
      const myRes = await request(app)
        .get('/api/materials/my/purchases')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(myRes.status).toBe(200);
      const found = myRes.body.data.find((p: any) => p.materialId === paidMaterialId);
      expect(found).toBeDefined();
    });

    it('strictly prevents another student from accessing the purchased material (ID manipulation defense)', async () => {
      const hackerRes = await request(app)
        .get(`/api/materials/${paidMaterialId}/download`)
        .set('Authorization', `Bearer ${hackerToken}`);
      expect(hackerRes.status).toBe(403);
      expect(hackerRes.body.error?.message).toMatch(/Access denied/i);
    });
  });

  // ==========================================
  // 4. INTERNSHIP APPLICATION & ENROLLMENT
  // ==========================================
  describe('4. Internship Application & Fee Payment Flow', () => {
    it('initiates unpaid application with PENDING status for paid internship', async () => {
      const res = await request(app)
        .post(`/api/internships/${paidInternshipId}/apply`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ notes: 'Applying for AI internship batch' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(Number(res.body.data.paidAmount)).toBe(0);
    });

    it('activates seat immediately as ACCEPTED for free internship', async () => {
      const res = await request(app)
        .post(`/api/internships/${freeInternshipId}/apply`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ notes: 'Enrolling in free open source internship' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACCEPTED');
    });

    it('completes payment for paid internship and activates status to ACCEPTED', async () => {
      // 1. Create order
      const orderRes = await request(app)
        .post('/api/payments/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ internshipId: paidInternshipId, couponCode: internshipCoupon });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.data.orderId;
      // 4999 - 1000 = 3999 -> 399900 paise
      expect(orderRes.body.data.amount).toBe(399900);

      // 2. Verify signature
      const paymentId = `pay_intern_${Date.now()}`;
      const signature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        });

      expect(verifyRes.status).toBe(200);

      // 3. Confirm status is now ACCEPTED in DB
      const appRecord = await prisma.internshipApplication.findUnique({
        where: {
          internshipId_userId: { internshipId: paidInternshipId, userId: studentId },
        },
      });
      expect(appRecord?.status).toBe('ACCEPTED');
      expect(Number(appRecord?.paidAmount)).toBe(3999);
    });

    it('displays active internship under Student Dashboard -> My Internships', async () => {
      const res = await request(app)
        .get('/api/internships/my/applications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const paidApp = res.body.data.find((a: any) => a.internshipId === paidInternshipId);
      expect(paidApp).toBeDefined();
      expect(paidApp.status).toBe('ACCEPTED');
    });
  });

  // ==========================================
  // 5. UNIFIED ORDERS & PAYMENTS DASHBOARD
  // ==========================================
  describe('5. Unified Orders & Payments History', () => {
    it('returns itemized payment transactions with full product details', async () => {
      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const materialTx = res.body.data.find((p: any) => p.materialId === paidMaterialId);
      expect(materialTx).toBeDefined();
      expect(materialTx.material.title).toContain('Production System Design');
      expect(materialTx.couponCode).toBe(materialCoupon);
      expect(materialTx.status).toBe('COMPLETED');

      const internshipTx = res.body.data.find((p: any) => p.internshipId === paidInternshipId);
      expect(internshipTx).toBeDefined();
      expect(internshipTx.internship.title).toContain('AI & Cloud Internship');
      expect(internshipTx.status).toBe('COMPLETED');
    });
  });
});
