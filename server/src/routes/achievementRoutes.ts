import { Router } from 'express';
import * as ctrl from '../controllers/achievementController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public routes
router.get('/', ctrl.getPublicAchievements);
router.get('/categories', ctrl.getCategories);
router.get('/:slugOrId', ctrl.getAchievementBySlugOrId);

// Admin routes
router.get('/admin/all', authenticate, authorize('ADMIN'), ctrl.getAdminAchievements);
router.post('/admin', authenticate, authorize('ADMIN'), ctrl.createAchievement);
router.patch('/admin/:id', authenticate, authorize('ADMIN'), ctrl.updateAchievement);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), ctrl.deleteAchievement);

router.post('/admin/categories', authenticate, authorize('ADMIN'), ctrl.createCategory);
router.delete('/admin/categories/:id', authenticate, authorize('ADMIN'), ctrl.deleteCategory);

export default router;

