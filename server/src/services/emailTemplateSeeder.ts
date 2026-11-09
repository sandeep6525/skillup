import prisma from '../config/prisma';

export const ALL_36_TEMPLATES = [
  // 1. Account & Authentication
  { code: 'STUDENT_WELCOME', name: '1. Welcome After Registration', subject: 'Welcome to SkillUp — Your Learning Journey Begins Today!', category: 'ACCOUNT' },
  { code: 'EMAIL_VERIFICATION_OTP', name: '2. Email Verification / OTP', subject: 'SkillUp Account Verification Code: {{otp}}', category: 'ACCOUNT' },
  { code: 'PASSWORD_RESET', name: '3. Password Reset Request', subject: 'Reset Your SkillUp Account Password', category: 'ACCOUNT' },
  { code: 'PASSWORD_CHANGED', name: '4. Password Changed Confirmation', subject: 'Security Confirmation: SkillUp Password Updated', category: 'ACCOUNT' },
  { code: 'LOGIN_SECURITY_ALERT', name: '5. Login / Security Notification', subject: 'Security Alert: New Sign-In to Your SkillUp Account', category: 'ACCOUNT' },

  // 2. Course Management
  { code: 'COURSE_ENROLLMENT_CONFIRMATION', name: '6. Course Enrollment Confirmation', subject: 'Enrollment Confirmed: {{courseTitle}}', category: 'COURSE' },
  { code: 'COURSE_PAYMENT_RECEIPT', name: '7. Successful Payment Receipt', subject: 'Payment Receipt: {{courseTitle}} (Ref: {{paymentRef}})', category: 'PAYMENT' },
  { code: 'PAYMENT_FAILED', name: '8. Payment Failure Notification', subject: 'Payment Incomplete / Failed: {{productTitle}}', category: 'PAYMENT' },
  { code: 'PARTIAL_PAYMENT_CONFIRMATION', name: '9. Partial Payment Confirmation', subject: 'Partial Payment Confirmed: {{productTitle}}', category: 'PAYMENT' },
  { code: 'REMAINING_PAYMENT_REMINDER', name: '10. Remaining Payment Reminder', subject: 'Payment Reminder: Upcoming Installment for {{courseTitle}}', category: 'PAYMENT' },
  { code: 'COURSE_ACCESS_ACTIVATED', name: '11. Course Access Activation', subject: 'Full Course Access Activated: {{courseTitle}}', category: 'COURSE' },
  { code: 'COURSE_COMPLETION_CONFIRMATION', name: '12. Course Completion Confirmation', subject: 'Congratulations on Completing {{courseTitle}}!', category: 'COURSE' },

  // 3. Live Classes
  { code: 'LIVE_CLASS_SCHEDULED', name: '13. Live Class Scheduled', subject: 'Live Class Scheduled: {{classTitle}}', category: 'LIVE_CLASS' },
  { code: 'LIVE_CLASS_REMINDER', name: '14. Live Class Reminder', subject: 'Reminder: Live Class "{{classTitle}}" Starts Soon', category: 'LIVE_CLASS' },
  { code: 'LIVE_CLASS_STARTING_NOW', name: '15. Live Class Starting Now', subject: '🔴 Live Now: {{classTitle}}', category: 'LIVE_CLASS' },
  { code: 'LIVE_CLASS_CANCELLED', name: '16. Live Class Cancelled', subject: 'Notice: Live Class "{{classTitle}}" Cancelled', category: 'LIVE_CLASS' },
  { code: 'LIVE_CLASS_RESCHEDULED', name: '17. Live Class Rescheduled', subject: 'Rescheduled: Live Class "{{classTitle}}"', category: 'LIVE_CLASS' },
  { code: 'LIVE_CLASS_COMPLETED', name: '18. Live Class Completed', subject: 'Class Completed: {{classTitle}} (Recording Available)', category: 'LIVE_CLASS' },

  // 4. Internship
  { code: 'INTERNSHIP_APPLICATION_CONFIRMATION', name: '19. Internship Application Confirmation', subject: 'Application Received: {{internshipTitle}}', category: 'INTERNSHIP' },
  { code: 'INTERNSHIP_APPROVAL', name: '20. Internship Approval', subject: '🎉 Congratulations! Internship Application Approved: {{internshipTitle}}', category: 'INTERNSHIP' },
  { code: 'INTERNSHIP_REJECTION', name: '21. Internship Rejection', subject: 'Application Update: {{internshipTitle}}', category: 'INTERNSHIP' },
  { code: 'INTERNSHIP_COMPLETION', name: '22. Internship Completion', subject: 'Internship Completed: {{internshipTitle}}', category: 'INTERNSHIP' },
  { code: 'INTERNSHIP_CERTIFICATE_ISSUED', name: '23. Internship Certificate Issued', subject: 'Verified Internship Certificate: {{internshipTitle}}', category: 'INTERNSHIP' },

  // 5. Materials
  { code: 'MATERIAL_PURCHASE_CONFIRMATION', name: '24. Material Purchase Confirmation', subject: 'Access Confirmed: {{materialTitle}}', category: 'MATERIAL' },
  { code: 'MATERIAL_ACCESS_GRANTED', name: '25. Material Access Granted', subject: 'Material Access Granted: {{materialTitle}}', category: 'MATERIAL' },
  { code: 'NEW_STUDY_MATERIAL_ANNOUNCEMENT', name: '26. New Study Material Announcement', subject: 'New Study Material Released: {{materialTitle}}', category: 'MATERIAL' },

  // 6. Achievements
  { code: 'ACHIEVEMENT_PUBLISHED', name: '27. Achievement Published', subject: 'Recognition: Your Achievement "{{achievementTitle}}" is Live!', category: 'ACHIEVEMENT' },
  { code: 'CERTIFICATE_ISSUED', name: '28. Certificate Issued', subject: 'Official SkillUp Certificate: {{courseTitle}}', category: 'ACHIEVEMENT' },
  { code: 'STUDENT_RECOGNITION', name: '29. Student Recognition Notification', subject: '🌟 Student Recognition: {{recognitionTitle}}', category: 'ACHIEVEMENT' },

  // 7. Admin & Mentor
  { code: 'ADMIN_NEW_STUDENT_REGISTRATION', name: '30. New Student Registration Notification', subject: '[Admin Alert] New Student Registration: {{studentName}}', category: 'ADMIN' },
  { code: 'ADMIN_NEW_COURSE_ENROLLMENT', name: '31. New Course Enrollment Notification', subject: '[Admin Alert] New Enrollment: {{studentName}} in {{courseTitle}}', category: 'ADMIN' },
  { code: 'ADMIN_NEW_PAYMENT_NOTIFICATION', name: '32. New Payment Notification', subject: '[Payment Alert] ₹{{amount}} Received from {{studentName}}', category: 'ADMIN' },
  { code: 'ADMIN_NEW_INTERNSHIP_APPLICATION', name: '33. New Internship Application Notification', subject: '[Internship Alert] New Application for {{internshipTitle}}', category: 'ADMIN' },
  { code: 'ADMIN_NEW_STUDENT_QUERY', name: '34. New Student Query Notification', subject: '[Support Query #{{ticketId}}] {{subject}}', category: 'ADMIN' },
  { code: 'MENTOR_ASSIGNMENT_NOTIFICATION', name: '35. Mentor Assignment Notification', subject: 'Teaching Assignment: {{courseTitle}}', category: 'MENTOR' },
  { code: 'ADMIN_ANNOUNCEMENT', name: '36. Admin Announcement', subject: '[SkillUp Announcement] {{title}}', category: 'ADMIN' },
];

export async function ensureAllTemplatesSeeded() {
  for (const t of ALL_36_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        subject: t.subject,
        category: t.category,
      },
      create: {
        code: t.code,
        name: t.name,
        subject: t.subject,
        bodyHtml: '<p>Responsive SkillUp branded template with header, footer and social icons</p>',
        category: t.category,
        isEnabled: true,
      },
    });
  }
}

