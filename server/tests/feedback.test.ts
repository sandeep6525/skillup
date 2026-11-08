import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app';
import prisma from '../src/config/prisma';
import { config } from '../src/config';

const app = createApp();

describe('Feedback System Endpoints', () => {
  let studentToken: string;
  let mentorToken: string;
  let adminToken: string;
  let studentUser: any;
  let mentorUser: any;
  let adminUser: any;
  let course: any;
  let feedbackId: string;

  beforeAll(async () => {
    // Lookup existing seeded users & course
    studentUser = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
    mentorUser = await prisma.user.findFirst({ where: { role: 'INSTRUCTOR' } });
    adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    course = await prisma.course.findFirst();

    if (studentUser) {
      studentToken = jwt.sign({ id: studentUser.id, email: studentUser.email, role: studentUser.role }, config.jwtSecret);
    }
    if (mentorUser) {
      mentorToken = jwt.sign({ id: mentorUser.id, email: mentorUser.email, role: mentorUser.role }, config.jwtSecret);
    }
    if (adminUser) {
      adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: adminUser.role }, config.jwtSecret);
    }

    // Clean up any existing feedback for the test course to ensure clean state
    if (studentUser && course) {
      await prisma.course_feedbacks.deleteMany({
        where: { courseId: course.id },
      });
    }
  });

  afterAll(async () => {
    // Cleanup any created test feedbacks
    if (course) {
      await prisma.course_feedbacks.deleteMany({
        where: { courseId: course.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('Student Feedback Workflow', () => {
    it('1. Should fail submitting feedback without authentication', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({
          courseId: course.id,
          rating: 5,
          title: 'Unauthenticated review',
          comment: 'This should fail authentication validation',
        });
      expect(res.status).toBe(401);
    });

    it('2. Should allow enrolled student to submit valid feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          rating: 5,
          contentRating: 4,
          mentorRating: 5,
          title: 'Outstanding Python Course Experience',
          comment: 'The hands-on video lectures and practical exercises made learning very effective.',
          suggestions: 'Add more real-world asynchronous coding challenges.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.isPublished).toBe(false);
      feedbackId = res.body.data.id;
    });

    it('3. Should prevent duplicate student feedback for the same course', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          rating: 4,
          title: 'Second review attempt',
          comment: 'Duplicate submission should be rejected with 409 Conflict.',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('4. Student can view their submitted feedback under /api/feedback/my', async () => {
      const res = await request(app)
        .get('/api/feedback/my')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(feedbackId);
    });

    it('5. Student can edit their own feedback', async () => {
      const res = await request(app)
        .put(`/api/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 5,
          title: 'Updated Python Course Review',
          comment: 'Updated review content with additional praise for the curriculum.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Python Course Review');
    });
  });

  describe('Mentor Feedback Workflow', () => {
    it('6. Should allow assigned mentor to submit course feedback', async () => {
      const res = await request(app)
        .post('/api/feedback/mentor')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          courseId: course.id,
          rating: 5,
          engagementRating: 4,
          contentRating: 5,
          mentorRating: 5,
          title: 'Great student cohort engagement and participation',
          comment: 'Students actively participate in live sessions and complete assignments on time.',
          suggestions: 'Consider introducing weekly live office hours for advanced learners.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.feedbackType).toBe('MENTOR');
    });

    it('7. Mentor can fetch their submitted feedback under /api/feedback/mentor/my', async () => {
      const res = await request(app)
        .get('/api/feedback/mentor/my')
        .set('Authorization', `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((f: any) => f.feedbackType === 'MENTOR')).toBe(true);
    });
  });

  describe('Admin Moderation & Audit Trail', () => {
    it('8. Admin can list feedbacks and retrieve accurate analytics', async () => {
      const analyticsRes = await request(app)
        .get('/api/admin/feedback/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.data.totalFeedback).toBeGreaterThanOrEqual(2);
      expect(analyticsRes.body.data.pendingFeedback).toBeGreaterThanOrEqual(2);

      const listRes = await request(app)
        .get('/api/admin/feedback')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
    });

    it('9. Admin approves student feedback and publishes to homepage', async () => {
      const approveRes = await request(app)
        .patch(`/api/admin/feedback/${feedbackId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED', isPublished: true });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');
      expect(approveRes.body.data.isPublished).toBe(true);
    });

    it('10. Approved feedback now appears in public API and course feedback', async () => {
      const publicRes = await request(app).get('/api/feedback/public');
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.some((f: any) => f.id === feedbackId)).toBe(true);

      const courseRes = await request(app).get(`/api/feedback/course/${course.id}`);
      expect(courseRes.status).toBe(200);
      expect(courseRes.body.data.stats.avgStudentRating).toBe(5);
      expect(courseRes.body.data.studentReviews.length).toBeGreaterThan(0);
    });

    it('11. Admin can hide feedback from homepage', async () => {
      const hideRes = await request(app)
        .patch(`/api/admin/feedback/${feedbackId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPublished: false });

      expect(hideRes.status).toBe(200);
      expect(hideRes.body.data.isPublished).toBe(false);

      const homepageRes = await request(app).get('/api/feedback/public?homepageOnly=true');
      expect(homepageRes.body.data.some((f: any) => f.id === feedbackId)).toBe(false);
    });

    it('12. Admin can delete feedback with audit trail recording', async () => {
      const deleteRes = await request(app)
        .delete(`/api/admin/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify audit log exists
      const auditRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.data.some((log: any) => log.action === 'DELETE_FEEDBACK')).toBe(true);
    });
  });
});

