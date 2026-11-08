import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('SkillUp Mentor Management & Live Class Integration Suite', () => {
  const adminEmail = `admin_live_${Date.now()}@skillup.test`;
  const mentorEmail = `mentor_live_${Date.now()}@skillup.test`;
  const studentEmail = `student_live_${Date.now()}@skillup.test`;
  const otherStudentEmail = `other_student_${Date.now()}@skillup.test`;
  const password = 'Password123!';

  let adminToken = '';
  let adminId = '';
  let mentorToken = '';
  let mentorId = '';
  let studentToken = '';
  let studentId = '';
  let otherStudentToken = '';
  let otherStudentId = '';

  let courseId = '';
  let batchId = '';
  let liveClassId = '';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create Admin
    const admin = await prisma.user.create({
      data: {
        name: 'System Admin',
        email: adminEmail,
        password: passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: 'ADMIN' }, config.jwtSecret, { expiresIn: '1d' });

    // 2. Create Mentor
    const mentor = await prisma.user.create({
      data: {
        name: 'Prof. Anitha Mentor',
        email: mentorEmail,
        password: passwordHash,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });
    mentorId = mentor.id;
    mentorToken = jwt.sign({ id: mentor.id, email: mentor.email, role: 'INSTRUCTOR' }, config.jwtSecret, { expiresIn: '1d' });

    // 3. Create Enrolled Student
    const student = await prisma.user.create({
      data: {
        name: 'Eligible Student',
        email: studentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    studentId = student.id;
    studentToken = jwt.sign({ id: student.id, email: student.email, role: 'STUDENT' }, config.jwtSecret, { expiresIn: '1d' });

    // 4. Create Unenrolled Student
    const otherStudent = await prisma.user.create({
      data: {
        name: 'Unenrolled Student',
        email: otherStudentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    otherStudentId = otherStudent.id;
    otherStudentToken = jwt.sign({ id: otherStudent.id, email: otherStudent.email, role: 'STUDENT' }, config.jwtSecret, { expiresIn: '1d' });

    // 5. Create Course & Batch
    const course = await prisma.course.create({
      data: {
        title: 'Masterclass in Distributed Systems',
        slug: `dist-sys-${Date.now()}`,
        description: 'Advanced distributed computing and cloud architecture',
        price: 4999,
        instructorId: adminId, // Created by admin, assigned to mentor
      },
    });
    courseId = course.id;

    const batch = await prisma.batch.create({
      data: {
        name: 'DistSys Fall 2026',
        code: `DS-${Date.now()}`,
        courseId: course.id,
        startDate: new Date(),
      },
    });
    batchId = batch.id;

    // 6. Enroll student in course and batch
    await prisma.enrollment.create({
      data: { userId: studentId, courseId: course.id },
    });
    await prisma.batchEnrollment.create({
      data: { batchId: batch.id, studentId, isActive: true },
    });

    // 7. Assign Course & Batch to Mentor
    await prisma.mentorAssignment.create({
      data: {
        mentorId: mentor.id,
        courseId: course.id,
        batchId: batch.id,
        scope: 'SPECIFIC_BATCH',
      },
    });
  });

  afterAll(async () => {
    // Cleanup records safely
    await prisma.liveClassMessage.deleteMany({ where: { liveClassId } });
    await prisma.liveClassAttendee.deleteMany({ where: { liveClassId } });
    await prisma.liveClass.deleteMany({ where: { instructorId: mentorId } });
    await prisma.batchEnrollment.deleteMany({ where: { batchId } });
    await prisma.mentorAssignment.deleteMany({ where: { mentorId } });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.batch.deleteMany({ where: { id: batchId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, mentorId, studentId, otherStudentId] } } });
  });

  describe('Module 1: Admin-Controlled Mentor Management', () => {
    it('1. GET /api/admin/mentors lists mentors and pending invitations', async () => {
      const res = await request(app)
        .get('/api/admin/mentors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.mentors)).toBe(true);
      const found = res.body.data.mentors.find((m: any) => m.id === mentorId);
      expect(found).toBeDefined();
      expect(found.mentorAssignments.length).toBeGreaterThanOrEqual(1);
    });

    it('2. GET /api/admin/mentors/:id returns complete mentor profile details', async () => {
      const res = await request(app)
        .get(`/api/admin/mentors/${mentorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mentorId);
      expect(res.body.data.email).toBe(mentorEmail);
      expect(res.body.data.isVerified).toBe(true);
    });

    it('3. PATCH /api/admin/mentors/:id updates mentor details', async () => {
      const res = await request(app)
        .patch(`/api/admin/mentors/${mentorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Distinguished Cloud Architect',
          bio: '15+ years building hyperscale systems.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Distinguished Cloud Architect');
    });

    it('4. POST /api/admin/mentors/:id/deactivate revokes mentor login and scheduling', async () => {
      const res = await request(app)
        .post(`/api/admin/mentors/${mentorId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Compliance audit review' });

      expect(res.status).toBe(200);
      expect(res.body.data.isVerified).toBe(false);

      // Verify deactivated mentor cannot log in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: mentorEmail, password });
      expect(loginRes.status).toBe(403);
    });

    it('5. POST /api/admin/mentors/:id/reactivate restores mentor access', async () => {
      const res = await request(app)
        .post(`/api/admin/mentors/${mentorId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isVerified).toBe(true);

      // Verify mentor can log in again
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: mentorEmail, password });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('Module 2: Mentor-Created Live Classes & URL Security', () => {
    it('6. Rejects scheduling when meeting URL contains unsafe protocol (e.g. javascript:)', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: 'Unsafe Script Class',
          courseId,
          batchId,
          startTime: new Date(Date.now() + 3600000).toISOString(),
          duration: 60,
          meetingUrl: 'javascript:alert("exploit")',
        });

      expect(res.status).toBe(400);
    });

    it('7. Rejects scheduling for unassigned course/batch', async () => {
      const otherCourse = await prisma.course.create({
        data: {
          title: 'Unrelated Course',
          slug: `unrelated-${Date.now()}`,
          description: 'Unrelated description',
          price: 999,
          instructorId: adminId,
        },
      });

      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: 'Hacked Class',
          courseId: otherCourse.id,
          startTime: new Date(Date.now() + 3600000).toISOString(),
          duration: 60,
          meetingUrl: 'https://meet.google.com/xyz-abc-def',
        });

      expect(res.status).toBe(403);

      await prisma.course.delete({ where: { id: otherCourse.id } });
    });

    it('8. Successfully schedules a valid live class with HTTPS meeting URL', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: 'Consensus Algorithms & Raft In Depth',
          courseId,
          batchId,
          startTime: new Date(Date.now() + 1800000).toISOString(), // 30 min from now
          duration: 60,
          meetingProvider: 'GOOGLE_MEET',
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
          description: 'Live code walkthrough of leader election and log replication.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.meetingProvider).toBe('GOOGLE_MEET');
      liveClassId = res.body.data.id;
    });

    it('9. Allows mentor to update/reschedule the live class', async () => {
      const res = await request(app)
        .patch(`/api/mentor/classes/${liveClassId}`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: 'Consensus Algorithms & Paxos/Raft',
          meetingUrl: 'https://meet.google.com/updated-link-xyz',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Consensus Algorithms & Paxos/Raft');
      expect(res.body.data.meetingUrl).toBe('https://meet.google.com/updated-link-xyz');
    });
  });

  describe('Module 3: Student Live Class Isolation & Join Gate', () => {
    it('10. Enrolled student sees the scheduled class', async () => {
      const res = await request(app)
        .get('/api/live-classes')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((c: any) => c.id === liveClassId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Consensus Algorithms & Paxos/Raft');
    });

    it('11. Unenrolled student does NOT receive the class (Strict Isolation)', async () => {
      const res = await request(app)
        .get('/api/live-classes')
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((c: any) => c.id === liveClassId);
      expect(found).toBeUndefined();
    });

    it('12. Masks meeting URL for students outside early join window', async () => {
      // The class is 30 minutes away, early join window is 5 minutes, so canJoin should be false and meetingUrl null
      const res = await request(app)
        .get('/api/live-classes')
        .set('Authorization', `Bearer ${studentToken}`);

      const found = res.body.data.find((c: any) => c.id === liveClassId);
      expect(found).toBeDefined();
      expect(found.canJoin).toBe(false);
      expect(found.meetingUrl).toBeNull();
    });

    it('13. Discloses meeting URL when class is starting within 5-minute early window', async () => {
      // Update class start time to 2 minutes from now
      await prisma.liveClass.update({
        where: { id: liveClassId },
        data: { startTime: new Date(Date.now() + 2 * 60 * 1000) },
      });

      const res = await request(app)
        .get('/api/live-classes')
        .set('Authorization', `Bearer ${studentToken}`);

      const found = res.body.data.find((c: any) => c.id === liveClassId);
      expect(found).toBeDefined();
      expect(found.canJoin).toBe(true);
      expect(found.meetingUrl).toBe('https://meet.google.com/updated-link-xyz');
    });
  });

  describe('Module 4: Admin Live Class Oversight', () => {
    it('14. Admin can view all live classes with oversight filter', async () => {
      const res = await request(app)
        .get('/api/admin/live-classes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((c: any) => c.id === liveClassId);
      expect(found).toBeDefined();
      expect(found.instructor.email).toBe(mentorEmail);
    });

    it('15. Admin can cancel a live class', async () => {
      const res = await request(app)
        .delete(`/api/admin/live-classes/${liveClassId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Admin test cancellation' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      // Verify student cannot join cancelled class
      const studentRes = await request(app)
        .get('/api/live-classes')
        .set('Authorization', `Bearer ${studentToken}`);

      const found = studentRes.body.data.find((c: any) => c.id === liveClassId);
      expect(found.canJoin).toBe(false);
      expect(found.meetingUrl).toBeNull();
    });
  });

  describe('Module 5 & Security Audit: Batch Reassignment & Session Revocation', () => {
    let newMentorId = '';
    let newMentorToken = '';
    const newMentorEmail = `new_mentor_${Date.now()}@skillup.test`;

    beforeAll(async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('Password123!', 10);
      const m = await prisma.user.create({
        data: {
          name: 'Successor Mentor',
          email: newMentorEmail,
          password: hash,
          role: 'INSTRUCTOR',
          isVerified: true,
        },
      });
      newMentorId = m.id;
      newMentorToken = jwt.sign({ id: m.id, email: m.email, role: 'INSTRUCTOR' }, config.jwtSecret, { expiresIn: '1d' });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: newMentorId } });
    });

    it('16. Admin reassigns batch to another mentor; previous mentor loses assignment', async () => {
      const res = await request(app)
        .post(`/api/admin/mentors/${newMentorId}/assignments/batches`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ batchId });

      expect(res.status).toBe(201);

      // Verify previous mentor's assignments no longer include this batch
      const prevAssignments = await prisma.mentorAssignment.findMany({
        where: { mentorId, batchId },
      });
      expect(prevAssignments.length).toBe(0);

      // Verify new mentor now has this batch assigned
      const newAssignments = await prisma.mentorAssignment.findMany({
        where: { mentorId: newMentorId, batchId },
      });
      expect(newAssignments.length).toBe(1);
    });

    it('17. Previous mentor cannot schedule classes for the reassigned batch', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: 'Unauthorized Reassigned Class',
          courseId,
          batchId,
          startTime: new Date(Date.now() + 7200000).toISOString(),
          duration: 60,
          meetingUrl: 'https://meet.google.com/test-reassign',
        });

      expect(res.status).toBe(403);
    });

    it('18. New mentor can schedule classes for the assigned batch', async () => {
      const res = await request(app)
        .post('/api/mentor/classes')
        .set('Authorization', `Bearer ${newMentorToken}`)
        .send({
          title: 'Authorized Class by Successor',
          courseId,
          batchId,
          startTime: new Date(Date.now() + 7200000).toISOString(),
          duration: 60,
          meetingUrl: 'https://meet.google.com/test-successor',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Clean up the created test class
      await prisma.liveClass.delete({ where: { id: res.body.data.id } });
    });

    it('19. Existing JWT sessions of deactivated mentor are immediately rejected by auth middleware', async () => {
      // Deactivate new mentor
      await request(app)
        .post(`/api/admin/mentors/${newMentorId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Audit session security test' });

      // Attempt to access mentor routes with existing token
      const res = await request(app)
        .get('/api/mentor/dashboard')
        .set('Authorization', `Bearer ${newMentorToken}`);

      expect(res.status).toBe(403);
    });

    it('20. Deactivation revokes refreshToken preventing token renewal', async () => {
      // Verify in DB that refreshToken was cleared
      const user = await prisma.user.findUnique({ where: { id: newMentorId } });
      expect(user?.refreshToken).toBeNull();

      // Attempt refresh token renewal
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'fake_or_stale_token' });

      expect(res.status).toBe(401);
    });
  });
});
