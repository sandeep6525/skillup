import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

describe('SkillUp Course-Wide & Specific-Batch Mentor Assignment Suite', () => {
  const app = createApp();
  let adminToken: string;
  let mentorToken: string;
  let otherMentorToken: string;
  let studentToken: string;

  let adminUser: any;
  let mentorUser: any;
  let otherMentorUser: any;
  let studentUser: any;
  let newStudentUser: any;

  let testCourse: any;
  let otherCourse: any;
  let testBatchA: any;
  let otherCourseBatch: any;

  beforeAll(async () => {
    // 1. Create or ensure Admin
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.assignment.test@skillup.local' },
      update: { role: 'ADMIN', isVerified: true },
      create: {
        name: 'Admin Tester',
        email: 'admin.assignment.test@skillup.local',
        password: 'hashedpassword123',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // 2. Create Mentor 1
    mentorUser = await prisma.user.upsert({
      where: { email: 'mentor.assignment.test@skillup.local' },
      update: { role: 'INSTRUCTOR', isVerified: true },
      create: {
        name: 'Mentor Priya',
        email: 'mentor.assignment.test@skillup.local',
        password: 'hashedpassword123',
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });

    // 3. Create Mentor 2
    otherMentorUser = await prisma.user.upsert({
      where: { email: 'mentor2.assignment.test@skillup.local' },
      update: { role: 'INSTRUCTOR', isVerified: true },
      create: {
        name: 'Mentor Rahul',
        email: 'mentor2.assignment.test@skillup.local',
        password: 'hashedpassword123',
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });

    // 4. Create Students
    studentUser = await prisma.user.upsert({
      where: { email: 'student1.assignment.test@skillup.local' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Student One',
        email: 'student1.assignment.test@skillup.local',
        password: 'hashedpassword123',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    newStudentUser = await prisma.user.upsert({
      where: { email: 'student2.assignment.test@skillup.local' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Student Two (Future Enrollment)',
        email: 'student2.assignment.test@skillup.local',
        password: 'hashedpassword123',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    // Create Tokens
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwtSecret, { expiresIn: '1d' });
    mentorToken = jwt.sign({ id: mentorUser.id, role: mentorUser.role }, config.jwtSecret, { expiresIn: '1d' });
    otherMentorToken = jwt.sign({ id: otherMentorUser.id, role: otherMentorUser.role }, config.jwtSecret, { expiresIn: '1d' });
    studentToken = jwt.sign({ id: studentUser.id, role: studentUser.role }, config.jwtSecret, { expiresIn: '1d' });

    // 5. Create Test Courses
    testCourse = await prisma.course.upsert({
      where: { slug: 'test-course-assign-course-1' },
      update: { instructorId: adminUser.id },
      create: {
        title: 'Full Stack Web Engineering',
        slug: 'test-course-assign-course-1',
        description: 'Comprehensive Web Development',
        price: 999,
        level: 'BEGINNER',
        instructorId: adminUser.id,
      },
    });

    otherCourse = await prisma.course.upsert({
      where: { slug: 'test-course-assign-course-2' },
      update: { instructorId: adminUser.id },
      create: {
        title: 'Cloud Architecture & DevOps',
        slug: 'test-course-assign-course-2',
        description: 'Cloud Infrastructure and CI/CD',
        price: 1499,
        level: 'INTERMEDIATE',
        instructorId: adminUser.id,
      },
    });

    // 6. Create Batches
    testBatchA = await prisma.batch.upsert({
      where: { code: 'BATCH-FS-2026' },
      update: { courseId: testCourse.id },
      create: {
        name: 'Full Stack Cohort Alpha',
        code: 'BATCH-FS-2026',
        courseId: testCourse.id,
        startDate: new Date(),
        maxStudents: 50,
      },
    });

    otherCourseBatch = await prisma.batch.upsert({
      where: { code: 'BATCH-DEVOPS-2026' },
      update: { courseId: otherCourse.id },
      create: {
        name: 'DevOps Cohort Alpha',
        code: 'BATCH-DEVOPS-2026',
        courseId: otherCourse.id,
        startDate: new Date(),
        maxStudents: 50,
      },
    });

    // Clean prior mentor assignments for these test entities
    await prisma.mentorAssignment.deleteMany({
      where: {
        courseId: { in: [testCourse.id, otherCourse.id] },
      },
    });

    // Enroll student1 in testCourse
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: studentUser.id, courseId: testCourse.id } },
      update: {},
      create: {
        userId: studentUser.id,
        courseId: testCourse.id,
        progress: 10,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.mentorAssignment.deleteMany({
      where: { courseId: { in: [testCourse.id, otherCourse.id] } },
    });
    await prisma.enrollment.deleteMany({
      where: { userId: { in: [studentUser.id, newStudentUser.id] } },
    });
    await prisma.batchEnrollment.deleteMany({
      where: { studentId: { in: [studentUser.id, newStudentUser.id] } },
    });
    await prisma.batch.deleteMany({
      where: { id: { in: [testBatchA.id, otherCourseBatch.id] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [testCourse.id, otherCourse.id] } },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin.assignment.test@skillup.local',
            'mentor.assignment.test@skillup.local',
            'mentor2.assignment.test@skillup.local',
            'student1.assignment.test@skillup.local',
            'student2.assignment.test@skillup.local',
          ],
        },
      },
    });
  });

  test('1. Admin Authorization: Non-admin users are blocked from mentor assignment', async () => {
    await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        scope: 'COURSE_WIDE',
      })
      .expect(403);

    await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        scope: 'COURSE_WIDE',
      })
      .expect(403);
  });

  test('2. Missing Required Fields: Mentor ID or Course ID validation', async () => {
    const res = await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: testCourse.id,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('3. Cross-Course Validation: Rejects batch belonging to a different course', async () => {
    const res = await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        batchId: otherCourseBatch.id, // belongs to otherCourse!
        scope: 'SPECIFIC_BATCH',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('selected batch does not belong to the selected course');
  });

  test('4. Course-wide Mentor Assignment: Works without batchId (No batchId null error)', async () => {
    const res = await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        batchId: null, // explicitly null
        scope: 'COURSE_WIDE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.scope).toBe('COURSE_WIDE');
    expect(res.body.data.batchId).toBeNull();
    expect(res.body.data.courseId).toBe(testCourse.id);
  });

  test('5. Duplicate Assignment Prevention & Repeated Synchronization: Idempotent course-wide assignment', async () => {
    const res = await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        scope: 'COURSE_WIDE',
      })
      .expect(201);

    expect(res.body.success).toBe(true);

    // Verify in database that only 1 course-wide assignment exists
    const assignments = await prisma.mentorAssignment.findMany({
      where: {
        mentorId: mentorUser.id,
        courseId: testCourse.id,
        batchId: null,
      },
    });
    expect(assignments.length).toBe(1);
  });

  test('6. Existing Enrolled Students Appear in Mentor Roster: Student 1 appears automatically', async () => {
    const res = await request(app)
      .get(`/api/mentor/students?courseId=${testCourse.id}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const studentIds = res.body.data.map((s: any) => s.id);
    expect(studentIds).toContain(studentUser.id);
  });

  test('7. Future Enrolled Students Automatically Appear in Course-wide Mentor Roster', async () => {
    // New student enrolls in the course later
    await prisma.enrollment.create({
      data: {
        userId: newStudentUser.id,
        courseId: testCourse.id,
        progress: 0,
      },
    });

    const res = await request(app)
      .get(`/api/mentor/students?courseId=${testCourse.id}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const studentIds = res.body.data.map((s: any) => s.id);
    expect(studentIds).toContain(studentUser.id);
    expect(studentIds).toContain(newStudentUser.id);
  });

  test('8. Specific Batch Mentor Assignment: Assign Mentor Rahul to testBatchA', async () => {
    const res = await request(app)
      .post('/api/admin/mentors/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        mentorId: otherMentorUser.id,
        courseId: testCourse.id,
        batchId: testBatchA.id,
        scope: 'SPECIFIC_BATCH',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.scope).toBe('SPECIFIC_BATCH');
    expect(res.body.data.batchId).toBe(testBatchA.id);

    // Verify batch sync automatically linked existing course enrollments into batchEnrollment
    const batchEnr = await prisma.batchEnrollment.findFirst({
      where: {
        batchId: testBatchA.id,
        studentId: studentUser.id,
      },
    });
    expect(batchEnr).not.toBeNull();
    expect(batchEnr?.isActive).toBe(true);
  });

  test('9. Specific Batch Isolation: Mentor Rahul only sees students in assigned batch', async () => {
    const res = await request(app)
      .get(`/api/mentor/students?batchId=${testBatchA.id}`)
      .set('Authorization', `Bearer ${otherMentorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const studentIds = res.body.data.map((s: any) => s.id);
    expect(studentIds).toContain(studentUser.id);
  });

  test('10. Mentor Roster Student Deep Profile Access Authorization', async () => {
    // Mentor Priya (course-wide) can access student profile
    const res = await request(app)
      .get(`/api/mentor/students/${studentUser.id}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(studentUser.id);
  });
});
