import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { generateCorporateExcelWorkbook, ReportColumn, ReportSummaryItem } from '../utils/excelExporter';

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
        phone: u.phone || 'Not Provided',
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
          phone: user.phone || 'Not Provided',
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
          college: user.college || 'Not Provided',
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

/**
 * Helper to export rows to CSV, XLSX, or PDF
 */
async function sendFormattedReport(
  res: Response,
  format: 'xlsx' | 'csv' | 'pdf',
  filenameBase: string,
  title: string,
  columns: { header: string; key: string; width?: number; format?: 'currency' | 'date' | 'percent' | 'text' | 'number'; alignment?: 'left' | 'center' | 'right' }[],
  data: Record<string, any>[],
  summaryItems?: ReportSummaryItem[],
  category?: string
) {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeBase = filenameBase.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (format === 'xlsx') {
    await generateCorporateExcelWorkbook({
      res,
      filenameBase,
      sheets: [
        {
          sheetName: 'Executive Report',
          title,
          category: category || 'Platform Intelligence',
          subtitle: `SkillUp Corporate Operations Dossier (${data.length} records)`,
          summaryItems: summaryItems || [],
          columns,
          rows: data,
        },
      ],
    });
    return;
  }

  if (format === 'csv') {
    const escapeCsv = (val: any) => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
    const csvContent = [
      columns.map((c) => escapeCsv(c.header)).join(','),
      ...data.map((row) => columns.map((c) => escapeCsv(row[c.key])).join(',')),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeBase}_${dateStr}.csv"`);
    res.status(200).send(csvContent);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeBase}_${dateStr}.pdf"`);
      res.status(200).send(result);
    });

    // Brand Header
    doc.rect(0, 0, doc.page.width, 42).fill('#142B4F');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('SkillUp Admin Intelligence Dossier', 30, 14);
    doc.fillColor('#55B957').fontSize(10).font('Helvetica').text(`Export Date: ${dateStr}`, doc.page.width - 180, 16);

    doc.moveDown(2);
    doc.fillColor('#142B4F').fontSize(14).font('Helvetica-Bold').text(title, 30, 52);
    doc.fillColor('#64748B').fontSize(9).font('Helvetica').text(`Total records: ${data.length}`, 30, 68);

    // Table Setup
    const startY = 86;
    const startX = 30;
    const usableWidth = doc.page.width - 60;
    const colWidth = usableWidth / columns.length;
    const rowHeight = 18;

    // Header Row
    doc.rect(startX, startY, usableWidth, rowHeight).fill('#E2E8F0');
    doc.fillColor('#142B4F').fontSize(7.5).font('Helvetica-Bold');
    columns.forEach((col, idx) => {
      doc.text(col.header, startX + idx * colWidth + 3, startY + 5, {
        width: colWidth - 6,
        align: 'left',
        ellipsis: true,
      });
    });

    let currentY = startY + rowHeight;
    doc.font('Helvetica').fontSize(7);

    data.forEach((row, rIdx) => {
      if (currentY + rowHeight > doc.page.height - 35) {
        doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
        // Header on new page
        doc.rect(startX, 30, usableWidth, rowHeight).fill('#E2E8F0');
        doc.fillColor('#142B4F').fontSize(7.5).font('Helvetica-Bold');
        columns.forEach((col, idx) => {
          doc.text(col.header, startX + idx * colWidth + 3, 35, {
            width: colWidth - 6,
            align: 'left',
            ellipsis: true,
          });
        });
        currentY = 30 + rowHeight;
        doc.font('Helvetica').fontSize(7);
      }

      // Zebra striping
      if (rIdx % 2 === 1) {
        doc.rect(startX, currentY, usableWidth, rowHeight).fill('#F8FAFC');
      }

      doc.fillColor('#111111');
      columns.forEach((col, idx) => {
        const textVal = String(row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '');
        doc.text(textVal, startX + idx * colWidth + 3, currentY + 4.5, {
          width: colWidth - 6,
          align: 'left',
          ellipsis: true,
        });
      });

      currentY += rowHeight;
    });

    doc.end();
    return;
  }

  throw new AppError('Invalid format requested. Supported formats: xlsx, csv, pdf', 400);
}

/**
 * 7. GET /api/admin/reports/students
 * Report A: Complete Student Directory (All Enrolled Students)
 */
export const exportAllStudentsReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const format = ((req.query.format as string) || 'xlsx').toLowerCase() as 'xlsx' | 'csv' | 'pdf';
    const { search, courseId, batchId, paymentStatus, enrollmentStatus, certificateStatus } = req.query;

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
      user: userWhere,
    };

    if (courseId && courseId !== 'ALL') {
      enrollmentWhere.courseId = String(courseId);
    }
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
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            discountPrice: true,
            _count: { select: { liveClasses: true, assignments: true } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            batchEnrollments: {
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

    const studentIds = Array.from(new Set(enrollments.map((e) => e.userId)));
    const enrolledCourseIds = Array.from(new Set(enrollments.map((e) => e.courseId)));

    const [payments, certificates, attendances, submissions] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: { in: studentIds }, courseId: { in: enrolledCourseIds }, status: 'COMPLETED' },
        select: { userId: true, courseId: true, amount: true },
      }),
      prisma.certificate.findMany({
        where: { userId: { in: studentIds }, courseId: { in: enrolledCourseIds } },
        select: { userId: true, courseId: true, certificateNo: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds }, status: 'PRESENT' },
        select: { studentId: true, liveClass: { select: { courseId: true } } },
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, assignment: { select: { courseId: true } } },
      }),
    ]);

    // Build lookup maps keyed by `${userId}_${courseId}`
    const paymentMap = new Map<string, number>();
    payments.forEach((p) => {
      if (p.courseId) {
        const key = `${p.userId}_${p.courseId}`;
        paymentMap.set(key, (paymentMap.get(key) || 0) + Number(p.amount));
      }
    });

    const certMap = new Map<string, string>();
    certificates.forEach((c) => {
      certMap.set(`${c.userId}_${c.courseId}`, c.certificateNo);
    });

    const attendanceMap = new Map<string, number>();
    attendances.forEach((a) => {
      if (a.liveClass?.courseId) {
        const key = `${a.studentId}_${a.liveClass.courseId}`;
        attendanceMap.set(key, (attendanceMap.get(key) || 0) + 1);
      }
    });

    const submissionMap = new Map<string, number>();
    submissions.forEach((s) => {
      if (s.assignment?.courseId) {
        const key = `${s.studentId}_${s.assignment.courseId}`;
        submissionMap.set(key, (submissionMap.get(key) || 0) + 1);
      }
    });

    let reportRows = enrollments.map((enr) => {
      const u = enr.user;
      const c = enr.course;
      const key = `${u.id}_${c.id}`;
      const nominalPrice = Number(c.discountPrice || c.price);
      const paid = paymentMap.get(key) || 0;

      let pStatus = 'PENDING';
      if (paid >= nominalPrice && nominalPrice > 0) pStatus = 'PAID';
      else if (paid > 0) pStatus = 'PARTIAL';
      else if (nominalPrice === 0) pStatus = 'PAID';

      const certNo = certMap.get(key) || 'NOT_ISSUED';
      const totalLive = c._count.liveClasses;
      const attended = attendanceMap.get(key) || 0;
      const attRate = totalLive > 0 ? `${Math.round((attended / totalLive) * 100)}%` : '100%';
      const totalAssign = c._count.assignments;
      const submitted = submissionMap.get(key) || 0;

      // Find matching batch for course
      const matchingBatch = u.batchEnrollments.find((be) => be.batch.courseId === c.id);
      const batchName = matchingBatch?.batch?.name || 'Unassigned';
      const mentorName = matchingBatch?.batch?.mentorAssignments?.[0]?.mentor?.name || 'Unassigned';

      return {
        studentId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'Not Provided',
        registeredAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
        enrolledAt: enr.enrolledAt ? new Date(enr.enrolledAt).toISOString().split('T')[0] : 'N/A',
        courseTitle: c.title,
        courseId: c.id,
        batch: batchName,
        mentor: mentorName,
        paymentStatus: pStatus,
        amountPaid: paid,
        progress: `${enr.progress}%`,
        attendance: attRate,
        assignments: `${submitted}/${totalAssign}`,
        certificateStatus: certNo === 'NOT_ISSUED' ? 'Not Issued' : `Issued (${certNo})`,
      };
    });

    // In-memory filters
    if (paymentStatus && paymentStatus !== 'ALL') {
      reportRows = reportRows.filter((r) => r.paymentStatus === paymentStatus);
    }
    if (certificateStatus === 'ISSUED') {
      reportRows = reportRows.filter((r) => !r.certificateStatus.startsWith('Not Issued'));
    } else if (certificateStatus === 'NOT_ISSUED') {
      reportRows = reportRows.filter((r) => r.certificateStatus.startsWith('Not Issued'));
    }

    // Calculate Summary Dashboard Metrics
    const totalStudentsCount = reportRows.length;
    const completedStudentsCount = reportRows.filter((r) => r.progress === '100%').length;
    const paidStudentsCount = reportRows.filter((r) => r.paymentStatus === 'PAID').length;
    const totalCollected = reportRows.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

    const summaryItems: ReportSummaryItem[] = [
      { label: 'Total Enrolled Students', value: totalStudentsCount },
      { label: 'Course Completions', value: completedStudentsCount },
      { label: 'Fully Paid Enrollments', value: paidStudentsCount },
      { label: 'Total Revenue Collected', value: `₹${totalCollected.toLocaleString('en-IN')}` },
    ];

    const columns: ReportColumn[] = [
      { header: 'Student ID', key: 'studentId', width: 26 },
      { header: 'Full Name', key: 'name', width: 22 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Phone Number', key: 'phone', width: 16 },
      { header: 'Registered On', key: 'registeredAt', width: 14, format: 'date', alignment: 'center' },
      { header: 'Enrolled On', key: 'enrolledAt', width: 14, format: 'date', alignment: 'center' },
      { header: 'Course Name', key: 'courseTitle', width: 28 },
      { header: 'Course ID', key: 'courseId', width: 26 },
      { header: 'Batch', key: 'batch', width: 18 },
      { header: 'Assigned Mentor', key: 'mentor', width: 20 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16, alignment: 'center' },
      { header: 'Amount Paid (INR)', key: 'amountPaid', width: 18, format: 'currency' },
      { header: 'Learning Progress', key: 'progress', width: 18, format: 'percent', alignment: 'center' },
      { header: 'Attendance %', key: 'attendance', width: 15, alignment: 'center' },
      { header: 'Assignments', key: 'assignments', width: 15, alignment: 'center' },
      { header: 'Certificate', key: 'certificateStatus', width: 22, alignment: 'center' },
    ];

    await sendFormattedReport(
      res,
      format,
      `SkillUp_All_Students_${new Date().getFullYear()}`,
      'SkillUp - Complete Student Directory Report',
      columns,
      reportRows,
      summaryItems,
      'Student Enrollment & Telemetry'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 8. GET /api/admin/reports/courses/:courseId/students
 * Report B: Course-Wise Student Report
 */
export const exportCourseStudentsReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);
    const format = ((req.query.format as string) || 'xlsx').toLowerCase() as 'xlsx' | 'csv' | 'pdf';
    const { search, batchId, paymentStatus, enrollmentStatus, certificateStatus } = req.query;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { name: true } },
        _count: { select: { liveClasses: true, assignments: true, enrollments: true } },
      },
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
            createdAt: true,
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

    const [payments, certificates, attendances, submissions] = await Promise.all([
      prisma.payment.findMany({
        where: { courseId, userId: { in: studentIds }, status: 'COMPLETED' },
        select: { userId: true, amount: true },
      }),
      prisma.certificate.findMany({
        where: { courseId, userId: { in: studentIds } },
        select: { userId: true, certificateNo: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { liveClass: { courseId }, studentId: { in: studentIds }, status: 'PRESENT' },
        select: { studentId: true },
      }),
      prisma.assignmentSubmission.findMany({
        where: { assignment: { courseId }, studentId: { in: studentIds } },
        select: { studentId: true },
      }),
    ]);

    const paymentsMap = new Map<string, number>();
    payments.forEach((p) => {
      paymentsMap.set(p.userId, (paymentsMap.get(p.userId) || 0) + Number(p.amount));
    });

    const certsMap = new Map<string, string>();
    certificates.forEach((c) => {
      certsMap.set(c.userId, c.certificateNo);
    });

    const attendanceCountMap = new Map<string, number>();
    attendances.forEach((a) => {
      attendanceCountMap.set(a.studentId, (attendanceCountMap.get(a.studentId) || 0) + 1);
    });

    const submissionCountMap = new Map<string, number>();
    submissions.forEach((s) => {
      submissionCountMap.set(s.studentId, (submissionCountMap.get(s.studentId) || 0) + 1);
    });

    let rows = enrollments.map((enr) => {
      const u = enr.user;
      const paid = paymentsMap.get(u.id) || 0;
      let pStatus = 'PENDING';
      if (paid >= nominalPrice && nominalPrice > 0) pStatus = 'PAID';
      else if (paid > 0) pStatus = 'PARTIAL';
      else if (nominalPrice === 0) pStatus = 'PAID';

      const certNo = certsMap.get(u.id) || 'NOT_ISSUED';
      const liveClassesCount = course._count.liveClasses;
      const attended = attendanceCountMap.get(u.id) || 0;
      const attRate = liveClassesCount > 0 ? `${Math.round((attended / liveClassesCount) * 100)}%` : '100%';
      const assignmentsCount = course._count.assignments;
      const submitted = submissionCountMap.get(u.id) || 0;

      const batchName = u.batchEnrollments?.[0]?.batch?.name || 'Unassigned';
      const mentorName = u.batchEnrollments?.[0]?.batch?.mentorAssignments?.[0]?.mentor?.name || course.instructor?.name || 'Unassigned';

      return {
        studentId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'Not Provided',
        registeredAt: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : 'N/A',
        enrolledAt: enr.enrolledAt ? new Date(enr.enrolledAt).toISOString().split('T')[0] : 'N/A',
        courseTitle: course.title,
        batch: batchName,
        mentor: mentorName,
        paymentStatus: pStatus,
        amountPaid: paid,
        progress: `${enr.progress}%`,
        attendance: attRate,
        assignments: `${submitted}/${assignmentsCount}`,
        certificateStatus: certNo === 'NOT_ISSUED' ? 'Not Issued' : `Issued (${certNo})`,
      };
    });

    // In-memory filters
    if (paymentStatus && paymentStatus !== 'ALL') {
      rows = rows.filter((r) => r.paymentStatus === paymentStatus);
    }
    if (certificateStatus === 'ISSUED') {
      rows = rows.filter((r) => !r.certificateStatus.startsWith('Not Issued'));
    } else if (certificateStatus === 'NOT_ISSUED') {
      rows = rows.filter((r) => r.certificateStatus.startsWith('Not Issued'));
    }

    // Calculate Summary Dashboard Metrics
    const totalEnrolled = rows.length;
    const completedCount = rows.filter((r) => r.progress === '100%').length;
    const paidCount = rows.filter((r) => r.paymentStatus === 'PAID').length;
    const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0);

    const summaryItems: ReportSummaryItem[] = [
      { label: 'Total Enrolled', value: totalEnrolled },
      { label: 'Completions', value: completedCount },
      { label: 'Paid Enrollments', value: paidCount },
      { label: 'Course Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
    ];

    const columns: ReportColumn[] = [
      { header: 'Student ID', key: 'studentId', width: 26 },
      { header: 'Student Name', key: 'name', width: 22 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Phone Number', key: 'phone', width: 16 },
      { header: 'Registered Date', key: 'registeredAt', width: 15, format: 'date', alignment: 'center' },
      { header: 'Enrolled Date', key: 'enrolledAt', width: 15, format: 'date', alignment: 'center' },
      { header: 'Course Title', key: 'courseTitle', width: 28 },
      { header: 'Batch', key: 'batch', width: 18 },
      { header: 'Assigned Mentor', key: 'mentor', width: 20 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16, alignment: 'center' },
      { header: 'Amount Paid (INR)', key: 'amountPaid', width: 18, format: 'currency' },
      { header: 'Progress', key: 'progress', width: 16, format: 'percent', alignment: 'center' },
      { header: 'Attendance %', key: 'attendance', width: 15, alignment: 'center' },
      { header: 'Assignments', key: 'assignments', width: 15, alignment: 'center' },
      { header: 'Certificate', key: 'certificateStatus', width: 22, alignment: 'center' },
    ];

    await sendFormattedReport(
      res,
      format,
      `SkillUp_Course_Students_${course.title.substring(0, 25).replace(/\s+/g, '_')}`,
      `SkillUp - ${course.title} Student Roster`,
      columns,
      rows,
      summaryItems,
      course.title
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/admin/reports/courses
 * Report C: Complete Course Report (All Courses Performance & Revenue)
 */
export const exportAllCoursesReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const format = ((req.query.format as string) || 'xlsx').toLowerCase() as 'xlsx' | 'csv' | 'pdf';
    const { category, status } = req.query;

    const courseWhere: any = {};
    if (category && category !== 'ALL') {
      courseWhere.category = { name: String(category) };
    }
    if (status && status !== 'ALL') {
      courseWhere.status = String(status);
    }

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        category: { select: { name: true } },
        instructor: { select: { id: true, name: true, email: true } },
        mentorAssignments: {
          include: { mentor: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            enrollments: true,
            batches: true,
            liveClasses: true,
            assignments: true,
            certificates: true,
          },
        },
        enrollments: {
          select: { progress: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = courses.map((c) => c.id);

    const payments = await prisma.payment.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, amount: true, status: true },
    });

    const revenueMap = new Map<string, { verifiedRev: number; paidStudents: number; totalOrders: number }>();
    payments.forEach((p) => {
      if (!p.courseId) return;
      const cur = revenueMap.get(p.courseId) || { verifiedRev: 0, paidStudents: 0, totalOrders: 0 };
      cur.totalOrders += 1;
      if (p.status === 'COMPLETED') {
        cur.verifiedRev += Number(p.amount);
        cur.paidStudents += 1;
      }
      revenueMap.set(p.courseId, cur);
    });

    const rows = courses.map((c) => {
      const revData = revenueMap.get(c.id) || { verifiedRev: 0, paidStudents: 0, totalOrders: 0 };
      const avgProg = c.enrollments.length > 0
        ? Math.round(c.enrollments.reduce((sum, e) => sum + e.progress, 0) / c.enrollments.length)
        : 0;

      const mentors = c.mentorAssignments.map((m) => m.mentor?.name).filter(Boolean);
      const mentorDisplay = mentors.length > 0 ? mentors.join(', ') : (c.instructor?.name || 'Unassigned');

      return {
        courseId: c.id,
        title: c.title,
        category: c.category?.name || 'General',
        level: c.level,
        status: c.status,
        regularPrice: Number(c.price),
        discountPrice: c.discountPrice ? Number(c.discountPrice) : 'None',
        totalEnrollments: c._count.enrollments,
        paidStudentsCount: revData.paidStudents,
        verifiedRevenue: revData.verifiedRev,
        avgCompletionProgress: `${avgProg}%`,
        totalBatches: c._count.batches,
        totalLiveClasses: c._count.liveClasses,
        totalAssignments: c._count.assignments,
        certificatesIssued: c._count.certificates,
        instructorOrMentors: mentorDisplay,
      };
    });

    // Calculate Summary Dashboard Metrics
    const totalCourses = rows.length;
    const publishedCourses = rows.filter((r) => r.status === 'PUBLISHED').length;
    const totalEnrollments = rows.reduce((sum, r) => sum + (Number(r.totalEnrollments) || 0), 0);
    const totalPlatformRevenue = rows.reduce((sum, r) => sum + (Number(r.verifiedRevenue) || 0), 0);

    const summaryItems: ReportSummaryItem[] = [
      { label: 'Total Catalog Courses', value: totalCourses },
      { label: 'Published Courses', value: publishedCourses },
      { label: 'Total Student Enrollments', value: totalEnrollments },
      { label: 'Total Verified Revenue', value: `₹${totalPlatformRevenue.toLocaleString('en-IN')}` },
    ];

    const columns: ReportColumn[] = [
      { header: 'Course ID', key: 'courseId', width: 26 },
      { header: 'Course Title', key: 'title', width: 28 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Level', key: 'level', width: 14, alignment: 'center' },
      { header: 'Status', key: 'status', width: 14, alignment: 'center' },
      { header: 'Regular Price (INR)', key: 'regularPrice', width: 18, format: 'currency' },
      { header: 'Discount Price', key: 'discountPrice', width: 18, format: 'currency' },
      { header: 'Total Enrollments', key: 'totalEnrollments', width: 16, format: 'number' },
      { header: 'Paid Students', key: 'paidStudentsCount', width: 15, format: 'number' },
      { header: 'Verified Revenue (INR)', key: 'verifiedRevenue', width: 20, format: 'currency' },
      { header: 'Avg Completion %', key: 'avgCompletionProgress', width: 18, format: 'percent', alignment: 'center' },
      { header: 'Batches Count', key: 'totalBatches', width: 15, format: 'number', alignment: 'center' },
      { header: 'Live Classes', key: 'totalLiveClasses', width: 15, format: 'number', alignment: 'center' },
      { header: 'Assignments', key: 'totalAssignments', width: 15, format: 'number', alignment: 'center' },
      { header: 'Certificates Issued', key: 'certificatesIssued', width: 18, format: 'number', alignment: 'center' },
      { header: 'Assigned Mentors/Instructor', key: 'instructorOrMentors', width: 26 },
    ];

    await sendFormattedReport(
      res,
      format,
      `SkillUp_Course_Report_${new Date().getFullYear()}`,
      'SkillUp - Complete Courses Performance & Revenue Report',
      columns,
      rows,
      summaryItems,
      'Curriculum & Revenue Intelligence'
    );
  } catch (error) {
    next(error);
  }
};


