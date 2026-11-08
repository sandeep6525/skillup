import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

/**
 * Helper to fetch mentor authorized scopes (courseIds and batchIds)
 */
export const getMentorScope = async (userId: string, role: string) => {
  if (role === 'ADMIN') {
    const allCourses = await prisma.course.findMany({ select: { id: true } });
    const allBatches = await prisma.batch.findMany({ select: { id: true } });
    const allInternships = await prisma.internship.findMany({ select: { id: true } });
    return {
      isAdmin: true,
      courseIds: allCourses.map((c) => c.id),
      courseWideCourseIds: allCourses.map((c) => c.id),
      batchIds: allBatches.map((b) => b.id),
      internshipIds: allInternships.map((i) => i.id),
    };
  }

  const [assignments, instructedCourses, mentoredInternships] = await Promise.all([
    prisma.mentorAssignment.findMany({
      where: { mentorId: userId },
      select: { courseId: true, batchId: true, scope: true },
    }),
    prisma.course.findMany({
      where: { instructorId: userId },
      select: { id: true },
    }),
    prisma.internship.findMany({
      where: { mentorId: userId },
      select: { id: true },
    }),
  ]);

  const courseIds = new Set<string>();
  const courseWideCourseIds = new Set<string>();
  const batchIds = new Set<string>();
  const internshipIds = new Set<string>(mentoredInternships.map((i) => i.id));

  // Courses where user is direct instructor
  for (const c of instructedCourses) {
    courseIds.add(c.id);
    courseWideCourseIds.add(c.id);
  }

  for (const assign of assignments) {
    courseIds.add(assign.courseId);
    if (assign.scope === 'SPECIFIC_BATCH' && assign.batchId) {
      batchIds.add(assign.batchId);
    } else if (assign.scope === 'COURSE_WIDE' || !assign.batchId) {
      courseWideCourseIds.add(assign.courseId);
      const batches = await prisma.batch.findMany({
        where: { courseId: assign.courseId },
        select: { id: true },
      });
      batches.forEach((b) => batchIds.add(b.id));
    }
  }

  // Also include any batches of instructed courses
  if (instructedCourses.length > 0) {
    const instructedBatches = await prisma.batch.findMany({
      where: { courseId: { in: Array.from(courseIds) } },
      select: { id: true },
    });
    instructedBatches.forEach((b) => batchIds.add(b.id));
  }

  return {
    isAdmin: false,
    courseIds: Array.from(courseIds),
    courseWideCourseIds: Array.from(courseWideCourseIds),
    batchIds: Array.from(batchIds),
    internshipIds: Array.from(internshipIds),
  };
};

/**
 * 1. GET /api/mentor/dashboard - Real operational metrics & actionable summaries
 */
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    if (scope.courseIds.length === 0 && !scope.isAdmin) {
      return res.json({
        success: true,
        data: {
          metrics: {
            assignedCourses: 0,
            assignedBatches: 0,
            totalStudents: 0,
            todayClasses: 0,
            upcomingClasses: 0,
            pendingAttendance: 0,
            pendingAssignments: 0,
            pendingAssessments: 0,
          },
          todaySchedule: [],
          upcomingClasses: [],
          courseProgress: [],
          recentActivity: [],
        },
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [studentEnrollments, courseEnrollments] = await Promise.all([
      scope.batchIds.length > 0
        ? prisma.batchEnrollment.findMany({
            where: {
              batchId: { in: scope.batchIds },
              isActive: true,
            },
            select: { studentId: true },
          })
        : [],
      scope.courseWideCourseIds.length > 0
        ? prisma.enrollment.findMany({
            where: {
              courseId: { in: scope.courseWideCourseIds },
            },
            select: { userId: true },
          })
        : [],
    ]);

    const uniqueStudentIds = Array.from(
      new Set([
        ...studentEnrollments.map((e) => e.studentId),
        ...courseEnrollments.map((e) => e.userId),
      ])
    );

    const [todayClasses, upcomingClasses, pendingAttendanceSessions] = await Promise.all([
      prisma.liveClass.findMany({
        where: {
          courseId: { in: scope.courseIds },
          startTime: { gte: todayStart, lte: todayEnd },
        },
        include: {
          course: { select: { id: true, title: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.liveClass.findMany({
        where: {
          courseId: { in: scope.courseIds },
          startTime: { gt: todayEnd },
        },
        take: 5,
        include: {
          course: { select: { id: true, title: true } },
          batch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.liveClass.findMany({
        where: {
          courseId: { in: scope.courseIds },
          startTime: { lt: new Date() },
          attendanceRegister: { none: {} },
        },
        take: 5,
      }),
    ]);

    const pendingSubmissions = await prisma.assignmentSubmission.count({
      where: {
        assignment: { courseId: { in: scope.courseIds } },
        status: 'SUBMITTED',
      },
    });

    const pendingAssessments = await prisma.assessmentSubmission.count({
      where: {
        assessment: { courseId: { in: scope.courseIds } },
        gradedAt: null,
      },
    });

    const courses = await prisma.course.findMany({
      where: { id: { in: scope.courseIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        enrollments: {
          select: { progress: true },
        },
        batches: {
          where: { id: { in: scope.batchIds } },
          select: {
            id: true,
            name: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    const courseProgress = courses.map((c) => {
      const totalStudents = c.enrollments.length;
      const avgProgress =
        totalStudents > 0
          ? Math.round(c.enrollments.reduce((sum, e) => sum + e.progress, 0) / totalStudents)
          : 0;
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        studentCount: totalStudents,
        avgProgress,
        batchCount: c.batches.length,
      };
    });

    const recentSubmissions = await prisma.assignmentSubmission.findMany({
      where: { assignment: { courseId: { in: scope.courseIds } } },
      take: 4,
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { name: true, email: true } },
        assignment: { select: { title: true } },
      },
    });

    const recentEnrollments = await prisma.batchEnrollment.findMany({
      where: { batchId: { in: scope.batchIds } },
      take: 4,
      orderBy: { enrolledAt: 'desc' },
      include: {
        student: { select: { name: true, email: true } },
        batch: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        metrics: {
          assignedCourses: scope.courseIds.length,
          assignedBatches: scope.batchIds.length,
          totalStudents: uniqueStudentIds.length,
          todayClasses: todayClasses.length,
          upcomingClasses: upcomingClasses.length,
          pendingAttendance: pendingAttendanceSessions.length,
          pendingAssignments: pendingSubmissions,
          pendingAssessments,
        },
        todaySchedule: todayClasses,
        upcomingClasses,
        courseProgress,
        recentActivity: [
          ...recentSubmissions.map((s) => ({
            id: s.id,
            type: 'ASSIGNMENT_SUBMISSION',
            title: `New submission by ${s.student.name}`,
            description: s.assignment.title,
            time: s.submittedAt,
          })),
          ...recentEnrollments.map((e) => ({
            id: e.id,
            type: 'ENROLLMENT',
            title: `${e.student.name} enrolled`,
            description: e.batch.name,
            time: e.enrolledAt,
          })),
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/mentor/courses - Courses authorized for this mentor
 */
export const getMyCourses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const courses = await prisma.course.findMany({
      where: { id: { in: scope.courseIds } },
      include: {
        category: true,
        batches: {
          where: { id: { in: scope.batchIds } },
          include: {
            _count: { select: { enrollments: true } },
          },
        },
        enrollments: {
          select: {
            id: true,
            progress: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { lessons: true } },
          },
        },
        liveClasses: {
          where: {
            status: { in: ['SCHEDULED', 'LIVE'] },
            startTime: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
          orderBy: { startTime: 'asc' },
          take: 3,
        },
        _count: {
          select: {
            modules: true,
            assignments: true,
            liveClasses: true,
            learningMaterials: true,
            enrollments: true,
          },
        },
      },
    });

    const enrichedCourses = courses.map((course) => {
      const totalEnrolled = course._count.enrollments;
      const totalLessons = course.modules.reduce((sum, m) => sum + m._count.lessons, 0);
      const avgProgress =
        totalEnrolled > 0
          ? Math.round(course.enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrolled)
          : 0;

      return {
        ...course,
        totalEnrolledStudents: totalEnrolled,
        totalLessons,
        totalMaterials: course._count.learningMaterials,
        curriculumCompletionRate: avgProgress,
        upcomingLiveClassesList: course.liveClasses,
      };
    });

    res.json({ success: true, data: enrichedCourses });
  } catch (error) {
    next(error);
  }
};

/**
 * 2b. GET /api/mentor/internships - Industry internships supervised by this mentor
 */
export const getMyInternships = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const internships = await prisma.internship.findMany({
      where: { id: { in: scope.internshipIds } },
      include: {
        mentor: {
          select: { id: true, name: true, email: true, title: true, avatarUrl: true },
        },
        applications: {
          where: { status: 'ACCEPTED' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, college: true, phone: true } },
          },
        },
        _count: {
          select: {
            applications: true,
            learningMaterials: true,
            liveClasses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: internships });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/mentor/courses/:id - Detailed course syllabus & cohort data
 */
export const getCourseDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const courseId = String(req.params.id);
    const scope = await getMentorScope(req.user.id, req.user.role);

    if (!scope.courseIds.includes(courseId) && !scope.isAdmin) {
      throw new AppError('Access denied: You are not authorized for this course', 403);
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        modules: {
          include: {
            lessons: true,
          },
          orderBy: { order: 'asc' },
        },
        batches: {
          where: { id: { in: scope.batchIds } },
          include: {
            _count: { select: { enrollments: true } },
          },
        },
        learningMaterials: {
          where: { OR: [{ batchId: { in: scope.batchIds } }, { batchId: null }] },
        },
        assignments: {
          where: { OR: [{ batchId: { in: scope.batchIds } }, { batchId: null }] },
        },
        assessments: {
          where: { OR: [{ batchId: { in: scope.batchIds } }, { batchId: null }] },
        },
      },
    });

    if (!course) throw new AppError('Course not found', 404);
    res.json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/mentor/batches - Batches authorized for this mentor
 */
export const getMyBatches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const batches = await prisma.batch.findMany({
      where: { id: { in: scope.batchIds } },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: {
          select: {
            enrollments: true,
            liveClasses: true,
            assignments: true,
            materials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/mentor/students - Automatic student discovery based on mentor course/batch assignment
 */
export const getAuthorizedStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const courseId = req.query.courseId ? String(req.query.courseId) : undefined;
    const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    // A. Fetch Batch Enrollments for assigned batches
    const filterBatchIds = batchId ? [batchId] : scope.batchIds;
    const batchEnrollmentsPromise = filterBatchIds.length > 0
      ? prisma.batchEnrollment.findMany({
          where: {
            batchId: { in: filterBatchIds },
            isActive: true,
            ...(courseId ? { batch: { courseId } } : {}),
            ...(search
              ? {
                  student: {
                    OR: [
                      { name: { contains: search } },
                      { email: { contains: search } },
                    ],
                  },
                }
              : {}),
          },
          include: {
            batch: {
              include: {
                course: { select: { id: true, title: true } },
              },
            },
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                title: true,
                createdAt: true,
                enrollments: {
                  select: { courseId: true, progress: true },
                },
                assignmentSubmissions: {
                  select: { id: true, status: true, grade: true },
                },
                assessmentSubmissions: {
                  select: { id: true, score: true },
                },
                sessionAttendances: {
                  select: { id: true, status: true },
                },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        })
      : Promise.resolve([]);

    // B. Fetch Course-Wide Direct Enrollments for courses assigned COURSE_WIDE
    // Only query course-wide if not filtering by a specific batch
    let courseWideEnrollmentsPromise: Promise<any[]> = Promise.resolve([]);
    if (!batchId && scope.courseWideCourseIds.length > 0) {
      const targetCourseWideIds = courseId
        ? (scope.courseWideCourseIds.includes(courseId) ? [courseId] : [])
        : scope.courseWideCourseIds;

      if (targetCourseWideIds.length > 0) {
        courseWideEnrollmentsPromise = prisma.enrollment.findMany({
          where: {
            courseId: { in: targetCourseWideIds },
            ...(search
              ? {
                  user: {
                    OR: [
                      { name: { contains: search } },
                      { email: { contains: search } },
                    ],
                  },
                }
              : {}),
          },
          include: {
            course: { select: { id: true, title: true } },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                title: true,
                createdAt: true,
                enrollments: {
                  select: { courseId: true, progress: true },
                },
                assignmentSubmissions: {
                  select: { id: true, status: true, grade: true },
                },
                assessmentSubmissions: {
                  select: { id: true, score: true },
                },
                sessionAttendances: {
                  select: { id: true, status: true },
                },
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
        });
      }
    }

    const [batchEnrollments, courseEnrollments] = await Promise.all([
      batchEnrollmentsPromise,
      courseWideEnrollmentsPromise,
    ]);

    const studentMap = new Map<string, any>();

    // 1. Process batch enrollments first
    for (const item of batchEnrollments) {
      const student = item.student;
      const key = `${student.id}_${item.batch.courseId}`;

      const courseProgress =
        student.enrollments.find((e: any) => e.courseId === item.batch.courseId)?.progress || 0;
      const totalAttendances = student.sessionAttendances.length;
      const presentCount = student.sessionAttendances.filter(
        (a: any) => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;
      const attendancePct = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100;
      const latestAssessment = student.assessmentSubmissions[student.assessmentSubmissions.length - 1];

      studentMap.set(key, {
        id: student.id,
        enrollmentId: item.id,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        title: student.title,
        courseId: item.batch.courseId,
        courseTitle: item.batch.course.title,
        batchId: item.batch.id,
        batchName: item.batch.name,
        batchCode: item.batch.code,
        enrolledAt: item.enrolledAt,
        progress: courseProgress,
        attendancePercentage: attendancePct,
        latestAssessmentScore: latestAssessment?.score ?? null,
        submissionsCount: student.assignmentSubmissions.length,
      });
    }

    // 2. Process course-wide enrollments (if not already mapped from batch)
    for (const item of courseEnrollments) {
      const student = item.user;
      const key = `${student.id}_${item.courseId}`;
      if (!studentMap.has(key)) {
        const courseProgress =
          student.enrollments.find((e: any) => e.courseId === item.courseId)?.progress || 0;
        const totalAttendances = student.sessionAttendances.length;
        const presentCount = student.sessionAttendances.filter(
          (a: any) => a.status === 'PRESENT' || a.status === 'LATE'
        ).length;
        const attendancePct = totalAttendances > 0 ? Math.round((presentCount / totalAttendances) * 100) : 100;
        const latestAssessment = student.assessmentSubmissions[student.assessmentSubmissions.length - 1];

        studentMap.set(key, {
          id: student.id,
          enrollmentId: item.id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatarUrl,
          title: student.title,
          courseId: item.courseId,
          courseTitle: item.course.title,
          batchId: null,
          batchName: 'All Batches',
          batchCode: 'COURSE-WIDE',
          enrolledAt: item.enrolledAt,
          progress: courseProgress,
          attendancePercentage: attendancePct,
          latestAssessmentScore: latestAssessment?.score ?? null,
          submissionsCount: student.assignmentSubmissions.length,
        });
      }
    }

    const students = Array.from(studentMap.values());
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/mentor/students/:id - Individual student deep profile & academic progress
 */
export const getStudentProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const studentId = String(req.params.id);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const authorizedEnrollment = await prisma.batchEnrollment.findFirst({
      where: {
        studentId,
        batchId: { in: scope.batchIds },
      },
      include: {
        batch: { include: { course: true } },
      },
    });

    const authorizedCourseEnrollment = !authorizedEnrollment && scope.courseWideCourseIds.length > 0
      ? await prisma.enrollment.findFirst({
          where: {
            userId: studentId,
            courseId: { in: scope.courseWideCourseIds },
          },
        })
      : null;

    if (!authorizedEnrollment && !authorizedCourseEnrollment && !scope.isAdmin) {
      throw new AppError('Access denied: You do not mentor this student', 403);
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        title: true,
        bio: true,
        createdAt: true,
        enrollments: {
          where: { courseId: { in: scope.courseIds } },
          include: { course: { select: { title: true } } },
        },
        batchEnrollments: {
          where: { batchId: { in: scope.batchIds } },
          include: { batch: true },
        },
        sessionAttendances: {
          include: {
            liveClass: { select: { id: true, title: true, startTime: true } },
          },
          orderBy: { markedAt: 'desc' },
        },
        assignmentSubmissions: {
          include: {
            assignment: { select: { id: true, title: true, totalPoints: true, dueDate: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
        assessmentSubmissions: {
          include: {
            assessment: { select: { id: true, title: true, totalMarks: true, passingMarks: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!student) throw new AppError('Student not found', 404);

    res.json({ success: true, data: student });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to validate meeting URLs
 */
const validateMeetingUrl = (url: string | undefined): boolean => {
  if (!url) return true; // Default fallback room will be used if omitted
  const trimmed = url.trim();
  // Reject unsafe schemes
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false;
  }
  // Allow secure https links or local development urls
  const isHttps = /^https:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed);
  const isLocalDev = trimmed.startsWith('http://localhost') || trimmed.startsWith('/live-classes');
  return isHttps || isLocalDev;
};

/**
 * 7. POST /api/mentor/classes - Schedule a new live class
 */
export const scheduleClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    // Verify mentor account is verified and active (reject deactivated mentors)
    const mentorUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isVerified: true, role: true, name: true },
    });
    if (!mentorUser || (!mentorUser.isVerified && mentorUser.role !== 'ADMIN')) {
      throw new AppError('Your mentor account is deactivated or unverified. You cannot schedule live classes.', 403);
    }

    const scope = await getMentorScope(req.user.id, req.user.role);

    const { courseId, batchId, internshipId, title, description, startTime, duration, meetingUrl, meetingProvider, price, maxCapacity, timezone } = req.body;

    if (!title || !startTime) {
      throw new AppError('Class title and start time are required', 400);
    }

    // Role-based fee protection: Mentor cannot configure fee unless Admin
    if (price !== undefined && Number(price) > 0 && req.user.role !== 'ADMIN') {
      throw new AppError('Mentors are not authorized to set or modify live-class registration fees. Fees must be configured by an administrator.', 403);
    }

    if (courseId && !scope.courseIds.includes(String(courseId)) && !scope.isAdmin) {
      throw new AppError('You are not authorized to schedule classes for this course', 403);
    }
    if (batchId && !scope.batchIds.includes(String(batchId)) && !scope.isAdmin) {
      throw new AppError('You are not authorized to schedule classes for this batch', 403);
    }
    if (internshipId && !scope.internshipIds.includes(String(internshipId)) && !scope.isAdmin) {
      throw new AppError('You are not authorized to schedule classes for this internship', 403);
    }

    // If both courseId and batchId are provided, verify the batch belongs to the course
    if (courseId && batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: String(batchId) } });
      if (!batch || batch.courseId !== String(courseId)) {
        throw new AppError('The specified batch does not belong to the selected course', 400);
      }
    }

    // Validate meeting URL security
    if (meetingUrl && !validateMeetingUrl(meetingUrl)) {
      throw new AppError('Meeting URL must be a valid secure HTTPS link (e.g. Google Meet, Zoom, Teams)', 400);
    }

    const classStartTime = new Date(startTime);
    if (isNaN(classStartTime.getTime())) {
      throw new AppError('Invalid start time provided', 400);
    }

    const classDuration = Number(duration) || 60;
    const classEndTime = new Date(classStartTime.getTime() + classDuration * 60 * 1000);

    // Scheduling conflict check for this mentor
    const conflict = await prisma.liveClass.findFirst({
      where: {
        instructorId: req.user.id,
        status: { in: ['SCHEDULED', 'LIVE'] },
        startTime: {
          gte: new Date(classStartTime.getTime() - 15 * 60 * 1000), // within 15 min buffer
          lte: classEndTime,
        },
      },
    });

    if (conflict) {
      throw new AppError(`Scheduling conflict: You already have a session "${conflict.title}" scheduled around this time.`, 409);
    }

    const generatedRoom = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newClass = await prisma.liveClass.create({
      data: {
        roomName: generatedRoom,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        startTime: classStartTime,
        duration: classDuration,
        meetingUrl: meetingUrl ? String(meetingUrl).trim() : `https://meet.jit.si/${generatedRoom}`,
        meetingProvider: meetingProvider ? String(meetingProvider).trim() : 'OTHER',
        courseId: courseId ? String(courseId) : null,
        batchId: batchId ? String(batchId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        instructorId: req.user.id,
        price: price && req.user.role === 'ADMIN' ? Number(price) : 0,
        maxCapacity: maxCapacity ? parseInt(String(maxCapacity), 10) : 100,
        timezone: timezone ? String(timezone).trim() : 'IST',
        status: 'SCHEDULED',
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, code: true } },
        internship: { select: { id: true, title: true, organization: true } },
      },
    });

    const mentorName = mentorUser.name || 'Your Mentor';
    const courseTitle = newClass.course?.title || 'Interactive Course';

    // Collect all eligible students: Batch students (if batchId specified) and/or Course enrollments (if courseId specified)
    const recipientMap = new Map<string, { id: string; email: string; name: string }>();

    if (batchId) {
      const batchEnrollments = await prisma.batchEnrollment.findMany({
        where: { batchId: String(batchId), isActive: true },
        include: { student: { select: { id: true, email: true, name: true } } },
      });
      for (const item of batchEnrollments) {
        if (item.student) recipientMap.set(item.student.id, item.student);
      }
    } else if (courseId) {
      const courseEnrollments = await prisma.enrollment.findMany({
        where: { courseId: String(courseId) },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      for (const item of courseEnrollments) {
        if (item.user) recipientMap.set(item.user.id, item.user);
      }
    }

    // Dispatch in-app notifications and email notifications asynchronously
    const studentsToNotify = Array.from(recipientMap.values());
    for (const student of studentsToNotify) {
      await prisma.notification.create({
        data: {
          userId: student.id,
          title: `New Live Class Scheduled: ${title}`,
          message: `A new live session "${title}" for "${courseTitle}" has been scheduled for ${classStartTime.toLocaleString()}.`,
          type: 'COURSE',
          link: `/live-classes`,
        },
      }).catch(() => {});

      const emailData = emailTemplates.liveClassNotification({
        studentName: student.name || 'Student',
        courseTitle,
        classTitle: title,
        startTime: classStartTime.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        }),
        durationMins: classDuration,
        mentorName,
        isReschedule: false,
        isCancelled: false,
      });

      sendEmail({
        to: student.email,
        subject: emailData.subject,
        html: emailData.html,
      }).catch((err) => {
        console.warn(`[LiveClass Notification] Failed to email student ${student.email}:`, err?.message || err);
      });
    }

    res.status(201).json({ success: true, message: 'Live class scheduled successfully', data: newClass });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/mentor/classes - List mentor's scheduled and past classes
 */
export const getMyClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const classes = await prisma.liveClass.findMany({
      where: {
        OR: [
          { courseId: { in: scope.courseIds } },
          { internshipId: { in: scope.internshipIds } },
          { instructorId: req.user.id },
        ],
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, code: true } },
        internship: { select: { id: true, title: true, organization: true } },
        instructor: { select: { id: true, name: true, email: true } },
        _count: { select: { attendees: true, attendanceRegister: true, registrations: true } },
        registrations: {
          where: { status: 'PAID' },
          select: {
            id: true,
            status: true,
            amount: true,
            registeredAt: true,
            attended: true,
            student: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

/**
 * 8a. PATCH /api/mentor/classes/:id - Reschedule or edit live class
 */
export const updateLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);
    const { title, description, startTime, duration, meetingUrl, meetingProvider, batchId, price, maxCapacity, timezone } = req.body;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: { course: true, batch: true },
    });

    if (!liveClass) throw new AppError('Live class not found', 404);

    // Permission check: only assigned mentor or admin can edit
    if (liveClass.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('You do not have permission to modify this class session', 403);
    }

    // Role-based fee protection
    if (price !== undefined && req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators are authorized to update live-class registration fees', 403);
    }

    if (meetingUrl && !validateMeetingUrl(meetingUrl)) {
      throw new AppError('Meeting URL must be a valid secure HTTPS link', 400);
    }

    const previousStartTime = new Date(liveClass.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    const isReschedule = Boolean(startTime && new Date(startTime).getTime() !== new Date(liveClass.startTime).getTime());
    const isMeetingUrlUpdated = Boolean(meetingUrl && String(meetingUrl).trim() !== String(liveClass.meetingUrl || '').trim());

    const updated = await prisma.liveClass.update({
      where: { id },
      data: {
        ...(title ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(startTime ? { startTime: new Date(startTime) } : {}),
        ...(duration ? { duration: Number(duration) } : {}),
        ...(meetingUrl ? { meetingUrl: String(meetingUrl).trim() } : {}),
        ...(meetingProvider ? { meetingProvider: String(meetingProvider).trim() } : {}),
        ...(batchId !== undefined ? { batchId: batchId ? String(batchId) : null } : {}),
        ...(price !== undefined && req.user.role === 'ADMIN' ? { price: Number(price) } : {}),
        ...(maxCapacity !== undefined ? { maxCapacity: parseInt(String(maxCapacity), 10) } : {}),
        ...(timezone ? { timezone: String(timezone).trim() } : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true } },
      },
    });

    // Notify registered and enrolled students
    const recipientMap = new Map<string, { id: string; email: string; name: string }>();

    // Include registered paid students
    const paidRegistrations = await prisma.liveClassRegistration.findMany({
      where: { liveClassId: updated.id, status: 'PAID' },
      include: { student: { select: { id: true, email: true, name: true } } },
    });
    for (const reg of paidRegistrations) {
      if (reg.student) recipientMap.set(reg.student.id, reg.student);
    }

    if (updated.batchId) {
      const enrollments = await prisma.batchEnrollment.findMany({
        where: { batchId: updated.batchId, isActive: true },
        include: { student: { select: { id: true, email: true, name: true } } },
      });
      for (const item of enrollments) {
        if (item.student) recipientMap.set(item.student.id, item.student);
      }
    } else if (updated.courseId && Number(updated.price) === 0) {
      const courseEnrollments = await prisma.enrollment.findMany({
        where: { courseId: updated.courseId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      for (const item of courseEnrollments) {
        if (item.user) recipientMap.set(item.user.id, item.user);
      }
    }

    const courseTitle = updated.course?.title || 'Interactive Course';
    const mentorName = updated.instructor?.name || req.user.name || 'Mentor';
    const updatedStartTime = new Date(updated.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    for (const student of Array.from(recipientMap.values())) {
      await prisma.notification.create({
        data: {
          userId: student.id,
          title: `Live Class ${isReschedule ? 'Rescheduled' : isMeetingUrlUpdated ? 'Meeting Link Ready' : 'Updated'}: ${updated.title}`,
          message: isMeetingUrlUpdated
            ? `The meeting link is set by ${mentorName}. You can join from your dashboard when the session opens.`
            : `The session schedule has been updated to ${updatedStartTime} (IST)`,
          type: 'COURSE',
          link: `/live-classes`,
        },
      }).catch(() => {});

      if (isMeetingUrlUpdated && !isReschedule) {
        const linkEmail = emailTemplates.liveClassMeetingUrlUpdated({
          studentName: student.name || 'Student',
          classTitle: updated.title,
          mentorName,
          startTime: updatedStartTime,
          meetingProvider: updated.meetingProvider,
        });
        sendEmail({
          to: student.email,
          subject: linkEmail.subject,
          html: linkEmail.html,
          templateCode: 'LIVE_CLASS_MEETING_LINK_READY',
          idempotencyKey: `meet_link_${updated.id}_${student.id}_${Date.now()}`,
        }).catch((err) => {
          console.warn(`[LiveClass Meeting Link Email Failed]`, err?.message || err);
        });
      } else {
        const emailData = emailTemplates.liveClassNotification({
          studentName: student.name || 'Student',
          courseTitle,
          classTitle: updated.title,
          startTime: updatedStartTime,
          durationMins: updated.duration || 60,
          mentorName,
          isReschedule,
          isCancelled: false,
          previousTime: isReschedule ? previousStartTime : undefined,
        });

        sendEmail({
          to: student.email,
          subject: emailData.subject,
          html: emailData.html,
        }).catch((err) => {
          console.warn(`[LiveClass Update Email Failed]`, err?.message || err);
        });
      }
    }

    res.json({ success: true, message: 'Class session updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * 8b. DELETE /api/mentor/classes/:id - Cancel live class (preserves historical record)
 */
export const cancelLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true } },
      },
    });
    if (!liveClass) throw new AppError('Live class not found', 404);

    if (liveClass.instructorId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('You do not have permission to cancel this class session', 403);
    }

    const cancelled = await prisma.liveClass.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    // Notify enrolled students of cancellation
    const recipientMap = new Map<string, { id: string; email: string; name: string }>();
    if (liveClass.batchId) {
      const enrollments = await prisma.batchEnrollment.findMany({
        where: { batchId: liveClass.batchId, isActive: true },
        include: { student: { select: { id: true, email: true, name: true } } },
      });
      for (const item of enrollments) {
        if (item.student) recipientMap.set(item.student.id, item.student);
      }
    } else if (liveClass.courseId) {
      const courseEnrollments = await prisma.enrollment.findMany({
        where: { courseId: liveClass.courseId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      for (const item of courseEnrollments) {
        if (item.user) recipientMap.set(item.user.id, item.user);
      }
    }

    const courseTitle = liveClass.course?.title || 'Interactive Course';
    const mentorName = liveClass.instructor?.name || req.user.name || 'Mentor';
    const classTime = new Date(liveClass.startTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    for (const student of Array.from(recipientMap.values())) {
      await prisma.notification.create({
        data: {
          userId: student.id,
          title: `Live Class Cancelled: ${liveClass.title}`,
          message: `The live session "${liveClass.title}" scheduled for ${classTime} has been cancelled.`,
          type: 'COURSE',
          link: `/live-classes`,
        },
      }).catch(() => {});

      const emailData = emailTemplates.liveClassNotification({
        studentName: student.name || 'Student',
        courseTitle,
        classTitle: liveClass.title,
        startTime: classTime,
        durationMins: liveClass.duration || 60,
        mentorName,
        isReschedule: false,
        isCancelled: true,
      });

      sendEmail({
        to: student.email,
        subject: emailData.subject,
        html: emailData.html,
      }).catch((err) => {
        console.warn(`[LiveClass Cancel Email Failed]`, err?.message || err);
      });
    }

    res.json({
      success: true,
      message: `Live class "${liveClass.title}" has been cancelled.`,
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/mentor/attendance/:classId - View attendance register for a session
 */
export const getClassAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const classId = String(req.params.classId);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const liveClass = await prisma.liveClass.findUnique({
      where: { id: classId },
      include: {
        course: true,
        batch: true,
        attendanceRegister: {
          include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    if (!liveClass) throw new AppError('Class session not found', 404);

    if (liveClass.courseId && !scope.courseIds.includes(liveClass.courseId) && !scope.isAdmin) {
      throw new AppError('Unauthorized to access this class register', 403);
    }

    let eligibleStudents: any[] = [];
    if (liveClass.batchId) {
      const enrollments = await prisma.batchEnrollment.findMany({
        where: { batchId: liveClass.batchId, isActive: true },
        include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      eligibleStudents = enrollments.map((e) => e.student);
    } else if (liveClass.courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: liveClass.courseId },
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      });
      eligibleStudents = enrollments.map((e) => e.user);
    }

    const attendanceMap = new Map();
    liveClass.attendanceRegister.forEach((record: any) => {
      attendanceMap.set(record.studentId, record);
    });

    const roster = eligibleStudents.map((s) => ({
      studentId: s.id,
      name: s.name,
      email: s.email,
      avatarUrl: s.avatarUrl,
      recordId: attendanceMap.get(s.id)?.id || null,
      status: attendanceMap.get(s.id)?.status || 'ABSENT',
      remarks: attendanceMap.get(s.id)?.remarks || null,
      markedAt: attendanceMap.get(s.id)?.markedAt || null,
    }));

    res.json({
      success: true,
      data: {
        classSession: liveClass,
        roster,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. POST /api/mentor/attendance/:classId - Save/finalize attendance records
 */
export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const classId = String(req.params.classId);
    const { records } = req.body;

    if (!Array.isArray(records)) {
      throw new AppError('Records must be an array of student attendance items', 400);
    }

    const liveClass = await prisma.liveClass.findUnique({ where: { id: classId } });
    if (!liveClass) throw new AppError('Class session not found', 404);

    await prisma.$transaction(
      records.map((item: any) =>
        prisma.attendanceRecord.upsert({
          where: {
            liveClassId_studentId: {
              liveClassId: classId,
              studentId: String(item.studentId),
            },
          },
          update: {
            status: item.status,
            remarks: item.remarks ? String(item.remarks) : null,
          },
          create: {
            liveClassId: classId,
            studentId: String(item.studentId),
            status: item.status,
            remarks: item.remarks ? String(item.remarks) : null,
          },
        })
      )
    );

    if (liveClass.status !== 'COMPLETED') {
      await prisma.liveClass.update({
        where: { id: classId },
        data: { status: 'COMPLETED' },
      });
    }

    res.json({ success: true, message: 'Attendance register saved successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. GET /api/mentor/materials - List learning materials uploaded or assigned
 */
export const getMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const materials = await prisma.learningMaterial.findMany({
      where: {
        OR: [
          { courseId: { in: scope.courseIds } },
          { internshipId: { in: scope.internshipIds } },
          { uploaderId: req.user.id },
        ],
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. POST /api/mentor/materials - Upload/share learning material
 */
export const createMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const {
      title,
      description,
      fileUrl,
      type,
      price,
      discountPrice,
      isFree,
      thumbnailUrl,
      category,
      courseId,
      batchId,
      internshipId,
      module,
      isPublished,
    } = req.body;
    if (!title || !fileUrl || (!courseId && !internshipId)) {
      throw new AppError('Title, fileUrl, and either courseId or internshipId are required', 400);
    }

    if (courseId && !scope.courseIds.includes(String(courseId)) && !scope.isAdmin) {
      throw new AppError('Unauthorized to publish materials for this course', 403);
    }
    if (internshipId && !scope.internshipIds.includes(String(internshipId)) && !scope.isAdmin) {
      throw new AppError('Unauthorized to publish materials for this internship', 403);
    }

    const materialPrice = isFree !== undefined && !isFree ? Number(price || 0) : 0;
    const materialIsFree = isFree !== undefined ? Boolean(isFree) : (materialPrice === 0);

    const material = await prisma.learningMaterial.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        fileUrl: String(fileUrl),
        type: type || 'PDF',
        price: materialPrice,
        discountPrice: discountPrice ? Number(discountPrice) : null,
        isFree: materialIsFree,
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
        category: category || 'Development',
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
        courseId: courseId ? String(courseId) : null,
        batchId: batchId ? String(batchId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        module: module ? String(module) : null,
        uploaderId: req.user.id,
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true } },
      },
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. GET /api/mentor/assignments - List assignments and submissions
 */
export const getMentorAssignments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { courseId: { in: scope.courseIds } },
          { internshipId: { in: scope.internshipIds } },
        ],
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true, organization: true } },
        submissions: {
          include: {
            student: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. POST /api/mentor/assignments - Create a new assignment
 */
export const createAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const {
      title,
      description,
      instructions,
      module,
      fileUrl,
      dueDate,
      totalPoints,
      courseId,
      batchId,
      internshipId,
      isPublished,
    } = req.body;

    if (!title || (!courseId && !internshipId)) {
      throw new AppError('Assignment title and either courseId or internshipId are required', 400);
    }

    if (courseId && !scope.courseIds.includes(String(courseId)) && !scope.isAdmin) {
      throw new AppError('Unauthorized to add assignments to this course', 403);
    }
    if (internshipId && !scope.internshipIds.includes(String(internshipId)) && !scope.isAdmin) {
      throw new AppError('Unauthorized to add assignments to this internship', 403);
    }

    const assignment = await prisma.assignment.create({
      data: {
        title: String(title),
        description: description ? String(description) : '',
        instructions: instructions ? String(instructions) : null,
        module: module ? String(module) : null,
        fileUrl: fileUrl ? String(fileUrl) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        totalPoints: Number(totalPoints) || 100,
        courseId: courseId ? String(courseId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        batchId: batchId ? String(batchId) : null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true } },
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
};

/**
 * 14b. PATCH /api/mentor/assignments/:id - Update assignment details
 */
export const updateAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Assignment not found', 404);

    if (existing.courseId && !scope.courseIds.includes(existing.courseId) && !scope.isAdmin) {
      throw new AppError('Unauthorized to edit this assignment', 403);
    }
    if (existing.internshipId && !scope.internshipIds.includes(existing.internshipId) && !scope.isAdmin) {
      throw new AppError('Unauthorized to edit this assignment', 403);
    }

    const { title, description, instructions, module, fileUrl, dueDate, totalPoints, isPublished } = req.body;

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        ...(title ? { title: String(title) } : {}),
        ...(description !== undefined ? { description: String(description) } : {}),
        ...(instructions !== undefined ? { instructions: instructions ? String(instructions) : null } : {}),
        ...(module !== undefined ? { module: module ? String(module) : null } : {}),
        ...(fileUrl !== undefined ? { fileUrl: fileUrl ? String(fileUrl) : null } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(totalPoints !== undefined ? { totalPoints: Number(totalPoints) } : {}),
        ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        internship: { select: { id: true, title: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * 14c. DELETE /api/mentor/assignments/:id - Delete assignment
 */
export const deleteAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const existing = await prisma.assignment.findUnique({ where: { id } });
    if (!existing) throw new AppError('Assignment not found', 404);

    if (existing.courseId && !scope.courseIds.includes(existing.courseId) && !scope.isAdmin) {
      throw new AppError('Unauthorized to delete this assignment', 403);
    }
    if (existing.internshipId && !scope.internshipIds.includes(existing.internshipId) && !scope.isAdmin) {
      throw new AppError('Unauthorized to delete this assignment', 403);
    }

    await prisma.assignment.delete({ where: { id } });
    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. PATCH /api/mentor/submissions/:submissionId/grade - Review and grade submission
 */
export const gradeSubmission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const submissionId = String(req.params.submissionId);
    const { grade, feedback, status } = req.body;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: true,
        student: { select: { id: true, email: true, name: true } },
      },
    });

    if (!submission) throw new AppError('Submission not found', 404);

    const effectiveStatus = status === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : (grade !== undefined && grade !== null ? 'GRADED' : 'UNDER_REVIEW');
    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: grade !== undefined && grade !== null ? Number(grade) : undefined,
        feedback: feedback ? String(feedback) : null,
        status: effectiveStatus,
        gradedAt: effectiveStatus === 'GRADED' ? new Date() : null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: submission.studentId,
        title: `Assignment Graded: ${submission.assignment.title}`,
        message: `Your work received ${grade}/${submission.assignment.totalPoints} points.`,
        type: 'COURSE',
        link: `/assignments`,
      },
    });

    // Send assignment graded email to student
    try {
      if (submission.student?.email) {
        const emailData = emailTemplates.assignmentUpdate({
          studentName: submission.student.name,
          courseTitle: 'Your Enrolled Course',
          assignmentTitle: submission.assignment.title,
          score: Number(grade),
          totalPoints: submission.assignment.totalPoints,
          feedback: feedback ? String(feedback) : null,
        });

        sendEmail({
          to: submission.student.email,
          subject: emailData.subject,
          html: emailData.html,
          templateCode: 'ASSIGNMENT_GRADED',
          idempotencyKey: `grade_${submission.id}_${Date.now()}`,
        }).catch(console.error);
      }
    } catch (eErr) {
      console.error('[Assignment Graded Email Error]:', eErr);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * 16. GET /api/mentor/assessments - Tests and evaluations
 */
export const getAssessments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const assessments = await prisma.assessment.findMany({
      where: { courseId: { in: scope.courseIds } },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
        questions: true,
        submissions: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: assessments });
  } catch (error) {
    next(error);
  }
};

/**
 * 17. POST /api/mentor/assessments - Create an assessment
 */
export const createAssessment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const { title, description, courseId, batchId, durationMins, totalMarks, passingMarks, questions } = req.body;
    if (!title || !courseId) {
      throw new AppError('Title and courseId are required', 400);
    }

    if (!scope.courseIds.includes(String(courseId)) && !scope.isAdmin) {
      throw new AppError('Unauthorized to create assessments for this course', 403);
    }

    const assessment = await prisma.assessment.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        courseId: String(courseId),
        batchId: batchId ? String(batchId) : null,
        durationMins: Number(durationMins) || 45,
        totalMarks: Number(totalMarks) || 100,
        passingMarks: Number(passingMarks) || 40,
        questions: {
          create: (questions || []).map((q: any, idx: number) => ({
            questionText: String(q.questionText),
            questionType: q.questionType || 'MCQ',
            optionsJson: q.options ? JSON.stringify(q.options) : null,
            correctOpt: q.correctOpt ? String(q.correctOpt) : null,
            marks: Number(q.marks) || 10,
            order: idx + 1,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ success: true, data: assessment });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. POST /api/mentor/announcements - Post course/cohort announcement
 */
export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { title, message, batchId } = req.body;

    if (!title || !message) {
      throw new AppError('Title and message are required', 400);
    }

    const announcement = await prisma.mentorAnnouncement.create({
      data: {
        title: String(title),
        message: String(message),
        authorId: req.user.id,
        batchId: batchId ? String(batchId) : null,
      },
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(error);
  }
};

/**
 * 19. GET /api/mentor/announcements - Get announcements
 */
export const getAnnouncements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const scope = await getMentorScope(req.user.id, req.user.role);

    const announcements = await prisma.mentorAnnouncement.findMany({
      where: {
        OR: [
          { authorId: req.user.id },
          { batchId: { in: scope.batchIds } },
        ],
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        batch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
};
