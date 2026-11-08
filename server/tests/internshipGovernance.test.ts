import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

const app = createApp();

describe('SkillUp Internship Governance Suite', () => {
  let adminUser: any;
  let studentUser: any;
  let mentorUser: any;
  let adminToken: string;
  let studentToken: string;
  let mentorToken: string;
  let testInternshipId: string;

  beforeAll(async () => {
    // 1. Setup Admin
    adminUser = await prisma.user.create({
      data: {
        email: `intern.admin.${Date.now()}@skillup.test`,
        name: 'Internship Lead Admin',
        password: 'hashedpassword',
        role: 'ADMIN',
        isVerified: true,
      },
    });
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 2. Setup Student
    studentUser = await prisma.user.create({
      data: {
        email: `intern.student.${Date.now()}@skillup.test`,
        name: 'Sneha Rao',
        password: 'hashedpassword',
        role: 'STUDENT',
        isVerified: true,
        college: 'National Institute of Technology',
      },
    });
    studentToken = jwt.sign({ id: studentUser.id, role: studentUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 3. Setup Mentor
    mentorUser = await prisma.user.create({
      data: {
        email: `intern.mentor.${Date.now()}@skillup.test`,
        name: 'Dr. Anand Verma',
        password: 'hashedpassword',
        role: 'INSTRUCTOR',
        isVerified: true,
        title: 'Principal Systems Architect',
      },
    });
    mentorToken = jwt.sign({ id: mentorUser.id, role: mentorUser.role }, config.jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up test data
    if (testInternshipId) {
      await prisma.internshipApplication.deleteMany({ where: { internshipId: testInternshipId } });
      await prisma.internship.deleteMany({ where: { id: testInternshipId } });
    }
    await prisma.notification.deleteMany({
      where: { userId: { in: [adminUser.id, studentUser.id, mentorUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser.id, studentUser.id, mentorUser.id] } },
    });
    await prisma.$disconnect();
  });

  describe('1. Internship Program Lifecycle & Server RBAC', () => {
    it('Rejects non-admin attempts to create internship programs (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Hacker Internship',
          description: 'Unauthorized access',
          technologies: 'None',
        });

      expect(res.status).toBe(403);
    });

    it('Allows Admin to create a published internship program', async () => {
      const res = await request(app)
        .post('/api/internships')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'AI Full-Stack Systems Internship',
          description: 'Hands-on industry sprint on scalable architectures and LLM pipelines.',
          organization: 'SkillUp Cloud Labs',
          mentorId: mentorUser.id,
          technologies: 'React, TypeScript, Fastify, PyTorch',
          duration: '3 Months',
          deliveryMode: 'HYBRID',
          price: 0,
          availableSeats: 30,
          eligibility: 'Computer Science & IT Undergrads',
          isPublished: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe('AI Full-Stack Systems Internship');
      testInternshipId = res.body.data.id;
    });

    it('Public catalog returns the published internship', async () => {
      const res = await request(app).get('/api/internships');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((i: any) => i.id === testInternshipId);
      expect(found).toBeDefined();
      expect(found.organization).toBe('SkillUp Cloud Labs');
      expect(found.mentor?.name).toBe('Dr. Anand Verma');
    });

    it('Admin can update internship details (duration, seats, fee)', async () => {
      const res = await request(app)
        .patch(`/api/internships/${testInternshipId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          duration: '6 Months',
          availableSeats: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.duration).toBe('6 Months');
      expect(res.body.data.availableSeats).toBe(45);
    });
  });

  describe('2. Student Application & Duplicate Safeguards', () => {
    it('Requires student authentication to apply', async () => {
      const res = await request(app)
        .post(`/api/internships/${testInternshipId}/apply`)
        .send({ notes: 'Unauthenticated applicant' });

      expect(res.status).toBe(401);
    });

    it('Enrolled student can successfully apply for internship', async () => {
      const res = await request(app)
        .post(`/api/internships/${testInternshipId}/apply`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          notes: 'Interested in production LLMs and system design.',
          resumeUrl: 'https://github.com/sneha-rao/portfolio',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internshipId).toBe(testInternshipId);
      expect(res.body.data.userId).toBe(studentUser.id);
    });

    it('Rejects duplicate application when student is already enrolled (Duplicate prevention)', async () => {
      const res = await request(app)
        .post(`/api/internships/${testInternshipId}/apply`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ notes: 'Duplicate attempt' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/already actively enrolled/i);
    });

    it('Student can view their internship applications via /api/internships/my/applications', async () => {
      const res = await request(app)
        .get('/api/internships/my/applications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const appRecord = res.body.data.find((a: any) => a.internshipId === testInternshipId);
      expect(appRecord).toBeDefined();
    });
  });

  describe('3. Admin Governance: Applications Review, Approval, & Tracking', () => {
    let applicationId: string;

    it('Admin can view all applications across all programs', async () => {
      const res = await request(app)
        .get('/api/internships/admin/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((a: any) => a.internshipId === testInternshipId && a.userId === studentUser.id);
      expect(found).toBeDefined();
      expect(found.user.name).toBe('Sneha Rao');
      applicationId = found.id;
    });

    it('Admin updates application status to ACCEPTED or COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/internships/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'COMPLETED',
          notes: 'Finished all milestones with distinction.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('Student application reflects COMPLETED status in student portal', async () => {
      const res = await request(app)
        .get('/api/internships/my/applications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const myApp = res.body.data.find((a: any) => a.id === applicationId);
      expect(myApp.status).toBe('COMPLETED');
    });

    it('Admin can directly enroll a student or assign cohort placement', async () => {
      const res = await request(app)
        .post('/api/internships/admin/enroll')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          internshipId: testInternshipId,
          userId: studentUser.id,
          status: 'ACCEPTED',
          notes: 'Direct placement approved by Academic Dean',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
    });
  });
});
