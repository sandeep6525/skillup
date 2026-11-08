import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_dev_courses_2026';

async function runStudentVerification() {
  console.log('========================================================================');
  console.log('SKILLUP COMPLETE STUDENT WORKFLOW VERIFICATION (ASSIGNMENTS, MATERIALS, DASHBOARD)');
  console.log('========================================================================');

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

  const ts = Date.now();
  const passwordHash = await bcrypt.hash('Password@123', 10);

  try {
    // 0. Setup Instructor & Two Courses
    const instructor = await prisma.user.create({
      data: {
        name: `Instructor Test ${ts}`,
        email: `instructor.${ts}@skillup.test`,
        password: passwordHash,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });

    const course1 = await prisma.course.create({
      data: {
        title: `Full-Stack Web Dev ${ts}`,
        slug: `fs-web-dev-${ts}`,
        description: 'React, Node, TypeScript course',
        price: 4999,
        status: 'PUBLISHED',
        instructorId: instructor.id,
      },
    });

    const course2 = await prisma.course.create({
      data: {
        title: `Python Data Science ${ts}`,
        slug: `python-ds-${ts}`,
        description: 'Python ML course',
        price: 3999,
        status: 'PUBLISHED',
        instructorId: instructor.id,
      },
    });

    // Create assignments:
    // Assignment 1 & 2 belong to Course 1
    const assign1 = await prisma.assignment.create({
      data: {
        title: `React Dashboard Capstone ${ts}`,
        description: 'Build a responsive student portal in React',
        totalPoints: 100,
        courseId: course1.id,
      },
    });

    const assign2 = await prisma.assignment.create({
      data: {
        title: `Node Express API Project ${ts}`,
        description: 'Design RESTful API with validation',
        totalPoints: 50,
        courseId: course1.id,
      },
    });

    // Assignment 3 belongs to Course 2 (Python)
    const assign3 = await prisma.assignment.create({
      data: {
        title: `Python Pandas Data Wrangling ${ts}`,
        description: 'Clean dataset using pandas',
        totalPoints: 100,
        courseId: course2.id,
      },
    });

    // Create 2 Materials:
    // Material 1: course-included in Course 1
    const material1 = await prisma.learningMaterial.create({
      data: {
        title: `Full-Stack Architecture Handbook ${ts}`,
        description: 'System design PDF for Course 1',
        fileUrl: 'https://skillup-storage.test/handbook.pdf',
        type: 'PDF',
        fileSize: 102400,
        isFree: false,
        price: 499,
        courseId: course1.id,
        uploaderId: instructor.id,
      },
    });

    // Material 2: standalone paid material
    const material2 = await prisma.learningMaterial.create({
      data: {
        title: `Advanced Algorithm Cheatsheet ${ts}`,
        description: 'Standalone paid resource',
        fileUrl: 'https://skillup-storage.test/algorithms.pdf',
        type: 'PDF',
        fileSize: 51200,
        isFree: false,
        price: 299,
        uploaderId: instructor.id,
      },
    });

    // 1. Create Student A and Student B
    const studentA = await prisma.user.create({
      data: {
        name: `Student A ${ts}`,
        email: `studentA.${ts}@skillup.test`,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });

    const studentB = await prisma.user.create({
      data: {
        name: `Student B (Newbie) ${ts}`,
        email: `studentB.${ts}@skillup.test`,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });

    const tokenA = jwt.sign({ id: studentA.id, email: studentA.email, role: studentA.role }, JWT_SECRET, { expiresIn: '1d' });
    const tokenB = jwt.sign({ id: studentB.id, email: studentB.email, role: studentB.role }, JWT_SECRET, { expiresIn: '1d' });

    const authA = { headers: { Authorization: `Bearer ${tokenA}` } };
    const authB = { headers: { Authorization: `Bearer ${tokenB}` } };

    // Enroll Student A in Course 1 ONLY
    await prisma.enrollment.create({
      data: {
        userId: studentA.id,
        courseId: course1.id,
      },
    });

    // Give Student A a verified completed purchase of Material 2
    const paymentA = await prisma.payment.create({
      data: {
        userId: studentA.id,
        materialId: material2.id,
        amount: 299,
        currency: 'INR',
        status: 'COMPLETED',
        razorpayOrderId: `ord_mat_${ts}`,
        razorpayPaymentId: `pay_mat_${ts}`,
      },
    });
    await prisma.materialPurchase.create({
      data: {
        userId: studentA.id,
        materialId: material2.id,
        paymentId: paymentA.id,
      },
    });

    // Student B has ZERO enrollments and ZERO purchases.
    console.log('\n--- VERIFYING ASSIGNMENTS SCOPING ---');

    // 2. Fetch assignments for Student A: should see assign1 and assign2, NOT assign3 (Python)
    const resAssignmentsA = await axios.get(`${API_URL}/assignments`, authA);
    const listA = resAssignmentsA.data.data;
    const aIds = listA.map((x: any) => x.id);
    const hasAssign1 = aIds.includes(assign1.id);
    const hasAssign2 = aIds.includes(assign2.id);
    const hasAssign3 = aIds.includes(assign3.id);

    report('Relevant assignments are shown for Student A (enrolled course)', hasAssign1 && hasAssign2);
    report('Unrelated course assignments (Python) are NOT shown to Student A', !hasAssign3);

    // Verify deduplication: no duplicate IDs in list
    const uniqueAIds = new Set(aIds);
    report('Duplicate assignment cards are prevented', uniqueAIds.size === aIds.length);

    // Fetch assignments for Student B: should be 0 assignments since Student B has no active enrollments
    const resAssignmentsB = await axios.get(`${API_URL}/assignments`, authB);
    const listB = resAssignmentsB.data.data;
    report('Student B with no enrollments sees 0 assignments', listB.length === 0);

    console.log('\n--- VERIFYING ASSIGNMENT SUBMISSION & PERMISSIONS ---');

    // Student A submits to Assignment 1 (authorized)
    let submitASuccess = false;
    try {
      const resSubmitA = await axios.post(
        `${API_URL}/assignments/${assign1.id}/submit`,
        { content: 'https://github.com/student-a/react-capstone', fileUrl: 'https://github.com/student-a/react-capstone' },
        authA
      );
      submitASuccess = resSubmitA.data.success;
    } catch (err: any) {
      console.error(err.response?.data || err.message);
    }
    report('Authorized assignment submission is saved for Student A', submitASuccess);

    // Verify submission is saved and reflects in assignments API
    const resAssignmentsAAfter = await axios.get(`${API_URL}/assignments`, authA);
    const updatedAssign1 = resAssignmentsAAfter.data.data.find((x: any) => x.id === assign1.id);
    const isMarkedSubmitted = updatedAssign1?.submissions?.length > 0;
    report('Submission status and record persists upon re-fetching assignments', isMarkedSubmitted);

    // Student B attempts to submit to Assignment 1 (unauthorized because Student B is not enrolled in Course 1)
    let submitBBlocked = false;
    try {
      await axios.post(
        `${API_URL}/assignments/${assign1.id}/submit`,
        { content: 'https://github.com/student-b/hack-attempt', fileUrl: 'https://github.com/student-b/hack-attempt' },
        authB
      );
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        submitBBlocked = true;
      }
    }
    report('Unauthorized assignment submission is rejected with 403 Forbidden', submitBBlocked);

    console.log('\n--- VERIFYING MATERIALS DATA ISOLATION ---');

    // Student A calls getMyMaterials:
    // Should see Material 1 (course-included via Course 1 enrollment)
    // AND Material 2 (direct verified purchase)
    const resMaterialsA = await axios.get(`${API_URL}/materials/my/purchases`, authA);
    const matListA = resMaterialsA.data.data;
    const matAIds = matListA.map((m: any) => m.material?.id || m.id);

    report('Student A has access to course-included resource through valid enrollment', matAIds.includes(material1.id));
    report('Student A has access to completed verified direct purchase', matAIds.includes(material2.id));

    // Student B calls getMyMaterials:
    // Should see 0 materials (empty state)
    const resMaterialsB = await axios.get(`${API_URL}/materials/my/purchases`, authB);
    const matListB = resMaterialsB.data.data;
    report('Student B (new student with no purchases/enrollments) sees 0 materials', matListB.length === 0);
    report("Student A's purchases do NOT leak to Student B", !matListB.some((m: any) => (m.material?.id || m.id) === material2.id));

    // Pending payment material test:
    // Create a pending payment for Student B for Material 2
    await prisma.payment.create({
      data: {
        userId: studentB.id,
        materialId: material2.id,
        amount: 299,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: `ord_pending_${ts}`,
      },
    });

    const resMaterialsBAfterPending = await axios.get(`${API_URL}/materials/my/purchases`, authB);
    report('Pending payments DO NOT grant material access', resMaterialsBAfterPending.data.data.length === 0);

    // Download authorization test:
    // Student A can download Material 2 (returns 302 redirect or 200)
    let downloadASuccess = false;
    try {
      const resDlA = await axios.get(`${API_URL}/materials/${material2.id}/download`, {
        ...authA,
        maxRedirects: 0,
        validateStatus: (status) => status === 200 || status === 302,
      });
      downloadASuccess = resDlA.status === 200 || resDlA.status === 302;
    } catch (err: any) {
      console.error(err.response?.data || err.message);
    }
    report('Authorized student can download purchased material (200 OK / 302 Redirect)', downloadASuccess);

    // Student B attempts to download Material 2 directly by ID
    let downloadBBlocked = false;
    try {
      await axios.get(`${API_URL}/materials/${material2.id}/download`, authB);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        downloadBBlocked = true;
      }
    }
    report('Unauthorized download by Student B returns 403 Forbidden', downloadBBlocked);

    console.log('\n--- VERIFYING DASHBOARD COUNTS SYNCHRONIZATION ---');

    // Student A dashboard overview
    const resDashA = await axios.get(`${API_URL}/learning/dashboard-summary`, authA);
    const summaryA = resDashA.data.data;
    report('Dashboard Enrolled Courses matches DB for Student A (1 course)', summaryA.enrolledCourses === 1);
    report('Dashboard Purchased Materials matches DB for Student A (2 materials: 1 direct + 1 course-included)', summaryA.purchasedMaterials === 2);
    // Student A has 2 course assignments, 1 submitted -> 1 pending
    report('Dashboard Pending Assignments matches DB for Student A (1 pending)', summaryA.pendingAssignments === 1);

    // Student B dashboard overview
    const resDashB = await axios.get(`${API_URL}/learning/dashboard-summary`, authB);
    const summaryB = resDashB.data.data;
    report('Dashboard Enrolled Courses is 0 for Student B', summaryB.enrolledCourses === 0);
    report('Dashboard Purchased Materials is 0 for Student B', summaryB.purchasedMaterials === 0);
    report('Dashboard Pending Assignments is 0 for Student B', summaryB.pendingAssignments === 0);

    console.log('\n========================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Test execution error:', error.response?.data || error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStudentVerification();
