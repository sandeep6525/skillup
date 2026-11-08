import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, testSMTPConnection, emailTemplates } from '../services/emailService';
import { runPaymentReminderScan } from '../services/reminderScheduler';

/**
 * 1. GET /api/admin/email/templates - List all email templates with configuration status
 */
export const getEmailTemplates = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { code: 'asc' },
    });

    // If database has no templates seeded yet, seed defaults from code
    if (templates.length === 0) {
      const defaultTemplates = [
        { code: 'STUDENT_WELCOME', name: 'Student Registration Welcome', subject: 'Welcome to SkillUp!', category: 'STUDENT' },
        { code: 'EMAIL_VERIFICATION_OTP', name: 'Email Verification OTP', subject: 'SkillUp Account Verification Code: {{otp}}', category: 'AUTH' },
        { code: 'PASSWORD_RESET', name: 'Password Reset Request', subject: 'Reset Your SkillUp Password', category: 'AUTH' },
        { code: 'PASSWORD_CHANGED', name: 'Password Changed Confirmation', subject: 'Security Alert: Password Updated', category: 'AUTH' },
        { code: 'COURSE_ENROLLMENT_CONFIRMATION', name: 'Course Enrollment Confirmed', subject: 'Enrollment Confirmed: {{courseTitle}}', category: 'STUDENT' },
        { code: 'COURSE_PAYMENT_RECEIPT', name: 'Student Course Payment Receipt', subject: 'Payment Receipt: {{courseTitle}} (Ref: {{paymentRef}})', category: 'PAYMENT' },
        { code: 'MATERIAL_PURCHASE_RECEIPT', name: 'Learning Material Receipt', subject: 'Payment Receipt: {{materialTitle}} (Ref: {{paymentRef}})', category: 'PAYMENT' },
        { code: 'PAYMENT_REMINDER_PENDING', name: 'Upcoming Installment Reminder', subject: 'Payment Reminder: Upcoming Installment for {{courseTitle}}', category: 'REMINDER' },
        { code: 'PAYMENT_REMINDER_OVERDUE', name: 'Overdue Installment Reminder', subject: 'Important: Overdue Installment Payment for {{courseTitle}}', category: 'REMINDER' },
        { code: 'PAYMENT_FAILED', name: 'Payment Incomplete / Failed', subject: 'Payment Incomplete for {{productTitle}}', category: 'PAYMENT' },
        { code: 'PAYMENT_REFUND', name: 'Refund Confirmation', subject: 'Refund Processed: ₹{{amount}} for {{productTitle}}', category: 'PAYMENT' },
        { code: 'MENTOR_WELCOME', name: 'Mentor Welcome & Onboarding', subject: 'Welcome to the SkillUp Mentor & Instructor Team!', category: 'MENTOR' },
        { code: 'MENTOR_COURSE_ASSIGNED', name: 'Mentor Course Assignment', subject: 'New Teaching Assignment: {{courseTitle}}', category: 'MENTOR' },
        { code: 'MENTOR_PAYOUT_STATEMENT', name: 'Mentor Compensation Statement', subject: 'Mentor Disbursement Statement: ₹{{amount}} (Ref: {{payoutRef}})', category: 'MENTOR' },
        { code: 'LIVE_CLASS_REMINDER', name: 'Live Class Reminder & Schedule', subject: 'Upcoming Live Masterclass: {{classTitle}}', category: 'CLASS' },
        { code: 'CERTIFICATE_ISSUED', name: 'Course Certificate Ready', subject: 'Certificate of Completion: {{courseTitle}}', category: 'STUDENT' },
        { code: 'ASSIGNMENT_GRADED', name: 'Assignment Graded & Feedback', subject: 'Assignment Graded: {{assignmentTitle}}', category: 'STUDENT' },
        { code: 'ADMIN_ALERT', name: 'Administrative Alert', subject: '[SkillUp Admin Alert] {{title}}', category: 'ADMIN' },
      ];

      for (const t of defaultTemplates) {
        await prisma.emailTemplate.create({
          data: {
            code: t.code,
            name: t.name,
            subject: t.subject,
            bodyHtml: '<p>Standard SkillUp responsive template</p>',
            category: t.category,
            isEnabled: true,
          },
        });
      }

      const seeded = await prisma.emailTemplate.findMany({ orderBy: { code: 'asc' } });
      return res.json({ success: true, data: seeded });
    }

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
 * 3. POST /api/admin/email/test - Send test email to verify SMTP and template rendering
 */
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
