import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function resetDatabase() {
  console.log('--- STARTING COMPLETE APPLICATION RESET ---');

  // Disable foreign keys to safely truncate / delete in any order
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  const tablesToClear = [
    'attendance_records',
    'live_class_attendees',
    'live_class_messages',
    'live_class_registrations',
    'live_classes',
    'lesson_resources',
    'lesson_progress',
    'lessons',
    'modules',
    'enrollments',
    'batch_enrollments',
    'mentor_assignments',
    'batches',
    'reviews',
    'wishlists',
    'assignment_submissions',
    'assignments',
    'assessment_submissions',
    'assessment_questions',
    'assessments',
    'material_purchases',
    'learning_materials',
    'internship_applications',
    'internship_video_lessons',
    'internships',
    'hackathon_registrations',
    'hackathons',
    'certificates',
    'payments',
    'scheduled_payment_reminders',
    'coupon_redemptions',
    'coupons',
    'mentor_announcements',
    'mentor_bookings',
    'mentor_slots',
    'mentor_profiles',
    'mentor_invitations',
    'ticket_replies',
    'support_tickets',
    'notifications',
    'course_feedbacks',
    'otp_verifications',
    'password_resets',
    'email_delivery_logs',
    'audit_logs',
    'achievement_images',
    'achievements',
    'gallery_items',
    'partners',
    'courses',
    'users',
  ];

  for (const table of tablesToClear) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`Cleared table: ${table}`);
    } catch (err: any) {
      console.warn(`Truncate failed for ${table}, trying DELETE:`, err.message);
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
        console.log(`Deleted all rows from: ${table}`);
      } catch (delErr: any) {
        console.error(`Could not clear table ${table}:`, delErr.message);
      }
    }
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Foreign key checks re-enabled.');

  // Clean unreferenced uploads
  const uploadDir = path.resolve(__dirname, 'uploads');
  if (fs.existsSync(uploadDir)) {
    const subfolders = ['thumbnails', 'avatars', 'partners'];
    for (const sub of subfolders) {
      const p = path.join(uploadDir, sub);
      if (fs.existsSync(p)) {
        const files = fs.readdirSync(p);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(p, file));
          } catch (e) {}
        }
      }
    }
    console.log('Cleared uploaded media files.');
  }

  // Seed default admin account
  const defaultAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';
  const hashedPassword = await bcrypt.hash(defaultAdminPassword, 12);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gmail.com',
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      title: 'SUPER_ADMIN',
      bio: 'Master system administrator with full access privileges.',
      isVerified: true,
    },
  });

  console.log('--- ADMIN SEED COMPLETE ---');
  console.log('Created Admin User:', {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    title: adminUser.title,
  });

  // Verify counts
  const [usersCount, coursesCount, enrollmentsCount, paymentsCount, internshipsCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.payment.count(),
    prisma.internship.count(),
  ]);

  console.log('--- VERIFICATION ---');
  console.log({
    totalUsers: usersCount,
    totalCourses: coursesCount,
    totalEnrollments: enrollmentsCount,
    totalPayments: paymentsCount,
    totalInternships: internshipsCount,
  });

  await prisma.$disconnect();
}

resetDatabase().catch((e) => {
  console.error('Reset database failed:', e);
  process.exit(1);
});
