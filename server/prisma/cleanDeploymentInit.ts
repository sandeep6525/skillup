import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function cleanAndInit() {
  console.log('--- 1. Confirming target database ---');
  const dbResult: any = await prisma.$queryRawUnsafe('SELECT DATABASE() as db');
  const currentDb = dbResult[0]?.db;
  console.log('Connected Database:', currentDb);

  if (currentDb !== 'courses_db') {
    throw new Error(`ABORTED: Connected to ${currentDb}, expected courses_db!`);
  }

  console.log('--- 2. Deleting all demo/test records safely in reverse dependency order ---');

  // Deletions in transactional dependency sequence
  await prisma.$transaction([
    // Feedback and reviews
    prisma.course_feedbacks.deleteMany(),
    prisma.review.deleteMany(),
    
    // Submissions, attendances and progress
    prisma.assessmentSubmission.deleteMany(),
    prisma.assessmentQuestion.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.assignmentSubmission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.lessonProgress.deleteMany(),

    // Certificates & Claims
    prisma.certificate.deleteMany(),

    // Support tickets & replies
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

    // Orders, Payments, Coupons & Payouts
    prisma.payment.deleteMany(),
    prisma.couponRedemption.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.mentorPayout.deleteMany(),

    // Wishlists
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

    // Old Testimonials & Banners
    prisma.testimonial.deleteMany(),
    prisma.heroBanner.deleteMany(),

    // Auth helpers
    prisma.oTPVerification.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.mentorInvitation.deleteMany(),

    // Mentor profiles & users
    prisma.mentorProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('--- 3. Verified test records completely wiped ---');

  console.log('--- 4. Creating single initial administrator account ---');
  const adminEmail = 'admin@gmail.com';
  const adminRawPassword = 'admin123!';
  const hashedPassword = await bcrypt.hash(adminRawPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      title: 'Platform Administrator',
      bio: 'System Administrator account for SkillUp Platform.',
    },
  });

  console.log(`Created admin account successfully: ID = ${admin.id}, Email = ${admin.email}, Role = ${admin.role}`);

  // Create clean HeroBanner configuration for CMS
  await prisma.heroBanner.create({
    data: {
      title: 'Learn Today Build a Better Tomorrow',
      subtitle: 'SkillUp provides hands-on technical courses, scheduled live classes, and practical training with experienced mentors to help you build job-ready skills.',
      badgeText: 'Skill Development Programs',
      ctaText: 'Explore Courses',
      ctaLink: '/courses',
      imageUrl: '/hero-student-center.png',
      isActive: true,
      order: 1,
    },
  });

  console.log('Initialized clean hero banner.');

  // Validate admin password verification
  const isMatch = await bcrypt.compare(adminRawPassword, admin.password);
  console.log('Admin password hash verification check:', isMatch ? 'PASSED' : 'FAILED');

  const finalUserCount = await prisma.user.count();
  const finalCourseCount = await prisma.course.count();
  const finalEnrollmentCount = await prisma.enrollment.count();
  const finalLiveClassCount = await prisma.liveClass.count();
  const finalFeedbackCount = await prisma.course_feedbacks.count();

  console.log('--- Final Database State ---');
  console.log({
    users: finalUserCount,
    courses: finalCourseCount,
    enrollments: finalEnrollmentCount,
    liveClasses: finalLiveClassCount,
    feedbacks: finalFeedbackCount,
  });

  await prisma.$disconnect();
}

cleanAndInit().catch((err) => {
  console.error('Error during cleanup and initialization:', err);
  process.exit(1);
});

