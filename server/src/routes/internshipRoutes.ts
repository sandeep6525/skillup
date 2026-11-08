import { Router } from 'express';
import * as internshipCtrl from '../controllers/internshipController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public
router.get('/', internshipCtrl.getInternships);
router.get('/:id', internshipCtrl.getInternshipById);

// Student & Enrolled Learner
router.post('/:id/apply', authenticate, internshipCtrl.applyInternship);
router.get('/my/applications', authenticate, internshipCtrl.getMyInternshipApplications);
router.get('/:id/learning', authenticate, internshipCtrl.getInternshipLearningData);
router.get('/:id/videos', authenticate, internshipCtrl.getInternshipVideoLessons);
router.get('/videos/:lessonId', authenticate, internshipCtrl.getInternshipVideoLessonById);

// Mentor & Admin Video Lesson Management
router.post('/:id/videos', authenticate, authorize('INSTRUCTOR', 'ADMIN'), internshipCtrl.createInternshipVideoLesson);
router.patch('/videos/:lessonId', authenticate, authorize('INSTRUCTOR', 'ADMIN'), internshipCtrl.updateInternshipVideoLesson);
router.delete('/videos/:lessonId', authenticate, authorize('INSTRUCTOR', 'ADMIN'), internshipCtrl.deleteInternshipVideoLesson);

// Admin
router.get('/admin/all', authenticate, authorize('ADMIN'), internshipCtrl.getAdminInternships);
router.get('/admin/applications', authenticate, authorize('ADMIN'), internshipCtrl.getAllInternshipApplications);
router.post('/admin/enroll', authenticate, authorize('ADMIN'), internshipCtrl.assignInternshipStudent);
router.post('/', authenticate, authorize('ADMIN'), internshipCtrl.createInternship);
router.patch('/:id', authenticate, authorize('ADMIN'), internshipCtrl.updateInternship);
router.delete('/:id', authenticate, authorize('ADMIN'), internshipCtrl.deleteInternship);
router.get('/:id/applicants', authenticate, authorize('ADMIN'), internshipCtrl.getInternshipApplicants);
router.patch('/applications/:id/status', authenticate, authorize('ADMIN'), internshipCtrl.updateApplicationStatus);

export default router;
