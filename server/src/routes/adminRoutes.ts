import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import * as adminCtrl from '../controllers/adminController';
import * as courseAnalyticsCtrl from '../controllers/courseAnalyticsController';
import * as extra from '../controllers/extraControllers';

const router = Router();

// Enforce Admin authorization
router.use(authenticate);
router.use(authorize('ADMIN'));

// 1. Dashboard Overview Metrics & Telemetry
router.get('/overview', adminCtrl.getAdminOverview);
router.get('/overview/comprehensive', courseAnalyticsCtrl.getAdminComprehensiveAnalytics);

// 1b. Course-Wise Student Details & Complete Analytics Dashboard
router.get('/course-analytics/overview', courseAnalyticsCtrl.getAdminComprehensiveAnalytics);
router.get('/course-analytics/courses', courseAnalyticsCtrl.getAdminCourseAnalyticsList);
router.get('/courses/:courseId/analytics', courseAnalyticsCtrl.getAdminSingleCourseAnalytics);
router.get('/courses/:courseId/students', courseAnalyticsCtrl.getAdminCourseStudentsDirectory);
router.get('/courses/:courseId/students/:studentId', courseAnalyticsCtrl.getAdminStudentCourseDetail);
router.get('/courses/:courseId/export', courseAnalyticsCtrl.exportCourseStudentsCSV);

// 1c. Admin Reports System (Excel, CSV, PDF)
router.get('/reports/students', courseAnalyticsCtrl.exportAllStudentsReport);
router.get('/reports/courses/:courseId/students', courseAnalyticsCtrl.exportCourseStudentsReport);
router.get('/reports/courses', courseAnalyticsCtrl.exportAllCoursesReport);

// 2. User Management
router.get('/users', adminCtrl.getAdminUsers);
router.patch('/users/:userId/role', adminCtrl.updateUserRole);
router.patch('/users/:userId/status', adminCtrl.toggleUserStatus);
router.delete('/users/:userId', adminCtrl.deleteAdminUser);

// 3. Mentor Management & Assignment
router.get('/mentors', adminCtrl.getAdminMentors);
router.post('/mentors/invite', adminCtrl.inviteMentor);
router.post('/mentors/assign', adminCtrl.assignMentorToScope);
router.get('/mentors/:id', adminCtrl.getAdminMentorById);
router.patch('/mentors/:id', adminCtrl.updateMentorProfile);
router.delete('/mentors/:id', adminCtrl.removeMentor);
router.post('/mentors/:id/resend-invitation', adminCtrl.resendMentorInvitation);
router.post('/mentors/:id/deactivate', adminCtrl.deactivateMentor);
router.post('/mentors/:id/reactivate', adminCtrl.reactivateMentor);
router.post('/mentors/:id/assignments/courses', adminCtrl.assignMentorCourse);
router.delete('/mentors/:id/assignments/courses/:courseId', adminCtrl.removeMentorCourse);
router.post('/mentors/:id/assignments/batches', adminCtrl.assignMentorBatch);
router.delete('/mentors/:id/assignments/batches/:batchId', adminCtrl.removeMentorBatch);

// 4. Batch Management
router.get('/batches', adminCtrl.getAdminBatches);
router.post('/batches', adminCtrl.createBatch);
router.delete('/batches/:batchId', adminCtrl.deleteAdminBatch);

// 5. Student Enrollment Administration
router.post('/students/enroll', adminCtrl.adminEnrollStudent);
router.delete('/students/:studentId/enrollments/:courseId', adminCtrl.removeStudentEnrollment);

import * as adminPaymentCtrl from '../controllers/adminPaymentController';

// 6. Course-Wise Payment Management & Financial Analytics
router.get('/payments', adminCtrl.getAdminOrders);
router.get('/payments/overview', adminPaymentCtrl.getAdminPaymentOverview);
router.get('/payments/courses', adminPaymentCtrl.getAdminCoursePayments);
router.get('/payments/courses/:courseId', adminPaymentCtrl.getAdminCoursePaymentDetail);
router.get('/payments/courses/:courseId/students', adminPaymentCtrl.getAdminCourseStudents);
router.get('/payments/students/:studentId', adminPaymentCtrl.getAdminStudentPaymentProfile);
router.get('/students/:studentId/courses/:courseId/payments', adminPaymentCtrl.getAdminStudentPaymentProfile);
router.get('/payments/export', adminPaymentCtrl.exportAdminPaymentsCSV);
router.get('/payments/transactions', adminPaymentCtrl.getAdminTransactions);
router.get('/payments/:paymentId', adminPaymentCtrl.getAdminTransactions);
router.post('/payments/reconcile/:paymentId', adminPaymentCtrl.reconcileAdminPayment);
router.post('/payments/refund', adminPaymentCtrl.processAdminRefund);
router.post('/payments/:paymentId/refund', (req, res, next) => {
  req.body.paymentId = req.params.paymentId;
  return adminPaymentCtrl.processAdminRefund(req, res, next);
});
router.post('/payments/offline', adminPaymentCtrl.recordAdminOfflinePayment);
router.post('/payments/payment-reminders', adminPaymentCtrl.sendPaymentReminder);
router.post('/payment-reminders', adminPaymentCtrl.sendPaymentReminder);
router.post('/payments/reset-all', adminPaymentCtrl.resetAllPaymentsAndEnrollments);
router.delete('/payments/:id', adminPaymentCtrl.deleteAdminPayment);
router.delete('/payments/orders/:id', adminPaymentCtrl.deleteAdminPayment);
router.post('/payments/:id/revoke-access', adminPaymentCtrl.revokeStudentPaymentAccess);

// Aliases matching prompt Section 8 specifications
router.get('/course-payments', adminPaymentCtrl.getAdminCoursePayments);
router.get('/course-payments/export', adminPaymentCtrl.exportAdminPaymentsCSV);
router.get('/course-payments/:courseId', adminPaymentCtrl.getAdminCoursePaymentDetail);
router.get('/course-payments/:courseId/students', adminPaymentCtrl.getAdminCourseStudents);
router.get('/course-payments/:courseId/export', adminPaymentCtrl.exportAdminPaymentsCSV);

// Backward-compatible Orders & Refund routes
router.get('/orders', adminCtrl.getAdminOrders);
router.post('/orders/:id/refund', adminCtrl.refundOrder);
router.delete('/orders/:id', adminPaymentCtrl.deleteAdminPayment);

// 7. Coupons & Discounts
router.get('/coupons', adminCtrl.getAdminCoupons);
router.post('/coupons', adminCtrl.createCoupon);
router.patch('/coupons/:id', adminCtrl.updateCoupon);
router.patch('/coupons/:id/toggle', adminCtrl.toggleCouponStatus);
router.delete('/coupons/:id', adminCtrl.deleteAdminCoupon);
router.get('/coupons/redemptions', adminCtrl.getCouponRedemptions);
router.get('/coupons/export-csv', adminCtrl.exportCouponRedemptionsCSV);

// 8. Mentor Earnings & Payouts
router.get('/payouts', adminCtrl.getAdminPayouts);
router.post('/payouts', adminCtrl.createMentorPayout);

// 9. Certificates
router.get('/certificates', adminCtrl.getAdminCertificates);
router.delete('/certificates/:id', adminCtrl.deleteAdminCertificate);

// 10. CMS & Announcements
router.get('/cms', adminCtrl.getAdminCMS);
router.post('/cms/banners', adminCtrl.createHeroBanner);

// 11. Audit Logs
router.get('/audit-logs', adminCtrl.getAdminAuditLogs);

// 12. Settings & Diagnostics
router.get('/settings', adminCtrl.getAdminSettings);
router.get('/smtp/test', extra.testAdminSMTP);

// 13. Support Tickets Administration
router.get('/tickets', adminCtrl.getAdminTickets);
router.patch('/tickets/:id/status', adminCtrl.updateAdminTicketStatus);
router.delete('/tickets/:id', adminCtrl.deleteAdminTicket);

// 14. Live Classes Administration
router.get('/live-classes', adminCtrl.getAdminLiveClasses);
router.post('/live-classes', adminCtrl.createAdminLiveClass);
router.patch('/live-classes/:id', adminCtrl.updateAdminLiveClass);
router.delete('/live-classes/:id', adminCtrl.cancelAdminLiveClass);

// 14b. Learning & Program Oversight
router.get('/oversight/learning', adminCtrl.getAdminLearningOversight);

// 14c. Direct Content & Submissions Administration
router.get('/materials', adminCtrl.getAdminMaterials);
router.get('/assignments', adminCtrl.getAdminAssignments);
router.get('/submissions', adminCtrl.getAdminSubmissions);

// 15. Partner Logo Management
import * as partnerCtrl from '../controllers/partnerController';
import { upload } from '../utils/upload';

router.get('/partners', partnerCtrl.getAdminPartners);
router.post('/partners', upload.single('logo'), partnerCtrl.createPartner);
router.patch('/partners/:id', upload.single('logo'), partnerCtrl.updatePartner);
router.delete('/partners/:id', partnerCtrl.deletePartner);

// 16. Email Automation & Template Management
import * as emailAdminCtrl from '../controllers/emailAdminController';

router.get('/email/templates', emailAdminCtrl.getEmailTemplates);
router.patch('/email/templates/:id', emailAdminCtrl.updateEmailTemplate);
router.delete('/email/templates/:id', emailAdminCtrl.deleteEmailTemplate);
router.post('/email/test', emailAdminCtrl.sendTestEmail);
router.get('/email/logs', emailAdminCtrl.getEmailLogs);
router.post('/email/logs/:id/retry', emailAdminCtrl.retryFailedEmail);
router.post('/email/reminders/run', emailAdminCtrl.triggerPaymentReminders);
router.get('/email/smtp-status', emailAdminCtrl.getSmtpStatus);

// 17. Course & Mentor Feedback Management
import * as feedbackCtrl from '../controllers/feedbackController';

router.get('/feedback', feedbackCtrl.getAdminFeedbacks);
router.get('/feedback/analytics', feedbackCtrl.getAdminFeedbackAnalytics);
router.get('/feedback/:id', feedbackCtrl.getAdminFeedbackById);
router.patch('/feedback/:id/status', feedbackCtrl.updateFeedbackStatus);
router.patch('/feedback/:id/publish', feedbackCtrl.toggleFeedbackPublish);
router.delete('/feedback/:id', feedbackCtrl.deleteFeedback);

export default router;
