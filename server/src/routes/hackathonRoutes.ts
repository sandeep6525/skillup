import { Router } from 'express';
import * as hackathonCtrl from '../controllers/hackathonController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public
router.get('/', hackathonCtrl.getHackathons);
router.get('/:id', hackathonCtrl.getHackathonById);

// Student
router.post('/:id/register', authenticate, hackathonCtrl.registerHackathon);
router.get('/my/registrations', authenticate, hackathonCtrl.getMyHackathons);

// Admin
router.post('/', authenticate, authorize('ADMIN'), hackathonCtrl.createHackathon);
router.patch('/:id', authenticate, authorize('ADMIN'), hackathonCtrl.updateHackathon);
router.get('/:id/participants', authenticate, authorize('ADMIN'), hackathonCtrl.getHackathonParticipants);
router.delete('/:id', authenticate, authorize('ADMIN'), hackathonCtrl.deleteHackathon);

export default router;
