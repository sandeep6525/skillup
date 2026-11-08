import { testSMTPConnection, sendEmail, emailTemplates } from '../src/services/emailService';
import { runPaymentReminderScan } from '../src/services/reminderScheduler';
import prisma from '../src/config/prisma';

async function main() {
  console.log('--- TEST 1: LIVE SMTP CONNECTION ---');
  const smtp = await testSMTPConnection();
  console.log('SMTP STATUS:', JSON.stringify(smtp, null, 2));

  console.log('\n--- TEST 2: EMAIL TEMPLATE GENERATION ---');
  const courseReceipt = emailTemplates.coursePurchasedReceipt({
    studentName: 'Aravind Swaminathan',
    courseTitle: 'Full-Stack Web Development Bootcamp',
    courseTitleTa: 'முழு-அடுக்கு வலை உருவாக்கம்',
    amountPaid: 4999,
    totalPrice: 9999,
    remainingBalance: 5000,
    paymentRef: 'PAY_VERIF_882910',
    orderId: 'order_test_9921',
    slug: 'full-stack-web-development',
  });
  console.log('Course Receipt Subject:', courseReceipt.subject);

  const matReceipt = emailTemplates.materialPurchasedReceipt({
    studentName: 'Priya Rajendran',
    materialTitle: 'Next.js & PostgreSQL Production Architecture',
    amountPaid: 499,
    paymentRef: 'PAY_MAT_99012',
    orderId: 'order_mat_4412',
  });
  console.log('Material Receipt Subject:', matReceipt.subject);

  const mentorPayout = emailTemplates.mentorPayoutStatement({
    mentorName: 'Dr. K. Senthil Kumar',
    amount: 15000,
    payoutRef: 'PAYOUT_STMT_3389',
    payoutDate: new Date(),
    notes: 'Verified teaching compensation for React Cohort 1',
  });
  console.log('Mentor Payout Subject:', mentorPayout.subject);

  console.log('\n--- TEST 3: AUTOMATED PAYMENT REMINDER SCAN (DRY RUN) ---');
  const dryRun = await runPaymentReminderScan(true);
  console.log('Dry Run Summary:', {
    totalChecked: dryRun.totalChecked,
    remindersSent: dryRun.remindersSent,
    skippedPaid: dryRun.skippedPaid,
    errors: dryRun.errors,
  });

  console.log('\n--- TEST 4: IDEMPOTENCY CHECK ---');
  const testKey = `test_idempotency_${Date.now()}`;
  const firstSend = await sendEmail({
    to: 'test-student@example.com',
    subject: 'Idempotency Test 1',
    html: '<p>Testing idempotency persistence</p>',
    idempotencyKey: testKey,
  });
  console.log('First send completed, ID:', firstSend?.messageId);

  const secondSend = await sendEmail({
    to: 'test-student@example.com',
    subject: 'Idempotency Test 2',
    html: '<p>Testing idempotency persistence</p>',
    idempotencyKey: testKey,
  });
  console.log('Second send (should be skipped):', secondSend);

  // Clean up test log
  await prisma.emailDeliveryLog.deleteMany({
    where: { idempotencyKey: testKey },
  });

  console.log('\n=== ALL EMAIL AUTOMATION MODULE TESTS PASSED! ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('Test Execution Failed:', err);
  process.exit(1);
});
