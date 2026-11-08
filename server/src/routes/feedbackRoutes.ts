import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import * as feedbackCtrl from '../controllers/feedbackController';

const router = Router();

// Public feedback catalog & approved list
router.get('/public', feedbackCtrl.getPublicFeedbacks);

// Course-specific feedback (Public view for approved; Authenticated view includes user's own draft/pending feedback)
router.get('/course/:courseId', optionalAuthenticate, feedbackCtrl.getCourseFeedback);

// Student Endpoints (Strictly Authenticated)
router.post('/', authenticate, feedbackCtrl.submitStudentFeedback);
router.get('/my', authenticate, feedbackCtrl.getMyStudentFeedback);

// Mentor Endpoints (Strictly Authenticated)
router.post('/mentor', authenticate, feedbackCtrl.submitMentorFeedback);
router.get('/mentor/my', authenticate, feedbackCtrl.getMyMentorFeedback);

// Feedback modification & deletion (Owner or Admin)
router.put('/:id', authenticate, feedbackCtrl.updateFeedback);
router.delete('/:id', authenticate, feedbackCtrl.deleteFeedback);

export default router;

