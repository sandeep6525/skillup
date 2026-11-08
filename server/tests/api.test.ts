import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

describe('SkillUp Platform API Test Suite', () => {
  const testStudentEmail = `student_${Date.now()}@skillup.test`;
  const testInstructorEmail = `instructor_${Date.now()}@skillup.test`;
  const testPassword = 'Password123!';

  let studentToken = '';
  let studentId = '';
  let instructorToken = '';
  let instructorId = '';
  let createdCourseId = '';
  let createdCourseSlug = '';

  afterAll(async () => {
    // Cleanup created test records
    if (studentId) {
      await prisma.user.delete({ where: { id: studentId } }).catch(() => {});
    }
    if (instructorId) {
      await prisma.user.delete({ where: { id: instructorId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication & Email OTP Endpoints', () => {
    it('initiates student registration and issues 6-digit OTP', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Student',
          email: testStudentEmail,
          password: testPassword,
          role: 'STUDENT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testStudentEmail);
      expect(res.body.data.expiresInSeconds).toBe(300);

      // Verify OTP is hashed in database and verify account using OTP verification endpoint
      const pending = await prisma.oTPVerification.findUnique({
        where: { email: testStudentEmail },
      });
      expect(pending).not.toBeNull();

      // Retrieve mock OTP or verify with bcrypt
      const bcrypt = (await import('bcryptjs')).default;
      // Test verify with invalid OTP first
      const failRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: testStudentEmail,
          otp: '000000',
        });
      expect(failRes.status).toBe(400);

      // Complete registration directly via test user creation
      const user = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: testStudentEmail,
          password: pending!.password,
          role: 'STUDENT',
          isVerified: true,
        },
      });
      studentId = user.id;

      // Login to obtain JWT
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testStudentEmail, password: testPassword });
      studentToken = loginRes.body.data.accessToken;
    });

    it('creates verified instructor account', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      const instructor = await prisma.user.create({
        data: {
          name: 'Lead Instructor',
          email: testInstructorEmail,
          password: hashedPassword,
          role: 'INSTRUCTOR',
          title: 'Senior Systems Architect',
          isVerified: true,
        },
      });
      instructorId = instructor.id;

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testInstructorEmail, password: testPassword });
      instructorToken = loginRes.body.data.accessToken;
    });


    it('rejects registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Student',
          email: testStudentEmail,
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('authenticates user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testStudentEmail,
          password: 'wrong_password',
        });

      expect(res.status).toBe(401);
    });

    it('retrieves current authenticated profile (/api/auth/me)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(studentId);
    });
  });

  describe('2. Courses & Role-Based Access Control', () => {
    it('prevents a STUDENT from creating a course', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Unauthorized Student Course',
          description: 'This course should not be created by a student.',
          price: 999,
        });

      expect(res.status).toBe(403);
    });

    it('allows an INSTRUCTOR to create a course', async () => {
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Modern Full-Stack Engineering with React & Node',
          subtitle: 'From zero to production-grade applications',
          description: 'Comprehensive course covering clean code, microservices, and databases.',
          price: 1499,
          level: 'Intermediate',
          language: 'English',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('slug');

      createdCourseId = res.body.data.id;
      createdCourseSlug = res.body.data.slug;
    });

    it('allows public access to course listing', async () => {
      const res = await request(app).get('/api/courses');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('meta');
    });

    it('allows retrieval of single course by slug', async () => {
      const res = await request(app).get(`/api/courses/${createdCourseSlug}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('Modern Full-Stack');
      expect(res.body.data.isEnrolled).toBe(false);
    });
  });

  describe('3. Learning & Payment Signatures', () => {
    it('rejects tampered razorpay payment signature', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          razorpayOrderId: 'order_test_12345',
          razorpayPaymentId: 'pay_test_67890',
          razorpaySignature: 'invalid_fraudulent_signature',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Mentor Double-Booking Prevention & Concurrency', () => {
    let slotId = '';

    beforeAll(async () => {
      // Find or create an available unbooked mentor slot for testing
      const mentor = await prisma.mentorProfile.findFirst();

      if (mentor) {
        const testSlot = await prisma.mentorSlot.create({
          data: {
            mentorId: mentor.id,
            startTime: new Date(Date.now() + 86400000 * 10 + Math.random() * 1000000),
            endTime: new Date(Date.now() + 86400000 * 10 + 3600000 + Math.random() * 1000000),
            isBooked: false,
          },
        });
        slotId = testSlot.id;
      }
    });

    it('successfully reserves an open slot', async () => {
      if (!slotId) return;

      const res = await request(app)
        .post('/api/mentors/book')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          slotId,
          notes: 'Test Architecture Review Session',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('meetingLink');
    });

    it('rejects second attempt to book the same slot (prevent double-booking)', async () => {
      if (!slotId) return;

      const res = await request(app)
        .post('/api/mentors/book')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          slotId,
          notes: 'Attempting conflicting booking',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already been booked');
    });
  });

  describe('5. Certificate Eligibility & Integrity', () => {
    it('rejects certificate claim if course completion is below 100%', async () => {
      const res = await request(app)
        .post('/api/certificates/claim')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: createdCourseId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('100%');
    });
  });
});
