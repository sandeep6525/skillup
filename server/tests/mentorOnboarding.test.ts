import request from 'supertest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

describe('Mentor Onboarding & Authentication Security Test Suite', () => {
  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@skillup.test`;
  const testAdminEmail = `admin_${timestamp}@skillup.test`;
  const testMentorEmail = `mentor_${timestamp}@skillup.test`;
  const duplicateMentorEmail = `dup_mentor_${timestamp}@skillup.test`;
  const defaultPassword = 'Password123!';

  let adminToken = '';
  let adminId = '';
  let studentToken = '';
  let studentId = '';
  let createdMentorId = '';

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Create Admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: testAdminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminId = admin.id;

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testAdminEmail, password: defaultPassword });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create Student user
    const student = await prisma.user.create({
      data: {
        name: 'Regular Student',
        email: testStudentEmail,
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true,
      },
    });
    studentId = student.id;

    const studentLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testStudentEmail, password: defaultPassword });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup users and invitations
    await prisma.mentorInvitation.deleteMany({
      where: {
        email: { in: [testMentorEmail, duplicateMentorEmail] },
      },
    }).catch(() => {});

    if (createdMentorId) {
      await prisma.user.delete({ where: { id: createdMentorId } }).catch(() => {});
    }
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    if (adminId) {
      await prisma.user.delete({ where: { id: adminId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Public Registration Role Restrictions', () => {
    it('allows public registration with default STUDENT role', async () => {
      const publicStudentEmail = `public_student_${timestamp}@skillup.test`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Learner',
          email: publicStudentEmail,
          password: defaultPassword,
          role: 'STUDENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const pending = await prisma.oTPVerification.findUnique({
        where: { email: publicStudentEmail },
      });
      expect(pending).not.toBeNull();
      expect(pending?.role).toBe('STUDENT');

      // Cleanup pending record
      await prisma.oTPVerification.delete({ where: { id: pending!.id } });
    });

    it('rejects public registration attempts with INSTRUCTOR/Mentor role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fake Mentor',
          email: `fake_mentor_${timestamp}@skillup.test`,
          password: defaultPassword,
          role: 'INSTRUCTOR',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('restricted to Students');
    });

    it('rejects public registration attempts with ADMIN role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fake Admin',
          email: `fake_admin_${timestamp}@skillup.test`,
          password: defaultPassword,
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('restricted to Students');
    });
  });

  describe('2. Admin-Controlled Mentor Creation & Authorization', () => {
    let invitationActivationUrl = '';
    let rawActivationToken = '';

    it('rejects unauthenticated requests to create mentor accounts', async () => {
      const res = await request(app)
        .post('/api/admin/mentors/invite')
        .send({
          name: 'Unauthorized Mentor',
          email: testMentorEmail,
        });

      expect(res.status).toBe(401);
    });

    it('rejects student requests to create mentor accounts', async () => {
      const res = await request(app)
        .post('/api/admin/mentors/invite')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Unauthorized Mentor',
          email: testMentorEmail,
        });

      expect(res.status).toBe(403);
    });

    it('allows authorized Admin to onboard a mentor and generate activation token', async () => {
      const res = await request(app)
        .post('/api/admin/mentors/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Prof. Anitha Krishnan',
          email: testMentorEmail,
          title: 'Principal AI & Cloud Architect',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testMentorEmail);
      expect(res.body.data.name).toBe('Prof. Anitha Krishnan');

      invitationActivationUrl = res.body.data.activationUrl;
      expect(invitationActivationUrl).toBeDefined();

      // Extract raw token from activationUrl
      const urlObj = new URL(invitationActivationUrl);
      rawActivationToken = urlObj.searchParams.get('token') || '';
      expect(rawActivationToken).toBeTruthy();

      // Verify token in database is hashed, not exposed in plain text
      const tokenHashed = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
      const invRecord = await prisma.mentorInvitation.findFirst({
        where: { tokenHashed },
      });
      expect(invRecord).not.toBeNull();
      expect(invRecord?.isUsed).toBe(false);
    });

    it('rejects creating duplicate mentor with same email', async () => {
      // First onboard duplicate mentor
      await request(app)
        .post('/api/admin/mentors/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Mentor One',
          email: duplicateMentorEmail,
        });

      // Activate the mentor account
      const rawTok = crypto.randomBytes(32).toString('hex');
      const tokenHashed = crypto.createHash('sha256').update(rawTok).digest('hex');
      await prisma.mentorInvitation.create({
        data: {
          name: 'Duplicate Mentor One',
          email: duplicateMentorEmail,
          tokenHashed,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      const activateRes = await request(app)
        .post('/api/auth/activate-mentor')
        .send({
          token: rawTok,
          password: 'NewSecurePassword123!',
        });
      expect(activateRes.status).toBe(200);

      const createdUser = await prisma.user.findUnique({ where: { email: duplicateMentorEmail } });
      expect(createdUser?.role).toBe('INSTRUCTOR');

      // Attempt to onboard again with same email
      const dupRes = await request(app)
        .post('/api/admin/mentors/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Mentor Two',
          email: duplicateMentorEmail,
        });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.error.message).toContain('already exists');

      // Cleanup
      await prisma.user.delete({ where: { id: createdUser!.id } }).catch(() => {});
    });

    it('validates activation token without exposing sensitive secrets', async () => {
      const res = await request(app)
        .get(`/api/auth/activate-mentor/validate?token=${rawActivationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testMentorEmail);
      expect(res.body.data.name).toBe('Prof. Anitha Krishnan');
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.tokenHashed).toBeUndefined();
    });

    it('allows mentor to activate account and set own password', async () => {
      const mentorNewPassword = 'MentorSecretPassword2026!';
      const res = await request(app)
        .post('/api/auth/activate-mentor')
        .send({
          token: rawActivationToken,
          password: mentorNewPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('INSTRUCTOR');
      expect(res.body.data.user.isVerified).toBe(true);
      createdMentorId = res.body.data.user.id;

      // Check mentor profile created
      const profile = await prisma.mentorProfile.findUnique({
        where: { userId: createdMentorId },
      });
      expect(profile).not.toBeNull();

      // Check invitation is marked used
      const invRecord = await prisma.mentorInvitation.findFirst({
        where: { email: testMentorEmail },
      });
      expect(invRecord?.isUsed).toBe(true);
    });

    it('prevents reusing an already used activation token', async () => {
      const res = await request(app)
        .post('/api/auth/activate-mentor')
        .send({
          token: rawActivationToken,
          password: 'AnotherPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('invalid, already used, or has expired');
    });

    it('rejects expired activation tokens', async () => {
      const expiredRawToken = crypto.randomBytes(32).toString('hex');
      const expiredHashed = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

      await prisma.mentorInvitation.create({
        data: {
          name: 'Expired Mentor',
          email: `expired_${timestamp}@skillup.test`,
          tokenHashed: expiredHashed,
          expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
        },
      });

      const res = await request(app)
        .post('/api/auth/activate-mentor')
        .send({
          token: expiredRawToken,
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('invalid, already used, or has expired');
    });

    it('ensures two concurrent activation requests cannot activate the same invitation twice', async () => {
      const concurrentEmail = `concurrent_mentor_${timestamp}@skillup.test`;
      const concurrentRawToken = crypto.randomBytes(32).toString('hex');
      const concurrentHashed = crypto.createHash('sha256').update(concurrentRawToken).digest('hex');

      await prisma.mentorInvitation.create({
        data: {
          name: 'Concurrent Mentor',
          email: concurrentEmail,
          tokenHashed: concurrentHashed,
          expiresAt: new Date(Date.now() + 86400000),
        },
      });

      // Issue 2 concurrent activation requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/auth/activate-mentor')
          .send({ token: concurrentRawToken, password: 'SecurePassword1!' }),
        request(app)
          .post('/api/auth/activate-mentor')
          .send({ token: concurrentRawToken, password: 'SecurePassword2!' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed (200) and the other must be rejected (400)
      expect(statuses).toEqual([200, 400]);

      const user = await prisma.user.findUnique({ where: { email: concurrentEmail } });
      expect(user).not.toBeNull();
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it('suppresses development activation preview in production environment', async () => {
      const prevEnv = process.env.NODE_ENV;
      const { config } = await import('../src/config');
      const originalNodeEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const prodEmail = `prod_mentor_${timestamp}@skillup.test`;
      const res = await request(app)
        .post('/api/admin/mentors/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Production Mentor',
          email: prodEmail,
        });

      config.nodeEnv = originalNodeEnv;

      expect(res.status).toBe(201);
      // In production, activationUrl must be undefined in response payload
      expect(res.body.data.activationUrl).toBeUndefined();

      await prisma.mentorInvitation.deleteMany({ where: { email: prodEmail } });
    });
  });

  describe('3. Role-Based Login Verification', () => {
    it('successfully logs in Student and returns STUDENT role for /dashboard redirection', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testStudentEmail, password: defaultPassword });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('STUDENT');
    });

    it('successfully logs in Mentor and returns INSTRUCTOR role for /mentor-dashboard redirection', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testMentorEmail, password: 'MentorSecretPassword2026!' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('INSTRUCTOR');
      expect(res.body.data.user.isVerified).toBe(true);
    });

    it('successfully logs in Admin and returns ADMIN role for /admin redirection', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testAdminEmail, password: defaultPassword });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('denies login for unapproved/unverified mentor accounts', async () => {
      const unverifiedMentorEmail = `unverified_mentor_${timestamp}@skillup.test`;
      const hashed = await bcrypt.hash(defaultPassword, 10);
      const unverified = await prisma.user.create({
        data: {
          name: 'Unverified Mentor',
          email: unverifiedMentorEmail,
          password: hashed,
          role: 'INSTRUCTOR',
          isVerified: false,
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: unverifiedMentorEmail, password: defaultPassword });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('pending activation or administrator approval');

      await prisma.user.delete({ where: { id: unverified.id } });
    });
  });
});
