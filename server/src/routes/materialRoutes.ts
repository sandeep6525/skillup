import { Router } from 'express';
import * as materialCtrl from '../controllers/materialController';
import { authenticate, optionalAuthenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public browse
router.get('/', materialCtrl.getMaterials);
router.get('/:id', optionalAuthenticate, materialCtrl.getMaterialById);

// Protected download - strictly restricted to platform ADMIN only
router.get('/:id/download', authenticate, authorize('ADMIN'), materialCtrl.downloadMaterial);

// Protected inline stream view - for in-dialog paper reader (no direct download)
router.get('/:id/view', authenticate, materialCtrl.streamMaterial);

// Student purchases
router.get('/my/purchases', authenticate, materialCtrl.getMyMaterials);

// Admin / Instructor upload & management
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN'), materialCtrl.createMaterial);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN'), materialCtrl.updateMaterial);
router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN'), materialCtrl.deleteMaterial);

export default router;
