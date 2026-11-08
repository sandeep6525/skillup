import { Router } from 'express';
import { authenticate, optionalAuthenticate, authorize } from '../middlewares/auth';
import * as extra from '../controllers/extraControllers';

import * as liveClassCtrl from '../controllers/liveClassController';

const router = Router();

// Mentors
router.get('/mentors', extra.getMentors);
router.get('/mentors/my-bookings', authenticate, extra.getMyMentorBookings);
router.post('/mentors/slots', authenticate, authorize('INSTRUCTOR', 'ADMIN'), extra.createMentorSlot);
router.post('/mentors/book', authenticate, extra.bookMentorSlot);

// Real-Time Live Classes & WebRTC Architecture
router.get('/live-classes', optionalAuthenticate, liveClassCtrl.getLiveClasses);
router.get('/live-classes/my/registrations', authenticate, liveClassCtrl.getStudentRegistrations);
router.get('/live-classes/:id', optionalAuthenticate, liveClassCtrl.getLiveClassById);
router.get('/live-classes/:id/meeting-url', authenticate, liveClassCtrl.getMeetingUrl);
router.post('/live-classes', authenticate, authorize('INSTRUCTOR', 'ADMIN'), liveClassCtrl.createLiveClass);
router.post('/live-classes/:id/start', authenticate, authorize('INSTRUCTOR', 'ADMIN'), liveClassCtrl.startLiveClass);
router.post('/live-classes/:id/end', authenticate, authorize('INSTRUCTOR', 'ADMIN'), liveClassCtrl.endLiveClass);
router.post('/live-classes/:id/join', authenticate, liveClassCtrl.joinLiveClass);
router.post('/live-classes/:id/leave', authenticate, liveClassCtrl.leaveLiveClass);
router.get('/live-classes/:id/messages', authenticate, liveClassCtrl.getLiveClassMessages);
router.post('/live-classes/:id/messages', authenticate, liveClassCtrl.sendLiveClassMessage);


// Assignments
router.get('/assignments', authenticate, extra.getAssignments);
router.post('/assignments/:assignmentId/submit', authenticate, extra.submitAssignment);

// Certificates
router.get('/certificates/my', authenticate, extra.getMyCertificates);
router.post('/certificates/claim', authenticate, extra.generateCertificate);
router.get('/certificates/:certificateNo/download', extra.downloadCertificate);

// Notifications
router.get('/notifications', authenticate, extra.getNotifications);
router.patch('/notifications/read', authenticate, extra.markNotificationsRead);
router.delete('/notifications/:id', authenticate, extra.deleteNotification);
router.delete('/notifications', authenticate, extra.clearAllNotifications);

// Support tickets
router.post('/tickets', authenticate, extra.createSupportTicket);
router.get('/tickets/my', authenticate, extra.getMyTickets);

// Admin stats & operations
router.get('/admin/stats', authenticate, authorize('ADMIN'), extra.getAdminStats);
router.get('/admin/users', authenticate, authorize('ADMIN'), extra.getAdminUsers);
router.patch('/admin/users/:userId/role', authenticate, authorize('ADMIN'), extra.updateAdminUserRole);
router.get('/admin/smtp/test', authenticate, authorize('ADMIN'), extra.testAdminSMTP);


// Partner Public endpoint
import { getPublicPartners } from '../controllers/partnerController';
router.get('/partners', getPublicPartners);

// Homepage CMS
router.get('/homepage', extra.getHomepageData);

export default router;
