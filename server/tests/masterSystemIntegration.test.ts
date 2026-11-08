import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('Master End-to-End System Suite (All Modules Integration)', () => {
  const ts = Date.now();
  const studentEmail = `master_student_${ts}@skillup.test`;
  const adminEmail = `master_admin_${ts}@skillup.test`;
  const password = 'Password123!';

  let studentToken = '';
  let studentId = '';
  let adminToken = '';
  let adminId = '';

  let courseId = '';
  let hackathonId = '';
  let paidHackathonId = '';
  let freeHackathonId = '';
  let internshipId = '';
  let materialId = '';

  let universalCoupon = `UNIV_${ts}`;
  let hackathonCoupon = `HACK_${ts}`;
  let collegeCoupon = `COLLEGE_${ts}`;

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        name: 'Master Student User',
        email: studentEmail,
        password: hashedPassword,
        role: 'STUDENT',
        college: 'Apex Institute of Technology',
        isVerified: true,
      },
    });
    studentId = student.id;

    // 2. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'Master Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;

    // 3. Login both
    const sLogin = await request(app).post('/api/auth/login').send({ email: studentEmail, password });
    studentToken = sLogin.body.data.accessToken;

    const aLogin = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = aLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.couponRedemption.deleteMany({ where: { userId: { in: [studentId, adminId] } } });
    await prisma.payment.deleteMany({ where: { userId: { in: [studentId, adminId] } } });
    await prisma.enrollment.deleteMany({ where: { userId: studentId } });
    await prisma.hackathonRegistration.deleteMany({ where: { userId: studentId } });
    await prisma.internshipApplication.deleteMany({ where: { userId: studentId } });
    await prisma.coupon.deleteMany({ where: { code: { in: [universalCoupon, hackathonCoupon, collegeCoupon] } } });
    if (courseId) await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    if (paidHackathonId) await prisma.hackathon.delete({ where: { id: paidHackathonId } }).catch(() => {});
    if (freeHackathonId) await prisma.hackathon.delete({ where: { id: freeHackathonId } }).catch(() => {});
    if (internshipId) await prisma.internship.delete({ where: { id: internshipId } }).catch(() => {});
    if (materialId) await prisma.learningMaterial.delete({ where: { id: materialId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [studentId, adminId] } } }).catch(() => {});
  });

  // ==========================================
  // MODULE 1 & 3: Course Creation & Catalogue
  // ==========================================
  test('Admin creates and publishes course; appears in student catalogue', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Enterprise Cloud Architecture ${ts}`,
        description: 'Complete hands-on AWS & Kubernetes mastery curriculum.',
        level: 'ADVANCED',
        price: 2499,
        discountPrice: 1999,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    courseId = res.body.data.id;
    expect(courseId).toBeDefined();

    // Student fetches courses catalogue
    const catRes = await request(app).get('/api/courses');
    expect(catRes.status).toBe(200);
    const found = catRes.body.data.find((c: any) => c.id === courseId);
    expect(found).toBeDefined();
    expect(found.title).toContain('Enterprise Cloud Architecture');
    expect(Number(found.price)).toBe(2499);
  });

  // ==========================================
  // MODULE 5: Hackathon Creation & Free Registration
  // ==========================================
  test('Admin creates free hackathon; student registers directly without payment', async () => {
    const start = new Date(Date.now() + 86400000 * 2);
    const end = new Date(Date.now() + 86400000 * 4);
    const deadline = new Date(Date.now() + 86400000);

    const hRes = await request(app)
      .post('/api/hackathons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `AI for Health Hackathon ${ts}`,
        description: 'Build predictive healthcare models',
        theme: 'Artificial Intelligence',
        organizer: 'SkillUp Healthcare Foundation',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        registrationDeadline: deadline.toISOString(),
        mode: 'ONLINE',
        minTeamSize: 1,
        maxTeamSize: 4,
        eligibility: 'All college engineering students',
        registrationFee: 0,
        rules: 'Open-source MIT license only',
        prizes: '₹1,00,000 cash prizes',
      });

    expect(hRes.status).toBe(201);
    freeHackathonId = hRes.body.data.id;

    // Student registers for free hackathon
    const regRes = await request(app)
      .post(`/api/hackathons/${freeHackathonId}/register`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        teamName: 'Health Pioneers',
        teamMembers: 'Alice, Bob',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.status).toBe('CONFIRMED');

    // Duplicate registration prevented
    const dupRes = await request(app)
      .post(`/api/hackathons/${freeHackathonId}/register`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ teamName: 'Duplicate Team' });

    expect(dupRes.status).toBe(400);
  });

  // ==========================================
  // MODULE 2: Multi-Product Coupons (Universal & Hackathon)
  // ==========================================
  test('Admin creates universal coupon and hackathon-targeted coupon', async () => {
    // 1. Universal Coupon: 25% off with minSpend 1000
    const uRes = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: universalCoupon,
        name: 'Universal Spring Festival',
        description: '25% off across all learning products',
        discountType: 'PERCENTAGE',
        discountVal: 25,
        minSpend: 500,
        maxDiscount: 1000,
        usageLimit: 100,
        perStudentLimit: 2,
      });

    expect(uRes.status).toBe(201);
    expect(uRes.body.data.code).toBe(universalCoupon);

    // 2. Paid Hackathon Creation
    const start = new Date(Date.now() + 86400000 * 5);
    const end = new Date(Date.now() + 86400000 * 7);
    const deadline = new Date(Date.now() + 86400000 * 3);

    const paidH = await request(app)
      .post('/api/hackathons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `FinTech Global Hackathon ${ts}`,
        description: 'Decentralized and algorithmic trading challenge',
        theme: 'FinTech',
        organizer: 'National Banking Consortium',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        registrationDeadline: deadline.toISOString(),
        mode: 'ONLINE',
        minTeamSize: 1,
        maxTeamSize: 3,
        eligibility: 'B.Tech & MCA Students',
        registrationFee: 800,
      });

    expect(paidH.status).toBe(201);
    paidHackathonId = paidH.body.data.id;

    // 3. Hackathon-specific Coupon: Fixed ₹300 off
    const hCouponRes = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: hackathonCoupon,
        name: 'FinTech Student Subsidy',
        description: '₹300 off FinTech Global Hackathon registration',
        hackathonId: paidHackathonId,
        discountType: 'FIXED',
        discountVal: 300,
        usageLimit: 50,
        perStudentLimit: 1,
      });

    expect(hCouponRes.status).toBe(201);
    expect(hCouponRes.body.data.hackathonId).toBe(paidHackathonId);
  });

  // ==========================================
  // MODULE 2 & 5: Validate Hackathon Coupon & Server Price Calculation
  // ==========================================
  test('Server validates hackathon coupon and computes discounted fee accurately', async () => {
    // 1. Validate hackathon-targeted coupon
    const valRes = await request(app)
      .post('/api/payments/validate-coupon')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        couponCode: hackathonCoupon,
        hackathonId: paidHackathonId,
      });

    expect(valRes.status).toBe(200);
    expect(valRes.body.data.originalPrice).toBe(800);
    expect(valRes.body.data.discountAmount).toBe(300);
    expect(valRes.body.data.finalAmount).toBe(500);

    // 2. Validate universal coupon also applies to hackathon (fee 800 >= minSpend 500)
    const uValRes = await request(app)
      .post('/api/payments/validate-coupon')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        couponCode: universalCoupon,
        hackathonId: paidHackathonId,
      });

    expect(uValRes.status).toBe(200);
    expect(uValRes.body.data.originalPrice).toBe(800);
    expect(uValRes.body.data.discountAmount).toBe(200); // 25% of 800 = 200
    expect(uValRes.body.data.finalAmount).toBe(600);
  });

  // ==========================================
  // MODULE 5 & 8: Paid Hackathon Checkout & Signature Verification
  // ==========================================
  test('Paid hackathon checkout with coupon creates order and confirms registration upon verification', async () => {
    // Student initiates registration record
    await request(app)
      .post(`/api/hackathons/${paidHackathonId}/register`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ teamName: 'FinTech Titans' });

    // Create payment order with hackathon coupon
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        hackathonId: paidHackathonId,
        couponCode: hackathonCoupon,
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.amount).toBe(50000); // 500 INR in paise
    expect(orderRes.body.data.currency).toBe('INR');
    const orderId = orderRes.body.data.orderId;

    // Simulate verified Razorpay callback
    const fakePaymentId = `pay_hack_${ts}`;
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret || 'test_secret')
      .update(`${orderId}|${fakePaymentId}`)
      .digest('hex');

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        razorpayOrderId: orderId,
        razorpayPaymentId: fakePaymentId,
        razorpaySignature: generatedSignature,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    // Registration confirmed in DB
    const regInDb = await prisma.hackathonRegistration.findFirst({
      where: { hackathonId: paidHackathonId, userId: studentId },
    });
    expect(regInDb).toBeDefined();
    expect(regInDb?.status).toBe('CONFIRMED');

    // Coupon redemption record confirmed
    const redInDb = await prisma.couponRedemption.findFirst({
      where: { coupon: { code: hackathonCoupon }, userId: studentId },
    });
    expect(redInDb).toBeDefined();
    expect(redInDb?.status).toBe('COMPLETED');
    expect(Number(redInDb?.discountAmount)).toBe(300);
  });

  // ==========================================
  // MODULE 7: Centralized Orders & Payments Admin Queries
  // ==========================================
  test('Admin orders endpoint filters by productType, status, and search query', async () => {
    // 1. Filter by HACKATHON
    const hackOrders = await request(app)
      .get('/api/admin/orders?productType=HACKATHON')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(hackOrders.status).toBe(200);
    expect(Array.isArray(hackOrders.body.data)).toBe(true);
    const hasHackOrder = hackOrders.body.data.some((o: any) => o.hackathonId === paidHackathonId);
    expect(hasHackOrder).toBe(true);

    // 2. Filter by COMPLETED status
    const compOrders = await request(app)
      .get('/api/admin/orders?status=COMPLETED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(compOrders.status).toBe(200);
    expect(compOrders.body.data.every((o: any) => o.status === 'COMPLETED')).toBe(true);

    // 3. Search by student name
    const searchRes = await request(app)
      .get(`/api/admin/orders?search=Master Student`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.data[0].user.name).toContain('Master Student');
  });

  // ==========================================
  // MODULE 7: Admin Financial Overview Analytics
  // ==========================================
  test('Admin payment overview returns live database aggregates with product breakdowns', async () => {
    const overviewRes = await request(app)
      .get('/api/admin/payments/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.success).toBe(true);
    const data = overviewRes.body.data;

    expect(Number(data.totalRevenue)).toBeGreaterThanOrEqual(500);
    expect(Number(data.successfulOrders)).toBeGreaterThanOrEqual(1);
    expect(Number(data.totalCouponDiscounts)).toBeGreaterThanOrEqual(300);

    // Verify breakdown structure
    expect(data.breakdown).toBeDefined();
    expect(data.breakdown.courses).toBeDefined();
    expect(data.breakdown.internships).toBeDefined();
    expect(data.breakdown.materials).toBeDefined();
    expect(data.breakdown.hackathons).toBeDefined();
    expect(Number(data.breakdown.hackathons.revenue)).toBeGreaterThanOrEqual(500);
  });

  // ==========================================
  // MODULE 9: Student Dashboard Integration (No Metric Inflation)
  // ==========================================
  test('Student dashboard displays distinct counters without cross-inflation', async () => {
    const dashRes = await request(app)
      .get('/api/learning/dashboard-summary')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(dashRes.status).toBe(200);
    const data = dashRes.body.data;

    // Student has 0 courses enrolled yet
    expect(data.enrolledCourses).toBe(0);
    // Student has 0 internships accepted yet
    expect(data.activeInternships).toBe(0);

    // Verify student registrations endpoint
    const myHacks = await request(app)
      .get('/api/hackathons/my/registrations')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(myHacks.status).toBe(200);
    expect(Array.isArray(myHacks.body.data)).toBe(true);
    expect(myHacks.body.data.length).toBe(2);
  });
});
