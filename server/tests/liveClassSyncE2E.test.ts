import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

describe('SkillUp Live Class Synchronization Across Admin, Mentor & Student Portals', () => {
  const app = createApp();

  let adminToken: string;
  let mentorToken: string;
  let unauthorizedMentorToken: string;
  let studentEnrolledToken: string;
  let studentLateEnrollToken: string;
  let studentInternToken: string;
  let studentUnregisteredToken: string;

  let adminUser: any;
  let mentorUser: any;
  let unauthorizedMentorUser: any;
  let studentEnrolledUser: any;
  let studentLateEnrollUser: any;
  let studentInternUser: any;
  let studentUnregisteredUser: any;

  let category: any;
  let course: any;
  let batch: any;
  let internship: any;

  let courseLiveClassId: string;
  let internshipLiveClassId: string;

  const generateToken = (user: any) => {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  };

  beforeAll(async () => {
    // 1. Create Users
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.liveclass.sync@skillup.test' },
      update: { role: 'ADMIN', isVerified: true },
      create: {
        name: 'Sync Admin',
        email: 'admin.liveclass.sync@skillup.test',
        password: 'Password123!',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    mentorUser = await prisma.user.upsert({
      where: { email: 'mentor.liveclass.sync@skillup.test' },
      update: { role: 'INSTRUCTOR', isVerified: true },
      create: {
        name: 'Assigned Mentor',
        email: 'mentor.liveclass.sync@skillup.test',
        password: 'Password123!',
        role: 'INSTRUCTOR',
        isVerified: true,
        title: 'Senior Solutions Architect',
      },
    });

    unauthorizedMentorUser = await prisma.user.upsert({
      where: { email: 'mentor.unauthorized.sync@skillup.test' },
      update: { role: 'INSTRUCTOR', isVerified: true },
      create: {
        name: 'Unassigned Mentor',
        email: 'mentor.unauthorized.sync@skillup.test',
        password: 'Password123!',
        role: 'INSTRUCTOR',
        isVerified: true,
        title: 'External Instructor',
      },
    });

    studentEnrolledUser = await prisma.user.upsert({
      where: { email: 'student.enrolled.sync@skillup.test' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Enrolled Student',
        email: 'student.enrolled.sync@skillup.test',
        password: 'Password123!',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    studentLateEnrollUser = await prisma.user.upsert({
      where: { email: 'student.late.sync@skillup.test' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Late Enrolling Student',
        email: 'student.late.sync@skillup.test',
        password: 'Password123!',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    studentInternUser = await prisma.user.upsert({
      where: { email: 'student.intern.sync@skillup.test' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Intern Student',
        email: 'student.intern.sync@skillup.test',
        password: 'Password123!',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    studentUnregisteredUser = await prisma.user.upsert({
      where: { email: 'student.unregistered.sync@skillup.test' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Unregistered Student',
        email: 'student.unregistered.sync@skillup.test',
        password: 'Password123!',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    adminToken = generateToken(adminUser);
    mentorToken = generateToken(mentorUser);
    unauthorizedMentorToken = generateToken(unauthorizedMentorUser);
    studentEnrolledToken = generateToken(studentEnrolledUser);
    studentLateEnrollToken = generateToken(studentLateEnrollUser);
    studentInternToken = generateToken(studentInternUser);
    studentUnregisteredToken = generateToken(studentUnregisteredUser);

    // 2. Setup Category, Course, Batch, and Internship
    category = await prisma.category.findFirst({ where: { slug: 'cloud-computing-sync' } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Cloud Computing Sync',
          slug: 'cloud-computing-sync',
          description: 'Cloud courses',
        },
      });
    }

    course = await prisma.course.create({
      data: {
        title: 'Cloud Architecture Mastery Sync',
        slug: `cloud-architecture-mastery-sync-${Date.now()}`,
        subtitle: 'Enterprise Cloud System Design',
        description: 'Deep dive into microservices and distributed systems',
        price: 999,
        level: 'Intermediate',
        language: 'English',
        categoryId: category.id,
        instructorId: mentorUser.id,
        status: 'PUBLISHED',
      },
    });

    batch = await prisma.batch.create({
      data: {
        courseId: course.id,
        name: 'Cloud Mastery Cohort 1',
        code: `BATCH-CLOUD-SYNC-${Date.now().toString().slice(-4)}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    // Create Internship
    internship = await prisma.internship.create({
      data: {
        title: 'Full Stack Cloud Internship 2026',
        organization: 'TRI-CUBE DIGITAL SOLUTIONS',
        description: 'Hands-on enterprise engineering internship',
        technologies: 'AWS, Kubernetes, Node.js, TypeScript',
        mentorId: mentorUser.id,
        price: 2999,
        duration: '12 weeks',
        isPublished: true,
      },
    });

    // Enroll initial student in course
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: studentEnrolledUser.id, courseId: course.id } },
      update: {},
      create: {
        userId: studentEnrolledUser.id,
        courseId: course.id,
      },
    });

    // Enroll intern student in internship
    await prisma.internshipApplication.create({
      data: {
        userId: studentInternUser.id,
        internshipId: internship.id,
        status: 'ACCEPTED',
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.liveClassRegistration.deleteMany({
      where: {
        studentId: {
          in: [
            studentEnrolledUser.id,
            studentLateEnrollUser.id,
            studentInternUser.id,
            studentUnregisteredUser.id,
          ],
        },
      },
    });
    await prisma.liveClass.deleteMany({
      where: {
        instructorId: { in: [mentorUser.id, adminUser.id, unauthorizedMentorUser.id] },
      },
    });
    await prisma.internshipApplication.deleteMany({
      where: { internshipId: internship.id },
    });
    await prisma.internship.deleteMany({
      where: { id: internship.id },
    });
    await prisma.enrollment.deleteMany({
      where: { courseId: course.id },
    });
    await prisma.batch.deleteMany({
      where: { id: batch.id },
    });
    await prisma.course.deleteMany({
      where: { id: course.id },
    });
  });

  describe('Scenario A: Mentor schedules a live class for an enrolled Course', () => {
    it('should allow authorized mentor to schedule a live class for their course', async () => {
      const scheduledStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          courseId: course.id,
          title: 'Microservices & Event-Driven Architecture',
          description: 'Deep dive into Apache Kafka and distributed orchestration',
          startTime: scheduledStart.toISOString(),
          duration: 90,
          meetingUrl: 'https://meet.google.com/abc-sync-test',
          meetingProvider: 'GOOGLE_MEET',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      courseLiveClassId = res.body.data.id;
    });

    it('enrolled student immediately sees the scheduled class in /api/live-classes/my/registrations', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentEnrolledToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const match = res.body.data.find((item: any) => item.liveClassId === courseLiveClassId);
      expect(match).toBeDefined();
      expect(match.isCourseEnrolled).toBe(true);
      expect(match.liveClass.title).toBe('Microservices & Event-Driven Architecture');
      // Meeting URL must be masked because scheduled start is 2 hours away (> 5 mins window)
      expect(match.liveClass.meetingUrl).toBeNull();
      expect(match.liveClass.canJoin).toBe(false);
    });
  });

  describe('Scenario B: Live Class created FIRST, Student enrolls AFTERWARDS (Bidirectional Sync)', () => {
    it('late-enrolling student initially has no registrations for this course', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentLateEnrollToken}`);

      expect(res.status).toBe(200);
      const match = res.body.data.find((item: any) => item.liveClassId === courseLiveClassId);
      expect(match).toBeUndefined();
    });

    it('student enrolls in the course after the class was scheduled', async () => {
      const enr = await prisma.enrollment.create({
        data: {
          userId: studentLateEnrollUser.id,
          courseId: course.id,
        },
      });
      expect(enr.id).toBeDefined();
    });

    it('late-enrolling student now immediately sees the class without requiring manual registration', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentLateEnrollToken}`);

      expect(res.status).toBe(200);
      const match = res.body.data.find((item: any) => item.liveClassId === courseLiveClassId);
      expect(match).toBeDefined();
      expect(match.isCourseEnrolled).toBe(true);
      expect(match.liveClass.title).toBe('Microservices & Event-Driven Architecture');
    });
  });

  describe('Scenario C: Internship Live Class Synchronization', () => {
    it('mentor schedules a live class targeted to an Internship', async () => {
      const scheduledStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          internshipId: internship.id,
          title: 'Sprint Kickoff & Code Architecture Review',
          description: 'Week 1 onboarding and codebase walkthrough',
          startTime: scheduledStart.toISOString(),
          duration: 60,
          meetingUrl: 'https://meet.google.com/intern-sync-test',
          meetingProvider: 'GOOGLE_MEET',
        });

      expect(res.status).toBe(201);
      internshipLiveClassId = res.body.data.id;
    });

    it('accepted internship student sees the internship live class in their list', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentInternToken}`);

      expect(res.status).toBe(200);
      const match = res.body.data.find((item: any) => item.liveClassId === internshipLiveClassId);
      expect(match).toBeDefined();
      expect(match.isInternshipEnrolled).toBe(true);
      expect(match.liveClass.title).toBe('Sprint Kickoff & Code Architecture Review');
    });

    it('student not in the internship does not see the internship live class', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentEnrolledToken}`);

      expect(res.status).toBe(200);
      const match = res.body.data.find((item: any) => item.liveClassId === internshipLiveClassId);
      expect(match).toBeUndefined();
    });
  });

  describe('Scenario D: Security & Early Join Meeting URL Enforcement', () => {
    let startingSoonClassId: string;
    const realMeetingLink = 'https://meet.google.com/secret-unlocked-room';

    beforeAll(async () => {
      // Create a class starting in 2 minutes (inside early join window)
      const soonStart = new Date(Date.now() + 2 * 60 * 1000);
      const cls = await prisma.liveClass.create({
        data: {
          title: 'Live Q&A Starting Now',
          startTime: soonStart,
          duration: 45,
          courseId: course.id,
          instructorId: mentorUser.id,
          meetingUrl: realMeetingLink,
          status: 'SCHEDULED',
        },
      });
      startingSoonClassId = cls.id;
    });

    it('enrolled student can access the meeting URL when session is within early join window', async () => {
      const res = await request(app)
        .get(`/api/live-classes/${startingSoonClassId}/meeting-url`)
        .set('Authorization', `Bearer ${studentEnrolledToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meetingUrl).toBe(realMeetingLink);
    });

    it('unauthorized/unregistered student is rejected with 403 when requesting meeting URL', async () => {
      const res = await request(app)
        .get(`/api/live-classes/${startingSoonClassId}/meeting-url`)
        .set('Authorization', `Bearer ${studentUnregisteredToken}`);

      expect(res.status).toBe(403);
    });

    it('enrolled student cannot access meeting URL for future class (> 5 mins out)', async () => {
      const res = await request(app)
        .get(`/api/live-classes/${courseLiveClassId}/meeting-url`)
        .set('Authorization', `Bearer ${studentEnrolledToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/join window is not yet open/i);
    });
  });

  describe('Scenario E: Mentor Scope Enforcement & Authorization Rejection', () => {
    it('unauthorized mentor cannot schedule a class for a course they are not assigned to', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${unauthorizedMentorToken}`)
        .send({
          courseId: course.id,
          title: 'Hacked Session',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('mentor cannot schedule a class for an internship they do not mentor', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${unauthorizedMentorToken}`)
        .send({
          internshipId: internship.id,
          title: 'Hacked Internship Session',
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });

  describe('Scenario F: Admin Creation & Past/Completed Session Handling', () => {
    let pastClassId: string;

    beforeAll(async () => {
      // Create past class (yesterday)
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const cls = await prisma.liveClass.create({
        data: {
          title: 'Masterclass on React Server Components (Completed)',
          startTime: pastDate,
          duration: 60,
          courseId: course.id,
          instructorId: mentorUser.id,
          status: 'COMPLETED',
          meetingUrl: 'https://meet.google.com/past-class',
          recordingUrl: 'https://skillup.cdn.local/recordings/rsc-masterclass.mp4',
        },
      });
      pastClassId = cls.id;
    });

    it('admin can schedule a live class directly targeted to course', async () => {
      const res = await request(app)
        .post('/api/admin/live-classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Global Masterclass',
          courseId: course.id,
          instructorId: mentorUser.id,
          startTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          price: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('past class is included in student registrations list with completed status and recording', async () => {
      const res = await request(app)
        .get('/api/live-classes/my/registrations')
        .set('Authorization', `Bearer ${studentEnrolledToken}`);

      expect(res.status).toBe(200);
      const pastItem = res.body.data.find((item: any) => item.liveClassId === pastClassId);
      expect(pastItem).toBeDefined();
      expect(pastItem.liveClass.status).toBe('COMPLETED');
      expect(pastItem.liveClass.recordingUrl).toBe('https://skillup.cdn.local/recordings/rsc-masterclass.mp4');
    });
  });
});
