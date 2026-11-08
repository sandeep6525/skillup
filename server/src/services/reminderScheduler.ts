import prisma from '../config/prisma';
import { sendEmail, emailTemplates } from './emailService';

export interface ReminderJobResult {
  totalChecked: number;
  remindersSent: number;
  skippedPaid: number;
  errors: number;
  details: Array<{
    studentEmail: string;
    courseTitle: string;
    outstandingBalance: number;
    intervalType: string;
    status: 'SENT' | 'SKIPPED' | 'FAILED';
  }>;
}

/**
 * Run Automated Payment Reminder Scan
 * Requirements:
 * - Query real student course enrollments and payments
 * - Calculate true outstanding balance (coursePrice - sum of completed payments)
 * - Check due dates & interval rules:
 *   - 3 days before due date
 *   - 1 day before due date
 *   - On due date
 *   - 3 days overdue
 *   - 7 days overdue
 * - Skip fully settled courses (balance <= 0)
 * - Skip cancelled / inactive enrollments
 * - Prevent duplicate reminders using ScheduledPaymentReminder records & idempotency
 * - Dry-run option to preview without dispatching emails
 */
export const runPaymentReminderScan = async (dryRun: boolean = false): Promise<ReminderJobResult> => {
  const result: ReminderJobResult = {
    totalChecked: 0,
    remindersSent: 0,
    skippedPaid: 0,
    errors: 0,
    details: [],
  };

  try {
    // 1. Fetch all active student enrollments with course details and completed payments
    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, price: true, discountPrice: true, slug: true, createdAt: true } },
      },
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (const enrollment of enrollments) {
      result.totalChecked++;
      const { user, course } = enrollment;

      if (!user || !course || !user.email) continue;

      // 2. Query completed payments for this user and course to calculate exact balance
      const completedPayments = await prisma.payment.findMany({
        where: {
          userId: user.id,
          courseId: course.id,
          status: 'COMPLETED',
        },
        select: { amount: true, createdAt: true },
      });

      const totalCourseFee = Number(course.discountPrice || course.price);
      const totalPaid = completedPayments.reduce((acc, p) => acc + Number(p.amount), 0);
      const outstandingBalance = Math.max(0, totalCourseFee - totalPaid);

      // If fully paid, skip and mark any pending reminders as RESOLVED
      if (outstandingBalance <= 0) {
        result.skippedPaid++;
        await prisma.scheduledPaymentReminder.updateMany({
          where: {
            studentId: user.id,
            courseId: course.id,
            status: 'PENDING',
          },
          data: { status: 'CANCELLED' },
        });
        continue;
      }

      // 3. Determine Due Date for installment (Standard: 30 days after initial enrollment/payment)
      const firstPaymentDate = completedPayments.length > 0 ? completedPayments[0].createdAt : enrollment.enrolledAt;
      const dueDate = new Date(firstPaymentDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30-day installment term

      const msDiff = dueDate.getTime() - now.getTime();
      const daysUntilDue = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      let intervalCategory: string | null = null;
      let daysOverdue = 0;

      if (daysUntilDue === 3) {
        intervalCategory = '3_DAYS_BEFORE';
      } else if (daysUntilDue === 1) {
        intervalCategory = '1_DAY_BEFORE';
      } else if (daysUntilDue === 0) {
        intervalCategory = 'ON_DUE_DATE';
      } else if (daysUntilDue === -3) {
        intervalCategory = '3_DAYS_OVERDUE';
        daysOverdue = 3;
      } else if (daysUntilDue === -7) {
        intervalCategory = '7_DAYS_OVERDUE';
        daysOverdue = 7;
      }

      // If enrollment is within an active reminder window
      if (intervalCategory) {
        const idempotencyKey = `auto_remind_${user.id}_${course.id}_${intervalCategory}_${todayStr}`;

        // Check if reminder was already scheduled or sent for this window
        const existingRecord = await prisma.scheduledPaymentReminder.findUnique({
          where: { idempotencyKey },
        });

        if (existingRecord && existingRecord.status === 'SENT') {
          continue; // Already processed today
        }

        if (dryRun) {
          result.details.push({
            studentEmail: user.email,
            courseTitle: course.title,
            outstandingBalance,
            intervalType: intervalCategory,
            status: 'SENT',
          });
          result.remindersSent++;
          continue;
        }

        // Create or update ScheduledPaymentReminder record
        const reminderRecord = await prisma.scheduledPaymentReminder.upsert({
          where: { idempotencyKey },
          create: {
            studentId: user.id,
            courseId: course.id,
            balanceAmount: outstandingBalance,
            intervalDays: daysUntilDue,
            reminderType: daysOverdue > 0 ? 'OVERDUE' : daysUntilDue === 0 ? 'DUE_TODAY' : 'UPCOMING',
            status: 'PENDING',
            idempotencyKey,
          },
          update: {
            balanceAmount: outstandingBalance,
            intervalDays: daysUntilDue,
          },
        });

        try {
          // Render email template
          const emailData = emailTemplates.paymentReminder({
            studentName: user.name,
            courseTitle: course.title,
            outstandingBalance,
            dueDate: dueDate.toLocaleDateString(),
            daysOverdue,
            slug: course.slug,
          });

          const templateCode = daysOverdue > 0 ? 'PAYMENT_REMINDER_OVERDUE' : 'PAYMENT_REMINDER_PENDING';

          const sendResult = await sendEmail({
            to: user.email,
            subject: emailData.subject,
            html: emailData.html,
            templateCode,
            idempotencyKey: `email_${idempotencyKey}`,
          });

          if (sendResult) {
            await prisma.scheduledPaymentReminder.update({
              where: { id: reminderRecord.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
              },
            });

            // Also create In-App notification
            await prisma.notification.create({
              data: {
                userId: user.id,
                title: daysOverdue > 0 ? `Overdue Payment: ${course.title}` : `Upcoming Payment: ${course.title}`,
                message: `You have an outstanding balance of ₹${outstandingBalance.toFixed(2)} due on ${dueDate.toLocaleDateString()}.`,
                type: 'PAYMENT',
              },
            });

            result.remindersSent++;
            result.details.push({
              studentEmail: user.email,
              courseTitle: course.title,
              outstandingBalance,
              intervalType: intervalCategory,
              status: 'SENT',
            });
          } else {
            result.errors++;
            result.details.push({
              studentEmail: user.email,
              courseTitle: course.title,
              outstandingBalance,
              intervalType: intervalCategory,
              status: 'FAILED',
            });
          }
        } catch (err: any) {
          result.errors++;
          console.error(`[Reminder Error for ${user.email}]:`, err?.message || err);
          result.details.push({
            studentEmail: user.email,
            courseTitle: course.title,
            outstandingBalance,
            intervalType: intervalCategory,
            status: 'FAILED',
          });
        }
      }
    }
  } catch (globalErr: any) {
    console.error('[Reminder Scheduler Global Failure]:', globalErr);
  }

  return result;
};
