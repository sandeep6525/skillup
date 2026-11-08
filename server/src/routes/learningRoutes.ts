import { Router } from 'express';
import { z } from 'zod';
import * as learningController from '../controllers/learningController';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

const progressSchema = z.object({
  lastPosition: z.number().int().nonnegative().optional(),
  isCompleted: z.boolean().optional(),
});

// Stream lesson data allows free preview without strict login, but verifies enrollment for paid lessons
router.get('/lessons/:lessonId', optionalAuthenticate, learningController.getLessonStreamData);

// All subsequent routes require authenticated user
router.use(authenticate);

router.get('/my-courses', learningController.getEnrolledCourses);
router.get('/dashboard-summary', learningController.getStudentDashboardSummary);
router.post(
  '/lessons/:lessonId/progress',
  validate(progressSchema),
  learningController.updateLessonProgress
);
router.get('/resources/:resourceId/download', learningController.downloadLessonResource);

export default router;
