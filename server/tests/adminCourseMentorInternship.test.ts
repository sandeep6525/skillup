import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

describe('SkillUp Admin Mentor Assignment, Course Update & Internship Mentor Assignment Suite', () => {
  const app = createApp();
  let adminToken: string;
  let mentorToken: string;
  let studentToken: string;

  let adminUser: any;
  let mentorUser: any;
  let studentUser: any;

  let testCourse: any;
  let testBatch: any;
  let testInternship: any;

  beforeAll(async () => {
    // 1. Create or ensure Admin User
    adminUser = await prisma.user.upsert({
      where: { email: 'admin.verify.flow@skillup.local' },
      update: { role: 'ADMIN', isVerified: true },
      create: {
        name: 'System Admin Flow Tester',
        email: 'admin.verify.flow@skillup.local',
        password: 'Password123!',
        role: 'ADMIN',
        isVerified: true,
      },
    });

    // 2. Create or ensure Teaching Mentor
    mentorUser = await prisma.user.upsert({
      where: { email: 'mentor.verify.flow@skillup.local' },
      update: { role: 'INSTRUCTOR', isVerified: true },
      create: {
        name: 'Ananya Sharma',
        email: 'mentor.verify.flow@skillup.local',
        password: 'Password123!',
        role: 'INSTRUCTOR',
        isVerified: true,
        title: 'Lead Full-Stack Instructor',
      },
    });

    // 3. Create or ensure Student
    studentUser = await prisma.user.upsert({
      where: { email: 'student.verify.flow@skillup.local' },
      update: { role: 'STUDENT', isVerified: true },
      create: {
        name: 'Karthik Raja',
        email: 'student.verify.flow@skillup.local',
        password: 'Password123!',
        role: 'STUDENT',
        isVerified: true,
      },
    });

    // Generate JWT tokens
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    mentorToken = jwt.sign(
      { id: mentorUser.id, email: mentorUser.email, role: mentorUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: studentUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 4. Create Category & Test Course owned by admin initially
    let category = await prisma.category.findFirst({ where: { name: 'Full-Stack Development' } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Full-Stack Development',
          slug: 'full-stack-development',
          description: 'Web development courses',
        },
      });
    }

    testCourse = await prisma.course.create({
      data: {
        title: 'Advanced React & Node Architecture',
        slug: `advanced-react-node-${Date.now()}`,
        description: 'Comprehensive industry course on React, Node.js, and Prisma databases.',
        price: 2999,
        discountPrice: 1999,
        level: 'Intermediate',
        language: 'English',
        instructorId: adminUser.id,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    });

    testBatch = await prisma.batch.create({
      data: {
        name: 'React 2026 Batch A',
        code: `R26A-${Date.now().toString().slice(-4)}`,
        courseId: testCourse.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    // Create an enrollment for student in course
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: studentUser.id,
          courseId: testCourse.id,
        },
      },
      update: {},
      create: {
        userId: studentUser.id,
        courseId: testCourse.id,
        progress: 15,
      },
    });

    // Create a base internship
    testInternship = await prisma.internship.create({
      data: {
        title: 'Full-Stack Software Engineering Internship',
        description: 'Hands-on practical industry engineering program.',
        technologies: 'React, TypeScript, Express, MySQL',
        organization: 'SkillUp Cloud Systems',
        price: 4999,
        isPublished: true,
        availableSeats: 30,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created records
    try {
      if (testCourse) {
        await prisma.mentorAssignment.deleteMany({ where: { courseId: testCourse.id } });
        await prisma.batchEnrollment.deleteMany({ where: { batch: { courseId: testCourse.id } } });
        await prisma.batch.deleteMany({ where: { courseId: testCourse.id } });
        await prisma.enrollment.deleteMany({ where: { courseId: testCourse.id } });
        await prisma.course.delete({ where: { id: testCourse.id } });
      }
      if (testInternship) {
        await prisma.internshipApplication.deleteMany({ where: { internshipId: testInternship.id } });
        await prisma.internship.delete({ where: { id: testInternship.id } });
      }
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'admin.verify.flow@skillup.local',
              'mentor.verify.flow@skillup.local',
              'student.verify.flow@skillup.local',
            ],
          },
        },
      });
    } catch {
      // Ignore cleanup error in tear down
    }
  });

  // =========================================================================
  // ISSUE 1: Admin Course Updates & Role Checks
  // =========================================================================
  describe('Issue 1: Course Update Permissions and Data Sanitization', () => {
    it('should allow platform ADMIN to update any course details without 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Advanced React & Node Architecture (Updated by Admin)',
          description: 'Updated comprehensive industry course on React and TypeScript.',
          price: 3499,
          level: 'Advanced',
          category: 'Full-Stack Development',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Advanced React & Node Architecture (Updated by Admin)');
      expect(Number(res.body.data.price)).toBe(3499);
      expect(res.body.data.level).toBe('Advanced');
    });

    it('should reject unauthorized student attempting to update course', async () => {
      const res = await request(app)
        .patch(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect([401, 403]).toContain(res.status);
    });

    it('should allow ADMIN to reassign instructorId to an authorized mentor', async () => {
      const res = await request(app)
        .patch(`/api/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          instructorId: mentorUser.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.instructorId).toBe(mentorUser.id);
    });
  });

  // =========================================================================
  // ISSUE 2: Admin Mentor Assignment Flow & Student Synchronization
  // =========================================================================
  describe('Issue 2: Admin Mentor Assignment (Course-wide & Specific Batch)', () => {
    it('should successfully assign mentor with Course-wide scope and synchronize enrolled students', async () => {
      const res = await request(app)
        .post('/api/admin/mentors/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mentorId: mentorUser.id,
          courseId: testCourse.id,
          batchId: null,
          scope: 'COURSE_WIDE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scope).toBe('COURSE_WIDE');
      expect(res.body.data.batchId).toBeNull();
      expect(res.body.data.courseId).toBe(testCourse.id);
      expect(res.body.data.mentorId).toBe(mentorUser.id);
    });

    it('should reflect course-wide student count in Admin Mentors query', async () => {
      const res = await request(app)
        .get('/api/admin/mentors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const targetMentor = res.body.data.mentors.find((m: any) => m.id === mentorUser.id);
      expect(targetMentor).toBeDefined();
      expect(targetMentor.assignedCoursesCount).toBeGreaterThanOrEqual(1);
      // Student count must be at least 1 since studentUser was enrolled
      expect(targetMentor.totalStudentsUnderCohorts).toBeGreaterThanOrEqual(1);
    });

    it('should make students visible in Mentor Portal roster (/mentor/students)', async () => {
      const res = await request(app)
        .get('/api/mentor/students')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const foundStudent = res.body.data.find((s: any) => s.id === studentUser.id);
      expect(foundStudent).toBeDefined();
      expect(foundStudent.email).toBe(studentUser.email);
    });

    it('should successfully assign mentor to a specific cohort batch and auto-enroll students into batchEnrollment', async () => {
      const res = await request(app)
        .post('/api/admin/mentors/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mentorId: mentorUser.id,
          courseId: testCourse.id,
          batchId: testBatch.id,
          scope: 'SPECIFIC_BATCH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scope).toBe('SPECIFIC_BATCH');
      expect(res.body.data.batchId).toBe(testBatch.id);

      // Verify that enrolled students were automatically synced to batchEnrollment
      const batchEnr = await prisma.batchEnrollment.findUnique({
        where: {
          batchId_studentId: {
            batchId: testBatch.id,
            studentId: studentUser.id,
          },
        },
      });
      expect(batchEnr).toBeDefined();
      expect(batchEnr?.isActive).toBe(true);
    });
  });

  // =========================================================================
  // ISSUE 3: Admin Internship Mentor Assignment Flow
  // =========================================================================
  describe('Issue 3: Internship Mentor Assignment and Portal Visibility', () => {
    it('should successfully assign a mentor to an internship via PATCH /api/internships/:id', async () => {
      const res = await request(app)
        .patch(`/api/internships/${testInternship.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mentorId: mentorUser.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mentorId).toBe(mentorUser.id);
      expect(res.body.data.mentor).toBeDefined();
      expect(res.body.data.mentor.id).toBe(mentorUser.id);
    });

    it('should display the internship in the Mentor Portal (/api/mentor/internships)', async () => {
      const res = await request(app)
        .get('/api/mentor/internships')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const foundInternship = res.body.data.find((i: any) => i.id === testInternship.id);
      expect(foundInternship).toBeDefined();
      expect(foundInternship.title).toBe(testInternship.title);
      expect(foundInternship.mentor.id).toBe(mentorUser.id);
    });

    it('should allow unassigning mentor from internship by passing empty string or null without database constraint errors', async () => {
      const res = await request(app)
        .patch(`/api/internships/${testInternship.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mentorId: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mentorId).toBeNull();
    });
  });
});
