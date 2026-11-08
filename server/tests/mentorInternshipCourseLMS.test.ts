import request from 'supertest';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';

describe('SkillUp Mentor & Student Learning Management System (Internship & Purchased Course)', () => {
  const app = createApp();

  let adminToken: string;
  let mentorToken: string;
  let unassignedMentorToken: string;
  let studentToken: string;
  let unenrolledStudentToken: string;

  let adminUser: any;
  let mentorUser: any;
  let unassignedMentorUser: any;
  let studentUser: any;
  let unenrolledStudentUser: any;

  let course: any;
  let internship: any;
  let testAssignment: any;
  let testMaterial: any;

  beforeAll(async () => {
    // Clean up past test LMS fixtures
    await prisma.internshipVideoLesson.deleteMany({
      where: {
        title: { contains: '[TEST_LMS]' }
      }
    });
    await prisma.assignmentSubmission.deleteMany({
      where: {
        assignment: {
          title: { contains: '[TEST_LMS]' }
        }
      }
    });
    await prisma.assignment.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.learningMaterial.deleteMany({
      where: { title: { contains: 'TEST_LMS' } }
    });
    await prisma.mentorAssignment.deleteMany({
      where: { mentor: { email: { contains: 'test.lms' } } }
    });
    await prisma.enrollment.deleteMany({
      where: { user: { email: { contains: 'test.lms' } } }
    });
    await prisma.internshipApplication.deleteMany({
      where: { user: { email: { contains: 'test.lms' } } }
    });
    await prisma.course.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.internship.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.lms' } }
    });

    const hashedPassword = 'MockHashedPassword$2b$10$abcdefghijklmnopqrstuvwxyz123456';

    // 1. Create Admin
    adminUser = await prisma.user.create({
      data: {
        name: 'LMS Admin',
        email: 'admin.test.lms@skillup.local',
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true
      }
    });
    adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 2. Create Assigned Mentor
    mentorUser = await prisma.user.create({
      data: {
        name: 'Assigned Mentor',
        email: 'mentor.assigned.test.lms@skillup.local',
        password: hashedPassword,
        role: 'INSTRUCTOR',
        isVerified: true
      }
    });
    mentorToken = jwt.sign({ id: mentorUser.id, email: mentorUser.email, role: mentorUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 3. Create Unassigned Mentor
    unassignedMentorUser = await prisma.user.create({
      data: {
        name: 'Unassigned Mentor',
        email: 'mentor.unassigned.test.lms@skillup.local',
        password: hashedPassword,
        role: 'INSTRUCTOR',
        isVerified: true
      }
    });
    unassignedMentorToken = jwt.sign({ id: unassignedMentorUser.id, email: unassignedMentorUser.email, role: unassignedMentorUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 4. Create Enrolled Student
    studentUser = await prisma.user.create({
      data: {
        name: 'Enrolled Student',
        email: 'student.enrolled.test.lms@skillup.local',
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true
      }
    });
    studentToken = jwt.sign({ id: studentUser.id, email: studentUser.email, role: studentUser.role }, config.jwtSecret, { expiresIn: '1h' });

    // 5. Create Unenrolled Student
    unenrolledStudentUser = await prisma.user.create({
      data: {
        name: 'Unenrolled Student',
        email: 'student.unenrolled.test.lms@skillup.local',
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true
      }
    });
    unenrolledStudentToken = jwt.sign({ id: unenrolledStudentUser.id, email: unenrolledStudentUser.email, role: unenrolledStudentUser.role }, config.jwtSecret, { expiresIn: '1h' });

    let category = await prisma.category.findFirst({ where: { slug: 'full-stack-development' } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Full-Stack Development',
          slug: 'full-stack-development',
          description: 'Web development courses'
        }
      });
    }

    // 6. Create Course and Internship
    course = await prisma.course.create({
      data: {
        title: '[TEST_LMS] Cloud Native Microservices',
        slug: `test-lms-microservices-${Date.now()}`,
        description: 'Advanced production microservices architecture',
        price: 2499,
        discountPrice: 1999,
        level: 'Intermediate',
        language: 'English',
        instructorId: mentorUser.id,
        categoryId: category.id,
        status: 'PUBLISHED'
      }
    });

    internship = await prisma.internship.create({
      data: {
        title: '[TEST_LMS] Full-Stack Software Engineering Internship',
        organization: 'SkillUp Tech Labs',
        description: '3-Month Intensive Industry Practicum',
        technologies: 'React, TypeScript, Express, MySQL',
        duration: '12 Weeks',
        price: 4999,
        mentorId: mentorUser.id,
        isPublished: true
      }
    });

    // 7. Enroll Student in Course & Internship
    await prisma.enrollment.create({
      data: {
        userId: studentUser.id,
        courseId: course.id,
        progress: 10
      }
    });

    await prisma.internshipApplication.create({
      data: {
        userId: studentUser.id,
        internshipId: internship.id,
        status: 'ACCEPTED',
        resumeUrl: 'https://skillup.local/resumes/student.pdf'
      }
    });
  });

  afterAll(async () => {
    await prisma.internshipVideoLesson.deleteMany({
      where: {
        title: { contains: '[TEST_LMS]' }
      }
    });
    await prisma.assignmentSubmission.deleteMany({
      where: {
        assignment: {
          title: { contains: '[TEST_LMS]' }
        }
      }
    });
    await prisma.assignment.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.learningMaterial.deleteMany({
      where: { title: { contains: 'TEST_LMS' } }
    });
    await prisma.mentorAssignment.deleteMany({
      where: { mentor: { email: { contains: 'test.lms' } } }
    });
    await prisma.enrollment.deleteMany({
      where: { user: { email: { contains: 'test.lms' } } }
    });
    await prisma.internshipApplication.deleteMany({
      where: { user: { email: { contains: 'test.lms' } } }
    });
    await prisma.course.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.internship.deleteMany({
      where: { title: { contains: '[TEST_LMS]' } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.lms' } }
    });
    await prisma.$disconnect();
  });

  describe('1. Internship Learning Management & Access Control', () => {
    it('should allow enrolled student to access internship learning portal', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/learning`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internship.id).toBe(internship.id);
      expect(res.body.data.learningMaterials).toBeInstanceOf(Array);
      expect(res.body.data.assignments).toBeInstanceOf(Array);
    });

    it('should reject unenrolled student from internship learning portal with 403', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/learning`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow assigned mentor to access internship learning management portal with roster', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/learning`)
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enrolledStudents).toBeInstanceOf(Array);
      expect(res.body.data.enrolledStudents.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.enrolledStudents[0].email).toBe(studentUser.email);
    });

    it('should reject unassigned mentor from internship learning portal with 403', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/learning`)
        .set('Authorization', `Bearer ${unassignedMentorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow platform ADMIN to view internship learning portal directly', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/learning`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internship.title).toBe(internship.title);
    });
  });

  describe('2. Mentor Learning Materials & Assignments for Internships & Courses', () => {
    it('should allow assigned mentor to upload internship learning material with module categorization', async () => {
      const res = await request(app)
        .post('/api/mentor/materials')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: '[TEST_LMS] Week 1: Microservices Architecture Blueprint',
          description: 'System decomposition and domain-driven design spec',
          fileUrl: 'https://skillup.local/docs/week1-spec.pdf',
          fileType: 'DOCUMENT',
          fileSize: 1048576,
          internshipId: internship.id,
          module: 'Module 1: Architecture'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internshipId).toBe(internship.id);
      expect(res.body.data.module).toBe('Module 1: Architecture');
      testMaterial = res.body.data;
    });

    it('should allow assigned mentor to create an internship milestone assignment', async () => {
      const res = await request(app)
        .post('/api/mentor/assignments')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: '[TEST_LMS] Milestone 1: Distributed Tracing & OpenTelemetry',
          description: 'Implement distributed tracing across order and payment services',
          instructions: 'Submit your GitHub repo with Docker Compose setup',
          internshipId: internship.id,
          module: 'Module 1: Architecture',
          dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          totalMarks: 100,
          isPublished: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internshipId).toBe(internship.id);
      expect(res.body.data.module).toBe('Module 1: Architecture');
      testAssignment = res.body.data;
    });

    it('should display the internship assignment in mentor assignment list', async () => {
      const res = await request(app)
        .get('/api/mentor/assignments')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((a: any) => a.id === testAssignment.id);
      expect(found).toBeDefined();
      expect(found.internship.id).toBe(internship.id);
    });

    it('should allow mentor to update assignment instructions and marks', async () => {
      const res = await request(app)
        .patch(`/api/mentor/assignments/${testAssignment.id}`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: '[TEST_LMS] Milestone 1: Distributed Tracing & OpenTelemetry (Updated)',
          totalPoints: 120
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPoints).toBe(120);
    });
  });

  describe('3. Student Deliverable Submission, Review, Revision & Grading Workflow', () => {
    let submissionId: string;

    it('should allow enrolled student to submit assignment deliverable', async () => {
      const res = await request(app)
        .post(`/api/assignments/${testAssignment.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          fileUrl: 'https://github.com/student/microservices-telemetry',
          content: 'Configured Jaeger tracing with Docker Compose and test scripts.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignmentId).toBe(testAssignment.id);
      expect(res.body.data.status).toBe('SUBMITTED');
      submissionId = res.body.data.id;
    });

    it('should allow mentor to request revisions (NEEDS_REVISION) with feedback', async () => {
      const res = await request(app)
        .patch(`/api/mentor/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          grade: 0,
          feedback: 'Please include the docker-compose.yml file and Jaeger span screenshots in README.',
          status: 'NEEDS_REVISION'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('NEEDS_REVISION');
    });

    it('should allow student to resubmit deliverable after mentor requested revision', async () => {
      const res = await request(app)
        .post(`/api/assignments/${testAssignment.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          fileUrl: 'https://github.com/student/microservices-telemetry-revised',
          content: 'Added docker-compose and Jaeger screenshots as requested.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.content).toContain('Added docker-compose');
    });

    it('should allow mentor to evaluate and finalize grade (GRADED)', async () => {
      const res = await request(app)
        .patch(`/api/mentor/submissions/${submissionId}/grade`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          grade: 115,
          feedback: 'Excellent work! Tracing spans and docker setup verified.',
          status: 'GRADED'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('GRADED');
      expect(res.body.data.grade).toBe(115);
    });
  });

  describe('4. Administrative Global Oversight for Materials & Submissions', () => {
    it('should allow admin to list all platform learning materials without mentor impersonation', async () => {
      const res = await request(app)
        .get('/api/admin/materials')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      const found = res.body.data.find((m: any) => m.id === testMaterial.id);
      expect(found).toBeDefined();
    });

    it('should allow admin to list all platform assignments across courses & internships', async () => {
      const res = await request(app)
        .get('/api/admin/assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      const found = res.body.data.find((a: any) => a.id === testAssignment.id);
      expect(found).toBeDefined();
    });

    it('should allow admin to inspect all student submissions across programs', async () => {
      const res = await request(app)
        .get('/api/admin/submissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      const found = res.body.data.find((s: any) => s.assignmentId === testAssignment.id);
      expect(found).toBeDefined();
      expect(found.grade).toBe(115);
      expect(found.status).toBe('GRADED');
    });
  });

  describe('5. Recorded Video Lessons Management & Student Access (Internship Learning)', () => {
    let createdVideoLessonId: string;

    it('should allow assigned mentor to create recorded video lesson with order and module', async () => {
      const res = await request(app)
        .post(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: '[TEST_LMS] Lesson 1: Microservices Container Orchestration',
          description: 'Docker Compose, networking boundaries, and service discovery walkthrough',
          videoUrl: 'https://skillup.local/videos/lesson1-microservices.mp4',
          thumbnailUrl: 'https://skillup.local/thumbs/lesson1.jpg',
          moduleName: 'Module 1: Architecture',
          lessonOrder: 1,
          duration: 55,
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.internshipId).toBe(internship.id);
      expect(res.body.data.lessonOrder).toBe(1);
      expect(res.body.data.enrolledStudentsCount).toBeGreaterThanOrEqual(1);
      createdVideoLessonId = res.body.data.id;
    });

    it('should reject unassigned mentor from creating video lesson on internship', async () => {
      const res = await request(app)
        .post(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${unassignedMentorToken}`)
        .send({
          title: '[TEST_LMS] Unauthorized Video Attempt',
          videoUrl: 'https://skillup.local/videos/hack.mp4',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow enrolled student to access published video lessons', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      const found = res.body.data.find((v: any) => v.id === createdVideoLessonId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PUBLISHED');
    });

    it('should reject unenrolled student from accessing video lessons (403)', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${unenrolledStudentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow mentor to update video lesson details and status', async () => {
      const res = await request(app)
        .patch(`/api/internships/videos/${createdVideoLessonId}`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          title: '[TEST_LMS] Lesson 1: Microservices Container Orchestration (Updated)',
          duration: 60,
          status: 'DRAFT',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.duration).toBe(60);
    });

    it('should hide DRAFT video lesson from enrolled students', async () => {
      const res = await request(app)
        .get(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.find((v: any) => v.id === createdVideoLessonId);
      expect(found).toBeUndefined(); // Filtered out for regular enrolled students
    });

    it('should allow mentor to publish DRAFT video lesson so students see it immediately', async () => {
      const updateRes = await request(app)
        .patch(`/api/internships/videos/${createdVideoLessonId}`)
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          status: 'PUBLISHED',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('PUBLISHED');

      // Immediate visibility check for enrolled student
      const studentRes = await request(app)
        .get(`/api/internships/${internship.id}/videos`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentRes.status).toBe(200);
      const found = studentRes.body.data.find((v: any) => v.id === createdVideoLessonId);
      expect(found).toBeDefined();
    });

    it('should allow student to fetch single video lesson details with authorized URL', async () => {
      const res = await request(app)
        .get(`/api/internships/videos/${createdVideoLessonId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.videoUrl).toContain('lesson1-microservices.mp4');
    });

    it('should allow assigned mentor to delete video lesson', async () => {
      const res = await request(app)
        .delete(`/api/internships/videos/${createdVideoLessonId}`)
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get(`/api/internships/videos/${createdVideoLessonId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
