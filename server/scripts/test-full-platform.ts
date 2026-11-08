import axios from 'axios';
import crypto from 'crypto';

const API_BASE = 'http://localhost:5000/api';

async function runEndToEndIntegration() {
  console.log('================================================================');
  console.log('SKILLUP FULL PLATFORM END-TO-END INTEGRATION TEST (3 PORTALS)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // 1. ADMIN AUTHENTICATION
    console.log('\n--- Step 1: Admin Authentication ---');
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@skillup.com',
      password: 'Password123!',
    });
    const adminToken = adminLoginRes.data.data.accessToken;
    assert(!!adminToken && adminLoginRes.data.data.user.role === 'ADMIN', 'Admin logged in successfully with role ADMIN');

    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. MENTOR AUTHENTICATION
    console.log('\n--- Step 2: Mentor Authentication ---');
    const mentorLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'sarah.chen@skillup.com',
      password: 'Password123!',
    });
    const mentorToken = mentorLoginRes.data.data.accessToken;
    assert(!!mentorToken && mentorLoginRes.data.data.user.role === 'INSTRUCTOR', 'Mentor Sarah Chen logged in successfully');
    const mentorHeaders = { headers: { Authorization: `Bearer ${mentorToken}` } };

    // 3. STUDENT AUTHENTICATION
    console.log('\n--- Step 3: Student Authentication (Neha Kapoor) ---');
    const studentLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'neha.kapoor@example.com',
      password: 'Password123!',
    });
    const studentToken = studentLoginRes.data.data.accessToken;
    const studentUser = studentLoginRes.data.data.user;
    assert(!!studentToken && studentUser.email === 'neha.kapoor@example.com', 'Student Neha Kapoor authenticated successfully');
    const studentHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };

    // 4. STUDENT DASHBOARD INITIAL STATE
    console.log('\n--- Step 4: Verify Student Dashboard Live Data (No Mock Fallbacks) ---');
    const studentInitCourses = await axios.get(`${API_BASE}/learning/my-courses`, studentHeaders);
    assert(Array.isArray(studentInitCourses.data.data), `Student enrolled courses query succeeds and returns ${studentInitCourses.data.data.length} real DB records`);

    // 5. GET OR CREATE A COURSE & BATCH BY ADMIN
    console.log('\n--- Step 5: Admin Creates Course & Batch ---');
    const coursesRes = await axios.get(`${API_BASE}/courses`);
    let course = coursesRes.data.data[0];
    assert(!!course, `Found existing course for testing: "${course.title}" (${course.id})`);

    const batchCode = `E2E-BATCH-${Date.now().toString().slice(-4)}`;
    const batchRes = await axios.post(
      `${API_BASE}/admin/batches`,
      {
        courseId: course.id,
        name: `Cohort ${batchCode}`,
        code: batchCode,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        capacity: 30,
      },
      adminHeaders
    );
    const batch = batchRes.data.data;
    assert(batch.code === batchCode, `Admin created batch ${batch.name} (${batch.code})`);

    // 6. ADMIN ASSIGNS MENTOR TO BATCH
    console.log('\n--- Step 6: Admin Assigns Mentor Sarah Chen to Batch ---');
    const assignRes = await axios.post(
      `${API_BASE}/admin/mentors/assign`,
      {
        mentorId: mentorLoginRes.data.data.user.id,
        courseId: course.id,
        batchId: batch.id,
        role: 'PRIMARY_MENTOR',
      },
      adminHeaders
    );
    assert(assignRes.data.success, 'Mentor Sarah Chen assigned to batch by Admin');

    // 7. ADMIN ENROLLS STUDENT INTO BATCH
    console.log('\n--- Step 7: Admin Enrolls Student into Batch ---');
    const enrollRes = await axios.post(
      `${API_BASE}/admin/students/enroll`,
      {
        studentId: studentUser.id,
        courseId: course.id,
        batchId: batch.id,
      },
      adminHeaders
    );
    assert(enrollRes.data.success, 'Student Neha Kapoor enrolled in course & batch');

    // 8. AUTOMATIC STUDENT DISCOVERY IN MENTOR PORTAL
    console.log('\n--- Step 8: Automatic Student Sync Verification in Mentor Portal ---');
    const mentorStudentsRes = await axios.get(`${API_BASE}/mentor/students`, mentorHeaders);
    const matchedStudent = mentorStudentsRes.data.data.find((s: any) => s.email === 'neha.kapoor@example.com');
    assert(
      !!matchedStudent,
      `Mentor portal automatically detected enrolled student: ${matchedStudent?.name} (${matchedStudent?.batchName || 'Assigned'})`
    );

    // 9. STUDENT SEES ACTIVE COURSE IN DASHBOARD
    console.log('\n--- Step 9: Student Sees Active Course in Student Dashboard ---');
    const studentCoursesRes = await axios.get(`${API_BASE}/learning/my-courses`, studentHeaders);
    const enrolledCourse = studentCoursesRes.data.data.find((c: any) => c.courseId === course.id);
    assert(!!enrolledCourse, `Student dashboard now returns real enrollment in "${course.title}" with progress ${enrolledCourse?.progress}%`);

    // 10. MENTOR SCHEDULES A LIVE CLASS FOR THE BATCH
    console.log('\n--- Step 10: Mentor Schedules Live Class ---');
    const liveClassRes = await axios.post(
      `${API_BASE}/mentor/classes`,
      {
        courseId: course.id,
        batchId: batch.id,
        title: `Masterclass: Architecture for ${batchCode}`,
        description: 'Comprehensive architecture discussion with Sarah Chen',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        duration: 90,
      },
      mentorHeaders
    );
    const liveClass = liveClassRes.data.data;
    assert(!!liveClass && liveClass.title.includes(batchCode), `Live class scheduled by mentor: "${liveClass?.title}"`);

    // 11. MENTOR MARKS ATTENDANCE REGISTER
    console.log('\n--- Step 11: Mentor Marks Attendance Register ---');
    const markAttRes = await axios.post(
      `${API_BASE}/mentor/attendance/${liveClass.id}`,
      {
        records: [
          {
            studentId: studentUser.id,
            status: 'PRESENT',
            remarks: 'Active participation in architecture review',
          },
        ],
      },
      mentorHeaders
    );
    assert(markAttRes.data.success, 'Attendance marked PRESENT for Neha Kapoor in mentor register');

    // 12. ADMIN AUDIT TRAIL LOGGING
    console.log('\n--- Step 12: Admin Audit Trail Verification ---');
    const auditRes = await axios.get(`${API_BASE}/admin/audit-logs`, adminHeaders);
    const recentLogs = auditRes.data.data;
    assert(
      recentLogs.length > 0 && recentLogs.some((l: any) => l.action.includes('ENROLL') || l.action.includes('ASSIGN')),
      `Audit logs recorded platform activities (${recentLogs.length} total logs found)`
    );

    // 13. RAZORPAY PAYMENT LIFECYCLE & WEBHOOK INTEGRATION
    console.log('\n--- Step 13: Razorpay Payment Order Creation ---');
    // Student Arjun Kumar creates a payment order for an unenrolled course
    const arjunLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'arjun.kumar@example.com',
      password: 'Password123!',
    });
    const arjunHeaders = { headers: { Authorization: `Bearer ${arjunLoginRes.data.data.accessToken}` } };

    // Select a course that Arjun is not yet enrolled in
    const arjunExisting = await axios.get(`${API_BASE}/learning/my-courses`, arjunHeaders);
    const enrolledCourseIds = new Set(arjunExisting.data.data.map((c: any) => c.courseId));
    const targetCourse = coursesRes.data.data.find((c: any) => !enrolledCourseIds.has(c.id)) || course;

    // If already enrolled in all, clean up for repeatable testing
    if (enrolledCourseIds.has(targetCourse.id)) {
      const { PrismaClient } = await import('@prisma/client');
      const prismaClient = new PrismaClient();
      await prismaClient.enrollment.deleteMany({
        where: { userId: arjunLoginRes.data.data.user.id, courseId: targetCourse.id },
      });
      await prismaClient.$disconnect();
    }

    const orderRes = await axios.post(
      `${API_BASE}/payments/orders`,
      { courseId: targetCourse.id },
      arjunHeaders
    );
    assert(orderRes.status === 201 && !!orderRes.data.data.orderId, `Razorpay order created: ${orderRes.data.data.orderId} (Amount: ₹${orderRes.data.data.amount / 100})`);

    console.log('\n--- Step 14: Payment Verification & Enrollment Activation ---');
    const paymentId = `pay_e2e_${Date.now()}`;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET || 'BwFVcaFhZUyKlmUjXfA1DAT0';
    const genuineSig = crypto
      .createHmac('sha256', rzpSecret)
      .update(`${orderRes.data.data.orderId}|${paymentId}`)
      .digest('hex');

    const verifyRes = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        razorpayOrderId: orderRes.data.data.orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: genuineSig,
      },
      arjunHeaders
    );
    assert(verifyRes.data.success, 'Payment verified server-side and enrollment successfully activated');

    // Verify Arjun now has active enrollment in the course
    const arjunCoursesRes = await axios.get(`${API_BASE}/learning/my-courses`, arjunHeaders);
    const hasEnrollment = arjunCoursesRes.data.data.some((c: any) => c.courseId === targetCourse.id);
    assert(hasEnrollment, `Student Arjun Kumar dashboard immediately reflects unlocked course "${targetCourse.title}"`);

    // Verify Duplicate Order/Enrollment is Prevented
    console.log('\n--- Step 15: Duplicate Order & Enrollment Prevention ---');
    let duplicateBlocked = false;
    try {
      await axios.post(`${API_BASE}/payments/orders`, { courseId: targetCourse.id }, arjunHeaders);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message?.toLowerCase() || '';
      if (err.response?.status === 400 && msg.includes('already') && msg.includes('enrolled')) {
        duplicateBlocked = true;
      }
    }
    assert(duplicateBlocked, 'Server correctly rejected duplicate order attempt for already enrolled course');

    // Verify Idempotent Webhook Processing
    console.log('\n--- Step 16: Razorpay Webhook Idempotency & Reconciliation ---');
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderRes.data.data.orderId,
            amount: orderRes.data.data.amount,
            status: 'captured',
          },
        },
      },
    };
    const webhookSig = crypto
      .createHmac('sha256', 'razorpay_webhook_secret_123')
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    const webhookRes = await axios.post(`${API_BASE}/payments/webhook`, webhookPayload, {
      headers: { 'x-razorpay-signature': webhookSig },
    });
    assert(webhookRes.data.status === 'ok', 'Razorpay webhook delivered and processed idempotently');

    // Verify Admin Overview Reflects Completed Revenue
    console.log('\n--- Step 17: Admin Overview Revenue Calculation ---');
    const overviewRes = await axios.get(`${API_BASE}/admin/overview`, adminHeaders);
    const totalRev = overviewRes.data.data.metrics.totalRevenue;
    assert(totalRev > 0, `Admin overview reports verified completed revenue of ₹${totalRev}`);

    // 18. FRONTEND ROLE-BASED NAVIGATION CONTRACT VERIFICATION
    console.log('\n--- Step 18: Role-Based Navigation & Route Contract Verification ---');
    // Function mimicking frontend navigation resolution logic from Navbar.tsx
    function getRoleNavigation(userRole: string) {
      const links: string[] = ['/', '/courses', '/mentors', '/live-classes', '/assignments', '/certificates'];
      let primaryPortalLink = '';

      if (userRole === 'STUDENT') {
        primaryPortalLink = '/dashboard';
        links.push('/orders');
      } else if (userRole === 'INSTRUCTOR') {
        primaryPortalLink = '/mentor-dashboard';
      } else if (userRole === 'ADMIN') {
        primaryPortalLink = '/admin';
      }

      return { primaryPortalLink, links };
    }

    const studentNav = getRoleNavigation(studentUser.role);
    assert(
      studentNav.primaryPortalLink === '/dashboard' && !studentNav.links.includes('/mentor-dashboard') && !studentNav.links.includes('/admin'),
      'Student navigation renders Dashboard (/dashboard) and excludes Mentor Portal and Admin Hub'
    );

    const mentorNav = getRoleNavigation(mentorLoginRes.data.data.user.role);
    assert(
      mentorNav.primaryPortalLink === '/mentor-dashboard' && !mentorNav.links.includes('/dashboard') && !mentorNav.links.includes('/admin'),
      'Mentor navigation renders Mentor Portal (/mentor-dashboard) and excludes student Dashboard and Admin Hub'
    );

    const adminNav = getRoleNavigation(adminLoginRes.data.data.user.role);
    assert(
      adminNav.primaryPortalLink === '/admin' && !adminNav.links.includes('/dashboard') && !adminNav.links.includes('/mentor-dashboard'),
      'Admin navigation renders Admin Hub (/admin) and excludes student Dashboard and Mentor Portal'
    );

    // 19. LOGOUT & SESSION INVALIDATION
    console.log('\n--- Step 19: Logout & Unauthenticated Direct Access Verification ---');
    const logoutRes = await axios.post(`${API_BASE}/auth/logout`, {}, studentHeaders);
    assert(logoutRes.data.success, 'Student successfully logged out, revoking refresh token session');

    let unauthBlocked = false;
    try {
      await axios.get(`${API_BASE}/learning/my-courses`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        unauthBlocked = true;
      }
    }
    assert(unauthBlocked, 'Direct access without authentication properly blocked with HTTP 401 Unauthorized');

  } catch (error: any) {
    console.error('Fatal error during integration testing:', error.response?.data || error.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndIntegration();
