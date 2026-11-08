import { Router } from 'express';
import { z } from 'zod';
import * as courseController from '../controllers/courseController';
import { authenticate, authorize, optionalAuthenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

const createCourseSchema = z.object({
  title: z.string().min(3),
  titleTa: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  description: z.string().min(10),
  descriptionTa: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  discountPrice: z.number().nonnegative().nullable().optional(),
  allowInstallments: z.boolean().optional(),
  minInstallmentAmount: z.number().nonnegative().nullable().optional(),
  installmentCount: z.number().int().nullable().optional(),
  installmentPolicy: z.enum(['FULL_ACCESS', 'RESTRICTED']).nullable().optional(),
  category: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  level: z.string().optional(),
  language: z.string().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  previewVideoUrl: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  instructorId: z.string().nullable().optional(),
});

const moduleSchema = z.object({
  title: z.string().min(2),
  titleTa: z.string().optional(),
  order: z.number().int().optional(),
});

const lessonSchema = z.object({
  title: z.string().min(2),
  titleTa: z.string().optional(),
  description: z.string().optional(),
  descriptionTa: z.string().optional(),
  videoUrl: z.string().optional(),
  duration: z.number().int().optional(),
  order: z.number().int().optional(),
  isFree: z.boolean().optional(),
});

// Categories & Courses
router.get('/categories', courseController.getCategories);
router.get('/', courseController.getCourses);
router.get('/:slug', optionalAuthenticate, courseController.getCourseBySlug);

// Course CRUD (Instructor / Admin)
router.post(
  '/',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(createCourseSchema),
  courseController.createCourse
);

router.patch(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.updateCourse
);

router.delete(
  '/:id',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.deleteCourse
);

// Modules and Lessons
router.get(
  '/:courseId/modules',
  authenticate,
  courseController.getCourseModules
);

router.post(
  '/:courseId/modules',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(moduleSchema),
  courseController.addModule
);

router.patch(
  '/modules/:moduleId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.updateModule
);

router.delete(
  '/modules/:moduleId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.deleteModule
);

router.post(
  '/modules/:moduleId/lessons',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  validate(lessonSchema),
  courseController.addLesson
);

router.patch(
  '/lessons/:lessonId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.updateLesson
);

router.delete(
  '/lessons/:lessonId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.deleteLesson
);

// Lesson Resources
router.post(
  '/lessons/:lessonId/resources',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.addLessonResource
);

router.delete(
  '/lessons/resources/:resourceId',
  authenticate,
  authorize('INSTRUCTOR', 'ADMIN'),
  courseController.deleteLessonResource
);

// Wishlist & Reviews
router.post('/:courseId/wishlist', authenticate, courseController.toggleWishlist);
router.post('/:courseId/reviews', authenticate, courseController.addReview);

export default router;
