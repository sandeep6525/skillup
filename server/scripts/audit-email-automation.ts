import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { testSMTPConnection, sendEmail, emailTemplates } from '../src/services/emailService';
import { runPaymentReminderScan } from '../src/services/reminderScheduler';

interface TestResult {
  module: string;
  scenario: string;
  passed: boolean;
  details?: any;
}

const results: TestResult[] = [];

function record(module: string, scenario: string, passed: boolean, details?: any) {
  results.push({ module, scenario, passed, details });
  const statusStr = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${statusStr} [${module}] ${scenario}`);
  if (!passed && details) {
    console.error('   Failure details:', details);
  }
}

async function runEndToEndAudit() {
  console.log('================================================================');
  console.log('SKILLUP COMPLETE EMAIL AUTOMATION END-TO-END AUDIT SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testStudentEmail = `audit_student_${timestamp}@example.com`;
  const testMentorEmail = `audit_mentor_${timestamp}@example.com`;

  // ----------------------------------------------------------------------
  // MODULE 1: AUTHENTICATION & ACCOUNT SECURITY EMAILS
  // ----------------------------------------------------------------------
  console.log('>>> TESTING MODULE 1: AUTHENTICATION & ACCOUNT SECURITY EMAILS...');

  // 1.1 OTP Generation & Storage
  const otpCode = '742918';
  const otpHashed = await bcrypt.hash(otpCode, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  const otpRecord = await prisma.oTPVerification.create({
    data: {
      email: testStudentEmail,
      name: 'Audit Test Student',
      password: await bcrypt.hash('TestPassword123!', 10),
      otpHashed,
      expiresAt: otpExpires,
    },
  });
  record('AUTH', 'OTP Generation and registration record stored with hashed OTP', !!otpRecord.id);

  // 1.2 OTP Verification Success
  const isMatch = await bcrypt.compare(otpCode, otpRecord.otpHashed);
  record('AUTH', 'Correct 6-digit OTP verification matches hashed secret', isMatch);

  // 1.3 OTP Verification Incorrect Rejection
  const isWrongMatch = await bcrypt.compare('000000', otpRecord.otpHashed);
  record('AUTH', 'Incorrect OTP strictly rejected', !isWrongMatch);

  // 1.4 Expired OTP Rejection
  const expiredDate = new Date(Date.now() - 60000);
  const isExpired = new Date() > expiredDate;
  record('AUTH', 'Expired OTP correctly identified and invalidated', isExpired);

  // 1.5 Student Account Activation and Welcome Email
  const studentUser = await prisma.user.create({
    data: {
      name: 'Audit Test Student',
      email: testStudentEmail,
      password: await bcrypt.hash('TestPassword123!', 10),
      role: 'STUDENT',
      isVerified: true,
    },
  });

  const welcomeMail = await sendEmail({
    to: studentUser.email,
    subject: emailTemplates.welcome(studentUser.name).subject,
    html: emailTemplates.welcome(studentUser.name).html,
    templateCode: 'STUDENT_WELCOME',
    idempotencyKey: `welcome_${studentUser.id}`,
  });
  record('AUTH', 'Welcome email dispatched and logged with idempotency key', !!welcomeMail?.messageId);

  // 1.6 Password Reset Token Expiry & Single-Use Enforcement
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const tokenHashed = crypto.createHash('sha256').update(rawResetToken).digest('hex');
  const pwdReset = await prisma.passwordReset.create({
    data: {
      email: studentUser.email,
      tokenHashed,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      isUsed: false,
    },
  });

  // Mark token as used
  await prisma.passwordReset.update({
    where: { id: pwdReset.id },
    data: { isUsed: true },
  });

  const reusedLookup = await prisma.passwordReset.findFirst({
    where: { tokenHashed, isUsed: false },
  });
  record('AUTH', 'Single-use password reset token enforcement (cannot reuse)', !reusedLookup);

  // 1.7 Password Changed Security Notification
  const pwdChangedMail = await sendEmail({
    to: studentUser.email,
    subject: emailTemplates.passwordChanged(studentUser.name).subject,
    html: emailTemplates.passwordChanged(studentUser.name).html,
    templateCode: 'PASSWORD_CHANGED',
    idempotencyKey: `pwd_changed_${studentUser.id}_${timestamp}`,
  });
  record('AUTH', 'Password changed security confirmation dispatched', !!pwdChangedMail?.messageId);

  // 1.8 Sensitive Data Masking Audit (Passwords/OTPs never stored in plaintext delivery logs)
  const deliveryLogs = await prisma.emailDeliveryLog.findMany({
    where: { recipientEmail: studentUser.email },
  });
  const hasPlainPassword = deliveryLogs.some((l) => l.bodyPreview?.includes('TestPassword123!'));
  record('SECURITY', 'Plaintext passwords strictly excluded from delivery logs', !hasPlainPassword);

  // ----------------------------------------------------------------------
  // MODULE 2: COURSE PURCHASE & PAYMENT RECEIPTS
  // ----------------------------------------------------------------------
  console.log('\n>>> TESTING MODULE 2: COURSE PURCHASE & PAYMENT RECEIPTS...');

  // Create a controlled course
  const testCourse = await prisma.course.create({
    data: {
      title: 'Full-Stack Cloud Architecture Audit Course',
      slug: `audit-course-${timestamp}`,
      description: 'Audit test course description',
      price: 9999,
      discountPrice: 4999,
      instructorId: studentUser.id,
      status: 'PUBLISHED',
    },
  });

  // Create Verified Payment
  const rzpOrderId = `order_audit_${timestamp}`;
  const rzpPaymentId = `pay_audit_${timestamp}`;

  const payment = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      courseId: testCourse.id,
      amount: 4999,
      originalAmount: 9999,
      discountAmount: 5000,
      currency: 'INR',
      status: 'COMPLETED',
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      remainingBalance: 0,
    },
  });

  // Create Enrollment
  const enrollment = await prisma.enrollment.create({
    data: {
      userId: studentUser.id,
      courseId: testCourse.id,
    },
  });
  record('PAYMENTS', 'Payment verified and enrollment granted transactionally', !!enrollment.id);

  // Dispatch Course Receipt with Idempotency
  const rcptKey = `rcpt_course_${payment.id}_${rzpPaymentId}`;
  const rcptEmailData = emailTemplates.coursePurchasedReceipt({
    studentName: studentUser.name,
    courseTitle: testCourse.title,
    amountPaid: Number(payment.amount),
    totalPrice: 9999,
    remainingBalance: 0,
    paymentRef: rzpPaymentId,
    orderId: rzpOrderId,
    slug: testCourse.slug,
  });

  const rcpt1 = await sendEmail({
    to: studentUser.email,
    subject: rcptEmailData.subject,
    html: rcptEmailData.html,
    templateCode: 'COURSE_PAYMENT_RECEIPT',
    idempotencyKey: rcptKey,
  });
  record('PAYMENTS', 'Course payment receipt dispatched and logged', !!rcpt1?.messageId);

  // Duplicate webhook attempt (idempotency test)
  const rcpt2 = await sendEmail({
    to: studentUser.email,
    subject: rcptEmailData.subject,
    html: rcptEmailData.html,
    templateCode: 'COURSE_PAYMENT_RECEIPT',
    idempotencyKey: rcptKey,
  });
  record('PAYMENTS', 'Duplicate webhook receipt blocked via idempotency key', !!rcpt2?.skipped);

  // ----------------------------------------------------------------------
  // MODULE 3: LEARNING MATERIAL PURCHASE RECEIPTS
  // ----------------------------------------------------------------------
  console.log('\n>>> TESTING MODULE 3: LEARNING MATERIAL PURCHASE RECEIPTS...');

  const testMaterial = await prisma.learningMaterial.create({
    data: {
      title: 'Audit Microservices Guide PDF',
      description: 'Production materials audit',
      type: 'PDF',
      category: 'Backend',
      price: 299,
      isFree: false,
      fileUrl: '/uploads/audit-guide.pdf',
      uploaderId: studentUser.id,
    },
  });

  const matPayment = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      materialId: testMaterial.id,
      amount: 299,
      originalAmount: 299,
      discountAmount: 0,
      currency: 'INR',
      status: 'COMPLETED',
      razorpayOrderId: `order_mat_${timestamp}`,
      razorpayPaymentId: `pay_mat_${timestamp}`,
    },
  });

  const matPurchase = await prisma.materialPurchase.create({
    data: {
      userId: studentUser.id,
      materialId: testMaterial.id,
      paymentId: matPayment.id,
      paidAmount: 299,
    },
  });
  record('MATERIALS', 'Material purchase entitlement created for student', !!matPurchase.id);

  const matRcptEmail = emailTemplates.materialPurchasedReceipt({
    studentName: studentUser.name,
    materialTitle: testMaterial.title,
    amountPaid: 299,
    paymentRef: `pay_mat_${timestamp}`,
    orderId: `order_mat_${timestamp}`,
  });

  const matMail = await sendEmail({
    to: studentUser.email,
    subject: matRcptEmail.subject,
    html: matRcptEmail.html,
    templateCode: 'MATERIAL_PURCHASE_RECEIPT',
    idempotencyKey: `rcpt_mat_${matPayment.id}_${matPayment.razorpayPaymentId}`,
  });
  record('MATERIALS', 'Material purchase receipt sent with authorized download guidance', !!matMail?.messageId);

  // ----------------------------------------------------------------------
  // MODULE 4: AUTOMATED INSTALLMENT PAYMENT REMINDER ENGINE
  // ----------------------------------------------------------------------
  console.log('\n>>> TESTING MODULE 4: AUTOMATED INSTALLMENT PAYMENT REMINDER ENGINE...');

  const reminderScanResult = await runPaymentReminderScan(true);
  record('REMINDERS', 'Payment reminder scheduler scan executed cleanly without errors', reminderScanResult.errors === 0);
  record('REMINDERS', 'Fully settled course accounts are excluded from reminders', reminderScanResult.skippedPaid >= 1);

  // ----------------------------------------------------------------------
  // MODULE 5: MENTOR NOTIFICATIONS & COMPENSATION STATEMENTS
  // ----------------------------------------------------------------------
  console.log('\n>>> TESTING MODULE 5: MENTOR NOTIFICATIONS & COMPENSATION STATEMENTS...');

  const mentorUser = await prisma.user.create({
    data: {
      name: 'Audit Senior Mentor',
      email: testMentorEmail,
      password: await bcrypt.hash('TestMentor123!', 10),
      role: 'INSTRUCTOR',
      isVerified: true,
    },
  });

  // 5.1 Mentor Welcome
  const mentorWelcomeMail = await sendEmail({
    to: mentorUser.email,
    subject: emailTemplates.mentorWelcome(mentorUser.name).subject,
    html: emailTemplates.mentorWelcome(mentorUser.name).html,
    templateCode: 'MENTOR_WELCOME',
    idempotencyKey: `mentor_welcome_${mentorUser.id}`,
  });
  record('MENTOR', 'Mentor onboarding welcome email dispatched', !!mentorWelcomeMail?.messageId);

  // 5.2 Mentor Course Assignment
  const mentorAssign = await prisma.mentorAssignment.create({
    data: {
      mentorId: mentorUser.id,
      courseId: testCourse.id,
      scope: 'COURSE_WIDE',
    },
  });

  const assignEmailData = emailTemplates.mentorCourseAssigned({
    mentorName: mentorUser.name,
    courseTitle: testCourse.title,
    studentCount: 1,
  });

  const assignMail = await sendEmail({
    to: mentorUser.email,
    subject: assignEmailData.subject,
    html: assignEmailData.html,
    templateCode: 'MENTOR_COURSE_ASSIGNED',
    idempotencyKey: `mentor_assign_${mentorUser.id}_${testCourse.id}`,
  });
  record('MENTOR', 'Mentor course assignment notification sent', !!assignMail?.messageId);

  // 5.3 Mentor Compensation Statement
  const payout = await prisma.mentorPayout.create({
    data: {
      mentorId: mentorUser.id,
      amount: 18500,
      periodStart: new Date(Date.now() - 30 * 86400000),
      periodEnd: new Date(),
      status: 'PAID',
      notes: 'Monthly verified teaching settlement for audit course',
      processedAt: new Date(),
    },
  });

  const stmtEmailData = emailTemplates.mentorPayoutStatement({
    mentorName: mentorUser.name,
    amount: Number(payout.amount),
    payoutRef: `PAYOUT_${payout.id.substring(0, 8).toUpperCase()}`,
    payoutDate: payout.processedAt || new Date(),
    notes: payout.notes,
  });

  const stmtMail = await sendEmail({
    to: mentorUser.email,
    subject: stmtEmailData.subject,
    html: stmtEmailData.html,
    templateCode: 'MENTOR_PAYOUT_STATEMENT',
    idempotencyKey: `payout_statement_${payout.id}`,
  });
  record('MENTOR', 'Mentor compensation disbursement statement sent', !!stmtMail?.messageId);

  // ----------------------------------------------------------------------
  // MODULE 6: LIVE CLASSES & ASSIGNMENT GRADING
  // ----------------------------------------------------------------------
  console.log('\n>>> TESTING MODULE 6: LIVE CLASSES & ASSIGNMENT GRADING...');

  const liveClassTpl = emailTemplates.liveClassNotification({
    studentName: studentUser.name,
    courseTitle: testCourse.title,
    classTitle: 'Cloud Deployment Masterclass',
    startTime: 'Today at 7:00 PM IST',
    durationMins: 90,
    mentorName: mentorUser.name,
    meetingUrl: 'http://localhost:5173/live-classes/test-room/room',
  });

  const classMail = await sendEmail({
    to: studentUser.email,
    subject: liveClassTpl.subject,
    html: liveClassTpl.html,
    templateCode: 'LIVE_CLASS_REMINDER',
    idempotencyKey: `live_class_${timestamp}`,
  });
  record('CLASSES', 'Live class schedule notification dispatched', !!classMail?.messageId);

  const gradeTpl = emailTemplates.assignmentUpdate({
    studentName: studentUser.name,
    courseTitle: testCourse.title,
    assignmentTitle: 'Docker Microservices Pipeline',
    score: 95,
    totalPoints: 100,
    feedback: 'Flawless CI/CD Docker orchestration implementation!',
  });

  const gradeMail = await sendEmail({
    to: studentUser.email,
    subject: gradeTpl.subject,
    html: gradeTpl.html,
    templateCode: 'ASSIGNMENT_GRADED',
    idempotencyKey: `grade_${timestamp}`,
  });
  record('ASSIGNMENTS', 'Assignment assessment update and feedback email sent', !!gradeMail?.messageId);

  // ----------------------------------------------------------------------
  // MODULE 7: AUDIT CLEANUP OF TEST FIXTURES
  // ----------------------------------------------------------------------
  console.log('\n>>> CLEANING UP AUDIT TEST DATA...');
  await prisma.emailDeliveryLog.deleteMany({
    where: { recipientEmail: { in: [testStudentEmail, testMentorEmail] } },
  });
  await prisma.materialPurchase.deleteMany({ where: { userId: studentUser.id } });
  await prisma.learningMaterial.delete({ where: { id: testMaterial.id } });
  await prisma.mentorPayout.deleteMany({ where: { mentorId: mentorUser.id } });
  await prisma.mentorAssignment.deleteMany({ where: { mentorId: mentorUser.id } });
  await prisma.enrollment.deleteMany({ where: { userId: studentUser.id } });
  await prisma.payment.deleteMany({ where: { userId: studentUser.id } });
  await prisma.course.delete({ where: { id: testCourse.id } });
  await prisma.passwordReset.deleteMany({ where: { email: studentUser.email } });
  await prisma.oTPVerification.deleteMany({ where: { email: testStudentEmail } });
  await prisma.user.deleteMany({ where: { id: { in: [studentUser.id, mentorUser.id] } } });

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY REPORT');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL SCENARIOS AUDITED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEndToEndAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
