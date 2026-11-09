import BRAND_CONFIG from '../config/brandConfig';
import { renderSkillUpEmailWrapper } from './emailTemplateRenderer';

export interface EmailTemplatePayload {
  subject: string;
  html: string;
  text?: string;
}

/**
 * 36 Unified Corporate Email Templates for SkillUp
 * Covering:
 * - Account & Authentication (1-5)
 * - Course Management & Payments (6-12)
 * - Live Classes (13-18)
 * - Internships (19-23)
 * - Learning Materials (24-26)
 * - Achievements & Recognition (27-29)
 * - Admin & Mentor Oversight (30-36)
 */
export const skillUpEmailCatalog = {
  // -------------------------------------------------------------
  // 1. ACCOUNT & AUTHENTICATION
  // -------------------------------------------------------------
  welcome: (name: string): EmailTemplatePayload => ({
    subject: 'Welcome to SkillUp — Your Learning Journey Begins Today!',
    html: renderSkillUpEmailWrapper({
      title: 'Welcome to SkillUp',
      recipientName: name,
      contentHtml: `
        <p>Congratulations! Your SkillUp student profile has been verified and activated.</p>
        <p>You now have unrestricted access to explore our industry-grade cohorts, video courses, capstone projects, and real-time doubt clearing with seasoned mentors.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
          <strong style="color: #111111; font-size: 13px;">What you can do right now:</strong>
          <ul style="margin: 8px 0 0 18px; padding: 0; color: #475569; font-size: 13px; line-height: 1.6;">
            <li>Enroll in high-impact courses across Full-Stack, AI &amp; Cloud.</li>
            <li>Book interactive live masterclasses.</li>
            <li>Apply for verified virtual internships with industry partners.</li>
          </ul>
        </div>
      `,
      ctaText: 'Explore Student Dashboard',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
    }),
  }),

  registrationOTP: (name: string, otp: string): EmailTemplatePayload => ({
    subject: `SkillUp Account Verification Code: ${otp}`,
    html: renderSkillUpEmailWrapper({
      title: 'Verify Your Email Address',
      recipientName: name,
      contentHtml: `
        <p>Thank you for registering on SkillUp. Please enter the 6-digit verification code below to verify your email address and activate your account:</p>
        <div style="margin: 26px 0; padding: 22px 20px; background-color: #F0FDF4; border: 2px solid #5DBA58; border-radius: 14px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #5DBA58; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
            Your Single-Use Verification Code
          </div>
          <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #111111; margin: 6px 0;">
            ${otp}
          </div>
          <p style="margin: 8px 0 0; font-size: 12px; color: #64748B;">This code is valid for <strong>5 minutes</strong>. Never share this code with anyone.</p>
        </div>
        <p style="font-size: 13px; color: #64748B;">If you did not initiate this registration request, please disregard this email.</p>
      `,
      bannerType: 'green',
    }),
  }),

  passwordReset: (name: string, resetUrl: string): EmailTemplatePayload => ({
    subject: 'Reset Your SkillUp Account Password',
    html: renderSkillUpEmailWrapper({
      title: 'Reset Password Request',
      recipientName: name,
      contentHtml: `
        <p>We received a request to reset the password for your SkillUp account.</p>
        <p>Click the button below to choose a new password. For security purposes, this password reset link will expire in <strong>60 minutes</strong>.</p>
        <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin: 20px 0; color: #92400E; font-size: 12px;">
          <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or reach out to our security team immediately.
        </div>
      `,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
      secondaryCtaText: 'Contact Support if this wasn\'t you',
      secondaryCtaUrl: `mailto:${BRAND_CONFIG.supportEmail}`,
    }),
  }),

  passwordChanged: (name: string): EmailTemplatePayload => ({
    subject: 'Security Confirmation: SkillUp Password Updated',
    html: renderSkillUpEmailWrapper({
      title: 'Password Updated Successfully',
      recipientName: name,
      contentHtml: `
        <p>This is a confirmation that the password for your SkillUp account has been changed successfully.</p>
        <p>You can now sign in using your new credentials.</p>
        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px 16px; margin: 20px 0; color: #991B1B; font-size: 12px;">
          <strong>Did not make this change?</strong> Your account may be compromised. Please reset your password immediately or contact our support team.
        </div>
      `,
      ctaText: 'Sign In to Your Account',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/login`,
      bannerType: 'success',
    }),
  }),

  loginSecurityAlert: (name: string, data: { ip: string; device: string; time: string }): EmailTemplatePayload => ({
    subject: 'Security Alert: New Sign-In to Your SkillUp Account',
    html: renderSkillUpEmailWrapper({
      title: 'New Sign-In Detected',
      recipientName: name,
      contentHtml: `
        <p>We detected a new sign-in to your SkillUp account with the following details:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Device / Browser:</strong> ${data.device || 'Web Browser'}</div>
          <div><strong>IP Address:</strong> ${data.ip || 'Recorded'}</div>
          <div><strong>Time:</strong> ${data.time || new Date().toLocaleString('en-IN')}</div>
        </div>
        <p style="font-size: 13px; color: #64748B;">If this was you, no action is needed. If you do not recognize this activity, please secure your account immediately.</p>
      `,
      ctaText: 'Review Security Settings',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard/profile`,
    }),
  }),

  // -------------------------------------------------------------
  // 2. COURSE MANAGEMENT & PAYMENTS
  // -------------------------------------------------------------
  courseEnrollmentConfirmation: (data: { studentName: string; courseTitle: string; courseUrl?: string }): EmailTemplatePayload => ({
    subject: `Enrollment Confirmed: ${data.courseTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Course Enrollment Confirmed',
      recipientName: data.studentName,
      contentHtml: `
        <p>You have been successfully enrolled in <strong>${data.courseTitle}</strong>!</p>
        <p>Your curriculum, video modules, live session access, and assignment portals are now unlocked.</p>
        <div style="background-color: #EAF5EA; border: 1px solid #B8E2B6; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
          <strong style="color: #111111; font-size: 13px;">Course Details:</strong>
          <p style="margin: 6px 0 0 0; color: #2D3748; font-size: 13px;">
            <strong>Program:</strong> ${data.courseTitle}<br />
            <strong>Access:</strong> Full Lifetime Access &amp; Capstone Evaluation
          </p>
        </div>
      `,
      ctaText: 'Go to Classroom & Start Learning',
      ctaUrl: data.courseUrl || `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  paymentSuccessReceipt: (data: {
    studentName: string;
    productTitle: string;
    amount: number;
    transactionId: string;
    receiptUrl?: string;
    paymentPlan?: string;
  }): EmailTemplatePayload => ({
    subject: `Payment Receipt: ₹${Number(data.amount).toLocaleString('en-IN')} for ${data.productTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Payment Receipt Confirmed',
      recipientName: data.studentName,
      contentHtml: `
        <p>Thank you for your payment. Your transaction has been verified and settled successfully.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #334155; line-height: 1.8;">
            <tr>
              <td><strong>Item Purchased:</strong></td>
              <td align="right" style="color: #111111; font-weight: 700;">${data.productTitle}</td>
            </tr>
            <tr>
              <td><strong>Transaction / Order ID:</strong></td>
              <td align="right" style="font-family: monospace;">${data.transactionId}</td>
            </tr>
            <tr>
              <td><strong>Payment Plan:</strong></td>
              <td align="right">${data.paymentPlan || 'FULL'}</td>
            </tr>
            <tr>
              <td><strong>Amount Paid (INR):</strong></td>
              <td align="right" style="font-size: 15px; font-weight: 800; color: #5DBA58;">₹${Number(data.amount).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong></td>
              <td align="right">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
        </div>
        <p style="font-size: 12px; color: #64748B;">A printable copy of this receipt is preserved in your student billing history.</p>
      `,
      ctaText: 'Access Purchased Item',
      ctaUrl: data.receiptUrl || `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  paymentFailed: (data: { studentName: string; productTitle: string; reason?: string }): EmailTemplatePayload => ({
    subject: `Payment Incomplete / Failed: ${data.productTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Payment Could Not Be Processed',
      recipientName: data.studentName,
      contentHtml: `
        <p>We attempted to process your payment for <strong>${data.productTitle}</strong>, but the transaction could not be completed by the banking gateway.</p>
        ${data.reason ? `<div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 14px 16px; margin: 18px 0; color: #991B1B; font-size: 13px;"><strong>Gateway message:</strong> ${data.reason}</div>` : ''}
        <p>No funds were permanently deducted. If your account was debited, the amount will be refunded automatically by your bank within 3–5 business days.</p>
        <p>You can retry your payment anytime using UPI, Card, Net Banking or EMI.</p>
      `,
      ctaText: 'Retry Payment Now',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/courses`,
      bannerType: 'alert',
    }),
  }),

  partialPaymentConfirmation: (data: {
    studentName: string;
    productTitle: string;
    amountPaid: number;
    remainingBalance: number;
    dueDate?: string;
  }): EmailTemplatePayload => ({
    subject: `Partial Payment Confirmed: ${data.productTitle} (Balance: ₹${Number(data.remainingBalance).toLocaleString('en-IN')})`,
    html: renderSkillUpEmailWrapper({
      title: 'Installment Payment Confirmed',
      recipientName: data.studentName,
      contentHtml: `
        <p>We have successfully received your installment payment of <strong>₹${Number(data.amountPaid).toLocaleString('en-IN')}</strong> for <strong>${data.productTitle}</strong>.</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Amount Paid Today:</strong> <span style="color: #5DBA58; font-weight: 700;">₹${Number(data.amountPaid).toLocaleString('en-IN')}</span></div>
          <div><strong>Remaining Balance:</strong> <span style="color: #D97706; font-weight: 700;">₹${Number(data.remainingBalance).toLocaleString('en-IN')}</span></div>
          ${data.dueDate ? `<div><strong>Next Due Date:</strong> ${data.dueDate}</div>` : ''}
        </div>
        <p>Your classroom access remains fully active.</p>
      `,
      ctaText: 'View Payment Schedule',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  remainingPaymentReminder: (data: {
    studentName: string;
    productTitle: string;
    remainingBalance: number;
    dueDate?: string;
    paymentUrl?: string;
  }): EmailTemplatePayload => ({
    subject: `Payment Reminder: Upcoming Installment for ${data.productTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Installment Payment Reminder',
      recipientName: data.studentName,
      contentHtml: `
        <p>This is a friendly reminder that an installment payment for <strong>${data.productTitle}</strong> is pending.</p>
        <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
          <div style="font-size: 13px; color: #92400E; line-height: 1.8;">
            <strong>Course:</strong> ${data.productTitle}<br />
            <strong>Outstanding Balance:</strong> <span style="font-size: 16px; font-weight: 800;">₹${Number(data.remainingBalance).toLocaleString('en-IN')}</span><br />
            ${data.dueDate ? `<strong>Due Date:</strong> ${data.dueDate}` : ''}
          </div>
        </div>
        <p>To avoid any disruption to your course access or live classes, please settle the outstanding balance.</p>
      `,
      ctaText: 'Pay Outstanding Balance',
      ctaUrl: data.paymentUrl || `${BRAND_CONFIG.websiteUrl}/dashboard`,
    }),
  }),

  courseAccessActivated: (data: { studentName: string; courseTitle: string }): EmailTemplatePayload => ({
    subject: `Full Course Access Activated: ${data.courseTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Course Access Unlocked',
      recipientName: data.studentName,
      contentHtml: `
        <p>Great news! Your complete course materials, hands-on lab exercises, and mentor review queue for <strong>${data.courseTitle}</strong> have been unlocked.</p>
        <p>Our instructional team is excited to support your learning progress.</p>
      `,
      ctaText: 'Start Course Now',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  courseCompletionConfirmation: (data: {
    studentName: string;
    courseTitle: string;
    certificateUrl?: string;
  }): EmailTemplatePayload => ({
    subject: `Congratulations on Completing ${data.courseTitle}!`,
    html: renderSkillUpEmailWrapper({
      title: 'Course Completed Successfully',
      recipientName: data.studentName,
      contentHtml: `
        <p>Outstanding accomplishment! You have completed all modules, lessons, and evaluations for <strong>${data.courseTitle}</strong>.</p>
        <p>Your verifiable Certificate of Completion has been generated and added to your profile.</p>
      `,
      ctaText: 'Download Your Verified Certificate',
      ctaUrl: data.certificateUrl || `${BRAND_CONFIG.websiteUrl}/certificates`,
      bannerType: 'success',
    }),
  }),

  // -------------------------------------------------------------
  // 3. LIVE CLASSES
  // -------------------------------------------------------------
  liveClassScheduled: (data: {
    studentName: string;
    classTitle: string;
    date: string;
    time: string;
    meetingUrl: string;
    mentorName?: string;
  }): EmailTemplatePayload => ({
    subject: `Live Class Scheduled: ${data.classTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Live Interactive Masterclass Scheduled',
      recipientName: data.studentName,
      contentHtml: `
        <p>A new live interactive session has been scheduled for your enrolled program:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 22px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Masterclass Title:</strong> <span style="color: #111111; font-weight: 700;">${data.classTitle}</span></div>
          <div><strong>Date:</strong> ${data.date}</div>
          <div><strong>Time:</strong> ${data.time}</div>
          ${data.mentorName ? `<div><strong>Instructor / Mentor:</strong> ${data.mentorName}</div>` : ''}
        </div>
        <p style="font-size: 13px; color: #64748B;">Please join on time with an active internet connection. You can ask questions and participate in live coding.</p>
      `,
      ctaText: 'Join Live Class Room',
      ctaUrl: data.meetingUrl,
      bannerType: 'green',
    }),
  }),

  liveClassReminder: (data: {
    studentName: string;
    classTitle: string;
    startsIn: string;
    meetingUrl: string;
  }): EmailTemplatePayload => ({
    subject: `Reminder: Live Class "${data.classTitle}" Starts in ${data.startsIn}`,
    html: renderSkillUpEmailWrapper({
      title: 'Live Class Starting Soon',
      recipientName: data.studentName,
      contentHtml: `
        <p>This is a quick reminder that your live session <strong>${data.classTitle}</strong> will begin in <strong>${data.startsIn}</strong>.</p>
        <p>Click below to join the session directly:</p>
      `,
      ctaText: 'Join Live Class',
      ctaUrl: data.meetingUrl,
      bannerType: 'green',
    }),
  }),

  liveClassStartingNow: (data: { studentName: string; classTitle: string; meetingUrl: string }): EmailTemplatePayload => ({
    subject: `🔴 Live Now: ${data.classTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Live Session is Now In Session',
      recipientName: data.studentName,
      contentHtml: `
        <p>Your mentor has opened the live session for <strong>${data.classTitle}</strong>.</p>
        <p>Click below to join right now and connect with your cohort.</p>
      `,
      ctaText: 'Enter Live Class Now',
      ctaUrl: data.meetingUrl,
      bannerType: 'green',
    }),
  }),

  liveClassCancelled: (data: { studentName: string; classTitle: string; reason?: string }): EmailTemplatePayload => ({
    subject: `Notice: Live Class "${data.classTitle}" Cancelled`,
    html: renderSkillUpEmailWrapper({
      title: 'Live Class Notice',
      recipientName: data.studentName,
      contentHtml: `
        <p>Please be advised that the live class <strong>${data.classTitle}</strong> has been cancelled.</p>
        ${data.reason ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; color: #475569; font-size: 13px;"><strong>Reason:</strong> ${data.reason}</div>` : ''}
        <p>Our academic coordinator will publish a rescheduled slot shortly. We apologize for the inconvenience.</p>
      `,
      ctaText: 'View Updated Schedule',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/live-classes`,
      bannerType: 'alert',
    }),
  }),

  liveClassRescheduled: (data: {
    studentName: string;
    classTitle: string;
    newDate: string;
    newTime: string;
    meetingUrl: string;
  }): EmailTemplatePayload => ({
    subject: `Rescheduled: Live Class "${data.classTitle}"`,
    html: renderSkillUpEmailWrapper({
      title: 'Live Class Rescheduled',
      recipientName: data.studentName,
      contentHtml: `
        <p>The scheduled session for <strong>${data.classTitle}</strong> has been moved to a new time slot:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>New Date:</strong> ${data.newDate}</div>
          <div><strong>New Time:</strong> ${data.newTime}</div>
        </div>
        <p>Please update your calendar accordingly.</p>
      `,
      ctaText: 'View Class Details',
      ctaUrl: data.meetingUrl || `${BRAND_CONFIG.websiteUrl}/live-classes`,
    }),
  }),

  liveClassCompleted: (data: { studentName: string; classTitle: string; recordingUrl?: string }): EmailTemplatePayload => ({
    subject: `Class Completed: ${data.classTitle} (Recording Available)`,
    html: renderSkillUpEmailWrapper({
      title: 'Masterclass Completed',
      recipientName: data.studentName,
      contentHtml: `
        <p>Thank you for attending the live masterclass <strong>${data.classTitle}</strong>.</p>
        <p>The session recording and attached resources are now accessible in your course library for review.</p>
      `,
      ctaText: 'Watch Session Recording',
      ctaUrl: data.recordingUrl || `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  // -------------------------------------------------------------
  // 4. INTERNSHIP PROGRAM
  // -------------------------------------------------------------
  internshipApplicationConfirmation: (data: { studentName: string; internshipTitle: string }): EmailTemplatePayload => ({
    subject: `Application Received: ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Internship Application Under Review',
      recipientName: data.studentName,
      contentHtml: `
        <p>We have successfully received your application for the <strong>${data.internshipTitle}</strong> virtual internship program.</p>
        <p>Our review team is evaluating your profile, skills, and prerequisites. You will receive an update within 2–3 business days.</p>
      `,
      ctaText: 'View Application Status',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/internship`,
    }),
  }),

  internshipApproved: (data: { studentName: string; internshipTitle: string; startDate?: string }): EmailTemplatePayload => ({
    subject: `🎉 Congratulations! Internship Application Approved: ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Internship Offer Confirmed',
      recipientName: data.studentName,
      contentHtml: `
        <p>Congratulations! Your application for the <strong>${data.internshipTitle}</strong> internship has been approved.</p>
        <p>You have been placed in an active cohort. Your project brief, repository guidelines, and assigned mentor will be available in your portal.</p>
        ${data.startDate ? `<p><strong>Program Start Date:</strong> ${data.startDate}</p>` : ''}
      `,
      ctaText: 'Open Internship Portal',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/internship`,
      bannerType: 'success',
    }),
  }),

  internshipRejected: (data: { studentName: string; internshipTitle: string; feedback?: string }): EmailTemplatePayload => ({
    subject: `Application Update: ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Internship Application Update',
      recipientName: data.studentName,
      contentHtml: `
        <p>Thank you for your interest in the <strong>${data.internshipTitle}</strong> program.</p>
        <p>After careful evaluation of the cohort capacity and applicant prerequisites, we are unable to offer you a position in this particular intake.</p>
        ${data.feedback ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin: 16px 0; color: #475569; font-size: 13px;"><strong>Mentor Feedback:</strong> ${data.feedback}</div>` : ''}
        <p>We encourage you to complete additional course projects and apply for our next monthly intake.</p>
      `,
      ctaText: 'Explore Available Programs',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/courses`,
    }),
  }),

  internshipCompleted: (data: { studentName: string; internshipTitle: string }): EmailTemplatePayload => ({
    subject: `Internship Completed: ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Internship Successfully Completed',
      recipientName: data.studentName,
      contentHtml: `
        <p>Congratulations on completing all milestone deliverables, code reviews, and project presentations for <strong>${data.internshipTitle}</strong>.</p>
        <p>Your performance dossier and evaluation grades have been finalized by your industry mentor.</p>
      `,
      ctaText: 'View Final Evaluation',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/internship`,
      bannerType: 'success',
    }),
  }),

  internshipCertificateIssued: (data: {
    studentName: string;
    internshipTitle: string;
    certificateUrl: string;
  }): EmailTemplatePayload => ({
    subject: `Verified Internship Certificate: ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Internship Certificate Issued',
      recipientName: data.studentName,
      contentHtml: `
        <p>Your official, verifiable SkillUp Internship Certificate for <strong>${data.internshipTitle}</strong> has been issued.</p>
        <p>You can share this credential directly on LinkedIn or attach it to your technical resume.</p>
      `,
      ctaText: 'Download Official Certificate',
      ctaUrl: data.certificateUrl,
      bannerType: 'success',
    }),
  }),

  // -------------------------------------------------------------
  // 5. LEARNING MATERIALS
  // -------------------------------------------------------------
  materialPurchaseConfirmation: (data: {
    studentName: string;
    materialTitle: string;
    amount: number;
    downloadUrl?: string;
  }): EmailTemplatePayload => ({
    subject: `Access Confirmed: ${data.materialTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Learning Resource Unlocked',
      recipientName: data.studentName,
      contentHtml: `
        <p>Thank you for purchasing <strong>${data.materialTitle}</strong>.</p>
        <p>Your comprehensive study resource, architecture cheatsheets, and code repository links are now available for instant download.</p>
      `,
      ctaText: 'Download Study Material',
      ctaUrl: data.downloadUrl || `${BRAND_CONFIG.websiteUrl}/materials`,
      bannerType: 'success',
    }),
  }),

  materialAccessGranted: (data: { studentName: string; materialTitle: string; downloadUrl?: string }): EmailTemplatePayload => ({
    subject: `Material Access Granted: ${data.materialTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Study Resource Granted',
      recipientName: data.studentName,
      contentHtml: `
        <p>An administrator or mentor has granted you access to <strong>${data.materialTitle}</strong>.</p>
        <p>Click below to download or view the material directly.</p>
      `,
      ctaText: 'View Material',
      ctaUrl: data.downloadUrl || `${BRAND_CONFIG.websiteUrl}/materials`,
      bannerType: 'success',
    }),
  }),

  newStudyMaterialAnnouncement: (data: { studentName: string; materialTitle: string; category?: string }): EmailTemplatePayload => ({
    subject: `New Study Material Released: ${data.materialTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Learning Resource Published',
      recipientName: data.studentName,
      contentHtml: `
        <p>A new high-yield study resource has just been published on SkillUp: <strong>${data.materialTitle}</strong>.</p>
        ${data.category ? `<p><strong>Category:</strong> ${data.category}</p>` : ''}
        <p>Check out the syllabus, download sample pages, and add it to your learning library.</p>
      `,
      ctaText: 'Explore Material',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/materials`,
    }),
  }),

  // -------------------------------------------------------------
  // 6. ACHIEVEMENTS & RECOGNITION
  // -------------------------------------------------------------
  achievementPublished: (data: { studentName: string; achievementTitle: string; achievementUrl?: string }): EmailTemplatePayload => ({
    subject: `Recognition: Your Achievement "${data.achievementTitle}" is Live!`,
    html: renderSkillUpEmailWrapper({
      title: 'Achievement Published to Showcase',
      recipientName: data.studentName,
      contentHtml: `
        <p>Congratulations! Your achievement <strong>${data.achievementTitle}</strong> has been reviewed and officially published on the SkillUp community showcase.</p>
        <p>Your accomplishment is now visible to industry recruiters, mentors, and fellow learners.</p>
      `,
      ctaText: 'View Your Achievement Showcase',
      ctaUrl: data.achievementUrl || `${BRAND_CONFIG.websiteUrl}/achievements`,
      bannerType: 'success',
    }),
  }),

  certificateIssued: (data: {
    studentName: string;
    courseTitle: string;
    certificateNo: string;
    certificateUrl: string;
  }): EmailTemplatePayload => ({
    subject: `Official SkillUp Certificate: ${data.courseTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Certificate of Excellence Issued',
      recipientName: data.studentName,
      contentHtml: `
        <p>Congratulations on successfully fulfilling all requirements for <strong>${data.courseTitle}</strong>!</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 22px 0;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.8;">
            <tr>
              <td><strong>Recipient:</strong></td>
              <td align="right" style="font-weight: 700; color: #111111;">${data.studentName}</td>
            </tr>
            <tr>
              <td><strong>Program:</strong></td>
              <td align="right">${data.courseTitle}</td>
            </tr>
            <tr>
              <td><strong>Credential ID:</strong></td>
              <td align="right" style="font-family: monospace; color: #5DBA58; font-weight: 700;">${data.certificateNo}</td>
            </tr>
            <tr>
              <td><strong>Verification:</strong></td>
              <td align="right" style="color: #5DBA58; font-weight: 700;">Tamper-proof Cryptographic Verification</td>
            </tr>
          </table>
        </div>
      `,
      ctaText: 'Download & Verify Certificate',
      ctaUrl: data.certificateUrl,
      bannerType: 'success',
    }),
  }),

  studentRecognition: (data: { studentName: string; recognitionTitle: string; reason: string }): EmailTemplatePayload => ({
    subject: `🌟 Student Recognition: ${data.recognitionTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'SkillUp Spotlight Recognition',
      recipientName: data.studentName,
      contentHtml: `
        <p>The academic faculty and mentorship leads have selected you for special recognition: <strong>${data.recognitionTitle}</strong>.</p>
        <div style="background-color: #EAF5EA; border: 1px solid #B8E2B6; border-radius: 12px; padding: 18px 20px; margin: 20px 0; color: #111111; font-size: 13px; line-height: 1.7;">
          <strong>Why you were recognized:</strong>
          <p style="margin: 6px 0 0 0;">${data.reason}</p>
        </div>
      `,
      ctaText: 'View Recognition in Profile',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/dashboard`,
      bannerType: 'success',
    }),
  }),

  // -------------------------------------------------------------
  // 7. ADMIN & MENTOR NOTIFICATIONS
  // -------------------------------------------------------------
  adminNewStudentRegistration: (data: { studentName: string; email: string; phone?: string }): EmailTemplatePayload => ({
    subject: `[Admin Alert] New Student Registration: ${data.studentName}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Student Account Created',
      contentHtml: `
        <p>A new student has registered on the SkillUp platform:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Student Name:</strong> ${data.studentName}</div>
          <div><strong>Email:</strong> ${data.email}</div>
          <div><strong>Phone:</strong> ${data.phone || 'Not Provided'}</div>
          <div><strong>Registered At:</strong> ${new Date().toLocaleString('en-IN')}</div>
        </div>
      `,
      ctaText: 'Inspect in Admin Portal',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/admin`,
    }),
  }),

  adminNewCourseEnrollment: (data: {
    studentName: string;
    studentEmail: string;
    courseTitle: string;
  }): EmailTemplatePayload => ({
    subject: `[Admin Alert] New Enrollment: ${data.studentName} in ${data.courseTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'Course Enrollment Notification',
      contentHtml: `
        <p>A student has completed enrollment in a course cohort:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Course:</strong> ${data.courseTitle}</div>
          <div><strong>Student:</strong> ${data.studentName} (${data.studentEmail})</div>
        </div>
      `,
      ctaText: 'View Course Analytics',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/admin`,
    }),
  }),

  adminNewPaymentNotification: (data: {
    studentName: string;
    productTitle: string;
    amount: number;
    transactionId: string;
  }): EmailTemplatePayload => ({
    subject: `[Payment Alert] ₹${Number(data.amount).toLocaleString('en-IN')} Received from ${data.studentName}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Commercial Transaction',
      contentHtml: `
        <p>A successful payment transaction was captured via the payment gateway:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Customer:</strong> ${data.studentName}</div>
          <div><strong>Product / Item:</strong> ${data.productTitle}</div>
          <div><strong>Settled Amount:</strong> <strong style="color: #5DBA58;">₹${Number(data.amount).toLocaleString('en-IN')}</strong></div>
          <div><strong>Transaction ID:</strong> ${data.transactionId}</div>
        </div>
      `,
      ctaText: 'Open Payment Telemetry',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/admin`,
      bannerType: 'success',
    }),
  }),

  adminNewInternshipApplication: (data: {
    studentName: string;
    studentEmail: string;
    internshipTitle: string;
  }): EmailTemplatePayload => ({
    subject: `[Internship Alert] New Application for ${data.internshipTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Internship Applicant',
      contentHtml: `
        <p>A student submitted an application for the virtual internship program:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Program:</strong> ${data.internshipTitle}</div>
          <div><strong>Applicant:</strong> ${data.studentName} (${data.studentEmail})</div>
        </div>
      `,
      ctaText: 'Review Applicant Dossier',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/admin`,
    }),
  }),

  adminNewStudentQuery: (data: {
    studentName: string;
    studentEmail: string;
    subject: string;
    ticketId: string;
  }): EmailTemplatePayload => ({
    subject: `[Support Query #${data.ticketId}] ${data.subject}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Support / Help Ticket',
      contentHtml: `
        <p>A new student help desk inquiry has been submitted:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 13px; line-height: 1.8;">
          <div><strong>Ticket ID:</strong> #${data.ticketId}</div>
          <div><strong>Student:</strong> ${data.studentName} (${data.studentEmail})</div>
          <div><strong>Subject:</strong> ${data.subject}</div>
        </div>
      `,
      ctaText: 'Open Ticket in Admin Desk',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/admin`,
    }),
  }),

  mentorAssignmentNotification: (data: {
    mentorName: string;
    courseTitle: string;
    batchName?: string;
  }): EmailTemplatePayload => ({
    subject: `Teaching Assignment: ${data.courseTitle}`,
    html: renderSkillUpEmailWrapper({
      title: 'New Teaching Mentor Assignment',
      recipientName: data.mentorName,
      contentHtml: `
        <p>An administrator has assigned you as an active Teaching Mentor for <strong>${data.courseTitle}</strong>${data.batchName ? ` (${data.batchName})` : ''}.</p>
        <p>You can now manage live classes, evaluate submitted assignments, and provide technical guidance through your Mentor Dashboard.</p>
      `,
      ctaText: 'Open Mentor Dashboard',
      ctaUrl: `${BRAND_CONFIG.websiteUrl}/mentor-dashboard`,
      bannerType: 'green',
    }),
  }),

  adminAnnouncement: (data: { title: string; bodyHtml: string; recipientName?: string }): EmailTemplatePayload => ({
    subject: `[SkillUp Announcement] ${data.title}`,
    html: renderSkillUpEmailWrapper({
      title: data.title,
      recipientName: data.recipientName,
      contentHtml: `
        <div style="font-size: 14px; line-height: 1.7; color: #334155;">
          ${data.bodyHtml}
        </div>
      `,
      ctaText: 'Visit SkillUp Platform',
      ctaUrl: BRAND_CONFIG.websiteUrl,
      bannerType: 'green',
    }),
  }),
};

export default skillUpEmailCatalog;

