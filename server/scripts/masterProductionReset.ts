import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function masterDatabaseReset() {
  console.log('=====================================================');
  console.log('   SKILLUP PRODUCTION DATABASE CLEANUP & RESET       ');
  console.log('=====================================================');

  // 1. Confirm target database
  const dbResult: any = await prisma.$queryRawUnsafe('SELECT DATABASE() as db');
  const currentDb = dbResult[0]?.db;
  console.log('Target Database:', currentDb);

  if (currentDb !== 'courses_db') {
    throw new Error(`ABORTED: Connected to ${currentDb}, expected courses_db!`);
  }

  // 2. Safe transaction to clear all test & demo data in correct dependency sequence
  console.log('\n--- 1. Executing atomic transactional cleanup ---');
  await prisma.$transaction([
    // Feedback and reviews
    prisma.course_feedbacks.deleteMany(),
    prisma.review.deleteMany(),

    // Submissions, questions, assessments, assignments
    prisma.assessmentSubmission.deleteMany(),
    prisma.assessmentQuestion.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.assignmentSubmission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.lessonProgress.deleteMany(),

    // Certificates
    prisma.certificate.deleteMany(),

    // Support tickets
    prisma.ticketReply.deleteMany(),
    prisma.supportTicket.deleteMany(),

    // Notifications & Logs
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.emailDeliveryLog.deleteMany(),
    prisma.scheduledPaymentReminder.deleteMany(),
    prisma.mentorAnnouncement.deleteMany(),

    // Live Classes
    prisma.liveClassMessage.deleteMany(),
    prisma.liveClassAttendee.deleteMany(),
    prisma.liveClassRegistration.deleteMany(),
    prisma.liveClass.deleteMany(),

    // Materials
    prisma.materialPurchase.deleteMany(),
    prisma.learningMaterial.deleteMany(),

    // Internships & Hackathons
    prisma.internshipApplication.deleteMany(),
    prisma.internship.deleteMany(),
    prisma.hackathonRegistration.deleteMany(),
    prisma.hackathon.deleteMany(),

    // Payments, Coupons & Payouts
    prisma.payment.deleteMany(),
    prisma.couponRedemption.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.mentorPayout.deleteMany(),

    // Wishlist
    prisma.wishlist.deleteMany(),

    // Mentor bookings, slots, assignments
    prisma.mentorBooking.deleteMany(),
    prisma.mentorSlot.deleteMany(),
    prisma.mentorAssignment.deleteMany(),
    prisma.batchEnrollment.deleteMany(),
    prisma.batch.deleteMany(),
    prisma.enrollment.deleteMany(),

    // Lessons and Modules
    prisma.lessonResource.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),

    // Courses
    prisma.course.deleteMany(),

    // Achievements & Gallery
    prisma.achievement.deleteMany(),
    prisma.galleryItem.deleteMany(),

    // Partners & Old Testimonials
    prisma.partner.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.heroBanner.deleteMany(),

    // Auth helpers & Invitations
    prisma.oTPVerification.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.mentorInvitation.deleteMany(),

    // Mentor profiles & all previous users
    prisma.mentorProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✓ All test and demo records wiped successfully.');

  // 3. Clean up uploaded demo media
  console.log('\n--- 2. Cleaning demo media folders ---');
  const uploadsRoot = path.join(__dirname, '../uploads');
  const subdirs = ['avatars', 'resources', 'submissions', 'thumbnails', 'partners'];
  
  for (const sub of subdirs) {
    const dirPath = path.join(uploadsRoot, sub);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dirPath, file));
        } catch (e) {
          console.warn(`Could not delete file ${file}:`, e);
        }
      }
      console.log(`✓ Cleared uploads/${sub} (${files.length} files removed)`);
    }
  }

  // 4. Create the single initial Super Admin account
  console.log('\n--- 3. Creating Single Initial Super Admin Account ---');
  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'tricubedigitalsolutions@gmail.com').toLowerCase().trim();
  const rawAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'TriCube@Admin2026!';

  const hashedPassword = await bcrypt.hash(rawAdminPassword, 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: 'TriCube Super Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      title: 'SUPER_ADMIN',
      bio: 'Platform Super Administrator with complete system governance and operational control.',
      isVerified: true,
    },
  });

  console.log(`✓ Initial Super Admin Created:`);
  console.log(`  ID: ${superAdmin.id}`);
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Role: ${superAdmin.role}`);
  console.log(`  Title: ${superAdmin.title}`);

  // 5. Initialize clean official Hero Banner for public homepage
  console.log('\n--- 4. Initializing Clean Production Homepage Banner ---');
  await prisma.heroBanner.create({
    data: {
      title: 'Accelerate Your Tech Career with Industry Mentors',
      subtitle: 'SkillUp provides practical skill development, expert mentorship, scheduled live classes, and industry internships.',
      badgeText: 'Student Skill Development Platform',
      ctaText: 'Explore Courses',
      ctaLink: '/courses',
      imageUrl: '/hero-student-center.png',
      isActive: true,
      order: 1,
    },
  });
  console.log('✓ Clean homepage hero banner created.');

  // 6. Verification and final counts
  console.log('\n--- 5. Verifying Database State ---');
  const [
    totalUsers,
    totalStudents,
    totalInstructors,
    totalCourses,
    totalEnrollments,
    totalPayments,
    totalLiveClasses,
    totalInternships,
    totalHackathons,
    totalMaterials,
    totalAchievements,
    totalTickets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.payment.count(),
    prisma.liveClass.count(),
    prisma.internship.count(),
    prisma.hackathon.count(),
    prisma.learningMaterial.count(),
    prisma.achievement.count(),
    prisma.supportTicket.count(),
  ]);

  const stats = {
    'Total Users': totalUsers,
    'Total Students': totalStudents,
    'Total Mentors (Instructors)': totalInstructors,
    'Total Super Admins': await prisma.user.count({ where: { role: 'ADMIN' } }),
    'Total Courses': totalCourses,
    'Total Enrollments': totalEnrollments,
    'Total Payments': totalPayments,
    'Active Live Classes': totalLiveClasses,
    'Total Internships': totalInternships,
    'Total Hackathons': totalHackathons,
    'Total Materials': totalMaterials,
    'Total Achievements': totalAchievements,
    'Open Support Tickets': totalTickets,
  };

  console.table(stats);

  // Validate admin password verification
  const isMatch = await bcrypt.compare(rawAdminPassword, superAdmin.password);
  console.log('Password hash verification check:', isMatch ? 'PASSED ✓' : 'FAILED ✗');

  await prisma.$disconnect();
  console.log('\n=====================================================');
  console.log('   DATABASE RESET & INITIAL SEEDING COMPLETED        ');
  console.log('=====================================================');
}

masterDatabaseReset().catch((err) => {
  console.error('CRITICAL ERROR during reset:', err);
  process.exit(1);
});

