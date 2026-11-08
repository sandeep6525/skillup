import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../config/prisma';

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

/**
 * Creates Nodemailer Transporter instance based on current SMTP config
 */
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure, // true for 465 (implicit TLS)
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
// BRANDED RESPONSIVE EMAIL TEMPLATES (SkillUp)
// ----------------------------------------------------------------------

export const emailWrapper = (title: string, contentHtml: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #0f172a; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04); }
    .header { background: #173B73; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #93c5fd; }
    .content { padding: 36px 32px; font-size: 14px; line-height: 1.65; color: #334155; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #eff6ff; color: #2563eb; }
    .button { display: inline-block; padding: 13px 26px; background: #2563EB; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
    .footer { padding: 24px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SkillUp</h1>
      <p>Student Skill Development Platform & Industry Learning</p>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} SkillUp Platform. All rights reserved.</p>
      <p style="margin: 0;">Official Support: <a href="mailto:${config.smtp.fromEmail}">${config.smtp.fromEmail}</a> | Tamil & English Support</p>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  // 1. Account Verification OTP
  registrationOTP: (name: string, otp: string) => ({
    subject: `SkillUp Account Verification Code: ${otp}`,
    html: emailWrapper(
      'Verify Your SkillUp Email',
      `
      <h2 style="color: #173B73; margin-top: 0;">Welcome to SkillUp, ${name}!</h2>
      <p>Thank you for registering. Use the 6-digit verification code below to verify your email address and activate your account:</p>
      <div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border: 2px dashed #93c5fd; border-radius: 12px; text-align: center;">
        <div style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #173B73;">${otp}</div>
        <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">This verification code expires in <strong>5 minutes</strong>.</p>
      </div>
      <p style="font-size: 12px; color: #64748b;">தமிழ் ஆதரவு: நீங்கள் கணக்கை உருவாக்கவில்லை என்றால், இந்த மின்னஞ்சலைப் புறக்கணிக்கவும்.</p>
      `
    ),
  }),

  // 2. Student Welcome Email
  welcome: (name: string) => ({
    subject: 'Welcome to SkillUp — Your Journey Begins Today!',
    html: emailWrapper(
      'Welcome to SkillUp',
      `
      <h2 style="color: #173B73; margin-top: 0;">Account Verified! Welcome, ${name}</h2>
      <p>Your email has been successfully verified and your SkillUp student profile is active.</p>
      <p>You can now browse courses, access free video previews, join interactive masterclasses, and explore study resources in English and Tamil (தமிழ்).</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/dashboard" class="button">Go to Student Dashboard</a>
      </div>
      <div class="card" style="margin-top: 24px;">
        <p style="margin: 0; font-size: 12px; color: #64748b;"><strong>Security Reminder:</strong> SkillUp will never ask for your password or OTP via email or chat. Keep your credentials secure.</p>
      </div>
      `
    ),
  }),

  // 2B. Mentor Invitation & Activation Email
  mentorInvitation: (data: { name: string; activationUrl: string; courseTitle?: string | null }) => ({
    subject: 'Invitation to Join SkillUp as a Teaching Mentor',
    html: emailWrapper(
      'Mentor Account Activation',
      `
      <h2 style="color: #173B73; margin-top: 0;">Welcome to SkillUp Teaching Staff, ${data.name}!</h2>
      <p>An administrator has invited you to join the SkillUp platform as an authorized Teaching Mentor.</p>
      ${data.courseTitle ? `<div class="card"><p style="margin: 0;"><strong>Initial Course Assigned:</strong> ${data.courseTitle}</p></div>` : ''}
      <p>To activate your mentor account and securely set your password, click the button below:</p>
      <div style="text-align: center; margin: 26px 0;">
        <a href="${data.activationUrl}" class="button">Activate Mentor Account & Set Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This secure activation link is valid for <strong>48 hours</strong> and can only be used once. You will not receive a default password.</p>
      <p style="font-size: 12px; color: #64748b;">If you did not expect this invitation, please contact our administrative team.</p>
      `
    ),
  }),

  // 3. Password Reset Request
  passwordReset: (name: string, resetUrl: string) => ({
    subject: 'Reset Your SkillUp Account Password',
    html: emailWrapper(
      'Reset Password Request',
      `
      <h2 style="color: #173B73; margin-top: 0;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">This link is valid for 30 minutes and can only be used once. If you did not make this request, your account remains secure.</p>
      `
    ),
  }),

  // 4. Password Changed Security Notification
  passwordChanged: (name: string) => ({
    subject: 'Your SkillUp Password Has Been Changed',
    html: emailWrapper(
      'Password Changed',
      `
      <h2 style="color: #173B73; margin-top: 0;">Security Alert: Password Updated</h2>
      <p>Hello ${name},</p>
      <p>Your SkillUp account password was successfully updated.</p>
      <p style="font-size: 12px; color: #64748b;">If you did not make this change, please contact our security team immediately at <a href="mailto:${config.smtp.fromEmail}">${config.smtp.fromEmail}</a>.</p>
      `
    ),
  }),

  // 5. Course Enrollment Confirmation
  courseEnrollmentConfirmation: (data: {
    studentName: string;
    courseTitle: string;
    courseTitleTa?: string | null;
    mentorName?: string | null;
    slug: string;
    enrolledAt?: Date;
  }) => ({
    subject: `Enrollment Confirmed: ${data.courseTitle}`,
    html: emailWrapper(
      'Course Enrollment Confirmed',
      `
      <h2 style="color: #173B73; margin-top: 0;">You're Enrolled! Get Ready to Learn</h2>
      <p>Dear ${data.studentName},</p>
      <p>Congratulations! Your enrollment in <strong>${data.courseTitle}</strong>${data.courseTitleTa ? ` (${data.courseTitleTa})` : ''} is now active.</p>

      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${data.courseTitle}</p>
        ${data.mentorName ? `<p style="margin: 0 0 8px 0;"><strong>Assigned Mentor:</strong> ${data.mentorName}</p>` : ''}
        <p style="margin: 0 0 8px 0;"><strong>Enrollment Status:</strong> <span style="color: #166534; font-weight: bold;">ACTIVE</span></p>
        <p style="margin: 0;"><strong>Enrollment Date:</strong> ${new Date(data.enrolledAt || Date.now()).toLocaleDateString()}</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/classroom/${data.slug}" class="button">Open Classroom & Syllabus</a>
      </div>
      `
    ),
  }),

  // 6. Student Course Payment Receipt
  coursePurchasedReceipt: (data: {
    studentName: string;
    courseTitle: string;
    courseTitleTa?: string | null;
    amountPaid: number;
    totalPrice: number;
    remainingBalance: number;
    paymentRef: string;
    orderId: string;
    slug: string;
    paymentDate?: Date;
  }) => ({
    subject: `Payment Receipt: ${data.courseTitle} (Ref: ${data.paymentRef})`,
    html: emailWrapper(
      'Payment Confirmation & Receipt',
      `
      <h2 style="color: #173B73; margin-top: 0;">Payment Receipt & Verified Transaction</h2>
      <p>Dear ${data.studentName},</p>
      <p>Thank you for your payment. Your transaction for <strong>${data.courseTitle}</strong>${data.courseTitleTa ? ` (${data.courseTitleTa})` : ''} has been verified.</p>
      
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #64748b;">Transaction Reference:</span>
          <span style="font-family: monospace; font-weight: 700;">${data.paymentRef}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #64748b;">Razorpay Order ID:</span>
          <span style="font-family: monospace;">${data.orderId}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #64748b;">Amount Paid in Transaction:</span>
          <span style="font-weight: 800; color: #166534;">₹${data.amountPaid.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #64748b;">Total Course Price:</span>
          <span style="font-weight: 700;">₹${data.totalPrice.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
          <span style="font-weight: 700; color: #173B73;">Outstanding Balance:</span>
          <span style="font-weight: 800; color: ${data.remainingBalance > 0 ? '#b45309' : '#166534'};">
            ${data.remainingBalance > 0 ? `₹${data.remainingBalance.toFixed(2)} (Installment Remaining)` : '₹0.00 (Fully Settled)'}
          </span>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/classroom/${data.slug}" class="button">Access Course Classroom</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        கட்டண ரசீது: உங்கள் கட்டணம் வெற்றிகரமாகச் சரிபார்க்கப்பட்டது. உங்கள் வகுப்பறை அணுகல் இயக்கப்பட்டுள்ளது.
      </p>
      `
    ),
  }),

  // 7. Material Purchase Receipt
  materialPurchasedReceipt: (data: {
    studentName: string;
    materialTitle: string;
    amountPaid: number;
    paymentRef: string;
    orderId: string;
  }) => ({
    subject: `Payment Receipt: ${data.materialTitle} (Ref: ${data.paymentRef})`,
    html: emailWrapper(
      'Material Purchase Receipt',
      `
      <h2 style="color: #173B73; margin-top: 0;">Learning Material Unlocked</h2>
      <p>Dear ${data.studentName},</p>
      <p>Thank you for purchasing <strong>${data.materialTitle}</strong>. Your payment has been verified and your download access is unlocked.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Material:</strong> ${data.materialTitle}</p>
        <p style="margin: 0 0 8px 0;"><strong>Transaction Reference:</strong> <span style="font-family: monospace;">${data.paymentRef}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> <span style="font-family: monospace;">${data.orderId}</span></p>
        <p style="margin: 0;"><strong>Amount Paid:</strong> <span style="color: #166534; font-weight: 800;">₹${data.amountPaid.toFixed(2)}</span></p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/dashboard/materials" class="button">Go to My Materials & Download</a>
      </div>
      `
    ),
  }),

  // 7b. Live Class Purchase Receipt & Registration Confirmation
  liveClassPaymentConfirmation: (data: {
    studentName: string;
    classTitle: string;
    courseTitle?: string | null;
    mentorName?: string | null;
    startTime: string;
    durationMins: number;
    timezone: string;
    amountPaid: number;
    paymentRef: string;
    orderId: string;
  }) => ({
    subject: `Registration Confirmed: ${data.classTitle} (Ref: ${data.paymentRef})`,
    html: emailWrapper(
      'Live Class Registration Confirmed',
      `
      <h2 style="color: #173B73; margin-top: 0;">Registration & Payment Confirmed!</h2>
      <p>Dear ${data.studentName},</p>
      <p>Your payment for the live interactive masterclass <strong>${data.classTitle}</strong> has been successfully verified.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Class Title:</strong> ${data.classTitle}</p>
        ${data.courseTitle ? `<p style="margin: 0 0 8px 0;"><strong>Associated Course:</strong> ${data.courseTitle}</p>` : ''}
        ${data.mentorName ? `<p style="margin: 0 0 8px 0;"><strong>Instructor / Mentor:</strong> ${data.mentorName}</p>` : ''}
        <p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${data.startTime} (${data.timezone})</p>
        <p style="margin: 0 0 8px 0;"><strong>Duration:</strong> ${data.durationMins} minutes</p>
        <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> <span style="font-family: monospace;">${data.orderId}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Payment Ref:</strong> <span style="font-family: monospace;">${data.paymentRef}</span></p>
        <p style="margin: 0;"><strong>Amount Paid:</strong> <span style="color: #166534; font-weight: 800;">₹${data.amountPaid.toFixed(2)}</span></p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/dashboard" class="button">Go to Student Dashboard & View Session</a>
      </div>
      <p style="font-size: 13px; color: #475569; text-align: center; margin-top: 12px;">
        For security, the verified joining link unlocks in your Student Dashboard 5 minutes before the session start time.
      </p>
      `
    ),
  }),

  // 7c. Live Class Meeting Link Updated / Shared Notification
  liveClassMeetingUrlUpdated: (data: {
    studentName: string;
    classTitle: string;
    mentorName: string;
    startTime: string;
    meetingProvider?: string | null;
  }) => ({
    subject: `Meeting Link Available: ${data.classTitle}`,
    html: emailWrapper(
      'Meeting Link Updated',
      `
      <h2 style="color: #173B73; margin-top: 0;">Meeting Details Ready for Your Live Class</h2>
      <p>Dear ${data.studentName},</p>
      <p>Mentor <strong>${data.mentorName}</strong> has prepared the meeting link for your upcoming live class: <strong>${data.classTitle}</strong>.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Topic:</strong> ${data.classTitle}</p>
        <p style="margin: 0 0 8px 0;"><strong>Instructor:</strong> ${data.mentorName}</p>
        <p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${data.startTime} (IST)</p>
        ${data.meetingProvider ? `<p style="margin: 0;"><strong>Platform:</strong> ${data.meetingProvider}</p>` : ''}
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/dashboard" class="button">Open Dashboard to Join Session</a>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 12px;">
        Access is restricted to verified paid attendees. Join directly from your Student Dashboard when the join window opens.
      </p>
      `
    ),
  }),

  // 8. Payment Pending / Upcoming Installment Reminder
  paymentReminder: (data: {
    studentName: string;
    courseTitle: string;
    outstandingBalance: number;
    dueDate?: string | null;
    daysOverdue?: number;
    slug: string;
  }) => {
    const isOverdue = (data.daysOverdue || 0) > 0;
    const subject = isOverdue
      ? `Important: Overdue Installment Payment for ${data.courseTitle}`
      : `Payment Reminder: Upcoming Installment for ${data.courseTitle}`;

    return {
      subject,
      html: emailWrapper(
        isOverdue ? 'Overdue Payment Reminder' : 'Upcoming Payment Reminder',
        `
        <h2 style="color: ${isOverdue ? '#b91c1c' : '#173B73'}; margin-top: 0;">
          ${isOverdue ? 'Action Required: Overdue Installment' : 'Upcoming Installment Payment'}
        </h2>
        <p>Dear ${data.studentName},</p>
        <p>
          ${
            isOverdue
              ? `Your installment payment for <strong>${data.courseTitle}</strong> is currently overdue by ${data.daysOverdue} days.`
              : `This is a friendly reminder regarding your remaining balance for <strong>${data.courseTitle}</strong>.`
          }
        </p>

        <div class="card" style="border-left: 4px solid ${isOverdue ? '#dc2626' : '#2563eb'};">
          <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${data.courseTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Outstanding Balance:</strong> <span style="color: #dc2626; font-weight: 800; font-size: 16px;">₹${data.outstandingBalance.toFixed(2)}</span></p>
          ${data.dueDate ? `<p style="margin: 0;"><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${config.clientUrl}/courses/${data.slug}" class="button" style="background: ${isOverdue ? '#dc2626' : '#2563EB'};">
            Pay Remaining Balance
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          If you have already submitted this installment, please allow a few minutes for verification. For questions, contact <a href="mailto:${config.smtp.fromEmail}">${config.smtp.fromEmail}</a>.
        </p>
        `
      ),
    };
  },

  // 9. Payment Failure Notification
  paymentFailed: (data: {
    studentName: string;
    productTitle: string;
    orderId: string;
    amount: number;
    slug?: string;
  }) => ({
    subject: `Payment Incomplete for ${data.productTitle}`,
    html: emailWrapper(
      'Payment Failure Notice',
      `
      <h2 style="color: #b91c1c; margin-top: 0;">Payment Incomplete</h2>
      <p>Dear ${data.studentName},</p>
      <p>We noticed that your checkout attempt for <strong>${data.productTitle}</strong> could not be completed.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> <span style="font-family: monospace;">${data.orderId}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Amount:</strong> ₹${data.amount.toFixed(2)}</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">UNCONFIRMED / FAILED</span></p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/orders" class="button">Retry Payment</a>
      </div>
      `
    ),
  }),

  // 10. Payment Refund Confirmation
  paymentRefund: (data: {
    studentName: string;
    productTitle: string;
    refundAmount: number;
    refundId: string;
    originalPaymentRef: string;
  }) => ({
    subject: `Refund Processed: ₹${data.refundAmount.toFixed(2)} for ${data.productTitle}`,
    html: emailWrapper(
      'Refund Confirmation',
      `
      <h2 style="color: #173B73; margin-top: 0;">Refund Processed Successfully</h2>
      <p>Dear ${data.studentName},</p>
      <p>A refund has been processed for your purchase of <strong>${data.productTitle}</strong>.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Refund ID:</strong> <span style="font-family: monospace;">${data.refundId}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Original Payment Ref:</strong> <span style="font-family: monospace;">${data.originalPaymentRef}</span></p>
        <p style="margin: 0;"><strong>Refund Amount:</strong> <span style="color: #166534; font-weight: 800;">₹${data.refundAmount.toFixed(2)}</span></p>
      </div>
      <p style="font-size: 12px; color: #64748b;">The refund will be credited back to your original payment method within 5–7 business days depending on your bank.</p>
      `
    ),
  }),

  // 11. Mentor Welcome Email
  mentorWelcome: (name: string) => ({
    subject: 'Welcome to the SkillUp Mentor & Instructor Team!',
    html: emailWrapper(
      'Welcome Mentor',
      `
      <h2 style="color: #173B73; margin-top: 0;">Welcome to SkillUp, Instructor ${name}!</h2>
      <p>Your mentor account has been configured. You can now manage your cohorts, conduct live WebRTC interactive sessions, review assignments, and track student mastery.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${config.clientUrl}/mentor-dashboard" class="button">Open Mentor Portal</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Security: Please use the official SkillUp portal login to access your instructor privileges.</p>
      `
    ),
  }),

  // 12. Mentor Course & Batch Assignment Notification
  mentorCourseAssigned: (data: {
    mentorName: string;
    courseTitle: string;
    batchName?: string | null;
    studentCount?: number;
  }) => ({
    subject: `New Teaching Assignment: ${data.courseTitle}${data.batchName ? ` (${data.batchName})` : ''}`,
    html: emailWrapper(
      'Course Assignment',
      `
      <h2 style="color: #173B73; margin-top: 0;">New Course Assignment</h2>
      <p>Dear ${data.mentorName},</p>
      <p>You have been assigned to lead <strong>${data.courseTitle}</strong>${data.batchName ? ` for cohort <strong>${data.batchName}</strong>` : ''}.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${data.courseTitle}</p>
        ${data.batchName ? `<p style="margin: 0 0 8px 0;"><strong>Cohort / Batch:</strong> ${data.batchName}</p>` : ''}
        ${typeof data.studentCount === 'number' ? `<p style="margin: 0;"><strong>Enrolled Students:</strong> ${data.studentCount}</p>` : ''}
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${config.clientUrl}/mentor-dashboard" class="button">View Student Roster</a>
      </div>
      `
    ),
  }),

  // 13. Mentor Compensation / Payout Statement
  mentorPayoutStatement: (data: {
    mentorName: string;
    amount: number;
    payoutRef: string;
    payoutDate: Date;
    notes?: string | null;
  }) => ({
    subject: `Mentor Disbursement Statement: ₹${data.amount.toFixed(2)} (Ref: ${data.payoutRef})`,
    html: emailWrapper(
      'Mentor Compensation Statement',
      `
      <h2 style="color: #173B73; margin-top: 0;">Mentor Compensation Disbursement</h2>
      <p>Dear ${data.mentorName},</p>
      <p>SkillUp has issued a disbursement of your mentor compensation.</p>
      
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Disbursement Reference:</strong> <span style="font-family: monospace;">${data.payoutRef}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Net Amount Paid:</strong> <span style="color: #166534; font-weight: 800; font-size: 18px;">₹${data.amount.toFixed(2)}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Disbursement Date:</strong> ${data.payoutDate.toLocaleDateString()}</p>
        ${data.notes ? `<p style="margin: 0; color: #475569;"><strong>Notes / Remarks:</strong> ${data.notes}</p>` : ''}
      </div>

      <p style="font-size: 12px; color: #64748b;">This statement documents instructor fees disbursed by SkillUp.</p>
      `
    ),
  }),

  // 14. Admin System Alert
  adminAlert: (data: {
    title: string;
    message: string;
    eventType: string;
    details?: Record<string, any>;
  }) => ({
    subject: `[SkillUp Admin Alert] ${data.title}`,
    html: emailWrapper(
      data.title,
      `
      <h2 style="color: #173B73; margin-top: 0;">${data.title}</h2>
      <p>${data.message}</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Event Type:</strong> <span class="badge">${data.eventType}</span></p>
        <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        ${
          data.details
            ? `<pre style="margin-top: 10px; background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 11px; overflow-x: auto;">${JSON.stringify(data.details, null, 2)}</pre>`
            : ''
        }
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${config.clientUrl}/admin" class="button">Open Admin Hub</a>
      </div>
      `
    ),
  }),

  // 15. Live Class Schedule Notification
  liveClassNotification: (data: {
    studentName: string;
    courseTitle: string;
    classTitle: string;
    startTime: string;
    durationMins: number;
    mentorName: string;
    meetingUrl?: string | null;
    isReschedule?: boolean;
    isCancelled?: boolean;
    previousTime?: string;
  }) => {
    const actionLabel = data.isCancelled
      ? 'Class Cancelled'
      : data.isReschedule
      ? 'Class Rescheduled'
      : 'Upcoming Live Masterclass';

    return {
      subject: `${actionLabel}: ${data.classTitle} — ${data.courseTitle}`,
      html: emailWrapper(
        actionLabel,
        `
        <h2 style="color: #173B73; margin-top: 0;">${actionLabel}</h2>
        <p>Hello ${data.studentName},</p>
        <p>
          ${
            data.isCancelled
              ? `The live class <strong>${data.classTitle}</strong> for <strong>${data.courseTitle}</strong> has been cancelled.`
              : data.isReschedule
              ? `The schedule for <strong>${data.classTitle}</strong> has been updated.`
              : `You are scheduled to attend an upcoming interactive class for <strong>${data.courseTitle}</strong>.`
          }
        </p>

        <div class="card">
          <p style="margin: 0 0 8px 0;"><strong>Class Topic:</strong> ${data.classTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Course:</strong> ${data.courseTitle}</p>
          <p style="margin: 0 0 8px 0;"><strong>Instructor/Mentor:</strong> ${data.mentorName}</p>
          ${data.isReschedule && data.previousTime ? `<p style="margin: 0 0 8px 0; color: #b45309;"><strong>Previous Time:</strong> <del>${data.previousTime}</del></p>` : ''}
          <p style="margin: 0 0 8px 0;"><strong>Scheduled Date & Time:</strong> ${data.startTime} (IST)</p>
          <p style="margin: 0;"><strong>Duration:</strong> ${data.durationMins} minutes</p>
        </div>

        ${
          !data.isCancelled
            ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${config.clientUrl}/dashboard" class="button" style="background-color: #2563EB; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in SkillUp Dashboard & Join</a>
            </div>
            <p style="font-size: 13px; color: #475569; text-align: center; margin-top: -12px;">
              For security, the join link unlocks in your authenticated dashboard 5 minutes prior to start time.
            </p>
            `
            : ''
        }
        <p style="font-size: 12px; color: #64748b;">SkillUp Student Skill Development Platform — நேரலை வகுப்பு அறிவிப்பு.</p>
        `
      ),
    };
  },

  // 16. Certificate Issued
  certificateIssued: (data: {
    studentName: string;
    courseTitle: string;
    certificateNo: string;
    downloadUrl: string;
  }) => ({
    subject: `Certificate of Completion: ${data.courseTitle} (${data.certificateNo})`,
    html: emailWrapper(
      'Certificate Issued',
      `
      <h2 style="color: #173B73; margin-top: 0;">Congratulations, ${data.studentName}!</h2>
      <p>You have successfully completed 100% of <strong>${data.courseTitle}</strong>.</p>
      <div class="card" style="text-align: center; padding: 24px;">
        <span class="badge">Verified Credential</span>
        <h3 style="margin: 12px 0 4px 0; color: #173B73; font-size: 20px;">Certificate No: ${data.certificateNo}</h3>
        <p style="margin: 0; font-size: 12px; color: #64748b;">SkillUp Certified Professional Portfolio Credential</p>
        <div style="margin-top: 18px;">
          <a href="${data.downloadUrl}" class="button">Download Official PDF Certificate</a>
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b;">சான்றிதழ் வழங்கப்பட்டது: உங்கள் அதிகாரப்பூர்வ சான்றிதழைப் பதிவிறக்க பொத்தானைக் கிளிக் செய்யவும்.</p>
      `
    ),
  }),

  // 17. Assignment Graded / Returned
  assignmentUpdate: (data: {
    studentName: string;
    courseTitle: string;
    assignmentTitle: string;
    score: number;
    totalPoints: number;
    feedback?: string | null;
  }) => ({
    subject: `Assignment Graded: ${data.assignmentTitle} (${data.score}/${data.totalPoints})`,
    html: emailWrapper(
      'Assignment Graded',
      `
      <h2 style="color: #173B73; margin-top: 0;">Assignment Assessment Update</h2>
      <p>Hello ${data.studentName},</p>
      <p>Your submission for <strong>${data.assignmentTitle}</strong> in <strong>${data.courseTitle}</strong> has been graded.</p>
      <div class="card">
        <p style="margin: 0 0 6px 0;"><strong>Score:</strong> <span style="font-size: 18px; font-weight: 800; color: #2563EB;">${data.score} / ${data.totalPoints}</span></p>
        ${data.feedback ? `<p style="margin: 8px 0 0 0; color: #475569;"><strong>Mentor Feedback:</strong> "${data.feedback}"</p>` : ''}
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${config.clientUrl}/dashboard/assignments" class="button">View Assignment in Dashboard</a>
      </div>
      `
    ),
  }),

  // 18. Support Ticket Created (Student Confirmation)
  ticketCreatedStudent: (data: {
    studentName: string;
    ticketId: string;
    subject: string;
    message: string;
    priority: string;
  }) => ({
    subject: `[Ticket #${data.ticketId.slice(-6).toUpperCase()}] Support Request Received: ${data.subject}`,
    html: emailWrapper(
      'Support Request Received',
      `
      <h2 style="color: #173B73; margin-top: 0;">Support Ticket Received</h2>
      <p>Hello ${data.studentName},</p>
      <p>Your support ticket has been created and assigned to our technical support team. A specialist is reviewing your inquiry.</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Ticket ID:</strong> #${data.ticketId.slice(-6).toUpperCase()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> <span class="badge">${data.priority}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Status:</strong> <span style="color: #b45309; font-weight: bold;">OPEN</span></p>
        <p style="margin: 0;"><strong>Issue Details:</strong></p>
        <blockquote style="margin: 8px 0 0 0; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #2563EB; font-size: 13px; color: #334155;">
          ${data.message}
        </blockquote>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${config.clientUrl}/support" class="button">Track Ticket in Dashboard</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Support Contact: support@tricubedigitalsolutions.com | SkillUp Student Skill Development Platform</p>
      `
    ),
  }),

  // 19. Support Ticket Alert (Admin Notification)
  ticketCreatedAdmin: (data: {
    studentName: string;
    studentEmail: string;
    ticketId: string;
    subject: string;
    message: string;
    priority: string;
  }) => ({
    subject: `[NEW TICKET #${data.ticketId.slice(-6).toUpperCase()}] (${data.priority}) - ${data.subject}`,
    html: emailWrapper(
      'New Student Support Ticket',
      `
      <h2 style="color: #173B73; margin-top: 0;">New Support Ticket Filed</h2>
      <p>A new support inquiry has been submitted by <strong>${data.studentName}</strong> (${data.studentEmail}).</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Ticket Ref:</strong> #${data.ticketId.slice(-6).toUpperCase()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Student:</strong> ${data.studentName} (${data.studentEmail})</p>
        <p style="margin: 0 0 8px 0;"><strong>Priority:</strong> <span class="badge">${data.priority}</span></p>
        <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 0;"><strong>Description:</strong></p>
        <blockquote style="margin: 8px 0 0 0; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #2563EB; font-size: 13px; color: #334155;">
          ${data.message}
        </blockquote>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${config.clientUrl}/admin" class="button">Open Admin Support Center</a>
      </div>
      `
    ),
  }),

  // 20. Support Ticket Status / Resolution Update
  ticketStatusUpdate: (data: {
    studentName: string;
    ticketId: string;
    subject: string;
    status: string;
    replyMessage?: string;
  }) => ({
    subject: `[Ticket #${data.ticketId.slice(-6).toUpperCase()}] Status Update: ${data.status}`,
    html: emailWrapper(
      'Support Ticket Update',
      `
      <h2 style="color: #173B73; margin-top: 0;">Support Ticket Status Update</h2>
      <p>Hello ${data.studentName},</p>
      <p>Your support ticket has been updated to <strong>${data.status}</strong> by our administrative team.</p>
      <div class="card">
        <p style="margin: 0 0 8px 0;"><strong>Ticket ID:</strong> #${data.ticketId.slice(-6).toUpperCase()}</p>
        <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 0 0 8px 0;"><strong>New Status:</strong> <span class="badge">${data.status}</span></p>
        ${
          data.replyMessage
            ? `
            <p style="margin: 8px 0 0 0;"><strong>Response from Staff:</strong></p>
            <blockquote style="margin: 8px 0 0 0; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #16845B; font-size: 13px; color: #334155;">
              ${data.replyMessage}
            </blockquote>
            `
            : ''
        }
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${config.clientUrl}/support" class="button">View Support Conversation</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">SkillUp Student Skill Development Platform Support Team</p>
      `
    ),
  }),
};
