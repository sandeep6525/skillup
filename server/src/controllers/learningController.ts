import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import path from 'path';
import fs from 'fs';
import { resolveDiskPath } from '../utils/pathUtils';

export const getEnrolledCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: req.user.id,
        course: { status: 'PUBLISHED' },
      },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, avatarUrl: true, title: true } },
            _count: { select: { modules: true } },
            modules: {
              include: {
                _count: { select: { lessons: true } },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Attach payment balance details for each enrolled course
    const enriched = await Promise.all(
      enrollments.map(async (enr) => {
        const totalLessons = enr.course.modules.reduce(
          (acc, m) => acc + (m._count?.lessons || 0),
          0
        );

        const latestPayment = await prisma.payment.findFirst({
          where: {
            userId: req.user!.id,
            courseId: enr.courseId,
            status: { in: ['COMPLETED', 'PENDING'] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            status: true,
            isPartial: true,
            remainingBalance: true,
            totalCoursePrice: true,
          },
        });

        return {
          ...enr,
          totalLessons,
          payment: latestPayment || null,
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/learning/dashboard-summary - Live verified database statistics for the student dashboard
 */
export const getStudentDashboardSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.id;

    const [
      enrolledCoursesCount,
      activeInternshipsCount,
      completedLessonsCount,
      purchasedMaterialsCount,
      certificatesCount,
      inProgressCoursesCount,
      completedCoursesCount,
      registeredHackathonsCount,
      pendingAssignmentsCount,
      upcomingLiveClassesCount,
    ] = await Promise.all([
      // 1. Total enrolled courses
      prisma.enrollment.count({
        where: {
          userId,
          course: { status: 'PUBLISHED' },
        },
      }),
      // 2. Active enrolled internships
      prisma.internshipApplication.count({
        where: {
          userId,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
      }),
      // 3. Total completed lessons across all enrolled courses
      prisma.lessonProgress.count({
        where: { userId, isCompleted: true },
      }),
      // 4. Purchased materials (unique direct purchases + eligible course-included & internship-included materials)
      (async () => {
        const [directPurchases, enrollments, acceptedInternships] = await Promise.all([
          prisma.materialPurchase.findMany({
            where: { userId },
            select: { materialId: true },
          }),
          prisma.enrollment.findMany({
            where: { userId },
            select: { courseId: true },
          }),
          prisma.internshipApplication.findMany({
            where: { userId, status: { in: ['ACCEPTED', 'COMPLETED'] } },
            select: { internshipId: true },
          }),
        ]);
        const uniqueMaterialIds = new Set<string>(directPurchases.map((p) => p.materialId));
        const courseIds = enrollments.map((e) => e.courseId);
        const internshipIds = acceptedInternships.map((a) => a.internshipId);

        if (courseIds.length > 0 || internshipIds.length > 0) {
          const includedMaterials = await prisma.learningMaterial.findMany({
            where: {
              OR: [
                courseIds.length > 0 ? { courseId: { in: courseIds } } : {},
                internshipIds.length > 0 ? { internshipId: { in: internshipIds } } : {},
              ],
              isPublished: true,
            },
            select: { id: true },
          });
          includedMaterials.forEach((m) => uniqueMaterialIds.add(m.id));
        }
        return uniqueMaterialIds.size;
      })(),
      // 5. Certificates earned
      prisma.certificate.count({
        where: { userId },
      }),
      // 6. In-progress courses (0 < progress < 100)
      prisma.enrollment.count({
        where: {
          userId,
          progress: { gt: 0, lt: 100 },
        },
      }),
      // 7. 100% Completed courses
      prisma.enrollment.count({
        where: {
          userId,
          progress: { gte: 100 },
        },
      }),
      // 8. Registered hackathons
      prisma.hackathonRegistration.count({
        where: { userId },
      }),
      // 9. Pending assignments for student's enrolled courses and batches
      (async () => {
        const enrollments = await prisma.enrollment.findMany({
          where: { userId },
          select: { courseId: true },
        });
        const enrolledCourseIds = enrollments.map((e) => e.courseId);
        if (enrolledCourseIds.length === 0) return 0;

        const batchEnrollments = await prisma.batchEnrollment.findMany({
          where: { studentId: userId, isActive: true },
          select: { batchId: true },
        });
        const enrolledBatchIds = batchEnrollments.map((b) => b.batchId);

        return prisma.assignment.count({
          where: {
            AND: [
              { courseId: { in: enrolledCourseIds } },
              {
                OR: [
                  { batchId: null },
                  enrolledBatchIds.length > 0 ? { batchId: { in: enrolledBatchIds } } : { batchId: null },
                ],
              },
              { submissions: { none: { studentId: userId } } },
            ],
          },
        });
      })(),
      // 10. Upcoming live classes for student's enrolled courses, batches, and internships
      (async () => {
        const [courseEnrollments, batchEnrollments, internshipEnrollments] = await Promise.all([
          prisma.enrollment.findMany({
            where: { userId },
            select: { courseId: true },
          }),
          prisma.batchEnrollment.findMany({
            where: { studentId: userId, isActive: true },
            select: { batchId: true },
          }),
          prisma.internshipApplication.findMany({
            where: { userId, status: { in: ['ACCEPTED', 'COMPLETED'] } },
            select: { internshipId: true },
          }),
        ]);

        const enrolledCourseIds = courseEnrollments.map((e) => e.courseId);
        const enrolledBatchIds = batchEnrollments.map((b) => b.batchId);
        const enrolledInternshipIds = internshipEnrollments.map((i) => i.internshipId);

        if (enrolledCourseIds.length === 0 && enrolledBatchIds.length === 0 && enrolledInternshipIds.length === 0) {
          return 0;
        }

        return prisma.liveClass.count({
          where: {
            status: { in: ['SCHEDULED', 'LIVE'] },
            startTime: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // scheduled or started within last 30 min
            OR: [
              ...(enrolledBatchIds.length > 0 ? [{ batchId: { in: enrolledBatchIds } }] : []),
              ...(enrolledCourseIds.length > 0 ? [{ courseId: { in: enrolledCourseIds }, batchId: null }] : []),
              ...(enrolledInternshipIds.length > 0 ? [{ internshipId: { in: enrolledInternshipIds } }] : []),
            ],
          },
        });
      })(),
    ]);

    res.json({
      success: true,
      data: {
        enrolledCourses: enrolledCoursesCount,
        activeInternships: activeInternshipsCount,
        completedLessons: completedLessonsCount,
        purchasedMaterials: purchasedMaterialsCount,
        certificatesEarned: certificatesCount,
        inProgressCourses: inProgressCoursesCount,
        completedCourses: completedCoursesCount,
        registeredHackathons: registeredHackathonsCount,
        pendingAssignments: pendingAssignmentsCount,
        upcomingLiveClasses: upcomingLiveClassesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLessonStreamData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lessonId = String(req.params.lessonId);

    const lesson: any = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        resources: true,
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) throw new AppError('Lesson not found', 404);

    const courseId = lesson.module.courseId;

    // Free preview check
    if (!lesson.isFree) {
      if (!req.user) {
        throw new AppError('Please log in and enroll in this course to access this lesson', 401);
      }
      let isAuthorizedManager = req.user.role === 'ADMIN' || req.user.id === lesson.module.course.instructorId;
      if (!isAuthorizedManager) {
        const assignment = await prisma.mentorAssignment.findFirst({
          where: { courseId, mentorId: req.user.id },
        });
        if (assignment) isAuthorizedManager = true;
      }

      if (!isAuthorizedManager) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: req.user.id, courseId } },
        });
        if (!enrollment) {
          throw new AppError('Please enroll in this course to access this lesson', 403);
        }

        const course = lesson.module.course;
        if (course.installmentPolicy === 'RESTRICTED') {
          const courseFee = Number(course.discountPrice || course.price);
          const payments = await prisma.payment.findMany({
            where: {
              userId: req.user.id,
              courseId,
              status: 'COMPLETED',
            },
            select: { amount: true, discountAmount: true },
          });
          const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const totalDiscount = payments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
          if (totalPaid + totalDiscount < courseFee) {
            throw new AppError(
              'Course content is restricted until your remaining installment balance is fully settled.',
              403
            );
          }
        }
      }
    }

    let progress = null;
    if (req.user) {
      progress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: req.user.id, lessonId } },
      });
    }

    res.json({
      success: true,
      data: {
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.videoUrl,
          duration: lesson.duration,
          resources: lesson.resources,
          moduleId: lesson.moduleId,
          module: {
            id: lesson.module.id,
            title: lesson.module.title,
          },
          courseId,
        },
        progress: progress || { isCompleted: false, lastPosition: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateLessonProgress = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);
    const { lastPosition, isCompleted } = req.body;

    const lesson: any = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { select: { courseId: true } } },
    });

    if (!lesson) throw new AppError('Lesson not found', 404);
    const courseId = lesson.module.courseId;

    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId } },
      create: {
        userId: req.user.id,
        lessonId,
        lastPosition: lastPosition || 0,
        isCompleted: isCompleted || false,
        completedAt: isCompleted ? new Date() : null,
      },
      update: {
        ...(lastPosition !== undefined && { lastPosition }),
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        }),
      },
    });

    const totalLessons = await prisma.lesson.count({
      where: { module: { courseId } },
    });

    if (totalLessons > 0) {
      const completedLessons = await prisma.lessonProgress.count({
        where: {
          userId: req.user.id,
          isCompleted: true,
          lesson: { module: { courseId } },
        },
      });

      const percentage = Math.round((completedLessons / totalLessons) * 100);

      await prisma.enrollment.update({
        where: { userId_courseId: { userId: req.user.id, courseId } },
        data: {
          progress: percentage,
          completedAt: percentage === 100 ? new Date() : null,
        },
      });
    }

    res.json({ success: true, message: 'Progress saved', data: progress });
  } catch (error) {
    next(error);
  }
};

export const downloadLessonResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const resourceId = String(req.params.resourceId);

    const resource: any = await prisma.lessonResource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: {
          include: {
            module: { select: { courseId: true } },
          },
        },
      },
    });

    if (!resource) throw new AppError('Resource not found', 404);

    const courseId = resource.lesson.module.courseId;
    let isAuthorized = req.user.role === 'ADMIN';

    if (!isAuthorized) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      });
      if (course?.instructorId === req.user.id) {
        isAuthorized = true;
      } else {
        const assignment = await prisma.mentorAssignment.findFirst({
          where: { courseId, mentorId: req.user.id },
        });
        if (assignment) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId } },
      });
      if (enrollment) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new AppError('Only enrolled students or course instructors can download resources', 403);
    }

    const resolvedPath = resolveDiskPath(resource.fileUrl);

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      return res.download(resolvedPath, resource.title);
    } else if (resource.fileUrl.startsWith('http://') || resource.fileUrl.startsWith('https://')) {
      return res.redirect(resource.fileUrl);
    } else {
      throw new AppError('File not found on server storage', 404);
    }
  } catch (error) {
    next(error);
  }
};
