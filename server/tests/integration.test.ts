import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('SkillUp Platform Improvement & Integration Verification', () => {
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let testCourseId: string;
  let testCourseSlug: string;

  beforeAll(async () => {
    // 1. Ensure an Admin user exists
    let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: `admin_test_${Date.now()}@skillup.internal`,
          password: 'Password123!',
          role: 'ADMIN',
          isVerified: true,
        },
      });
    }
    adminToken = jwt.sign({ id: admin.id, role: admin.role }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Ensure a Student user exists
    let student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: 'Arun Kumar',
          email: `arun_student_${Date.now()}@skillup.internal`,
          password: 'Password123!',
          role: 'STUDENT',
          isVerified: true,
        },
      });
    }
    studentId = student.id;
    studentToken = jwt.sign({ id: student.id, role: student.role }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Category
    let cat = await prisma.category.findFirst();
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: 'Full Stack', slug: `full-stack-${Date.now()}` },
      });
    }

    // 4. Create test course with Tamil support and Installment settings
    testCourseSlug = `e2e-tamil-course-${Date.now()}`;
    const course = await prisma.course.create({
      data: {
        title: 'Full Stack Web Development',
        titleTa: 'முழு அடுக்கு வலை மேம்பாடு',
        slug: testCourseSlug,
        description: 'Comprehensive Web Development Masterclass',
        descriptionTa: 'முழுமையான தமிழ் வலை மேம்பாட்டு பாடநெறி',
        price: 2000,
        discountPrice: 1500,
        level: 'All Levels',
        categoryId: cat.id,
        instructorId: admin.id,
        allowInstallments: true,
        minInstallmentAmount: 500,
        installmentCount: 3,
        installmentPolicy: 'RESTRICTED',
      },
    });
    testCourseId = course.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.notification.deleteMany({ where: { userId: studentId } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { courseId: testCourseId } }).catch(() => {});
    await prisma.enrollment.deleteMany({ where: { courseId: testCourseId } }).catch(() => {});
    await prisma.course.deleteMany({ where: { id: testCourseId } }).catch(() => {});
    await prisma.$disconnect();
  });

  // Scenario A: Tamil Content Persistence and API Delivery
  test('Scenario A: Course returns Tamil title and description alongside English', async () => {
    const res = await request(app)
      .get(`/api/courses/${testCourseSlug}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Full Stack Web Development');
    expect(res.body.data.titleTa).toBe('முழு அடுக்கு வலை மேம்பாடு');
    expect(res.body.data.descriptionTa).toBe('முழுமையான தமிழ் வலை மேம்பாட்டு பாடநெறி');
    expect(res.body.data.allowInstallments).toBe(true);
    expect(Number(res.body.data.minInstallmentAmount)).toBe(500);
  });

  // Scenario B: Order Validation - Rejection of below-minimum partial payment
  test('Scenario B: Custom payment below configured minimum is rejected with clear message', async () => {
    const res = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: testCourseId,
        isPartial: true,
        customAmount: 300, // Below min of 500
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/The minimum initial payment for this course is ₹500/);
  });

  // Scenario C: Custom/Partial Payment order creation and verification
  test('Scenario C: Valid partial payment creates correct order and tracks remaining balance', async () => {
    // 1. Create Partial Order
    const orderRes = await request(app)
      .post('/api/payments/orders')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: testCourseId,
        isPartial: true,
        customAmount: 600, // Valid (>= 500)
      })
      .expect(201);

    expect(orderRes.body.success).toBe(true);
    expect(orderRes.body.data.amount).toBe(600 * 100); // 60000 paise
    expect(orderRes.body.data.isPartial).toBe(true);
    expect(orderRes.body.data.remainingBalance).toBe(900); // 1500 - 600 = 900
    expect(orderRes.body.data.totalCoursePrice).toBe(1500);

    const paymentRecord = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderRes.body.data.orderId },
    });
    expect(paymentRecord).toBeTruthy();
    expect(paymentRecord?.isPartial).toBe(true);
    expect(Number(paymentRecord?.remainingBalance)).toBe(900);
  });

  // Scenario D: Admin telemetry separates actual revenue from outstanding balance
  test('Scenario D: Admin overview distinguishes collected money from unpaid balance', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toHaveProperty('actualCollectedRevenue');
    expect(res.body.data.metrics).toHaveProperty('outstandingBalance');
    expect(typeof res.body.data.metrics.actualCollectedRevenue).toBe('number');
    expect(typeof res.body.data.metrics.outstandingBalance).toBe('number');
  });
});
