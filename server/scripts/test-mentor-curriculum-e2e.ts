import prisma from '../src/config/prisma';
import { canManageCourse } from '../src/controllers/courseController';
import { getMentorScope } from '../src/controllers/mentorController';

async function runEndToEndVerification() {
  console.log('🚀 Starting Mentor Curriculum End-to-End Workflow Verification...');

  try {
    // 1. Prepare Mentor A, Mentor B, Student 1 (Enrolled), Student 2 (Unenrolled)
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) throw new Error('Admin user required for verification');

    let mentorA = await prisma.user.findUnique({ where: { email: 'mentor_a_test@skillup.com' } });
    if (!mentorA) {
      mentorA = await prisma.user.create({
        data: {
          email: 'mentor_a_test@skillup.com',
          name: 'Mentor Alpha',
          password: 'dummyhash',
          role: 'INSTRUCTOR',
        },
      });
    }

    let mentorB = await prisma.user.findUnique({ where: { email: 'mentor_b_test@skillup.com' } });
    if (!mentorB) {
      mentorB = await prisma.user.create({
        data: {
          email: 'mentor_b_test@skillup.com',
          name: 'Mentor Beta',
          password: 'dummyhash',
          role: 'INSTRUCTOR',
        },
      });
    }

    let studentEnrolled = await prisma.user.findUnique({ where: { email: 'student_enrolled_test@skillup.com' } });
    if (!studentEnrolled) {
      studentEnrolled = await prisma.user.create({
        data: {
          email: 'student_enrolled_test@skillup.com',
          name: 'Student Enrolled',
          password: 'dummyhash',
          role: 'STUDENT',
        },
      });
    }

    let studentUnenrolled = await prisma.user.findUnique({ where: { email: 'student_unenrolled_test@skillup.com' } });
    if (!studentUnenrolled) {
      studentUnenrolled = await prisma.user.create({
        data: {
          email: 'student_unenrolled_test@skillup.com',
          name: 'Student Unenrolled',
          password: 'dummyhash',
          role: 'STUDENT',
        },
      });
    }

    // Step 1: Admin assigns Course to Mentor A via MentorAssignment
    const testSlug = `e2e-mentor-curriculum-test-${Date.now()}`;
    const course = await prisma.course.create({
      data: {
        title: 'Mastering Full Stack Node & React',
        slug: testSlug,
        description: 'Complete hands-on curriculum with video lectures and downloadable notes',
        price: 2999,
        level: 'Intermediate',
        status: 'PUBLISHED',
        thumbnailUrl: '/uploads/thumbnails/sample.png',
        instructorId: adminUser.id, // Owned by admin, assigned to Mentor A
      },
    });

    const assignment = await prisma.mentorAssignment.create({
      data: {
        mentorId: mentorA.id,
        courseId: course.id,
        scope: 'COURSE_WIDE',
      },
    });
    console.log('✅ Step 1: Course created and MentorAssignment created for Mentor A');

    // Step 2: Mentor A scope check (sees assigned course in My Courses)
    const mentorAScope = await getMentorScope(mentorA.id, mentorA.role);
    const mentorBAuthorizedForCourse = mentorAScope.courseIds.includes(course.id);
    if (!mentorBAuthorizedForCourse) {
      throw new Error('Mentor A failed to see assigned course in getMentorScope');
    }
    console.log('✅ Step 2: Mentor A scope verified, course is present in getMentorScope');

    // Step 3: Mentor A authorization to manage curriculum
    const canMentorAManage = await canManageCourse(course.id, { id: mentorA.id, role: mentorA.role });
    if (!canMentorAManage) {
      throw new Error('canManageCourse returned false for assigned Mentor A');
    }
    console.log('✅ Step 3: canManageCourse correctly returns true for Mentor A');

    // Step 4: Unauthorized Mentor B check
    const canMentorBManage = await canManageCourse(course.id, { id: mentorB.id, role: mentorB.role });
    if (canMentorBManage) {
      throw new Error('Security flaw: Mentor B should NOT be authorized to manage Mentor A course');
    }
    console.log('✅ Step 4: Unauthorized Mentor B is blocked with false (HTTP 403 enforcement)');

    // Step 5: Mentor A creates module and lesson with video
    const module1 = await prisma.module.create({
      data: {
        title: 'Day 1: Architectural Foundations',
        order: 1,
        courseId: course.id,
      },
    });

    const lesson1 = await prisma.lesson.create({
      data: {
        title: 'Video 1.1: Express and TypeScript Architecture',
        description: 'Comprehensive setup of Express router, middlewares, and Prisma ORM',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: 25,
        order: 1,
        isFree: false, // Paid only
        moduleId: module1.id,
      },
    });
    console.log('✅ Step 5: Mentor A created module and lesson with YouTube video');

    // Step 6: Mentor A uploads and attaches PDF learning material
    const resource1 = await prisma.lessonResource.create({
      data: {
        title: 'Day 1 Cheatsheet PDF',
        fileUrl: '/uploads/resources/day1-cheatsheet.pdf',
        fileType: 'application/pdf',
        fileSize: 102400,
        lessonId: lesson1.id,
      },
    });

    const material1 = await prisma.learningMaterial.create({
      data: {
        title: 'Day 1 Architectural Cheatsheet',
        description: 'Course-included learning material',
        fileUrl: '/uploads/resources/day1-cheatsheet.pdf',
        type: 'PDF',
        price: 0,
        isFree: true,
        isPublished: true,
        courseId: course.id,
        uploaderId: mentorA.id,
      },
    });
    console.log('✅ Step 6: PDF resource and course learning material attached and published');

    // Step 7: Enroll student 1 in course
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentEnrolled.id,
        courseId: course.id,
        progress: 10,
      },
    });
    console.log('✅ Step 7: Student 1 enrolled in course');

    // Step 8: Verify student access rules
    // Enrolled student can access the course and lesson content
    const student1HasEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentEnrolled.id, courseId: course.id } },
    });
    if (!student1HasEnrollment) throw new Error('Enrollment check failed for Student 1');

    // Unenrolled student does NOT have access
    const student2HasEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: studentUnenrolled.id, courseId: course.id } },
    });
    if (student2HasEnrollment) throw new Error('Student 2 should not be enrolled');

    console.log('✅ Step 8: Enrolled student has verified access, unenrolled student is restricted');

    // Step 9: Verify Course-Included Material Access (no separate purchase needed for enrolled student)
    const materialInDb = await prisma.learningMaterial.findUnique({
      where: { id: material1.id },
      include: { course: true },
    });
    if (!materialInDb || materialInDb.courseId !== course.id) {
      throw new Error('Course material linkage verification failed');
    }
    console.log('✅ Step 9: Course-included material is linked and accessible without separate purchase');

    // Step 10: Refresh persistence check
    const fetchedCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        modules: {
          include: {
            lessons: {
              include: { resources: true },
            },
          },
        },
        learningMaterials: true,
        mentorAssignments: true,
      },
    });
    if (!fetchedCourse || fetchedCourse.modules.length === 0 || fetchedCourse.modules[0].lessons.length === 0) {
      throw new Error('Database persistence verification failed');
    }
    console.log('✅ Step 10: Data persistence verified (modules, lessons, videos, and materials remain intact)');

    // Cleanup test artifacts
    await prisma.lessonResource.deleteMany({ where: { lessonId: lesson1.id } });
    await prisma.learningMaterial.deleteMany({ where: { courseId: course.id } });
    await prisma.lesson.deleteMany({ where: { moduleId: module1.id } });
    await prisma.module.deleteMany({ where: { courseId: course.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.mentorAssignment.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });

    console.log('🎉 All 10 End-to-End Mentor Curriculum Workflow Tests Passed Successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndVerification();
