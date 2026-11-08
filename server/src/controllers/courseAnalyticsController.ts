import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';

/**
 * 1. GET /api/admin/course-analytics/overview
 * Platform-wide comprehensive analytics for Admin Dashboard KPIs
 */
export const getAdminComprehensiveAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Platform & User counts
    const [
      totalUsers,
      totalStudents,
      activeStudents,
      totalMentors,
      totalCourses,
      publishedCourses,
      totalBatches,
      totalLiveClasses,
      totalHackathons,
      totalInternships,
      totalCertificates,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'STUDENT', isVerified: true } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.batch.count(),
      prisma.liveClass.count(),
      prisma.hackathon.count(),
      prisma.internship.count(),
      prisma.certificate.count(),
    ]);

    // 2. Enrollment statistics
    const [
      totalEnrollments,
      completedEnrollments,
      enrolledToday,
      enrolledThisMonth,
    ] = await Promise.all([
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { completedAt: { not: null } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: startOfToday } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: startOfMonth } } }),
    ]);

    const activeEnrollments = totalEnrollments - completedEnrollments;

    // 3. Payment & Revenue statistics (from verified database records)
    const [
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true, discountAmount: true, originalAmount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'FAILED' },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const netCollectedRevenue = Number(completedPayments._sum.amount || 0);
    const totalDiscounts = Number(completedPayments._sum.discountAmount || 0);
    const totalRefundedAmount = Number(refundedPayments._sum.amount || 0);
    const pendingPaymentsCount = pendingPayments._count.id;
    const failedPaymentsCount = failedPayments._count.id;
    const completedPaymentsCount = completedPayments._count.id;

    // 4. Learning & Academic statistics
    const [
      avgProgressAgg,
      highProgressCount,
      lowProgressCount,
      totalAssignments,
      submittedAssignments,
      gradedAssignments,
      totalLiveAttendances,
      presentAttendances,
    ] = await Promise.all([
      prisma.enrollment.aggregate({
        _avg: { progress: true },
      }),
      prisma.enrollment.count({ where: { progress: { gte: 75 } } }),
      prisma.enrollment.count({ where: { progress: { lt: 25 } } }),
      prisma.assignment.count(),
      prisma.assignmentSubmission.count(),
      prisma.assignmentSubmission.count({ where: { status: 'GRADED' } }),
      prisma.attendanceRecord.count(),
      prisma.attendanceRecord.count({ where: { status: 'PRESENT' } }),
    ]);

    const avgCourseCompletion = Math.round(avgProgressAgg._avg.progress || 0);
    const submissionRate = totalAssignments > 0
      ? Math.round((submittedAssignments / (totalAssignments * (totalStudents || 1))) * 100)
      : 0;
    const assignmentCompletionRate = submittedAssignments > 0
      ? Math.round((gradedAssignments / submittedAssignments) * 100)
      : 0;
    const liveAttendanceRate = totalLiveAttendances > 0
      ? Math.round((presentAttendances / totalLiveAttendances) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        platform: {
          totalUsers,
          totalStudents,
          activeStudents,
          totalMentors,
          totalCourses,
          publishedCourses,
          totalBatches,
          totalLiveClasses,
          totalHackathons,
          totalInternships,
          totalCertificates,
        },
        enrollments: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          pendingEnrollments: 0,
          enrolledToday,
          enrolledThisMonth,
        },
        payments: {
          netCollectedRevenue,
          verifiedPaymentsCount: completedPaymentsCount,
          pendingPaymentsCount,
          failedPaymentsCount,
          refundedCount: refundedPayments._count.id,
          refundedAmount: totalRefundedAmount,
          totalDiscounts,
          totalCourseRevenue: netCollectedRevenue + totalRefundedAmount,
        },
        learning: {
          avgCourseCompletion,
          studentsCompleted: completedEnrollments,
          studentsHighProgress: highProgressCount,
          studentsLowProgress: lowProgressCount,
          submissionRate,
          assignmentCompletionRate,
          liveAttendanceRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/admin/course-analytics/courses
 * List all courses with aggregated enrolled students, mentor, batch, and verified revenue
 */
export const getAdminCourseAnalyticsList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, category, status } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (category && category !== 'ALL') {
      where.category = { name: String(category) };
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentorAssignments: {
          include: {
            mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        },
        batches: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            maxStudents: true,
            _count: { select: { enrollments: true } },
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
            assignments: true,
            liveClasses: true,
            certificates: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = courses.map((c) => c.id);

    // Aggregate completed payments and active completions for these courses
    const [paymentsAgg, completedEnrollmentsAgg] = await Promise.all([
      prisma.payment.groupBy({
        by: ['courseId'],
        where: {
          courseId: { in: courseIds },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.enrollment.groupBy({
        by: ['courseId'],
        where: {
          courseId: { in: courseIds },
          completedAt: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const revenueMap = new Map<string, number>();
    for (const p of paymentsAgg) {
      if (p.courseId) revenueMap.set(p.courseId, Number(p._sum.amount || 0));
    }

    const completedMap = new Map<string, number>();
    for (const c of completedEnrollmentsAgg) {
      if (c.courseId) completedMap.set(c.courseId, c._count.id);
    }

    const enrichedCourses = courses.map((c) => {
      const totalEnrolled = c._count.enrollments;
      const completedCount = completedMap.get(c.id) || 0;
      const activeCount = Math.max(0, totalEnrolled - completedCount);
      const verifiedRevenue = revenueMap.get(c.id) || 0;

      // Extract unique mentors
      const mentors = c.mentorAssignments.map((a) => a.mentor).filter(Boolean);
      const primaryMentor = mentors[0] || (c.instructor ? { id: c.instructor.id, name: c.instructor.name, email: c.instructor.email } : null);

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        category: c.category?.name || 'Development',
        level: c.level,
        price: Number(c.price),
        discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
        status: c.status,
        thumbnailUrl: c.thumbnailUrl,
        totalEnrolled,
        activeStudents: activeCount,
        completedStudents: completedCount,
        verifiedRevenue,
        primaryMentor,
        mentorCount: mentors.length,
        batches: c.batches,
        lessonsCount: c._count.modules,
        assignmentsCount: c._count.assignments,
        certificatesCount: c._count.certificates,
      };
    });

    res.json({
      success: true,
      data: enrichedCourses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/admin/courses/:courseId/analytics
 * In-depth analytics for a single selected course
 */
export const getAdminSingleCourseAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: { select: { id: true, name: true } },
        instructor: { select: { id: true, name: true, email: true } },
        mentorAssignments: {
          include: {
            mentor: { select: { id: true, name: true, email: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        },
        batches: {
          include: {
            _count: { select: { enrollments: true } },
          },
        },
        _count: {
          select: {
            modules: true,
            assignments: true,
            liveClasses: true,
            enrollments: true,
            certificates: true,
          },
        },
      },
    });

    if (!course) throw new AppError('Course not found', 404);

    // 1. Payment Breakdown
    const [completedPayments, pendingPayments, failedPayments, refundedPayments] = await Promise.all([
      prisma.payment.aggregate({
        where: { courseId, status: 'COMPLETED' },
        _sum: { amount: true, discountAmount: true, originalAmount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { courseId, status: 'PENDING' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { courseId, status: 'FAILED' },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: { courseId, status: 'REFUNDED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const verifiedRevenue = Number(completedPayments._sum.amount || 0);
    const totalDiscounts = Number(completedPayments._sum.discountAmount || 0);
    const refundedRevenue = Number(refundedPayments._sum.amount || 0);
    const netRevenue = verifiedRevenue;

    // 2. Student Progress Distribution
    const [
      progressAgg,
      completedEnrollments,
      highProgressCount,
      midProgressCount,
      lowProgressCount,
      zeroProgressCount,
    ] = await Promise.all([
      prisma.enrollment.aggregate({
        where: { courseId },
        _avg: { progress: true },
      }),
      prisma.enrollment.count({ where: { courseId, completedAt: { not: null } } }),
      prisma.enrollment.count({ where: { courseId, progress: { gte: 75 } } }),
      prisma.enrollment.count({ where: { courseId, progress: { gte: 25, lt: 75 } } }),
      prisma.enrollment.count({ where: { courseId, progress: { gt: 0, lt: 25 } } }),
      prisma.enrollment.count({ where: { courseId, progress: 0 } }),
    ]);

    const totalEnrolled = course._count.enrollments;
    const avgProgress = Math.round(progressAgg._avg.progress || 0);

    // 3. Assignment Stats
    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } },
        submissions: { select: { grade: true, status: true } },
      },
    });

    const totalSubmissions = assignments.reduce((sum, a) => sum + a._count.submissions, 0);
    const gradedSubmissions = assignments.reduce((sum, a) => sum + a.submissions.filter((s) => s.status === 'GRADED').length, 0);
    const pendingSubmissions = totalSubmissions - gradedSubmissions;

    const gradesList = assignments.flatMap((a) => a.submissions.map((s) => s.grade).filter((g): g is number => typeof g === 'number'));
    const avgScore = gradesList.length > 0 ? Math.round(gradesList.reduce((a, b) => a + b, 0) / gradesList.length) : 0;

    // 4. Live Class Attendance Stats
    const liveClasses = await prisma.liveClass.findMany({
      where: { courseId },
      include: {
        _count: { select: { attendees: true, registrations: true } },
      },
    });

    const totalLiveClasses = liveClasses.length;
    const totalAttendances = liveClasses.reduce((sum, l) => sum + l._count.attendees, 0);
    const avgAttendance = totalLiveClasses > 0 ? Math.round(totalAttendances / totalLiveClasses) : 0;

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category?.name,
          level: course.level,
          price: Number(course.price),
          discountPrice: course.discountPrice ? Number(course.discountPrice) : null,
          status: course.status,
          instructor: course.instructor,
          mentorAssignments: course.mentorAssignments,
          batches: course.batches,
        },
        enrollmentStats: {
          totalEnrolled,
          activeStudents: Math.max(0, totalEnrolled - completedEnrollments),
          completedStudents: completedEnrollments,
          droppedStudents: 0,
        },
        revenueStats: {
          totalCourseSales: verifiedRevenue + refundedRevenue,
          verifiedPayments: completedPayments._count.id,
          verifiedRevenue,
          pendingPayments: pendingPayments._count.id,
          pendingRevenue: Number(pendingPayments._sum.amount || 0),
          failedPayments: failedPayments._count.id,
          refunds: refundedPayments._count.id,
          refundedRevenue,
          discounts: totalDiscounts,
          netRevenue,
        },
        progressStats: {
          avgCompletion: avgProgress,
          above75: highProgressCount,
          between25And75: midProgressCount,
          below25: lowProgressCount,
          notStarted: zeroProgressCount,
        },
        assignmentStats: {
          totalAssignments: course._count.assignments,
          totalSubmissions,
          pendingSubmissions,
          evaluatedSubmissions: gradedSubmissions,
          avgScore,
        },
        attendanceStats: {
          totalLiveClasses,
          totalAttendances,
          avgAttendancePerClass: avgAttendance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/admin/courses/:courseId/students
 * Course-wise student directory with pagination, search, filters, learning progress, payment status, and attendance
 */
export const getAdminCourseStudentsDirectory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);
    const {
      search,
      batchId,
      mentorId,
      paymentStatus, // PAID, PENDING, REFUNDED, ALL
      enrollmentStatus, // ACTIVE, COMPLETED, ALL
      certificateStatus, // ISSUED, NOT_ISSUED, ALL
      page = '1',
      limit = '15',
      sortBy = 'enrolledAt', // enrolledAt, name, progress, paidAmount
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, price: true, discountPrice: true },
    });
    if (!course) throw new AppError('Course not found', 404);

    const nominalCoursePrice = Number(course.discountPrice || course.price);

    // Build enrollment user filter
    const userWhere: any = {};
    if (search) {
      const q = String(search).trim();
      userWhere.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const enrollmentWhere: any = {
      courseId,
      user: userWhere,
    };

    if (enrollmentStatus === 'COMPLETED') {
      enrollmentWhere.completedAt = { not: null };
    } else if (enrollmentStatus === 'ACTIVE') {
      enrollmentWhere.completedAt = null;
    }

    if (batchId && batchId !== 'ALL') {
      enrollmentWhere.user.batchEnrollments = {
        some: { batchId: String(batchId) },
      };
    }

    // Total matching candidate enrollments
    const totalEnrollments = await prisma.enrollment.count({ where: enrollmentWhere });

    // Fetch enrollments with related user data
    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true,
            batchEnrollments: {
              where: { batch: { courseId } },
              include: {
                batch: {
                  include: {
                    mentorAssignments: {
                      include: {
                        mentor: { select: { id: true, name: true, email: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { [String(sortBy) === 'name' ? 'userId' : 'enrolledAt']: sortOrder === 'asc' ? 'asc' : 'desc' },
    });

    const studentIds = enrollments.map((e) => e.userId);

    // Bulk query related data to avoid N+1 queries
    const [payments, certificates, assignmentsCount, submissions, liveClassesCount, attendances] = await Promise.all([
      prisma.payment.findMany({
        where: { courseId, userId: { in: studentIds } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: { courseId, userId: { in: studentIds } },
      }),
      prisma.assignment.count({ where: { courseId } }),
      prisma.assignmentSubmission.findMany({
        where: {
          assignment: { courseId },
          studentId: { in: studentIds },
        },
        select: { studentId: true, grade: true, status: true },
      }),
      prisma.liveClass.count({ where: { courseId } }),
      prisma.attendanceRecord.findMany({
        where: {
          liveClass: { courseId },
          studentId: { in: studentIds },
        },
        select: { studentId: true, status: true },
      }),
    ]);

    // Map bulk data by studentId
    const paymentsByUser = new Map<string, any[]>();
    for (const p of payments) {
      const list = paymentsByUser.get(p.userId) || [];
      list.push(p);
      paymentsByUser.set(p.userId, list);
    }

    const certByUser = new Map<string, any>();
    for (const c of certificates) {
      certByUser.set(c.userId, c);
    }

    const submissionsByUser = new Map<string, any[]>();
    for (const s of submissions) {
      const list = submissionsByUser.get(s.studentId) || [];
      list.push(s);
      submissionsByUser.set(s.studentId, list);
    }

    const attendancesByUser = new Map<string, any[]>();
    for (const a of attendances) {
      const list = attendancesByUser.get(a.studentId) || [];
      list.push(a);
      attendancesByUser.set(a.studentId, list);
    }

    // Compile student directory records
    let students = enrollments.map((enr) => {
      const u = enr.user;
      const userPayments = paymentsByUser.get(u.id) || [];
      const completedPayments = userPayments.filter((p) => p.status === 'COMPLETED');
      const refunded = userPayments.some((p) => p.status === 'REFUNDED');
      const verifiedPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      let calcPaymentStatus = 'PENDING';
      if (refunded) calcPaymentStatus = 'REFUNDED';
      else if (verifiedPaid >= nominalCoursePrice && nominalCoursePrice > 0) calcPaymentStatus = 'PAID';
      else if (verifiedPaid > 0) calcPaymentStatus = 'PARTIAL';
      else if (nominalCoursePrice === 0) calcPaymentStatus = 'PAID';

      const cert = certByUser.get(u.id);
      const studentSubmissions = submissionsByUser.get(u.id) || [];
      const studentAttendances = attendancesByUser.get(u.id) || [];
      const presentCount = studentAttendances.filter((a) => a.status === 'PRESENT').length;

      const attendancePct = liveClassesCount > 0 ? Math.round((presentCount / liveClassesCount) * 100) : 100;

      // Extract batch and mentor
      const batchEnrollment = u.batchEnrollments?.[0];
      const batch = batchEnrollment?.batch || null;
      const mentor = batch?.mentorAssignments?.[0]?.mentor || null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'Not Available',
        avatarUrl: u.avatarUrl,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
        progress: enr.progress,
        enrollmentStatus: enr.completedAt ? 'COMPLETED' : 'ACTIVE',
        batch: batch ? { id: batch.id, name: batch.name, code: batch.code } : null,
        mentor: mentor ? { id: mentor.id, name: mentor.name, email: mentor.email } : null,
        paymentStatus: calcPaymentStatus,
        amountPaid: verifiedPaid,
        attendancePct,
        attendedClasses: presentCount,
        totalClasses: liveClassesCount,
        submittedAssignments: studentSubmissions.length,
        totalAssignments: assignmentsCount,
        certificate: cert ? { id: cert.id, certificateNo: cert.certificateNo, issuedAt: cert.issuedAt } : null,
      };
    });

    // Apply in-memory filters for computed payment / cert / mentor fields if specified
    if (paymentStatus && paymentStatus !== 'ALL') {
      students = students.filter((s) => s.paymentStatus === paymentStatus);
    }
    if (certificateStatus === 'ISSUED') {
      students = students.filter((s) => s.certificate !== null);
    } else if (certificateStatus === 'NOT_ISSUED') {
      students = students.filter((s) => s.certificate === null);
    }
    if (mentorId && mentorId !== 'ALL') {
      students = students.filter((s) => s.mentor?.id === mentorId);
    }

    // Apply sorting
    if (sortBy === 'progress') {
      students.sort((a, b) => sortOrder === 'asc' ? a.progress - b.progress : b.progress - a.progress);
    } else if (sortBy === 'paidAmount') {
      students.sort((a, b) => sortOrder === 'asc' ? a.amountPaid - b.amountPaid : b.amountPaid - a.amountPaid);
    } else if (sortBy === 'attendance') {
      students.sort((a, b) => sortOrder === 'asc' ? a.attendancePct - b.attendancePct : b.attendancePct - a.attendancePct);
    } else if (sortBy === 'name') {
      students.sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
    }

    const totalFiltered = students.length;
    const startIndex = (pageNum - 1) * pageSize;
    const paginatedStudents = students.slice(startIndex, startIndex + pageSize);

    res.json({
      success: true,
      data: {
        students: paginatedStudents,
        pagination: {
          total: totalFiltered,
          page: pageNum,
          limit: pageSize,
          totalPages: Math.ceil(totalFiltered / pageSize) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/admin/courses/:courseId/students/:studentId
 * Complete 360-degree student profile for selected course
 */
export const getAdminStudentCourseDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);
    const studentId = String(req.params.studentId);

    const [user, course, enrollment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        include: {
          batchEnrollments: {
            where: { batch: { courseId } },
            include: {
              batch: {
                include: {
                  mentorAssignments: {
                    include: { mentor: { select: { id: true, name: true, email: true, phone: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        include: {
          category: { select: { name: true } },
          mentorAssignments: {
            include: { mentor: { select: { id: true, name: true, email: true } } },
          },
          modules: {
            include: {
              lessons: { select: { id: true, title: true, duration: true } },
            },
          },
        },
      }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: studentId, courseId } },
      }),
    ]);

    if (!user) throw new AppError('Student user not found', 404);
    if (!course) throw new AppError('Course not found', 404);

    const nominalPrice = Number(course.discountPrice || course.price);

    // Query all related details
    const [payments, certificate, lessonProgress, submissions, attendanceRecords, liveClasses] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: studentId, courseId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.certificate.findUnique({
        where: { userId_courseId: { userId: studentId, courseId } },
      }),
      prisma.lessonProgress.findMany({
        where: {
          userId: studentId,
          lesson: { module: { courseId } },
        },
        include: { lesson: { select: { id: true, title: true } } },
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignment: { courseId },
        },
        include: { assignment: { select: { id: true, title: true, totalPoints: true, dueDate: true } } },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          studentId,
          liveClass: { courseId },
        },
        include: { liveClass: { select: { id: true, title: true, startTime: true } } },
        orderBy: { markedAt: 'desc' },
      }),
      prisma.liveClass.findMany({
        where: { courseId },
        select: { id: true, title: true, startTime: true },
      }),
    ]);

    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = lessonProgress.filter((p) => p.isCompleted).length;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : (enrollment?.progress || 0);

    const verifiedPaid = payments.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDiscounts = payments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
    const primaryPayment = payments[0] || null;

    const totalClasses = liveClasses.length;
    const attendedClasses = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendancePct = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

    const assignedBatch = user.batchEnrollments?.[0]?.batch || null;
    const assignedMentor = assignedBatch?.mentorAssignments?.[0]?.mentor || course.mentorAssignments?.[0]?.mentor || null;

    res.json({
      success: true,
      data: {
        student: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || 'Not Available',
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
          college: user.college || 'Not Available',
        },
        course: {
          id: course.id,
          title: course.title,
          category: course.category?.name,
          level: course.level,
          price: nominalPrice,
          assignedBatch: assignedBatch ? { id: assignedBatch.id, name: assignedBatch.name, code: assignedBatch.code } : null,
          assignedMentor: assignedMentor ? { id: assignedMentor.id, name: assignedMentor.name, email: assignedMentor.email } : null,
          enrolledAt: enrollment?.enrolledAt || user.createdAt,
          completedAt: enrollment?.completedAt || null,
          progress: progressPct,
        },
        payment: {
          price: nominalPrice,
          amountPaid: verifiedPaid,
          discountAmount: totalDiscounts,
          couponCode: primaryPayment?.couponCode || null,
          status: verifiedPaid >= nominalPrice && nominalPrice > 0 ? 'PAID' : primaryPayment?.status || 'UNPAID',
          paymentDate: primaryPayment?.createdAt || null,
          paymentId: primaryPayment?.razorpayPaymentId || primaryPayment?.id || null,
          orderId: primaryPayment?.razorpayOrderId || null,
          refundStatus: payments.some((p) => p.status === 'REFUNDED') ? 'REFUNDED' : 'NONE',
          history: payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            status: p.status,
            date: p.createdAt,
            method: p.paymentMethod,
          })),
        },
        learning: {
          totalLessons,
          completedLessons,
          pendingLessons: Math.max(0, totalLessons - completedLessons),
          progressPercentage: progressPct,
          recentProgress: lessonProgress.slice(0, 5).map((lp) => ({
            lessonId: lp.lessonId,
            title: lp.lesson.title,
            completedAt: lp.completedAt,
          })),
        },
        attendance: {
          totalClasses,
          attendedClasses,
          absentClasses: Math.max(0, totalClasses - attendedClasses),
          attendancePercentage: attendancePct,
          records: attendanceRecords.map((ar) => ({
            id: ar.id,
            title: ar.liveClass.title,
            status: ar.status,
            date: ar.markedAt,
          })),
        },
        assignments: {
          totalSubmissions: submissions.length,
          submissions: submissions.map((s) => ({
            id: s.id,
            assignmentTitle: s.assignment.title,
            grade: s.grade,
            status: s.status,
            submittedAt: s.submittedAt,
            feedback: s.feedback,
          })),
        },
        certificate: certificate ? {
          id: certificate.id,
          certificateNo: certificate.certificateNo,
          issuedAt: certificate.issuedAt,
          pdfUrl: certificate.pdfUrl,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/admin/courses/:courseId/export
 * Secure CSV Export of Course Enrolled Students
 */
export const exportCourseStudentsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);
    const { search, batchId, paymentStatus, enrollmentStatus, certificateStatus } = req.query;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, price: true, discountPrice: true },
    });
    if (!course) throw new AppError('Course not found', 404);

    const nominalPrice = Number(course.discountPrice || course.price);

    const userWhere: any = {};
    if (search) {
      const q = String(search).trim();
      userWhere.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const enrollmentWhere: any = {
      courseId,
      user: userWhere,
    };

    if (enrollmentStatus === 'COMPLETED') {
      enrollmentWhere.completedAt = { not: null };
    } else if (enrollmentStatus === 'ACTIVE') {
      enrollmentWhere.completedAt = null;
    }

    if (batchId && batchId !== 'ALL') {
      enrollmentWhere.user.batchEnrollments = {
        some: { batchId: String(batchId) },
      };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            batchEnrollments: {
              where: { batch: { courseId } },
              include: {
                batch: {
                  include: {
                    mentorAssignments: {
                      include: { mentor: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const studentIds = enrollments.map((e) => e.userId);

    const [payments, certificates, liveClassesCount, attendances, assignmentsCount, submissions] = await Promise.all([
      prisma.payment.findMany({
        where: { courseId, userId: { in: studentIds }, status: 'COMPLETED' },
        select: { userId: true, amount: true },
      }),
      prisma.certificate.findMany({
        where: { courseId, userId: { in: studentIds } },
        select: { userId: true, certificateNo: true },
      }),
      prisma.liveClass.count({ where: { courseId } }),
      prisma.attendanceRecord.findMany({
        where: { liveClass: { courseId }, studentId: { in: studentIds }, status: 'PRESENT' },
        select: { studentId: true },
      }),
      prisma.assignment.count({ where: { courseId } }),
      prisma.assignmentSubmission.findMany({
        where: { assignment: { courseId }, studentId: { in: studentIds } },
        select: { studentId: true },
      }),
    ]);

    const paymentsMap = new Map<string, number>();
    for (const p of payments) {
      paymentsMap.set(p.userId, (paymentsMap.get(p.userId) || 0) + Number(p.amount));
    }

    const certsMap = new Map<string, string>();
    for (const c of certificates) {
      certsMap.set(c.userId, c.certificateNo);
    }

    const attendanceCountMap = new Map<string, number>();
    for (const a of attendances) {
      attendanceCountMap.set(a.studentId, (attendanceCountMap.get(a.studentId) || 0) + 1);
    }

    const submissionCountMap = new Map<string, number>();
    for (const s of submissions) {
      submissionCountMap.set(s.studentId, (submissionCountMap.get(s.studentId) || 0) + 1);
    }

    const rows = enrollments.map((enr) => {
      const u = enr.user;
      const paid = paymentsMap.get(u.id) || 0;
      let pStatus = 'PENDING';
      if (paid >= nominalPrice && nominalPrice > 0) pStatus = 'PAID';
      else if (paid > 0) pStatus = 'PARTIAL';
      else if (nominalPrice === 0) pStatus = 'PAID';

      const certNo = certsMap.get(u.id) || 'NOT_ISSUED';
      const attended = attendanceCountMap.get(u.id) || 0;
      const attRate = liveClassesCount > 0 ? `${Math.round((attended / liveClassesCount) * 100)}%` : '100%';
      const submitted = submissionCountMap.get(u.id) || 0;

      const batchName = u.batchEnrollments?.[0]?.batch?.name || 'Unassigned';
      const mentorName = u.batchEnrollments?.[0]?.batch?.mentorAssignments?.[0]?.mentor?.name || 'Unassigned';

      return {
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        course: course.title,
        batch: batchName,
        mentor: mentorName,
        enrolledAt: enr.enrolledAt.toISOString().split('T')[0],
        paymentStatus: pStatus,
        amountPaid: paid,
        progress: `${enr.progress}%`,
        attendance: attRate,
        assignments: `${submitted}/${assignmentsCount}`,
        certificate: certNo,
      };
    });

    // Generate CSV
    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'Course',
      'Batch',
      'Mentor',
      'Enrollment Date',
      'Payment Status',
      'Amount Paid (INR)',
      'Course Progress',
      'Attendance',
      'Assignments Submitted',
      'Certificate No',
    ];

    const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => [
        escapeCsv(r.name),
        escapeCsv(r.email),
        escapeCsv(r.phone),
        escapeCsv(r.course),
        escapeCsv(r.batch),
        escapeCsv(r.mentor),
        escapeCsv(r.enrolledAt),
        escapeCsv(r.paymentStatus),
        escapeCsv(r.amountPaid),
        escapeCsv(r.progress),
        escapeCsv(r.attendance),
        escapeCsv(r.assignments),
        escapeCsv(r.certificate),
      ].join(',')),
    ].join('\r\n');

    const fileName = `course_${courseId}_students_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

