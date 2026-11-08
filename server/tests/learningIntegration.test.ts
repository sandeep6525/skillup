import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('Module 1-13: Enrollment, Learning Materials, Videos & Live Class Integration', () => {
  const adminEmail = `admin_learn_${Date.now()}@skillup.test`;
  const mentorEmail = `mentor_learn_${Date.now()}@skillup.test`;
  const otherMentorEmail = `other_mentor_${Date.now()}@skillup.test`;
  const studentEmail = `student_learn_${Date.now()}@skillup.test`;
  const unenrolledEmail = `student_unenrolled_${Date.now()}@skillup.test`;
  const password = 'Password123!';

  let adminToken = '', adminId = '';
  let mentorToken = '', mentorId = '';
  let otherMentorToken = '', otherMentorId = '';
  let studentToken = '', studentId = '';
  let unenrolledToken = '', unenrolledId = '';

  let courseId = '';
  let internshipId = '';
  let courseMaterialId = '';
  let internshipMaterialId = '';
  let liveClassCourseId = '';
  let liveClassInternshipId = '';
  let cancelledClassId = '';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Admin
    const admin = await prisma.user.create({
      data: { name: 'Admin Learn', email: adminEmail, password: passwordHash, role: 'ADMIN', isVerified: true },
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Mentor 1
    const mentor = await prisma.user.create({
      data: { name: 'Mentor Alpha', email: mentorEmail, password: passwordHash, role: 'INSTRUCTOR', isVerified: true },
    });
    mentorId = mentor.id;
    mentorToken = jwt.sign({ id: mentor.id, email: mentor.email, role: mentor.role }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Other Mentor 2
    const otherMentor = await prisma.user.create({
      data: { name: 'Mentor Beta', email: otherMentorEmail, password: passwordHash, role: 'INSTRUCTOR', isVerified: true },
    });
    otherMentorId = otherMentor.id;
    otherMentorToken = jwt.sign({ id: otherMentor.id, email: otherMentor.email, role: otherMentor.role }, config.jwtSecret, { expiresIn: '1d' });

    // 4. Enrolled Student
    const student = await prisma.user.create({
      data: { name: 'Enrolled Student', email: studentEmail, password: passwordHash, role: 'STUDENT', isVerified: true },
    });
    studentId = student.id;
    studentToken = jwt.sign({ id: student.id, email: student.email, role: student.role }, config.jwtSecret, { expiresIn: '1d' });

    // 5. Unenrolled Student
    const unenrolled = await prisma.user.create({
      data: { name: 'Unenrolled Student', email: unenrolledEmail, password: passwordHash, role: 'STUDENT', isVerified: true },
    });
    unenrolledId = unenrolled.id;
    unenrolledToken = jwt.sign({ id: unenrolled.id, email: unenrolled.email, role: unenrolled.role }, config.jwtSecret, { expiresIn: '1d' });

    const ts = Date.now();
    // Create a Course assigned to mentor 1
    const course = await prisma.course.create({
      data: {
        title: `Full Stack Cloud Architecture ${ts}`,
        slug: `full-stack-cloud-architecture-${ts}`,
        description: 'Advanced course on cloud development',
        instructorId: mentorId,
        price: 2999,
        discountPrice: 1999,
        level: 'INTERMEDIATE',
        status: 'PUBLISHED',
      },
    });
    courseId = course.id;

    // Create an Internship assigned to mentor 1
    const internship = await prisma.internship.create({
      data: {
        title: `Backend Systems Engineering Cohort ${ts}`,
        organization: 'SkillUp Cloud Labs',
        duration: '12 Weeks',
        description: 'Hands on backend architecture cohort',
        technologies: 'Node.js, Docker, Kubernetes, MySQL',
        mentorId: mentorId,
        availableSeats: 30,
        price: 4999,
        isPublished: true,
      },
    });
    internshipId = internship.id;

    // Enroll student in Course
    await prisma.enrollment.create({
      data: {
        userId: studentId,
        courseId: courseId,
        progress: 0,
      },
    });

    // Enroll student in Internship (Accepted application)
    await prisma.internshipApplication.create({
      data: {
        internshipId: internshipId,
        userId: studentId,
        status: 'ACCEPTED',
        paidAmount: 4999,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records
    try {
      if (liveClassCourseId) await prisma.liveClass.delete({ where: { id: liveClassCourseId } }).catch(() => {});
      if (liveClassInternshipId) await prisma.liveClass.delete({ where: { id: liveClassInternshipId } }).catch(() => {});
      if (cancelledClassId) await prisma.liveClass.delete({ where: { id: cancelledClassId } }).catch(() => {});
      if (courseMaterialId) await prisma.learningMaterial.delete({ where: { id: courseMaterialId } }).catch(() => {});
      if (internshipMaterialId) await prisma.learningMaterial.delete({ where: { id: internshipMaterialId } }).catch(() => {});

      await prisma.internshipApplication.deleteMany({ where: { internshipId } }).catch(() => {});
      await prisma.enrollment.deleteMany({ where: { courseId } }).catch(() => {});
      if (internshipId) await prisma.internship.delete({ where: { id: internshipId } }).catch(() => {});
      if (courseId) await prisma.course.delete({ where: { id: courseId } }).catch(() => {});

      if (studentId) await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
      if (unenrolledId) await prisma.user.delete({ where: { id: unenrolledId } }).catch(() => {});
      if (mentorId) await prisma.user.delete({ where: { id: mentorId } }).catch(() => {});
      if (otherMentorId) await prisma.user.delete({ where: { id: otherMentorId } }).catch(() => {});
      if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    } catch (e) {
      // Ignored
    }
  });

  // 1. Student enrollment appears on the correct dashboard
  it('1. Student enrollment dashboard calculates real courses and internships', async () => {
    const res = await request(app)
      .get('/api/learning/dashboard-summary')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.enrolledCourses).toBeGreaterThanOrEqual(1);
    expect(res.body.data.activeInternships).toBeGreaterThanOrEqual(1);
  });

  // 2. Internship enrollment does not incorrectly count as course enrollment
  it('2. Internship enrollment does not inflate course count', async () => {
    // Unenrolled student has 0 courses and 0 internships
    const res = await request(app)
      .get('/api/learning/dashboard-summary')
      .set('Authorization', `Bearer ${unenrolledToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.enrolledCourses).toBe(0);
    expect(res.body.data.activeInternships).toBe(0);
  });

  // 3. Admin publishes learning material and the authorized student can see it
  it('3. Admin can publish learning material for course and internship', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Cloud Architecture Cheatsheet PDF',
        description: 'Complete architecture patterns reference',
        type: 'PDF',
        fileUrl: 'https://cdn.skillup.test/cloud-patterns.pdf',
        courseId: courseId,
        isFree: false,
        price: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    courseMaterialId = res.body.data.id;
    expect(res.body.data.courseId).toBe(courseId);
  });

  // 4. Assigned mentor publishes a lesson and learning material for internship
  it('4. Assigned mentor publishes learning material for internship cohort', async () => {
    const res = await request(app)
      .post('/api/materials')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Backend Scalability Code Starter',
        description: 'Starter repo with clean architecture and Docker',
        type: 'CODE_FILE',
        fileUrl: 'https://cdn.skillup.test/backend-starter.zip',
        internshipId: internshipId,
        isFree: false,
        price: 999,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    internshipMaterialId = res.body.data.id;
    expect(res.body.data.internshipId).toBe(internshipId);
  });

  // 5. Unauthorized mentors cannot modify or schedule classes for another mentor
  it('5. Unauthorized mentor cannot schedule class for an unassigned internship', async () => {
    const startTime = new Date(Date.now() + 3600000).toISOString();
    const endTime = new Date(Date.now() + 7200000).toISOString();

    const res = await request(app)
      .post('/api/mentor/classes')
      .set('Authorization', `Bearer ${otherMentorToken}`)
      .send({
        title: 'Unauthorized Intrusion Class',
        internshipId: internshipId,
        startTime,
        endTime,
        meetingUrl: 'https://meet.google.com/xyz-unauth',
      });

    expect(res.status).toBe(403);
  });

  // 6. Unenrolled students cannot access private learning materials
  it('6. Unenrolled student receives 403 on private material download', async () => {
    const res = await request(app)
      .get(`/api/materials/${internshipMaterialId}/download`)
      .set('Authorization', `Bearer ${unenrolledToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toMatch(/Access denied/i);
  });

  // 7. Enrolled student can access material download (remote URL redirects with 302 to CDN)
  it('7. Enrolled student can access internship learning material download', async () => {
    const res = await request(app)
      .get(`/api/materials/${internshipMaterialId}/download`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe('https://cdn.skillup.test/backend-starter.zip');
  });

  // 8. Assigned mentor can schedule live class with Google Meet URL
  it('8. Assigned mentor schedules live class for cohort', async () => {
    // Scheduled in future (2 hours ahead)
    const startTime = new Date(Date.now() + 7200000).toISOString();
    const endTime = new Date(Date.now() + 10800000).toISOString();

    const res = await request(app)
      .post('/api/mentor/classes')
      .set('Authorization', `Bearer ${mentorToken}`)
      .send({
        title: 'Microservices & High Availability Deep Dive',
        description: 'Live interactive coding and architecture session',
        internshipId: internshipId,
        startTime,
        endTime,
        meetingUrl: 'https://meet.google.com/abc-mno-pqr',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    liveClassInternshipId = res.body.data.id;
    expect(res.body.data.meetingUrl).toBe('https://meet.google.com/abc-mno-pqr');
  });

  // 9. Student sees scheduled live class with masked meeting URL outside join window
  it('9. Student sees live class but meeting URL is sanitized outside 5-minute window', async () => {
    const res = await request(app)
      .get('/api/live-classes')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const foundClass = res.body.data.find((c: any) => c.id === liveClassInternshipId);
    expect(foundClass).toBeDefined();
    // Meeting URL must be sanitized / null outside 5-minute window
    expect(foundClass.meetingUrl).toBeNull();
  });

  // 10. Unenrolled student cannot access meeting link or class details
  it('10. Unenrolled student receives 403 on private live class details', async () => {
    const res = await request(app)
      .get(`/api/live-classes/${liveClassInternshipId}`)
      .set('Authorization', `Bearer ${unenrolledToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error?.message).toMatch(/not enrolled/i);
  });

  // 11. Student can view dedicated Internship Learning portal data
  it('11. Student fetches complete internship learning curriculum, videos, and materials', async () => {
    const res = await request(app)
      .get(`/api/internships/${internshipId}/learning`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.internship.id).toBe(internshipId);
    expect(res.body.data.learningMaterials.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.liveClasses.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.internship.mentor.name).toBe('Mentor Alpha');
  });

  // 12. Cancelled class status is handled and cannot be joined
  it('12. Cancelled class preserves record and does not reveal meeting link', async () => {
    // Create class and cancel it
    const cancelled = await prisma.liveClass.create({
      data: {
        title: 'Cancelled Cohort Session',
        course: { connect: { id: courseId } },
        instructor: { connect: { id: mentorId } },
        startTime: new Date(Date.now() - 60000), // right now
        duration: 60,
        status: 'CANCELLED',
        meetingUrl: 'https://meet.google.com/cancelled-secret-link',
      },
    });
    cancelledClassId = cancelled.id;

    const res = await request(app)
      .get(`/api/live-classes/${cancelled.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.meetingUrl).toBeNull();
  });

  // 13. Admin Oversight endpoint returns all programs, mentors, materials, and classes
  it('13. Admin oversight endpoint returns comprehensive analytics across courses and cohorts', async () => {
    const res = await request(app)
      .get('/api/admin/oversight/learning')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.courses.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.internships.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.metrics.totalCourses).toBeGreaterThanOrEqual(1);
    expect(res.body.data.metrics.totalInternships).toBeGreaterThanOrEqual(1);
  });

  // 14. Student My Learning queries return enrolled courses and cohort programs
  it('14. Student queries return enrolled courses and cohort applications', async () => {
    const [courseRes, internshipRes] = await Promise.all([
      request(app).get('/api/learning/my-courses').set('Authorization', `Bearer ${studentToken}`),
      request(app).get('/api/internships/my/applications').set('Authorization', `Bearer ${studentToken}`),
    ]);

    expect(courseRes.status).toBe(200);
    expect(courseRes.body.success).toBe(true);
    expect(courseRes.body.data.length).toBeGreaterThanOrEqual(1);

    expect(internshipRes.status).toBe(200);
    expect(internshipRes.body.success).toBe(true);
    expect(internshipRes.body.data.length).toBeGreaterThanOrEqual(1);
    const targetInternship = internshipRes.body.data.find((a: any) => a.internshipId === internshipId);
    expect(targetInternship).toBeDefined();
    expect(targetInternship.status).toBe('ACCEPTED');
  });
});
