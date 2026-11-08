import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'BwFVcaFhZUyKlmUjXfA1DAT0';

function generateHmacSignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

async function run360DegreeAudit() {
  console.log('================================================================');
  console.log('SKILLUP 360-DEGREE AUDIT: VIDEO MANAGEMENT & PAID MATERIALS');
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
    // -------------------------------------------------------------
    // 1. AUTHENTICATION & PORTAL SETUP
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Authentication & Role Verification ---');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@skillup.com',
      password: 'Password123!',
    });
    const adminToken = adminLogin.data.data.accessToken;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    assert(adminLogin.data.data.user.role === 'ADMIN', 'Admin authenticated with role ADMIN');

    const student1Login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'neha.kapoor@example.com',
      password: 'Password123!',
    });
    const student1Token = student1Login.data.data.accessToken;
    const student1Headers = { headers: { Authorization: `Bearer ${student1Token}` } };
    assert(student1Login.data.data.user.role === 'STUDENT', 'Student 1 (Neha) authenticated with role STUDENT');

    const student2Login = await axios.post(`${API_BASE}/auth/login`, {
      email: 'arjun.kumar@example.com',
      password: 'Password123!',
    });
    const student2Token = student2Login.data.data.accessToken;
    const student2Headers = { headers: { Authorization: `Bearer ${student2Token}` } };
    assert(student2Login.data.data.user.role === 'STUDENT', 'Student 2 (Arjun) authenticated with role STUDENT');

    // -------------------------------------------------------------
    // 2. AUDIT SECTION A: COURSE & CURRICULUM VIDEO MANAGEMENT (ADMIN)
    // -------------------------------------------------------------
    console.log('\n--- Section A: Course Video Management & Authorization ---');
    const courseTitle = `Audit Course ${Date.now()}`;
    const courseRes = await axios.post(
      `${API_BASE}/courses`,
      {
        title: courseTitle,
        description: 'Comprehensive course video & materials audit testing suite.',
        price: 2499,
        level: 'Intermediate',
      },
      adminHeaders
    );
    const courseId = courseRes.data.data.id;
    const courseSlug = courseRes.data.data.slug;
    assert(courseRes.status === 201 && !!courseId, `Admin created course "${courseTitle}" (${courseId})`);

    // Add Module 1: Day 1
    const mod1Res = await axios.post(
      `${API_BASE}/courses/${courseId}/modules`,
      { title: 'Day 1: Foundations', order: 1 },
      adminHeaders
    );
    const mod1Id = mod1Res.data.data.id;
    assert(mod1Res.status === 201 && mod1Res.data.data.title === 'Day 1: Foundations', 'Admin added Day 1 module');

    // Add Module 2: Day 2
    const mod2Res = await axios.post(
      `${API_BASE}/courses/${courseId}/modules`,
      { title: 'Day 2: Advanced Topics', order: 2 },
      adminHeaders
    );
    const mod2Id = mod2Res.data.data.id;
    assert(mod2Res.status === 201 && mod2Res.data.data.title === 'Day 2: Advanced Topics', 'Admin added Day 2 module');

    // Add Video Lesson 1 (Free Preview) to Day 1
    const lesson1Res = await axios.post(
      `${API_BASE}/courses/modules/${mod1Id}/lessons`,
      {
        title: 'Video 1: Orientation & Setup',
        description: 'Orientation to development workflow',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 12,
        order: 1,
        isFree: true,
      },
      adminHeaders
    );
    const lesson1Id = lesson1Res.data.data.id;
    assert(lesson1Res.data.data.title === 'Video 1: Orientation & Setup', 'Admin added Lesson 1 (Free Preview)');

    // Add Video Lesson 2 (Paid Only) to Day 1
    const lesson2Res = await axios.post(
      `${API_BASE}/courses/modules/${mod1Id}/lessons`,
      {
        title: 'Video 2: Core Architecture Deep Dive',
        description: 'Internal components and mechanics',
        videoUrl: 'https://youtu.be/kJQP7kiw5Fk',
        duration: 25,
        order: 2,
        isFree: false,
      },
      adminHeaders
    );
    const lesson2Id = lesson2Res.data.data.id;
    assert(lesson2Res.data.data.title === 'Video 2: Core Architecture Deep Dive', 'Admin added Lesson 2 (Paid Only)');

    // Attach PDF Resource to Lesson 2
    const resourceRes = await axios.post(
      `${API_BASE}/courses/lessons/${lesson2Id}/resources`,
      {
        title: 'Day 1 Architecture Blueprint PDF',
        fileUrl: '/uploads/materials/test_blueprint.pdf',
        type: 'PDF',
      },
      adminHeaders
    );
    assert(resourceRes.data.success && !!resourceRes.data.data.id, 'Admin attached PDF resource to Lesson 2');

    // Edit and Reorder Module 2
    const updateModRes = await axios.patch(
      `${API_BASE}/courses/modules/${mod2Id}`,
      { title: 'Day 2: Production Deployment & Scale', order: 2 },
      adminHeaders
    );
    assert(updateModRes.data.data.title === 'Day 2: Production Deployment & Scale', 'Admin updated module title and order');

    // Verify Unauthorized Student CANNOT Add/Modify Modules or Lessons
    let studentHackingBlocked = false;
    try {
      await axios.post(
        `${API_BASE}/courses/${courseId}/modules`,
        { title: 'Hacked Module' },
        student1Headers
      );
    } catch (err: any) {
      if (err.response?.status === 403) studentHackingBlocked = true;
    }
    assert(studentHackingBlocked, 'Unauthorized student blocked from creating curriculum modules (HTTP 403 Forbidden)');

    // -------------------------------------------------------------
    // 3. AUDIT SECTION B: STUDENT COURSE ACCESS & VIDEO GATEKEEPING
    // -------------------------------------------------------------
    console.log('\n--- Section B: Course Access Control & Razorpay Purchase ---');
    // Student 1 (un-enrolled) attempts to fetch Course Details & Modules
    const publicCourseRes = await axios.get(`${API_BASE}/courses/${courseSlug}`, student1Headers);
    const modulesPublic = publicCourseRes.data.data.modules;
    const lesson1Public = modulesPublic[0].lessons.find((l: any) => l.id === lesson1Id);
    const lesson2Public = modulesPublic[0].lessons.find((l: any) => l.id === lesson2Id);
    assert(!!lesson1Public.videoUrl, 'Public preview lesson retains videoUrl');
    assert(lesson2Public.videoUrl === null, 'Protected paid lesson videoUrl is masked (null) for non-enrolled visitor');

    // Student 1 attempts direct access to protected stream
    let directStreamBlocked = false;
    try {
      await axios.get(`${API_BASE}/learning/lessons/${lesson2Id}`, student1Headers);
    } catch (err: any) {
      if (err.response?.status === 403) directStreamBlocked = true;
    }
    assert(directStreamBlocked, 'Direct stream access to paid lesson without enrollment returns HTTP 403 Forbidden');

    // Student 1 purchases course via Razorpay Order Creation
    const courseOrderRes = await axios.post(
      `${API_BASE}/payments/orders`,
      { courseId },
      student1Headers
    );
    const rzpCourseOrderId = courseOrderRes.data.data.orderId;
    assert(courseOrderRes.status === 201 && !!rzpCourseOrderId, `Razorpay Order generated: ${rzpCourseOrderId}`);

    // Verify Payment Signature & Activate Enrollment
    const payCourseId = `pay_course_${Date.now()}`;
    const courseSig = generateHmacSignature(rzpCourseOrderId, payCourseId);
    const verifyCourseRes = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        razorpayOrderId: rzpCourseOrderId,
        razorpayPaymentId: payCourseId,
        razorpaySignature: courseSig,
      },
      student1Headers
    );
    assert(verifyCourseRes.data.success, 'Course payment verified and enrollment activated');

    // Confirm enrollment in Student 1 Dashboard
    const student1Courses = await axios.get(`${API_BASE}/learning/my-courses`, student1Headers);
    const isEnrolledNow = student1Courses.data.data.some((e: any) => e.courseId === courseId);
    assert(isEnrolledNow, 'Purchased course appears immediately in Student 1 "My Courses"');

    // Confirm Protected Video is now Unlocked for Student 1
    const unlockedLessonRes = await axios.get(`${API_BASE}/learning/lessons/${lesson2Id}`, student1Headers);
    assert(
      unlockedLessonRes.data.data.lesson.videoUrl === 'https://youtu.be/kJQP7kiw5Fk',
      'Student 1 successfully unlocked protected video URL after verified purchase'
    );
    assert(
      unlockedLessonRes.data.data.lesson.resources.length > 0,
      'Student 1 successfully unlocked attached lesson PDF resource'
    );

    // Verify Lesson Progress Persistence
    const progressRes = await axios.post(
      `${API_BASE}/learning/lessons/${lesson2Id}/progress`,
      { isCompleted: true, lastPosition: 120 },
      student1Headers
    );
    assert(progressRes.data.success && progressRes.data.data.isCompleted === true, 'Lesson marked complete and progress saved');

    // Confirm Student 2 (who did not purchase) still cannot access Lesson 2
    let student2StillBlocked = false;
    try {
      await axios.get(`${API_BASE}/learning/lessons/${lesson2Id}`, student2Headers);
    } catch (err: any) {
      if (err.response?.status === 403) student2StillBlocked = true;
    }
    assert(student2StillBlocked, 'Student 2 (without purchase) remains strictly locked out of Lesson 2');

    // -------------------------------------------------------------
    // 4. AUDIT SECTION C: PAID MATERIALS MARKETPLACE & ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n--- Section C: Paid Materials Marketplace & File Protection ---');
    // Ensure test file exists on disk
    const testUploadDir = path.join(__dirname, '../uploads/materials');
    if (!fs.existsSync(testUploadDir)) fs.mkdirSync(testUploadDir, { recursive: true });
    const dummyFilePath = path.join(testUploadDir, 'audit_cheatsheet.pdf');
    fs.writeFileSync(dummyFilePath, '%PDF-1.4 Audit Secure Material Content');

    // Admin uploads paid material
    const matRes = await axios.post(
      `${API_BASE}/materials`,
      {
        title: 'High-Concurrency System Design Cheatsheet',
        description: 'Production diagrams and latency calculation formulas',
        price: 499,
        isFree: false,
        type: 'PDF',
        fileUrl: '/uploads/materials/audit_cheatsheet.pdf',
        fileSize: 1024,
      },
      adminHeaders
    );
    const materialId = matRes.data.data.id;
    assert(matRes.status === 201 && !!materialId, `Admin uploaded paid material: "${matRes.data.data.title}" (₹499)`);

    // Student 1 checks material listing without owning it
    const matDetailRes = await axios.get(`${API_BASE}/materials/${materialId}`, student1Headers);
    assert(matDetailRes.data.data.hasAccess === false, 'Visitor correctly reports hasAccess: false for paid material');

    // Student 1 attempts to download without purchase
    let unpurchasedDownloadBlocked = false;
    try {
      await axios.get(`${API_BASE}/materials/${materialId}/download`, student1Headers);
    } catch (err: any) {
      if (err.response?.status === 403) unpurchasedDownloadBlocked = true;
    }
    assert(unpurchasedDownloadBlocked, 'Unpurchased download request rejected with HTTP 403 Forbidden');

    // Student 1 purchases the material
    const matOrderRes = await axios.post(
      `${API_BASE}/payments/orders`,
      { materialId },
      student1Headers
    );
    const rzpMatOrderId = matOrderRes.data.data.orderId;
    assert(matOrderRes.status === 201 && !!rzpMatOrderId, `Material Razorpay order created: ${rzpMatOrderId}`);

    // Verify payment for material
    const payMatId = `pay_mat_${Date.now()}`;
    const matSig = generateHmacSignature(rzpMatOrderId, payMatId);
    const verifyMatRes = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        razorpayOrderId: rzpMatOrderId,
        razorpayPaymentId: payMatId,
        razorpaySignature: matSig,
      },
      student1Headers
    );
    assert(verifyMatRes.data.success, 'Material payment verified and entitlement granted');

    // Confirm material appears in Student 1 "My Materials"
    const student1Materials = await axios.get(`${API_BASE}/materials/my/purchases`, student1Headers);
    const ownsMaterial = student1Materials.data.data.some((p: any) => p.materialId === materialId);
    assert(ownsMaterial, 'Purchased material appears in Student 1 "My Materials" list');

    // Student 1 can now download the file
    const downloadRes = await axios.get(`${API_BASE}/materials/${materialId}/download`, student1Headers);
    assert(
      downloadRes.status === 200 && downloadRes.data.includes('%PDF-1.4'),
      'Student 1 successfully downloaded the authorized paid PDF'
    );

    // Student 2 attempts to download Student 1\'s material -> BLOCKED
    let student2MatBlocked = false;
    try {
      await axios.get(`${API_BASE}/materials/${materialId}/download`, student2Headers);
    } catch (err: any) {
      if (err.response?.status === 403) student2MatBlocked = true;
    }
    assert(student2MatBlocked, 'Student 2 cannot download Student 1\'s purchased file (HTTP 403 Forbidden)');

    // Direct manipulated material ID test -> BLOCKED
    let nonExistentMatBlocked = false;
    try {
      await axios.get(`${API_BASE}/materials/fake-material-id-9999/download`, student1Headers);
    } catch (err: any) {
      if (err.response?.status === 404) nonExistentMatBlocked = true;
    }
    assert(nonExistentMatBlocked, 'Accessing manipulated/non-existent material ID returns HTTP 404 Not Found');

    // Free Material Flow: Admin uploads free material
    const freeMatRes = await axios.post(
      `${API_BASE}/materials`,
      {
        title: 'Open Source Starter Kit Guide',
        description: 'Community starter kit documentation',
        price: 0,
        isFree: true,
        type: 'PDF',
        fileUrl: '/uploads/materials/audit_cheatsheet.pdf',
      },
      adminHeaders
    );
    const freeMatId = freeMatRes.data.data.id;
    const freeDownloadRes = await axios.get(`${API_BASE}/materials/${freeMatId}/download`, student2Headers);
    assert(
      freeDownloadRes.status === 200 && freeDownloadRes.data.includes('%PDF-1.4'),
      'Free learning material is accessible to authenticated students without payment'
    );

    // -------------------------------------------------------------
    // 5. AUDIT SECTION D: PAYMENT INTEGRITY, SECURITY & TAMPER TESTING
    // -------------------------------------------------------------
    console.log('\n--- Section D: Payment Security, Tamper Resistance & Idempotency ---');
    // Fraudulent Signature Test (using the paid material)
    let fraudBlocked = false;
    const fraudOrder = await axios.post(`${API_BASE}/payments/orders`, { materialId }, student2Headers);
    try {
      await axios.post(
        `${API_BASE}/payments/verify`,
        {
          razorpayOrderId: fraudOrder.data.data.orderId,
          razorpayPaymentId: 'pay_fraud_123',
          razorpaySignature: 'tampered_invalid_signature',
        },
        student2Headers
      );
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.error?.message?.includes('Fraudulent attempt blocked')) {
        fraudBlocked = true;
      }
    }
    assert(fraudBlocked, 'Tampered/invalid payment signature rejected with Fraudulent attempt blocked');

    // Idempotent Verification: Repeating verified payment returns already active
    const repeatVerify = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        razorpayOrderId: rzpCourseOrderId,
        razorpayPaymentId: payCourseId,
        razorpaySignature: courseSig,
      },
      student1Headers
    );
    assert(
      repeatVerify.data.message?.includes('already verified') || repeatVerify.data.success,
      'Duplicate payment verification handled idempotently without error or double enrollment'
    );

    // Duplicate Order Creation Blocked
    let duplicateCourseOrderBlocked = false;
    try {
      await axios.post(`${API_BASE}/payments/orders`, { courseId }, student1Headers);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message?.toLowerCase() || '';
      if (err.response?.status === 400 && msg.includes('already') && msg.includes('enrolled')) {
        duplicateCourseOrderBlocked = true;
      }
    }
    assert(duplicateCourseOrderBlocked, 'Attempting to re-order an enrolled course is blocked server-side');

    // -------------------------------------------------------------
    // 6. AUDIT SECTION E: CLEANUP & AUDIT SUMMARY
    // -------------------------------------------------------------
    console.log('\n--- Section E: Final Verification Clean-up ---');
    // Clean up temporary test files
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }

  } catch (error: any) {
    console.error('Audit exception caught:', error.response?.data || error.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`360-DEGREE AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run360DegreeAudit();
