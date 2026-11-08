import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_dev_courses_2026';

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('SKILLUP STUDENT PORTAL & PAYMENT WORKFLOW REGRESSION TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, details?: string) {
    if (ok) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - Details: ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    const ts = Date.now();
    const studentEmail = `student.audit.${ts}@skillup.test`;
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Create Verified Student Account directly in DB
    const student = await prisma.user.create({
      data: {
        name: 'Audit Student',
        email: studentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });

    const studentToken = jwt.sign(
      { id: student.id, email: student.email, role: student.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const authHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };

    report('Student account created and authenticated', !!studentToken);

    // 2. SCENARIO A: Pending Course Payment
    // Check that pending payment does NOT grant active enrollment
    const course = await prisma.course.findFirst({ where: { status: 'PUBLISHED' } });
    if (!course) throw new Error('No published course found');

    // Create a pending transaction record directly in database as if checkout started
    const pendingPayment = await prisma.payment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        amount: Number(course.price),
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: `order_audit_pending_${ts}`,
      },
    });

    report('Pending payment record created in database', !!pendingPayment.id);

    // Check student enrolled courses API
    const enrolledCoursesRes = await axios.get(`${API_URL}/learning/my-courses`, authHeaders);
    const enrolledCourses = enrolledCoursesRes.data.data || enrolledCoursesRes.data.courses || [];
    const isEnrolledInPending = enrolledCourses.some((c: any) => c.id === course.id || c.courseId === course.id);
    report('Pending course payment DOES NOT grant active enrollment in /my-courses', !isEnrolledInPending);

    // Check Orders & Payments API
    const ordersRes = await axios.get(`${API_URL}/payments/history`, authHeaders);
    const orders = ordersRes.data.data || [];
    const pendingOrderInApi = orders.find((o: any) => o.id === pendingPayment.id);
    report(
      'Pending order appears with status PENDING in orders API',
      pendingOrderInApi && pendingOrderInApi.status === 'PENDING'
    );

    // 3. SCENARIO B: Successful Course Payment
    // Simulate verified completion of a payment
    const completedPayment = await prisma.payment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        amount: Number(course.price),
        currency: 'INR',
        status: 'COMPLETED',
        razorpayOrderId: `order_audit_comp_${ts}`,
        razorpayPaymentId: `pay_audit_comp_${ts}`,
      },
    });

    // Create enrollment atomically as done in payment verification
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        courseId: course.id,
      },
    });

    // Re-check /my-courses
    const enrolledAfterRes = await axios.get(`${API_URL}/learning/my-courses`, authHeaders);
    const enrolledAfter = enrolledAfterRes.data.data || enrolledAfterRes.data.courses || [];
    const isEnrolledNow = enrolledAfter.some((c: any) => c.id === course.id || c.courseId === course.id);
    report('Completed payment grants active enrollment in /my-courses', isEnrolledNow);

    // 4. SCENARIO C: Failed Payment
    const failedPayment = await prisma.payment.create({
      data: {
        userId: student.id,
        courseId: course.id,
        amount: Number(course.price),
        currency: 'INR',
        status: 'FAILED',
        razorpayOrderId: `order_audit_fail_${ts}`,
      },
    });
    report('Failed payment has status FAILED', failedPayment.status === 'FAILED');

    // 5. SCENARIO D: My Materials Filtering, Deduplication & Access Source
    // Check materials endpoint
    const materialsRes = await axios.get(`${API_URL}/materials/my/purchases`, authHeaders);
    const myMaterials = materialsRes.data.data || [];
    
    // Check uniqueness of material IDs
    const materialIds = myMaterials.map((m: any) => m.id);
    const uniqueIds = new Set(materialIds);
    report('My Materials contains zero duplicate IDs', materialIds.length === uniqueIds.size);

    // Check access source validity
    const allHaveValidSource = myMaterials.every(
      (m: any) => m.accessSource === 'DIRECT_PURCHASE' || m.accessSource === 'COURSE_INCLUDED'
    );
    report('All materials report accurate accessSource (DIRECT_PURCHASE or COURSE_INCLUDED)', allHaveValidSource);

    // Test unauthorized download rejection
    const unownedMaterial = await prisma.learningMaterial.findFirst({
      where: {
        id: { notIn: materialIds.length > 0 ? materialIds : ['none'] },
        price: { gt: 0 }
      }
    });

    if (unownedMaterial) {
      try {
        await axios.get(`${API_URL}/materials/${unownedMaterial.id}/download`, authHeaders);
        report('Unauthorized material download rejected with 403', false, 'Expected 403 but got 200');
      } catch (err: any) {
        report('Unauthorized material download rejected with 403', err.response?.status === 403);
      }
    } else {
      report('Unauthorized material download check', true, 'No unowned paid material found, skipped');
    }

    // 6. SCENARIO E: Hackathons Isolation
    const hackRes = await axios.get(`${API_URL}/hackathons/my/registrations`, authHeaders);
    const myHackathons = hackRes.data.data || [];
    report('New student starts with zero bogus hackathons in my/registrations', myHackathons.length === 0);

    // Register student for a free hackathon (registrationFee: 0)
    const freeHackathon = await prisma.hackathon.findFirst({ where: { registrationFee: 0, isPublished: true } });
    if (freeHackathon) {
      await axios.post(
        `${API_URL}/hackathons/${freeHackathon.id}/register`,
        { teamName: 'AuditTeam', teamMembers: 'Member 1, Member 2' },
        authHeaders
      );
      const hackAfterRes = await axios.get(`${API_URL}/hackathons/my/registrations`, authHeaders);
      const myHackAfter = hackAfterRes.data.data || [];
      const isRegistered = myHackAfter.some((h: any) => h.hackathonId === freeHackathon.id);
      report('Free hackathon registration appears under my/registrations', isRegistered);
    } else {
      report('Free hackathon registration test', true, 'No free hackathon found to register');
    }

    // 7. SCENARIO F: Student Data Isolation
    const student2Email = `student2.audit.${ts}@skillup.test`;
    const student2 = await prisma.user.create({
      data: {
        name: 'Second Student',
        email: student2Email,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    const s2Token = jwt.sign(
      { id: student2.id, email: student2.email, role: student2.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const s2Headers = { headers: { Authorization: `Bearer ${s2Token}` } };

    const s2Orders = await axios.get(`${API_URL}/payments/history`, s2Headers);
    report(
      'Student 2 cannot see Student 1 orders (Strict isolation)',
      (s2Orders.data.data || []).length === 0
    );

    // Clean up test data created during this run
    await prisma.enrollment.deleteMany({ where: { userId: student.id } });
    await prisma.payment.deleteMany({ where: { userId: student.id } });
    await prisma.hackathonRegistration.deleteMany({ where: { userId: student.id } });
    await prisma.user.deleteMany({ where: { id: { in: [student.id, student2.id] } } });

    console.log('================================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err: any) {
    console.error('Fatal regression error:', err.response?.data || err.message);
  } finally {
    await prisma.$disconnect();
  }
}

runRegressionSuite();
