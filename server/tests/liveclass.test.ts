import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

describe('SkillUp Live Classroom & WebRTC API Suite', () => {
  const instructorEmail = `instr_live_${Date.now()}@skillup.test`;
  const studentEmail = `student_live_${Date.now()}@skillup.test`;
  const password = 'Password123!';

  let instructorToken = '';
  let instructorId = '';
  let studentToken = '';
  let studentId = '';
  let liveClassId = '';

  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const jwt = (await import('jsonwebtoken')).default;
    const { config } = await import('../src/config');
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create Instructor
    const instructor = await prisma.user.create({
      data: {
        name: 'Live Instructor',
        email: instructorEmail,
        password: passwordHash,
        role: 'INSTRUCTOR',
        isVerified: true,
      },
    });
    instructorId = instructor.id;
    instructorToken = jwt.sign(
      { id: instructor.id, email: instructor.email, role: instructor.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    // 2. Create Student
    const student = await prisma.user.create({
      data: {
        name: 'Live Student',
        email: studentEmail,
        password: passwordHash,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    studentId = student.id;
    studentToken = jwt.sign(
      { id: student.id, email: student.email, role: student.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
  });

  afterAll(async () => {
    // Cleanup
    if (liveClassId) {
      await prisma.liveClassMessage.deleteMany({ where: { liveClassId } });
      await prisma.liveClassAttendee.deleteMany({ where: { liveClassId } });
      await prisma.liveClass.delete({ where: { id: liveClassId } }).catch(() => {});
    }
    if (instructorId) {
      await prisma.user.delete({ where: { id: instructorId } }).catch(() => {});
    }
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Rejects live class creation by unauthenticated user', async () => {
    const res = await request(app)
      .post('/api/live-classes')
      .send({ title: 'Unauthorized class', startTime: new Date() });
    expect(res.status).toBe(401);
  });

  it('2. Rejects live class creation by student role', async () => {
    const res = await request(app)
      .post('/api/live-classes')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student attempt', startTime: new Date() });
    expect(res.status).toBe(403);
  });

  it('3. Allows instructor to create a live class with unique roomName', async () => {
    const res = await request(app)
      .post('/api/live-classes')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'Microservices & WebRTC Architecture Masterclass',
        description: 'Hands-on WebRTC and distributed streaming workshop',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        duration: 90,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.roomName).toContain('skillup-room-');
    liveClassId = res.body.data.id;
  });

  it('4. Allows instructor to start the live class session', async () => {
    const res = await request(app)
      .post(`/api/live-classes/${liveClassId}/start`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('LIVE');
    expect(res.body.data.actualStart).toBeDefined();
  });

  it('5. Issues short-lived LiveKit token for joining student & logs attendance', async () => {
    const res = await request(app)
      .post(`/api/live-classes/${liveClassId}/join`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.isHost).toBe(false);
    expect(res.body.data.roomName).toBeDefined();

    // Verify attendee record in MySQL
    const attendee = await prisma.liveClassAttendee.findUnique({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: studentId,
        },
      },
    });
    expect(attendee).not.toBeNull();
    expect(attendee?.role).toBe('STUDENT');
  });

  it('6. Records and persists live chat messages in database', async () => {
    const sendRes = await request(app)
      .post(`/api/live-classes/${liveClassId}/messages`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ text: 'Hello instructor, does WebRTC support SFU cascading?' });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.data.text).toBe('Hello instructor, does WebRTC support SFU cascading?');

    // Retrieve chat history
    const getRes = await request(app)
      .get(`/api/live-classes/${liveClassId}/messages`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('7. Prevents students from ending an instructor class session', async () => {
    const res = await request(app)
      .post(`/api/live-classes/${liveClassId}/end`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('8. Allows student to leave session safely and updates attendance duration', async () => {
    const res = await request(app)
      .post(`/api/live-classes/${liveClassId}/leave`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const attendee = await prisma.liveClassAttendee.findUnique({
      where: {
        liveClassId_userId: {
          liveClassId,
          userId: studentId,
        },
      },
    });
    expect(attendee?.leftAt).toBeDefined();
  });

  it('9. Allows authorized instructor to end the live class session', async () => {
    const res = await request(app)
      .post(`/api/live-classes/${liveClassId}/end`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.actualEnd).toBeDefined();
  });
});
