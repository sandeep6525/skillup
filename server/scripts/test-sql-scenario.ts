import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function runSqlCourseE2EScenario() {
  console.log('================================================================');
  console.log('SKILLUP END-TO-END SCENARIO: SQL & DATABASE MANAGEMENT');
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
    // Step 1: Admin & Student Authentication
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Authentication ---');
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@skillup.com',
      password: 'Password123!',
    });
    const adminToken = adminLogin.data.data.accessToken;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    assert(adminLogin.data.data.user.role === 'ADMIN', 'Admin logged in');

    const studentLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'neha.kapoor@example.com',
      password: 'Password123!',
    });
    const studentToken = studentLogin.data.data.accessToken;
    const studentUser = studentLogin.data.data.user;
    const studentHeaders = { headers: { Authorization: `Bearer ${studentToken}` } };
    assert(studentUser.email === 'neha.kapoor@example.com', 'Student Neha logged in');

    const secondStudentLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'arjun.kumar@example.com',
      password: 'Password123!',
    });
    const student2Headers = { headers: { Authorization: `Bearer ${secondStudentLogin.data.data.accessToken}` } };
    assert(secondStudentLogin.data.data.user.email === 'arjun.kumar@example.com', 'Student 2 Arjun logged in');

    // -------------------------------------------------------------
    // Step 2 & 3: Admin selects/creates "SQL and Database Management" and adds Day 1
    // -------------------------------------------------------------
    console.log('\n--- Step 2 & 3: Create Course & Day 1 Module ---');
    const courseTitle = `SQL and Database Management ${Date.now()}`;
    const courseRes = await axios.post(
      `${API_BASE}/courses`,
      {
        title: courseTitle,
        description: 'Comprehensive relational database design, indexing, and advanced query optimization.',
        price: 1999,
        level: 'Intermediate',
      },
      adminHeaders
    );
    const course = courseRes.data.data;
    assert(!!course.id, `Admin created course: "${course.title}" (${course.slug})`);

    const day1Res = await axios.post(
      `${API_BASE}/courses/${course.id}/modules`,
      {
        title: 'Day 1 – Introduction to SQL',
        order: 1,
      },
      adminHeaders
    );
    const day1 = day1Res.data.data;
    assert(day1.title === 'Day 1 – Introduction to SQL', 'Admin created "Day 1 – Introduction to SQL"');

    // -------------------------------------------------------------
    // Step 4: Admin adds YouTube Video URL (Lesson 1)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Admin adds YouTube Video Lesson ---');
    const lesson1Res = await axios.post(
      `${API_BASE}/courses/modules/${day1.id}/lessons`,
      {
        title: 'Lesson 1: Introduction to SQL',
        description: 'Database fundamentals, relational model, and SQL syntax overview',
        videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
        duration: 15,
        order: 1,
        isFree: false,
      },
      adminHeaders
    );
    const lesson1 = lesson1Res.data.data;
    assert(lesson1.videoUrl === 'https://www.youtube.com/watch?v=HXV3zeQKqGY', 'Admin saved YouTube video URL for Lesson 1 (15 mins)');

    // -------------------------------------------------------------
    // Step 5: Admin uploads and attaches Day 1 PDF
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Admin uploads Day 1 PDF ---');
    const testDir = path.join(__dirname, '../uploads/materials');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const dummyPdf = path.join(testDir, 'SQL_Introduction.pdf');
    fs.writeFileSync(dummyPdf, '%PDF-1.4 SQL Introduction Day 1 Notes');

    const resource1Res = await axios.post(
      `${API_BASE}/courses/lessons/${lesson1.id}/resources`,
      {
        title: 'Day 1 Notes: SQL_Introduction.pdf',
        fileUrl: '/uploads/materials/SQL_Introduction.pdf',
        type: 'PDF',
      },
      adminHeaders
    );
    assert(resource1Res.data.success && resource1Res.data.data.title === 'Day 1 Notes: SQL_Introduction.pdf', 'Admin attached Day 1 Notes PDF');

    // -------------------------------------------------------------
    // Step 6 & 7: Refresh & Verify Persistence
    // -------------------------------------------------------------
    console.log('\n--- Step 6 & 7: Page Refresh & Verification ---');
    const refreshedModules = await axios.get(`${API_BASE}/courses/${course.id}/modules`, adminHeaders);
    const rDay1 = refreshedModules.data.data.find((m: any) => m.id === day1.id);
    const rLesson1 = rDay1?.lessons?.find((l: any) => l.id === lesson1.id);
    const rResource1 = rLesson1?.resources?.find((r: any) => r.title.includes('SQL_Introduction.pdf'));
    assert(!!rDay1 && !!rLesson1 && !!rResource1, 'After refresh, Day 1, YouTube video lesson, and attached PDF notes persist in MySQL');

    // -------------------------------------------------------------
    // Step 8: Unenrolled Student Access Denied
    // -------------------------------------------------------------
    console.log('\n--- Step 8: Unenrolled Student Access Denied ---');
    let deniedClassroom = false;
    try {
      await axios.get(`${API_BASE}/learning/lessons/${lesson1.id}`, studentHeaders);
    } catch (err: any) {
      if (err.response?.status === 403) deniedClassroom = true;
    }
    assert(deniedClassroom, 'Student without enrollment denied classroom lesson access (HTTP 403 Forbidden)');

    // Public course syllabus check
    const publicSyllabus = await axios.get(`${API_BASE}/courses/${course.slug}`, studentHeaders);
    const pubLesson1 = publicSyllabus.data.data.modules[0].lessons[0];
    assert(pubLesson1.videoUrl === null, 'Course details page protects videoUrl (returns null) for non-enrolled students');

    // -------------------------------------------------------------
    // Step 9 & 10: Razorpay Purchase & Student Dashboard
    // -------------------------------------------------------------
    console.log('\n--- Step 9 & 10: Razorpay Purchase & Dashboard Appearance ---');
    const orderRes = await axios.post(`${API_BASE}/payments/orders`, { courseId: course.id }, studentHeaders);
    const rzpOrderId = orderRes.data.data.orderId;
    assert(orderRes.status === 201 && !!rzpOrderId, `Razorpay order created for course: ${rzpOrderId}`);

    const verifyRes = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: `pay_sql_${Date.now()}`,
        razorpaySignature: 'simulated_test_signature',
      },
      studentHeaders
    );
    assert(verifyRes.data.success, 'Backend verified Razorpay signature and activated student enrollment');

    const myCoursesRes = await axios.get(`${API_BASE}/learning/my-courses`, studentHeaders);
    const enrolledRecord = myCoursesRes.data.data.find((e: any) => e.courseId === course.id);
    assert(!!enrolledRecord, 'Course appears immediately in Student Dashboard "My Courses" with "Start Learning"');

    // -------------------------------------------------------------
    // Step 11, 12, 13: Classroom Playback, PDF Access, Progress
    // -------------------------------------------------------------
    console.log('\n--- Step 11, 12 & 13: Classroom Playback & Notes Download ---');
    const classroomLesson = await axios.get(`${API_BASE}/learning/lessons/${lesson1.id}`, studentHeaders);
    assert(
      classroomLesson.data.data.lesson.videoUrl === 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
      'Student successfully unlocks and plays YouTube video in classroom player'
    );
    assert(
      classroomLesson.data.data.lesson.resources.length > 0,
      'Student can view and download Day 1 Notes (SQL_Introduction.pdf)'
    );

    // Mark lesson as complete
    const markRes = await axios.post(
      `${API_BASE}/learning/lessons/${lesson1.id}/progress`,
      { isCompleted: true },
      studentHeaders
    );
    assert(markRes.data.success && markRes.data.data.isCompleted === true, 'Student can mark lesson as completed');

    // -------------------------------------------------------------
    // Step 14: Day 2 and Subsequent Modules
    // -------------------------------------------------------------
    console.log('\n--- Step 14: Day 2 Modules and Lessons ---');
    const day2Res = await axios.post(
      `${API_BASE}/courses/${course.id}/modules`,
      { title: 'Day 2 – SQL Queries', order: 2 },
      adminHeaders
    );
    const day2 = day2Res.data.data;
    const lesson2a = await axios.post(
      `${API_BASE}/courses/modules/${day2.id}/lessons`,
      {
        title: 'Lesson 1: SELECT Statements',
        duration: 18,
        videoUrl: 'https://youtu.be/7S_tz1z_5bA',
        order: 1,
      },
      adminHeaders
    );
    const lesson2b = await axios.post(
      `${API_BASE}/courses/modules/${day2.id}/lessons`,
      {
        title: 'Lesson 2: WHERE Conditions',
        duration: 22,
        videoUrl: 'https://youtu.be/9Pzj73G3346',
        order: 2,
      },
      adminHeaders
    );
    assert(!!lesson2a.data.data.id && !!lesson2b.data.data.id, 'Day 2 SELECT Statements & WHERE Conditions added successfully');

    // -------------------------------------------------------------
    // Step 15: Another Student Without Enrollment Access Denied
    // -------------------------------------------------------------
    console.log('\n--- Step 15: Second Student Isolation ---');
    let student2Denied = false;
    try {
      await axios.get(`${API_BASE}/learning/lessons/${lesson1.id}`, student2Headers);
    } catch (err: any) {
      if (err.response?.status === 403) student2Denied = true;
    }
    assert(student2Denied, 'Second student without enrollment cannot access the protected classroom or lesson resources');

    // Clean up dummy pdf
    if (fs.existsSync(dummyPdf)) fs.unlinkSync(dummyPdf);

  } catch (error: any) {
    console.error('Test scenario error:', error.response?.data || error.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`SQL COURSE SCENARIO SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runSqlCourseE2EScenario();
