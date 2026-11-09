import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, testSMTPConnection, emailTemplates } from '../services/emailService';
import { runPaymentReminderScan } from '../services/reminderScheduler';
import { ensureAllTemplatesSeeded } from '../services/emailTemplateSeeder';

/**
 * 1. GET /api/admin/email/templates - List all email templates with configuration status
 */
export const getEmailTemplates = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Ensure all 36 templates are always seeded and available
    await ensureAllTemplatesSeeded();

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { code: 'asc' },
    });

    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. PATCH /api/admin/email/templates/:id - Update subject, body, or toggle enabled
 */
export const updateEmailTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { subject, htmlBody, isEnabled } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) throw new AppError('Email template not found', 404);

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(subject !== undefined && { subject: String(subject).trim() }),
        ...(htmlBody !== undefined && { bodyHtml: String(htmlBody) }),
        ...(isEnabled !== undefined && { isEnabled: Boolean(isEnabled) }),
      },
    });

    res.json({ success: true, data: updated, message: 'Template updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * 2b. GET /api/admin/email/templates/:code/preview - Render live branded preview of template
 */
export const previewEmailTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code).toUpperCase();

    // Map template code to template function
    const templateKeyMap: Record<string, string> = {
      STUDENT_WELCOME: 'welcome',
      EMAIL_VERIFICATION_OTP: 'registrationOTP',
      PASSWORD_RESET: 'passwordReset',
      PASSWORD_CHANGED: 'passwordChanged',
      LOGIN_SECURITY_ALERT: 'loginSecurityAlert',
      COURSE_ENROLLMENT_CONFIRMATION: 'courseEnrollmentConfirmation',
      COURSE_PAYMENT_RECEIPT: 'paymentSuccessReceipt',
      PAYMENT_FAILED: 'paymentFailed',
      PARTIAL_PAYMENT_CONFIRMATION: 'partialPaymentConfirmation',
      REMAINING_PAYMENT_REMINDER: 'remainingPaymentReminder',
      COURSE_ACCESS_ACTIVATED: 'courseAccessActivated',
      COURSE_COMPLETION_CONFIRMATION: 'courseCompletionConfirmation',
      LIVE_CLASS_SCHEDULED: 'liveClassScheduled',
      LIVE_CLASS_REMINDER: 'liveClassReminder',
      LIVE_CLASS_STARTING_NOW: 'liveClassStartingNow',
      LIVE_CLASS_CANCELLED: 'liveClassCancelled',
      LIVE_CLASS_RESCHEDULED: 'liveClassRescheduled',
      LIVE_CLASS_COMPLETED: 'liveClassCompleted',
      INTERNSHIP_APPLICATION_CONFIRMATION: 'internshipApplicationConfirmation',
      INTERNSHIP_APPROVAL: 'internshipApproved',
      INTERNSHIP_REJECTION: 'internshipRejected',
      INTERNSHIP_COMPLETION: 'internshipCompleted',
      INTERNSHIP_CERTIFICATE_ISSUED: 'internshipCertificateIssued',
      MATERIAL_PURCHASE_CONFIRMATION: 'materialPurchaseConfirmation',
      MATERIAL_ACCESS_GRANTED: 'materialAccessGranted',
      NEW_STUDY_MATERIAL_ANNOUNCEMENT: 'newStudyMaterialAnnouncement',
      ACHIEVEMENT_PUBLISHED: 'achievementPublished',
      CERTIFICATE_ISSUED: 'certificateIssued',
      STUDENT_RECOGNITION: 'studentRecognition',
      ADMIN_NEW_STUDENT_REGISTRATION: 'adminNewStudentRegistration',
      ADMIN_NEW_COURSE_ENROLLMENT: 'adminNewCourseEnrollment',
      ADMIN_NEW_PAYMENT_NOTIFICATION: 'adminNewPaymentNotification',
      ADMIN_NEW_INTERNSHIP_APPLICATION: 'adminNewInternshipApplication',
      ADMIN_NEW_STUDENT_QUERY: 'adminNewStudentQuery',
      MENTOR_ASSIGNMENT_NOTIFICATION: 'mentorAssignmentNotification',
      ADMIN_ANNOUNCEMENT: 'adminAnnouncement',
    };

    const fnName = templateKeyMap[code] || 'welcome';
    const templFn = (emailTemplates as any)[fnName] || (emailTemplates as any).welcome;

    const sampleData: any = {
      name: 'Priya Sharma',
      studentName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '9876543210',
      otp: '482910',
      resetUrl: `${process.env.CLIENT_URL || 'https://skillups.co.in'}/reset-password?token=sample_token_123`,
      courseTitle: 'Full-Stack Web Development Mastery',
      productTitle: 'Full-Stack Web Development Mastery',
      amount: 4999,
      amountPaid: 4999,
      remainingBalance: 5000,
      dueDate: '15-Dec-2026',
      startsIn: '15 minutes',
      classTitle: 'Building Microservices with Docker & Kubernetes',
      date: '10-Nov-2026',
      time: '07:30 PM IST',
      newDate: '12-Nov-2026',
      newTime: '08:00 PM IST',
      meetingUrl: `${process.env.CLIENT_URL || 'https://skillups.co.in'}/live-classes`,
      internshipTitle: 'Full-Stack Cloud Engineering Virtual Internship',
      startDate: '01-Dec-2026',
      feedback: 'Great code portfolio. We recommend sharpening SQL query optimization.',
      materialTitle: 'Cloud Architecture & DevOps Cheatsheet 2026',
      category: 'Cloud Engineering',
      downloadUrl: `${process.env.CLIENT_URL || 'https://skillups.co.in'}/materials`,
      achievementTitle: 'Smart India Hackathon 1st Runner Up',
      achievementUrl: `${process.env.CLIENT_URL || 'https://skillups.co.in'}/achievements`,
      certificateNo: 'SKILLUP-CERT-2026-8842',
      certificateUrl: `${process.env.CLIENT_URL || 'https://skillups.co.in'}/certificates`,
      recognitionTitle: 'Top Technical Project Contributor - Cohort 4',
      reason: 'Delivered an exceptional microservices capstone project with automated CI/CD pipeline.',
      transactionId: 'pay_live_test_998822',
      ticketId: '9421',
      subject: 'Clarification regarding Capstone Project evaluation rubric',
      mentorName: 'Dr. R. Karthik',
      title: 'Platform Maintenance Scheduled for Sunday 2:00 AM',
      bodyHtml: '<p>SkillUp will undergo a scheduled 30-minute platform upgrade to enhance real-time live class performance. During this time, interactive sandboxes will be temporarily paused.</p>',
    };

    let rendered: any;
    if (typeof templFn === 'function') {
      if (fnName === 'welcome' || fnName === 'passwordChanged') {
        rendered = templFn('Priya Sharma');
      } else if (fnName === 'registrationOTP') {
        rendered = templFn('Priya Sharma', '482910');
      } else if (fnName === 'passwordReset') {
        rendered = templFn('Priya Sharma', sampleData.resetUrl);
      } else {
        rendered = templFn(sampleData);
      }
    }

    const html = rendered?.html || '<p>Template preview not available</p>';
    const subject = rendered?.subject || 'SkillUp Notification Preview';

    res.json({
      success: true,
      data: {
        code,
        subject,
        html,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const sendTestEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { recipientEmail, templateCode } = req.body;

    if (!recipientEmail) {
      throw new AppError('Recipient email is required for test email', 400);
    }

    // Default test template
    let subject = 'SkillUp SMTP Test Notification';
    let html = `
      <div style="font-family: sans-serif; padding: 24px; color: #173B73;">
        <h2>SkillUp SMTP Delivery Test</h2>
        <p>This is a test notification confirming that the SkillUp Centralized SMTP Service is operating correctly.</p>
        <p><strong>Recipient:</strong> ${recipientEmail}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    `;

    if (templateCode && (emailTemplates as any)[templateCode]) {
      const templFn = (emailTemplates as any)[templateCode];
      const preview = templFn({
        studentName: 'Test Student',
        courseTitle: 'Full-Stack Web Development Bootcamp',
        amountPaid: 4999,
        totalPrice: 9999,
        remainingBalance: 5000,
        paymentRef: 'TEST_RCPT_12345',
        orderId: 'order_test_998877',
        slug: 'full-stack-web-development',
        mentorName: 'Senior Instructor',
        materialTitle: 'Mastering TypeScript & React Guide',
        outstandingBalance: 5000,
        dueDate: new Date(Date.now() + 86400000 * 3).toLocaleDateString(),
        daysOverdue: 0,
      });
      subject = `[TEST] ${preview.subject}`;
      html = preview.html;
    }

    const info = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      templateCode: templateCode || 'TEST_EMAIL',
      idempotencyKey: `test_email_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    });

    if (!info) {
      throw new AppError('Failed to send test email. Check server SMTP settings.', 500);
    }

    res.json({
      success: true,
      message: `Test email successfully sent to ${recipientEmail}`,
      messageId: info.messageId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/admin/email/logs - Delivery attempts, failures, and audit trail
 */
export const getEmailLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.emailDeliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailDeliveryLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. POST /api/admin/email/logs/:id/retry - Retry a failed email delivery
 */
export const retryFailedEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const log = await prisma.emailDeliveryLog.findUnique({ where: { id } });
    if (!log) throw new AppError('Delivery log not found', 404);

    if (log.status === 'SENT') {
      return res.json({ success: true, message: 'Email was already delivered successfully' });
    }

    const info = await sendEmail({
      to: log.recipientEmail,
      subject: log.subject,
      html: `<p>Retried transmission of notification: ${log.subject}</p>`,
      deliveryLogId: log.id,
      templateCode: log.templateCode || undefined,
    });

    if (!info) {
      throw new AppError('Retry attempt failed. Please check SMTP configuration.', 500);
    }

    res.json({
      success: true,
      message: `Email successfully resent to ${log.recipientEmail}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. POST /api/admin/payment-reminders/run - Trigger scheduled reminder job manually or in dry-run mode
 */
export const triggerPaymentReminders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dryRun = req.body.dryRun === true;
    const results = await runPaymentReminderScan(dryRun);

    res.json({
      success: true,
      message: dryRun
        ? `Dry run completed. ${results.remindersSent} reminders identified.`
        : `Payment reminder scan completed. ${results.remindersSent} emails dispatched.`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. GET /api/admin/email/smtp-status - Check live SMTP connection status
 */
export const getSmtpStatus = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isConnected = await testSMTPConnection();
    res.json({
      success: true,
      data: {
        connected: isConnected,
        provider: 'Nodemailer SMTP',
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: process.env.SMTP_PORT || 465,
        fromEmail: process.env.EMAIL_FROM_ADDRESS || 'support@tricubedigitalsolutions.com',
        fromName: process.env.EMAIL_FROM_NAME || 'SkillUp',
      },
    });
  } catch (error) {
    next(error);
  }
};



/**
 * DELETE /api/admin/email/templates/:id - Delete custom email template (preserve system templates)
 */
export const deleteEmailTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new AppError('Email template not found', 404);
    }

    if (template.isSystem) {
      throw new AppError('Essential system email templates cannot be deleted.', 400);
    }

    await prisma.emailTemplate.delete({ where: { id } });

    res.json({
      success: true,
      message: `Email template "${template.name}" (${template.code}) deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
