import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../config/prisma';
import BRAND_CONFIG from '../config/brandConfig';
import { renderSkillUpEmailWrapper } from './emailTemplateRenderer';
import { skillUpEmailCatalog } from './skillUpEmailCatalog';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateCode?: string;
  recipientName?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  deliveryLogId?: string;
}

let lastSmtpErrorDetails: { code?: string; message: string; category: string } | null = null;

export const getLastSmtpError = () => lastSmtpErrorDetails;

export const classifySmtpError = (error: any): { code?: string; message: string; category: string } => {
  const code = error?.code || '';
  const rawMsg = error?.message || 'SMTP delivery failure';
  const response = error?.response || '';

  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      category: 'CONNECTION_TIMEOUT',
      message: 'SMTP mail server connection timed out. Please check your SMTP host address and port settings.',
    };
  }
  if (code === 'ECONNREFUSED' || rawMsg.includes('ECONNREFUSED')) {
    return {
      code: 'CONN_REFUSED',
      category: 'CONNECTION_REFUSED',
      message: 'Connection refused by the mail server. Ensure the SMTP server is running and accessible on the specified port.',
    };
  }
  if (code === 'EAUTH' || response.includes('535') || rawMsg.includes('authentication failed') || rawMsg.includes('BadCredentials')) {
    return {
      code: 'AUTH_FAILED',
      category: 'AUTHENTICATION_FAILURE',
      message: 'Mail server rejected the username or password. Please verify your SMTP credentials.',
    };
  }
  if (response.includes('550') || response.includes('553') || response.includes('relay access denied')) {
    return {
      code: 'RELAY_REJECTED',
      category: 'PROVIDER_REJECTION',
      message: 'Sender address or recipient rejected by the mail relay server.',
    };
  }

  return {
    code: code || 'UNKNOWN',
    category: 'TRANSMISSION_ERROR',
    message: 'Unable to deliver message through the mail server at this time.',
  };
};
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // true for 465 (implicit TLS)
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: config.nodeEnv === 'production',
    },
  });
};

/**
 * Diagnostic test for SMTP connection (does not expose credentials)
 */
export const testSMTPConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!config.smtp.user || !config.smtp.pass) {
    return {
      success: false,
      message: 'SMTP credentials missing in server/.env',
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection established successfully with ${config.smtp.host}:${config.smtp.port}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to authenticate with SMTP server',
    };
  }
};

/**
 * Core sendEmail function with persistence, delivery logging, retry capabilities, and idempotency
 */
export const sendEmail = async (options: SendEmailOptions) => {
  const {
    to,
    subject,
    html,
    text,
    templateCode,
    recipientName,
    idempotencyKey,
    metadata,
    deliveryLogId: explicitDeliveryLogId,
  } = options;

  let deliveryLogId: string | null = explicitDeliveryLogId || null;

  try {
    // 1. Idempotency Check (Prevent duplicate emails if duplicate webhook/action received)
    if (idempotencyKey) {
      const existingLog = await prisma.emailDeliveryLog.findUnique({
        where: { idempotencyKey },
      });
      if (existingLog && existingLog.status === 'SENT') {
        console.log(`[Email Skipped] Idempotent key already sent: ${idempotencyKey}`);
        return { messageId: `idempotent-${existingLog.id}`, skipped: true };
      }
      if (existingLog) {
        deliveryLogId = existingLog.id;
      }
    }

    // 2. Persist Delivery Log as PENDING
    if (!deliveryLogId) {
      try {
        const log = await prisma.emailDeliveryLog.create({
          data: {
            recipientEmail: to,
            recipientName: recipientName || null,
            subject,
            templateCode: templateCode || null,
            bodyPreview: text || html.replace(/<[^>]*>?/gm, '').substring(0, 300),
            status: 'PENDING',
            attempts: 0,
            maxAttempts: 3,
            idempotencyKey: idempotencyKey || null,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });
        deliveryLogId = log.id;
      } catch (dbErr) {
        // If unique constraint race condition on idempotencyKey, return gracefully
        console.warn('[Email Log Race Condition]:', dbErr);
      }
    }

    // 3. Automated Test Environment Bypass (Mocked test runner check)
    if (config.nodeEnv === 'test') {
      console.log(`[Email Mock/Test Mode] Simulated sending to: ${to} | Subject: "${subject}"`);
      if (deliveryLogId) {
        await prisma.emailDeliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: 'SENT',
            attempts: 1,
            sentAt: new Date(),
          },
        });
      }
      return { messageId: `mock-email-test-${Date.now()}` };
    }

    // 4. Verify valid SMTP configuration
    if (!config.smtp.user || !config.smtp.pass) {
      console.warn(`[Email Warning] SMTP credentials missing. Logging email to ${to} as FAILED.`);
      if (deliveryLogId) {
        await prisma.emailDeliveryLog.update({
          where: { id: deliveryLogId },
          data: {
            status: 'FAILED',
            attempts: 1,
            errorMessage: 'SMTP credentials missing in server environment variables',
          },
        });
      }
      return null;
    }

    // 5. Send Email via Nodemailer
    const transporter = createTransporter();
    const fromAddress = `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
    });

    console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);

    // 6. Update Delivery Log as SENT
    if (deliveryLogId) {
      await prisma.emailDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: 'SENT',
          attempts: { increment: 1 },
          sentAt: new Date(),
          errorMessage: null,
        },
      });
    }

    return info;
  } catch (error: any) {
    const errorMsg = error?.message || 'SMTP delivery failure';
    console.error('[Nodemailer Delivery Error]:', errorMsg);
    lastSmtpErrorDetails = classifySmtpError(error);

    // Update log status to FAILED or RETRYING
    if (deliveryLogId) {
      await prisma.emailDeliveryLog.update({
        where: { id: deliveryLogId },
        data: {
          status: 'FAILED',
          attempts: { increment: 1 },
          errorMessage: errorMsg,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000), // Retry in 15 mins
        },
      }).catch(console.error);
    }

    return null;
  }
};

// ----------------------------------------------------------------------
// BRANDED RESPONSIVE EMAIL WRAPPER (SkillUp)
// ----------------------------------------------------------------------

export const emailWrapper = (title: string, contentHtml: string): string => {
  return renderSkillUpEmailWrapper({
    title,
    contentHtml,
  });
};

export const emailTemplates = {
  ...skillUpEmailCatalog,

  // Backward-compatible alias mappings for existing server controllers
  courseEnrollmentConfirmation: (data: {
    studentName: string;
    courseTitle: string;
    courseTitleTa?: string;
    mentorName?: string | null;
    slug?: string;
    enrolledAt?: Date;
    courseUrl?: string;
  }) =>
    skillUpEmailCatalog.courseEnrollmentConfirmation({
      studentName: data.studentName,
      courseTitle: data.courseTitle || data.courseTitleTa || 'SkillUp Course',
      courseUrl: data.courseUrl || (data.slug ? `${BRAND_CONFIG.websiteUrl}/courses/${data.slug}` : undefined),
    }),

  coursePurchasedReceipt: (data: {
    studentName: string;
    courseTitle?: string;
    courseTitleTa?: string;
    amount?: number;
    amountPaid?: number;
    totalPrice?: number;
    remainingBalance?: number;
    paymentRef: string;
    orderId?: string;
    slug?: string;
    receiptUrl?: string;
    paymentPlan?: string;
  }) =>
    skillUpEmailCatalog.paymentSuccessReceipt({
      studentName: data.studentName,
      productTitle: data.courseTitle || data.courseTitleTa || 'SkillUp Course',
      amount: data.amount ?? data.amountPaid ?? data.totalPrice ?? 0,
      transactionId: data.paymentRef || data.orderId || 'TXN-REF',
      receiptUrl: data.receiptUrl,
      paymentPlan: data.paymentPlan,
    }),

  materialPurchasedReceipt: (data: {
    studentName: string;
    materialTitle: string;
    amount?: number;
    amountPaid?: number;
    paymentRef: string;
    orderId?: string;
  }) =>
    skillUpEmailCatalog.materialPurchaseConfirmation({
      studentName: data.studentName,
      materialTitle: data.materialTitle,
      amount: data.amount ?? data.amountPaid ?? 0,
    }),

  paymentSuccessReceipt: (data: {
    studentName: string;
    productTitle?: string;
    courseTitle?: string;
    courseTitleTa?: string;
    amount: number;
    transactionId?: string;
    paymentRef?: string;
    receiptUrl?: string;
    paymentPlan?: string;
  }) =>
    skillUpEmailCatalog.paymentSuccessReceipt({
      studentName: data.studentName,
      productTitle: data.productTitle || data.courseTitle || data.courseTitleTa || 'SkillUp Program',
      amount: data.amount,
      transactionId: data.transactionId || data.paymentRef || 'TXN-REF',
      receiptUrl: data.receiptUrl,
      paymentPlan: data.paymentPlan,
    }),

  courseAccessActivated: (data: {
    studentName: string;
    courseTitle?: string;
    courseTitleTa?: string;
    courseUrl?: string;
  }) =>
    skillUpEmailCatalog.courseAccessActivated({
      studentName: data.studentName,
      courseTitle: data.courseTitle || data.courseTitleTa || 'SkillUp Course',
    }),

  paymentFailed: (data: {
    studentName: string;
    productTitle: string;
    reason?: string;
    orderId?: string;
    amount?: number;
    slug?: string;
  }) =>
    skillUpEmailCatalog.paymentFailed({
      studentName: data.studentName,
      productTitle: data.productTitle,
      reason: data.reason || (data.orderId ? `Order #${data.orderId}` : undefined),
    }),

  certificateIssued: (data: {
    studentName: string;
    courseTitle: string;
    certificateNo: string;
    certificateUrl?: string;
    downloadUrl?: string;
    verifyUrl?: string;
  }) =>
    skillUpEmailCatalog.certificateIssued({
      studentName: data.studentName,
      courseTitle: data.courseTitle,
      certificateNo: data.certificateNo,
      certificateUrl: data.certificateUrl || data.downloadUrl || data.verifyUrl || `${BRAND_CONFIG.websiteUrl}/dashboard`,
    }),

  liveClassPaymentConfirmation: (data: {
    studentName: string;
    classTitle: string;
    amount?: number;
    amountPaid?: number;
    paymentRef: string;
    orderId?: string;
    courseTitle?: string | null;
    classDate?: string;
    classTime?: string;
    startTime?: string;
    durationMins?: number;
    timezone?: string;
    mentorName?: string | null;
  }) =>
    skillUpEmailCatalog.paymentSuccessReceipt({
      studentName: data.studentName,
      productTitle: `Live Class: ${data.classTitle}`,
      amount: data.amount ?? data.amountPaid ?? 0,
      transactionId: data.paymentRef || data.orderId || 'TXN-REF',
    }),

  paymentReminder: (data: {
    studentName: string;
    courseTitle: string;
    pendingAmount?: number;
    outstandingBalance?: number;
    dueDate?: string;
    paymentUrl?: string;
    slug?: string;
    daysOverdue?: number;
  }) =>
    skillUpEmailCatalog.remainingPaymentReminder({
      studentName: data.studentName,
      productTitle: data.courseTitle,
      remainingBalance: data.pendingAmount ?? data.outstandingBalance ?? 0,
      dueDate: data.dueDate,
      paymentUrl: data.paymentUrl,
    }),

  paymentRefund: (data: {
    studentName: string;
    productTitle: string;
    amount?: number;
    refundAmount?: number;
    refundId: string;
    originalPaymentRef?: string;
  }) => ({
    subject: `Refund Processed: ₹${Number(data.amount ?? data.refundAmount ?? 0).toLocaleString('en-IN')} for ${data.productTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Refund Processed Successfully',
      recipientName: data.studentName,
      contentHtml: `
        <p>A refund of <strong>₹${Number(data.amount ?? data.refundAmount ?? 0).toLocaleString('en-IN')}</strong> for <strong>${data.productTitle}</strong> has been processed to your original payment method.</p>
        <p><strong>Refund Reference ID:</strong> <span style="font-family: monospace;">${data.refundId}</span></p>
        <p style="font-size: 12px; color: #64748B;">Please allow 5–7 business days for the credit to reflect on your bank or card statement.</p>
      `,
      bannerType: 'success',
    }),
  }),

  mentorWelcome: (name: string) => ({
    subject: 'Welcome to the SkillUp Mentor & Instructor Team!',
    html: renderSkillUpEmailWrapper({
      title: 'Welcome to SkillUp Teaching Staff',
      recipientName: name,
      contentHtml: `
        <p>Welcome to the SkillUp teaching team! Your mentor credentials are active.</p>
        <p>You can access your cohort rosters, schedule interactive live masterclasses, and provide student code reviews from your Mentor Dashboard.</p>
      `,
      ctaText: 'Access Mentor Dashboard',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/mentor-dashboard`,
    }),
  }),

  mentorInvitation: (data: { name: string; activationUrl: string; courseTitle?: string | null }) => ({
    subject: 'Invitation to Join SkillUp as a Teaching Mentor',
    html: renderSkillUpEmailWrapper({
      title: 'Invitation to Join SkillUp Mentorship',
      recipientName: data.name,
      contentHtml: `
        <p>An administrator has invited you to join the SkillUp platform as a Teaching Mentor.</p>
        ${data.courseTitle ? `<p><strong>Course Assigned:</strong> ${data.courseTitle}</p>` : ''}
        <p>Click below to set your password and activate your mentor portal access:</p>
      `,
      ctaText: 'Activate Mentor Account',
      ctaUrl: data.activationUrl,
    }),
  }),

  mentorCourseAssigned: (data: { mentorName: string; courseTitle: string; batchName?: string | null; studentCount?: number }) =>
    skillUpEmailCatalog.mentorAssignmentNotification({
      mentorName: data.mentorName,
      courseTitle: data.courseTitle,
      batchName: data.batchName || undefined,
    }),

  mentorPayoutStatement: (data: {
    mentorName: string;
    amount: number;
    payoutRef: string;
    courseTitle?: string;
    payoutDate?: string;
    notes?: string | null;
  }) => ({
    subject: `Mentor Payout Statement: ₹${Number(data.amount).toLocaleString('en-IN')}`,
    html: renderSkillUpEmailWrapper({
      title: 'Mentor Compensation Disbursement',
      recipientName: data.mentorName,
      contentHtml: `
        <p>A mentor remuneration payout of <strong>₹${Number(data.amount).toLocaleString('en-IN')}</strong> has been credited.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Disbursement Amount:</strong> <strong style="color: #5DBA58;">₹${Number(data.amount).toLocaleString('en-IN')}</strong></div>
          <div><strong>Payout Reference:</strong> <span style="font-family: monospace;">${data.payoutRef}</span></div>
          ${data.courseTitle ? `<div><strong>Associated Program:</strong> ${data.courseTitle}</div>` : ''}
          ${data.notes ? `<div><strong>Notes:</strong> ${data.notes}</div>` : ''}
        </div>
      `,
      ctaText: 'Review Earnings in Portal',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/mentor-dashboard`,
      bannerType: 'success',
    }),
  }),

  liveClassNotification: (data: {
    studentName: string;
    classTitle: string;
    date?: string;
    time?: string;
    startTime?: string;
    previousTime?: string;
    durationMins?: number;
    meetingUrl?: string;
    mentorName?: string | null;
    courseTitle?: string;
    isReschedule?: boolean;
    isCancelled?: boolean;
  }) => {
    if (data.isCancelled) {
      return skillUpEmailCatalog.liveClassCancelled({
        studentName: data.studentName,
        classTitle: data.classTitle,
        reason: 'Instructor scheduling conflict or technical update',
      });
    }
    if (data.isReschedule) {
      return skillUpEmailCatalog.liveClassRescheduled({
        studentName: data.studentName,
        classTitle: data.classTitle,
        newDate: data.date || data.startTime || new Date().toISOString().split('T')[0],
        newTime: data.time || data.startTime || '10:00 AM',
        meetingUrl: data.meetingUrl || `${BRAND_CONFIG.websiteUrl}/live-classes`,
      });
    }
    return skillUpEmailCatalog.liveClassScheduled({
      studentName: data.studentName,
      classTitle: data.classTitle,
      date: data.date || data.startTime || new Date().toISOString().split('T')[0],
      time: data.time || data.startTime || '10:00 AM',
      meetingUrl: data.meetingUrl || `${BRAND_CONFIG.websiteUrl}/live-classes`,
      mentorName: data.mentorName || undefined,
    });
  },

  liveClassMeetingUrlUpdated: (data: {
    studentName: string;
    classTitle: string;
    meetingUrl?: string;
    courseTitle?: string;
    date?: string;
    time?: string;
    startTime?: string;
    durationMins?: number;
    meetingProvider?: string | null;
    mentorName?: string | null;
    isReschedule?: boolean;
  }) => ({
    subject: `Meeting Link Updated: ${data.classTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Meeting Link Updated',
      recipientName: data.studentName,
      contentHtml: `
        <p>The access link for your upcoming live class <strong>${data.classTitle}</strong> has been updated.</p>
        <p>Please use the updated room link below when joining:</p>
      `,
      ctaText: 'Open Updated Meeting Room',
      ctaUrl: data.meetingUrl || `${BRAND_CONFIG.websiteUrl}/live-classes`,
      bannerType: 'green',
    }),
  }),

  assignmentUpdate: (data: {
    studentName: string;
    assignmentTitle: string;
    courseTitle: string;
    grade?: number;
    score?: number;
    totalPoints?: number;
    feedback?: string | null;
  }) => ({
    subject: `Assignment Evaluated: ${data.assignmentTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Assignment Evaluation & Feedback',
      recipientName: data.studentName,
      contentHtml: `
        <p>Your mentor has reviewed and graded your submission for <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong>.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          ${(data.grade !== undefined || data.score !== undefined) ? `<div><strong>Grade Awarded:</strong> <span style="color: #5DBA58; font-weight: 800; font-size: 15px;">${data.grade ?? data.score}%</span></div>` : ''}
          ${data.feedback ? `<div style="margin-top: 6px;"><strong>Mentor Comments:</strong><br />${data.feedback}</div>` : ''}
        </div>
      `,
      ctaText: 'View Evaluated Submission',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  ticketCreatedStudent: (data: { studentName: string; ticketId: string; subject: string; message?: string; category?: string; priority?: string }) => ({
    subject: `[Ticket #${data.ticketId}] Support Request Received: ${data.subject}`,
    html: renderSkillUpEmailWrapper({
      title: 'Help Request Received',
      recipientName: data.studentName,
      contentHtml: `
        <p>Thank you for reaching out to SkillUp Support. We have logged your request with reference <strong>#${data.ticketId}</strong>.</p>
        <p>A member of our instructional or technical support team will review your inquiry and follow up shortly.</p>
        ${data.message ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; margin: 12px 0; font-size: 13px;">${data.message}</div>` : ''}
      `,
      ctaText: 'View Support Status',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
    }),
  }),

  ticketCreatedAdmin: (data: { studentName: string; studentEmail: string; ticketId: string; subject: string; message?: string; category?: string; priority?: string }) =>
    skillUpEmailCatalog.adminNewStudentQuery({
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      ticketId: data.ticketId,
      subject: data.subject,
    }),

  ticketStatusUpdate: (data: {
    studentName: string;
    ticketId: string;
    status: string;
    subject?: string;
    adminResponse?: string;
    replyMessage?: string;
  }) => ({
    subject: `Update on Support Ticket #${data.ticketId}: ${data.status}`,
    html: renderSkillUpEmailWrapper({
      title: 'Support Ticket Status Updated',
      recipientName: data.studentName,
      contentHtml: `
        <p>Your support ticket <strong>#${data.ticketId}</strong> has been updated to status: <strong>${data.status}</strong>.</p>
        ${(data.adminResponse || data.replyMessage) ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; font-size: 13px;"><strong>Staff Response:</strong><br />${data.adminResponse || data.replyMessage}</div>` : ''}
      `,
      ctaText: 'Review Ticket Details',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
    }),
  }),
};
