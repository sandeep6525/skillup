import { Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import prisma from '../config/prisma';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * Audit log helper
 */
const logAdminAction = async (userId: string | undefined, action: string, resource: string, details?: string) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details,
      },
    });
  } catch (err) {
    console.error('[AdminPaymentAuditLog Failed]:', err);
  }
};

/**
 * 1. GET /api/admin/payments/overview
 * Comprehensive platform-wide financial summary metrics
 */
export const getAdminPaymentOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. All completed course payments
    const completedCoursePayments = await prisma.payment.findMany({
      where: {
        courseId: { not: null },
        status: 'COMPLETED',
      },
      select: {
        amount: true,
        discountAmount: true,
        userId: true,
        courseId: true,
      },
    });

    const successfullyCollectedRevenue = completedCoursePayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    // 2. All course enrollments with course details
    const enrollments = await prisma.enrollment.findMany({
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            discountPrice: true,
          },
        },
      },
    });

    // Group verified payments and discounts by `${userId}_${courseId}`
    const paidByEnrollmentKey = new Map<string, number>();
    const discountByEnrollmentKey = new Map<string, number>();
    for (const p of completedCoursePayments) {
      if (!p.courseId) continue;
      const key = `${p.userId}_${p.courseId}`;
      paidByEnrollmentKey.set(key, (paidByEnrollmentKey.get(key) || 0) + Number(p.amount));
      discountByEnrollmentKey.set(key, (discountByEnrollmentKey.get(key) || 0) + Number(p.discountAmount || 0));
    }

    let totalCourseSalesValue = 0;
    let outstandingStudentBalances = 0;
    let fullyPaidEnrollments = 0;
    let partiallyPaidEnrollments = 0;
    let unpaidEnrollments = 0;

    for (const enr of enrollments) {
      const courseFee = Number(enr.course.discountPrice || enr.course.price || 0);
      totalCourseSalesValue += courseFee;

      const key = `${enr.userId}_${enr.courseId}`;
      const totalPaid = paidByEnrollmentKey.get(key) || 0;
      const totalDiscount = discountByEnrollmentKey.get(key) || 0;
      const remaining = Math.max(0, courseFee - totalPaid - totalDiscount);

      if (remaining > 0) {
        outstandingStudentBalances += remaining;
      }

      if ((totalPaid + totalDiscount) >= courseFee && courseFee > 0) {
        fullyPaidEnrollments++;
      } else if (totalPaid > 0 && remaining > 0) {
        partiallyPaidEnrollments++;
      } else {
        unpaidEnrollments++;
      }
    }

    // 3. Transactions breakdown across ALL products
    const [
      allCompletedPayments,
      allRefundedPayments,
      pendingCount,
      failedCount,
      totalOrdersCount,
      couponsDiscountsSum,
    ] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: {
          amount: true,
          courseId: true,
          internshipId: true,
          materialId: true,
          hackathonId: true,
          liveClassId: true,
          discountAmount: true,
        },
      }),
      prisma.payment.findMany({
        where: { status: 'REFUNDED' },
        select: {
          amount: true,
          courseId: true,
          internshipId: true,
          materialId: true,
          hackathonId: true,
          liveClassId: true,
        },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.payment.count(),
      prisma.couponRedemption.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { discountAmount: true },
      }),
    ]);

    const totalRevenueCollectedAll = allCompletedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const successfullyRefundedAmount = allRefundedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalCouponDiscounts = Number(couponsDiscountsSum._sum.discountAmount || 0);

    // Product-wise breakdowns
    const breakdown = {
      courses: {
        revenue: allCompletedPayments.filter((p) => p.courseId).reduce((sum, p) => sum + Number(p.amount), 0),
        count: allCompletedPayments.filter((p) => p.courseId).length,
      },
      internships: {
        revenue: allCompletedPayments.filter((p) => p.internshipId).reduce((sum, p) => sum + Number(p.amount), 0),
        count: allCompletedPayments.filter((p) => p.internshipId).length,
      },
      materials: {
        revenue: allCompletedPayments.filter((p) => p.materialId).reduce((sum, p) => sum + Number(p.amount), 0),
        count: allCompletedPayments.filter((p) => p.materialId).length,
      },
      hackathons: {
        revenue: allCompletedPayments.filter((p) => p.hackathonId).reduce((sum, p) => sum + Number(p.amount), 0),
        count: allCompletedPayments.filter((p) => p.hackathonId).length,
      },
      liveClasses: {
        revenue: allCompletedPayments.filter((p) => p.liveClassId).reduce((sum, p) => sum + Number(p.amount), 0),
        count: allCompletedPayments.filter((p) => p.liveClassId).length,
      },
    };

    // Distinct enrolled students count across all courses
    const uniqueEnrolledStudentIds = new Set(enrollments.map((e) => e.userId));
    const totalCoursesCount = await prisma.course.count();

    res.json({
      success: true,
      data: {
        totalCourses: totalCoursesCount,
        totalEnrolledStudents: uniqueEnrolledStudentIds.size,
        totalCourseRevenue: totalCourseSalesValue,
        totalCourseSalesValue,
        actualAmountCollected: successfullyCollectedRevenue,
        successfullyCollectedRevenue,
        totalRevenue: totalRevenueCollectedAll,
        totalOrders: totalOrdersCount,
        successfulOrders: allCompletedPayments.length,
        outstandingInstallmentBalance: outstandingStudentBalances,
        outstandingStudentBalances,
        studentsPaidInFull: fullyPaidEnrollments,
        fullyPaidEnrollments,
        studentsPaidPartially: partiallyPaidEnrollments,
        partiallyPaidEnrollments,
        studentsWithPendingPayments: pendingCount,
        unpaidEnrollments,
        totalEnrollments: enrollments.length,
        pendingTransactions: pendingCount,
        failedTransactions: failedCount,
        refundedAmount: successfullyRefundedAmount,
        successfullyRefundedAmount,
        refundedTransactionsCount: allRefundedPayments.length,
        totalCouponDiscounts,
        breakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/admin/payments/courses
 * Course-wise payment metrics list with server-side pagination and search
 */
export const getAdminCoursePayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, page = '1', limit = '10' } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNumber - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { id: { contains: String(search) } },
      ];
    }

    const [totalCourses, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          discountPrice: true,
          allowInstallments: true,
          minInstallmentAmount: true,
          installmentPolicy: true,
          createdAt: true,
        },
      }),
    ]);

    const courseIds = courses.map((c) => c.id);

    // Fetch enrollments for these courses
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        userId: true,
        courseId: true,
      },
    });

    // Fetch payments for these courses
    const payments = await prisma.payment.findMany({
      where: { courseId: { in: courseIds } },
      select: {
        id: true,
        userId: true,
        courseId: true,
        amount: true,
        discountAmount: true,
        status: true,
        createdAt: true,
      },
    });

    // Aggregate metrics per course
    const courseSummaries = courses.map((course) => {
      const courseFee = Number(course.discountPrice || course.price);
      const courseEnrollments = enrollments.filter((e) => e.courseId === course.id);
      const coursePayments = payments.filter((p) => p.courseId === course.id);

      const completedPayments = coursePayments.filter((p) => p.status === 'COMPLETED');
      const totalCollected = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Student paid and discount map
      const paidByStudent = new Map<string, number>();
      const discountByStudent = new Map<string, number>();
      for (const p of completedPayments) {
        paidByStudent.set(p.userId, (paidByStudent.get(p.userId) || 0) + Number(p.amount));
        discountByStudent.set(p.userId, (discountByStudent.get(p.userId) || 0) + Number(p.discountAmount || 0));
      }

      let fullyPaidStudents = 0;
      let partiallyPaidStudents = 0;
      let studentsWithOutstanding = 0;
      let totalOutstanding = 0;

      for (const enr of courseEnrollments) {
        const studentPaid = paidByStudent.get(enr.userId) || 0;
        const studentDiscount = discountByStudent.get(enr.userId) || 0;
        const bal = Math.max(0, courseFee - studentPaid - studentDiscount);
        if (bal > 0) {
          totalOutstanding += bal;
          studentsWithOutstanding++;
          if (studentPaid > 0) {
            partiallyPaidStudents++;
          }
        } else if (courseFee > 0 && (studentPaid + studentDiscount) >= courseFee) {
          fullyPaidStudents++;
        }
      }

      const pendingCount = coursePayments.filter((p) => p.status === 'PENDING').length;
      const failedCount = coursePayments.filter((p) => p.status === 'FAILED').length;
      const refundedCount = coursePayments.filter((p) => p.status === 'REFUNDED').length;

      // Most recent payment date
      const sortedCompleted = completedPayments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestPaymentDate = sortedCompleted.length > 0 ? sortedCompleted[0].createdAt : null;

      return {
        courseId: course.id,
        courseTitle: course.title,
        slug: course.slug,
        coursePrice: Number(course.price),
        discountPrice: course.discountPrice ? Number(course.discountPrice) : null,
        finalPayablePrice: courseFee,
        allowInstallments: course.allowInstallments,
        minInstallmentAmount: course.minInstallmentAmount ? Number(course.minInstallmentAmount) : null,
        installmentPolicy: course.installmentPolicy || 'RESTRICTED',
        enrolledStudentsCount: courseEnrollments.length,
        fullyPaidStudentsCount: fullyPaidStudents,
        partiallyPaidStudentsCount: partiallyPaidStudents,
        studentsWithOutstandingCount: studentsWithOutstanding,
        totalCollectedAmount: totalCollected,
        totalOutstandingBalance: totalOutstanding,
        pendingTransactionsCount: pendingCount,
        failedTransactionsCount: failedCount,
        refundedTransactionsCount: refundedCount,
        latestPaymentDate,
      };
    });

    res.json({
      success: true,
      data: courseSummaries,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalCourses,
        totalPages: Math.ceil(totalCourses / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/admin/payments/courses/:courseId
 * Course-specific dashboard summary
 */
export const getAdminCoursePaymentDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const courseFee = Number(course.discountPrice || course.price);

    const [enrollments, payments, batches] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true },
      }),
      prisma.payment.findMany({
        where: { courseId },
        select: { id: true, userId: true, amount: true, status: true, createdAt: true },
      }),
      prisma.batch.findMany({
        where: { courseId },
        select: { id: true, name: true, code: true },
      }),
    ]);

    const completed = payments.filter((p) => p.status === 'COMPLETED');
    const totalCollected = completed.reduce((sum, p) => sum + Number(p.amount), 0);

    const paidMap = new Map<string, number>();
    for (const p of completed) {
      paidMap.set(p.userId, (paidMap.get(p.userId) || 0) + Number(p.amount));
    }

    let fullyPaid = 0;
    let partiallyPaid = 0;
    let outstandingTotal = 0;

    for (const enr of enrollments) {
      const paid = paidMap.get(enr.userId) || 0;
      const rem = Math.max(0, courseFee - paid);
      if (rem > 0) {
        outstandingTotal += rem;
        if (paid > 0) partiallyPaid++;
      } else if (courseFee > 0 && paid >= courseFee) {
        fullyPaid++;
      }
    }

    const pendingCount = payments.filter((p) => p.status === 'PENDING').length;
    const failedCount = payments.filter((p) => p.status === 'FAILED').length;
    const refundedPayments = payments.filter((p) => p.status === 'REFUNDED');
    const refundTotal = refundedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
          price: Number(course.price),
          discountPrice: course.discountPrice ? Number(course.discountPrice) : null,
          courseFee,
          allowInstallments: course.allowInstallments,
          minInstallmentAmount: course.minInstallmentAmount ? Number(course.minInstallmentAmount) : null,
          installmentPolicy: course.installmentPolicy,
          instructor: course.instructor,
        },
        metrics: {
          enrolledStudents: enrollments.length,
          fullyPaidStudents: fullyPaid,
          partiallyPaidStudents: partiallyPaid,
          totalCollected,
          outstandingBalances: outstandingTotal,
          pendingTransactions: pendingCount,
          failedTransactions: failedCount,
          refundTotal,
          refundCount: refundedPayments.length,
        },
        batches,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/admin/payments/courses/:courseId/students
 * Course-specific student payment records with multi-facet server-side filtering & pagination
 */
export const getAdminCourseStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);
    const {
      search,
      paymentPlan, // FULL, PARTIAL
      paymentStatus, // FULLY_PAID, PARTIAL, UNPAID
      balanceStatus, // OUTSTANDING, CLEARED
      batchId,
      mentorId,
      startDate,
      endDate,
      page = '1',
      limit = '15',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        price: true,
        discountPrice: true,
        title: true,
        allowInstallments: true,
        minInstallmentAmount: true,
      },
    });
    if (!course) throw new AppError('Course not found', 404);

    const courseFee = Number(course.discountPrice || course.price);
    const minInitialPayment = course.minInstallmentAmount ? Number(course.minInstallmentAmount) : courseFee;

    // Build enrollment user filter
    const userWhere: any = {};
    if (search) {
      const q = String(search).trim();
      userWhere.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { id: { contains: q } },
      ];
    }

    const enrollmentWhere: any = {
      courseId,
      user: userWhere,
    };

    if (startDate || endDate) {
      enrollmentWhere.enrolledAt = {};
      if (startDate) enrollmentWhere.enrolledAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        enrollmentWhere.enrolledAt.lte = end;
      }
    }

    // Fetch all candidate enrollments for this course
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
      orderBy: { enrolledAt: 'desc' },
    });

    const studentIds = enrollments.map((e) => e.userId);

    // Fetch payments for these students in this course
    const payments = await prisma.payment.findMany({
      where: {
        courseId,
        userId: { in: studentIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group payments by user
    const paymentsByUser = new Map<string, any[]>();
    for (const p of payments) {
      const list = paymentsByUser.get(p.userId) || [];
      list.push(p);
      paymentsByUser.set(p.userId, list);
    }

    // Assemble and compute each student's payment record
    let studentRecords = enrollments.map((enr) => {
      const u = enr.user;
      const userPayments = paymentsByUser.get(u.id) || [];
      const completed = userPayments.filter((p) => p.status === 'COMPLETED');
      const verifiedPaid = completed.reduce((sum, p) => sum + Number(p.amount), 0);
      const couponDiscount = completed.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
      const remainingBalance = Math.max(0, courseFee - verifiedPaid - couponDiscount);

      // Determine payment status
      let calculatedStatus = 'UNPAID';
      if (verifiedPaid >= courseFee && courseFee > 0) {
        calculatedStatus = 'FULLY_PAID';
      } else if (verifiedPaid > 0 && remainingBalance > 0) {
        calculatedStatus = 'PARTIAL';
      }

      // Determine payment plan
      const latestPayment = userPayments[0] || null;
      const hasPartialPlan = userPayments.some((p) => p.paymentPlan === 'PARTIAL' || p.isPartial);
      const plan = hasPartialPlan ? 'INSTALLMENT' : 'FULL';

      // Associated Batch & Mentor
      const activeBatchEnr = u.batchEnrollments?.[0] || null;
      const assignedBatch = activeBatchEnr ? activeBatchEnr.batch : null;
      const assignedMentor = assignedBatch?.mentorAssignments?.[0]?.mentor || null;

      const latestDate = completed.length > 0 ? completed[0].createdAt : (latestPayment ? latestPayment.createdAt : null);

      return {
        studentId: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        avatarUrl: u.avatarUrl,
        enrollmentDate: enr.enrolledAt,
        coursePrice: courseFee,
        totalCourseFee: courseFee,
        minInitialPayment: minInitialPayment,
        totalPaid: verifiedPaid,
        totalVerifiedPaid: verifiedPaid,
        remainingBalance,
        paymentType: plan === 'INSTALLMENT' ? 'Installment' : 'Full Payment',
        paymentPlan: plan,
        paymentStatus: calculatedStatus === 'FULLY_PAID' ? 'Paid in Full' : (calculatedStatus === 'PARTIAL' ? 'Partially Paid' : 'Pending'),
        rawPaymentStatus: calculatedStatus,
        installmentsPaid: completed.length,
        balanceStatus: remainingBalance > 0 ? 'OUTSTANDING' : 'CLEARED',
        lastPaymentDate: latestDate,
        latestPaymentDate: latestDate,
        nextDueDate: remainingBalance > 0 ? 'Flexible' : 'Completed',
        latestPaymentId: latestPayment?.id || null,
        latestRazorpayOrderId: latestPayment?.razorpayOrderId || null,
        latestRazorpayPaymentId: latestPayment?.razorpayPaymentId || null,
        latestPaymentStatus: latestPayment?.status || 'UNPAID',
        assignedBatch: assignedBatch
          ? { id: assignedBatch.id, name: assignedBatch.name, code: assignedBatch.code }
          : null,
        assignedMentor: assignedMentor
          ? { id: assignedMentor.id, name: assignedMentor.name, email: assignedMentor.email }
          : null,
        transactionCount: userPayments.length,
      };
    });

    // Apply computed filters
    if (paymentPlan) {
      const planUpper = String(paymentPlan).toUpperCase();
      studentRecords = studentRecords.filter((s) => s.paymentPlan === planUpper || s.paymentType.toUpperCase().includes(planUpper));
    }
    if (paymentStatus) {
      const statusUpper = String(paymentStatus).toUpperCase();
      studentRecords = studentRecords.filter(
        (s) =>
          s.rawPaymentStatus === statusUpper ||
          s.paymentStatus.toUpperCase().replace(/\s+/g, '_') === statusUpper ||
          s.paymentStatus.toUpperCase().includes(statusUpper)
      );
    }
    if (balanceStatus) {
      studentRecords = studentRecords.filter((s) => s.balanceStatus === String(balanceStatus).toUpperCase());
    }
    if (batchId) {
      studentRecords = studentRecords.filter((s) => s.assignedBatch?.id === String(batchId));
    }
    if (mentorId) {
      studentRecords = studentRecords.filter((s) => s.assignedMentor?.id === String(mentorId));
    }

    const totalRecords = studentRecords.length;
    const paginatedRecords = studentRecords.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

    res.json({
      success: true,
      data: paginatedRecords,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. GET /api/admin/payments/students/:studentId
 * Individual student payment profile & history for a specific course or overall
 */
export const getAdminStudentPaymentProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = String(req.params.studentId);
    const { courseId } = req.query;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        college: true,
        createdAt: true,
      },
    });

    if (!student) throw new AppError('Student not found', 404);

    const paymentWhere: any = { userId: studentId };
    if (courseId) paymentWhere.courseId = String(courseId);

    const [payments, enrollments] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              discountPrice: true,
              allowInstallments: true,
              minInstallmentAmount: true,
              installmentPolicy: true,
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        where: courseId ? { userId: studentId, courseId: String(courseId) } : { userId: studentId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              price: true,
              discountPrice: true,
              allowInstallments: true,
              minInstallmentAmount: true,
              installmentPolicy: true,
            },
          },
        },
      }),
    ]);

    // Format transactions safely (never expose secret keys)
    const sanitizedTimeline = payments.map((p) => ({
      paymentRecordId: p.id,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      amount: Number(p.amount),
      originalAmount: p.originalAmount ? Number(p.originalAmount) : null,
      discountAmount: p.discountAmount ? Number(p.discountAmount) : 0,
      couponCode: p.couponCode,
      currency: p.currency,
      paymentPlan: p.paymentPlan,
      isPartial: p.isPartial,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      refundId: p.refundId,
      refundReason: p.refundReason,
      paymentMethod: p.paymentMethod,
      courseId: p.courseId,
      courseTitle: p.course?.title,
    }));

    // Calculate aggregated course profile if courseId provided, or primary course
    let targetCourse = null;
    let enrollmentDate = null;
    let originalPrice = 0;
    let finalPayable = 0;
    let totalCollected = 0;
    let remainingAmount = 0;
    let completionPercentage = 0;
    let paymentStatus = 'UNPAID';

    if (enrollments.length > 0) {
      const enr = enrollments[0];
      targetCourse = enr.course;
      enrollmentDate = enr.enrolledAt;
      originalPrice = Number(enr.course.price);
      finalPayable = Number(enr.course.discountPrice || enr.course.price);

      const completed = payments.filter(
        (p) => p.status === 'COMPLETED' && (!courseId || p.courseId === courseId)
      );
      totalCollected = completed.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalDiscount = completed.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
      remainingAmount = Math.max(0, finalPayable - totalCollected - totalDiscount);
      completionPercentage = finalPayable > 0 ? Math.min(100, Math.round(((totalCollected + totalDiscount) / finalPayable) * 100)) : 100;

      if ((totalCollected + totalDiscount) >= finalPayable && finalPayable > 0) {
        paymentStatus = 'FULLY_PAID';
      } else if (totalCollected > 0 && remainingAmount > 0) {
        paymentStatus = 'PARTIAL';
      }
    }

    res.json({
      success: true,
      data: {
        student,
        course: targetCourse,
        enrollmentDate,
        originalPrice,
        finalPayableAmount: finalPayable,
        minimumInitialPayment: targetCourse?.minInstallmentAmount ? Number(targetCourse.minInstallmentAmount) : 500,
        installmentPolicy: targetCourse?.installmentPolicy || 'RESTRICTED',
        totalSuccessfullyCollected: totalCollected,
        remainingAmount,
        paymentCompletionPercentage: completionPercentage,
        paymentStatus,
        transactionTimeline: sanitizedTimeline,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/admin/payments/transactions
 * Filtered all-transactions list with search, status, and course filter
 */
export const getAdminTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      courseId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '25',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNumber - 1) * pageSize;

    const where: any = {};
    if (courseId) where.courseId = String(courseId);
    if (status) where.status = String(status);

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { razorpayOrderId: { contains: q } },
        { razorpayPaymentId: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { title: { contains: q } } },
        { liveClass: { title: { contains: q } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [totalTransactions, transactions] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          course: { select: { id: true, title: true, price: true, discountPrice: true } },
          liveClass: { select: { id: true, title: true, price: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalTransactions,
        totalPages: Math.ceil(totalTransactions / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. GET /api/admin/payments/export
 * Filtered CSV Export of course payment records
 */
export const exportAdminPaymentsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, internshipId, materialId, productType, status, paymentPlan, startDate, endDate, search } = req.query;

    const where: any = {};
    if (courseId) where.courseId = String(courseId);
    if (internshipId) where.internshipId = String(internshipId);
    if (materialId) where.materialId = String(materialId);
    if (status) where.status = String(status);
    if (paymentPlan) where.paymentPlan = String(paymentPlan);

    if (productType === 'COURSE') where.courseId = { not: null };
    else if (productType === 'INTERNSHIP') where.internshipId = { not: null };
    else if (productType === 'MATERIAL') where.materialId = { not: null };
    else if (productType === 'HACKATHON') where.hackathonId = { not: null };
    else if (productType === 'LIVE_CLASS' || productType === 'LIVECLASS' || productType === 'LIVE CLASS') where.liveClassId = { not: null };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { razorpayOrderId: { contains: q } },
        { razorpayPaymentId: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { course: { title: { contains: q } } },
        { internship: { title: { contains: q } } },
        { material: { title: { contains: q } } },
        { hackathon: { title: { contains: q } } },
        { liveClass: { title: { contains: q } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const transactions = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        course: { select: { id: true, title: true, price: true } },
        internship: { select: { id: true, title: true, price: true } },
        material: { select: { id: true, title: true, price: true } },
        hackathon: { select: { id: true, title: true, registrationFee: true } },
        liveClass: { select: { id: true, title: true, price: true } },
      },
      take: 5000,
    });

    const headers = [
      'Transaction ID',
      'Order / Gateway ID',
      'Payment ID',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Product Type',
      'Item Title',
      'Amount (INR)',
      'Remaining Balance (INR)',
      'Payment Plan',
      'Status',
      'Coupon Code',
      'Discount (INR)',
      'Refund ID',
      'Created At',
    ];

    const rows = transactions.map((t) => {
      let type = 'Other';
      let title = 'General Payment';
      if (t.course) {
        type = 'Course';
        title = t.course.title;
      } else if (t.internship) {
        type = 'Internship';
        title = t.internship.title;
      } else if (t.material) {
        type = 'Material';
        title = t.material.title;
      } else if (t.hackathon) {
        type = 'Hackathon';
        title = t.hackathon.title;
      } else if (t.liveClass) {
        type = 'Live Class';
        title = t.liveClass.title;
      }

      return [
        `"${t.id}"`,
        `"${t.razorpayOrderId || ''}"`,
        `"${t.razorpayPaymentId || ''}"`,
        `"${t.user?.name || ''}"`,
        `"${t.user?.email || ''}"`,
        `"${t.user?.phone || 'N/A'}"`,
        `"${type}"`,
        `"${title.replace(/"/g, '""')}"`,
        Number(t.amount).toFixed(2),
        Number(t.remainingBalance || 0).toFixed(2),
        `"${t.paymentPlan || 'FULL'}"`,
        `"${t.status}"`,
        `"${t.couponCode || ''}"`,
        Number(t.discountAmount || 0).toFixed(2),
        `"${t.refundId || ''}"`,
        `"${new Date(t.createdAt).toISOString()}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=course_payments_export_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * 8. POST /api/admin/payments/reconcile/:paymentId
 * Reconcile pending or unverified transaction with Razorpay API
 */
export const reconcileAdminPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.paymentId);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, course: true },
    });

    if (!payment) throw new AppError('Payment record not found', 404);

    let fetchedOrder: any = null;
    let fetchedPayment: any = null;

    try {
      if (payment.razorpayOrderId && !payment.razorpayOrderId.startsWith('order_test_') && !payment.razorpayOrderId.startsWith('free_')) {
        fetchedOrder = await razorpay.orders.fetch(payment.razorpayOrderId);
        const paymentsList = await razorpay.orders.fetchPayments(payment.razorpayOrderId);
        if (paymentsList && paymentsList.items && paymentsList.items.length > 0) {
          fetchedPayment = paymentsList.items.find((item: any) => item.status === 'captured') || paymentsList.items[0];
        }
      }
    } catch (rzpErr: any) {
      console.warn('[Razorpay Reconcile Sync Notice]:', rzpErr?.error?.description || rzpErr?.message || rzpErr);
    }

    if (fetchedPayment && fetchedPayment.status === 'captured') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            razorpayPaymentId: fetchedPayment.id,
          },
        });

        if (payment.courseId) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
            create: { userId: payment.userId, courseId: payment.courseId },
            update: {},
          });
        }
      });

      await logAdminAction(
        req.user?.id,
        'RECONCILE_PAYMENT_CAPTURED',
        `Payment: ${payment.id}`,
        `Payment reconciled as COMPLETED via Razorpay API (${fetchedPayment.id})`
      );

      return res.json({
        success: true,
        message: 'Payment verified and status updated to COMPLETED.',
        data: { status: 'COMPLETED', razorpayPaymentId: fetchedPayment.id },
      });
    }

    // If sandbox / test mock order in dev
    if (config.nodeEnv !== 'production' && payment.razorpayOrderId?.startsWith('order_test_')) {
      return res.json({
        success: true,
        message: 'Sandbox / simulated transaction is in current state: ' + payment.status,
        data: { status: payment.status },
      });
    }

    res.json({
      success: true,
      message: `Transaction verified against payment gateway. Status remains ${payment.status}.`,
      data: { status: payment.status },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. POST /api/admin/payments/refund
 * Secure administrative refund with Razorpay integration and quota recovery
 */
export const processAdminRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paymentId, reason, amount } = req.body;

    if (!paymentId) throw new AppError('Payment ID is required', 400);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true, course: true },
    });

    if (!payment) throw new AppError('Payment record not found', 404);

    if (payment.status !== 'COMPLETED') {
      throw new AppError(`Cannot refund payment with status: ${payment.status}`, 400);
    }

    let refundReference = `ref_${Date.now()}`;

    // Attempt real Razorpay refund if live / authenticated
    if (payment.razorpayPaymentId && !payment.razorpayPaymentId.startsWith('pay_test_') && !payment.razorpayPaymentId.startsWith('free_')) {
      try {
        const rzpRefund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          notes: {
            reason: reason || 'Administrative Refund',
            refundedBy: req.user?.id || 'admin',
          },
        });
        if (rzpRefund && rzpRefund.id) {
          refundReference = rzpRefund.id;
        }
      } catch (rzpErr: any) {
        console.warn('[Razorpay Live Refund Notice]:', rzpErr?.error?.description || rzpErr?.message || rzpErr);
        // If razorpay returns error in dev / sandbox, note it but allow sandbox refund flow
        if (config.nodeEnv === 'production') {
          throw new AppError(
            `Razorpay refund failed: ${rzpErr?.error?.description || rzpErr?.message || 'Gateway error'}`,
            400
          );
        }
      }
    }

    // Atomically execute refund updates
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          refundReason: reason || 'Administrative Refund',
          refundId: refundReference,
        },
      });

      // Revoke course enrollment if no other completed payments exist for this course
      if (payment.courseId) {
        const otherPayments = await tx.payment.count({
          where: {
            userId: payment.userId,
            courseId: payment.courseId,
            status: 'COMPLETED',
            id: { not: payment.id },
          },
        });

        if (otherPayments === 0) {
          await tx.enrollment.deleteMany({
            where: { userId: payment.userId, courseId: payment.courseId },
          });

          await tx.batchEnrollment.deleteMany({
            where: {
              studentId: payment.userId,
              batch: { courseId: payment.courseId },
            },
          });
        }
      }

      // Restore coupon quota
      if (payment.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: payment.couponCode } });
        if (coupon && coupon.usedCount > 0) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { decrement: 1 } },
          });
        }

        await tx.couponRedemption.updateMany({
          where: { paymentId: payment.id },
          data: { status: 'REFUNDED' },
        });
      }

      return updated;
    });

    await logAdminAction(
      req.user?.id,
      'REFUND_ORDER',
      `Payment: ${payment.id}`,
      `Refunded ₹${payment.amount}. Refund Ref: ${refundReference}. Reason: ${reason || 'Admin Refund'}`
    );

    res.json({
      success: true,
      message: 'Payment refunded successfully and course access revoked.',
      data: updatedPayment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. POST /api/admin/payment-reminders
 * Send installment payment reminder to a student with outstanding course balance
 */
export const sendPaymentReminder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, courseId, customMessage } = req.body;

    if (!studentId || !courseId) {
      throw new AppError('studentId and courseId are required to send a payment reminder', 400);
    }

    const [student, course, completedPayments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, email: true },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, price: true, discountPrice: true },
      }),
      prisma.payment.findMany({
        where: {
          userId: studentId,
          courseId,
          status: 'COMPLETED',
        },
        select: { amount: true },
      }),
    ]);

    if (!student) throw new AppError('Student not found', 404);
    if (!course) throw new AppError('Course not found', 404);

    const courseFee = Number(course.discountPrice || course.price);
    const totalPaid = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstandingBalance = Math.max(0, courseFee - totalPaid);

    if (outstandingBalance <= 0) {
      throw new AppError('Student has no outstanding balance for this course', 400);
    }

    // 1. Create In-App Notification
    await prisma.notification.create({
      data: {
        userId: student.id,
        title: `Payment Reminder: ${course.title}`,
        message:
          customMessage ||
          `You have an outstanding balance of ₹${outstandingBalance.toLocaleString()} for "${course.title}". Please complete your next installment to avoid disruption in learning.`,
        type: 'PAYMENT',
      },
    });

    // 2. Dispatch Payment Reminder Email (with idempotency)
    try {
      if (student.email) {
        const emailData = emailTemplates.paymentReminder({
          studentName: student.name,
          courseTitle: course.title,
          outstandingBalance,
          slug: (course as any).slug || course.id,
        });

        await sendEmail({
          to: student.email,
          subject: emailData.subject,
          html: emailData.html,
          templateCode: 'PAYMENT_REMINDER_PENDING',
          idempotencyKey: `remind_${student.id}_${course.id}_${new Date().toISOString().split('T')[0]}`,
        });
      }
    } catch (eErr) {
      console.error('[Admin Payment Reminder Email Error]:', eErr);
    }

    // 2. Audit Log
    await logAdminAction(
      req.user?.id,
      'SEND_PAYMENT_REMINDER',
      `Student: ${student.id}, Course: ${course.id}`,
      `Sent reminder for outstanding balance of ₹${outstandingBalance}`
    );

    res.json({
      success: true,
      message: `Payment reminder successfully sent to ${student.name} (${student.email}) for ₹${outstandingBalance.toLocaleString()} outstanding balance.`,
      data: {
        studentId: student.id,
        studentName: student.name,
        courseId: course.id,
        outstandingBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. POST /api/admin/payments/offline
 * Record authorized offline / manual fee collection (e.g. Bank Transfer, Cash, Scholarship waiver)
 */
export const recordAdminOfflinePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      studentId,
      courseId,
      internshipId,
      materialId,
      amount,
      paymentMethod = 'MANUAL_BANK_TRANSFER',
      bankReference,
      receiptNumber,
      adminNotes,
      isPartial = false,
    } = req.body;

    if (!studentId) throw new AppError('Student ID is required', 400);
    if (!courseId && !internshipId && !materialId) {
      throw new AppError('One of courseId, internshipId, or materialId is required', 400);
    }
    if (amount === undefined || Number(amount) < 0) {
      throw new AppError('A valid non-negative payment amount is required', 400);
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Student not found', 404);

    const paidAmount = Number(amount);
    let totalTargetPrice = paidAmount;
    let targetTitle = 'Offline Payment';

    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Course not found', 404);
      totalTargetPrice = Number(course.discountPrice || course.price);
      targetTitle = course.title;
    } else if (internshipId) {
      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
      if (!internship) throw new AppError('Internship not found', 404);
      totalTargetPrice = Number(internship.discountPrice || internship.price);
      targetTitle = internship.title;
    } else if (materialId) {
      const mat = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
      if (!mat) throw new AppError('Material not found', 404);
      totalTargetPrice = Number(mat.discountPrice || mat.price);
      targetTitle = mat.title;
    }

    // Determine prior payments to compute remaining balance
    const priorCompleted = await prisma.payment.findMany({
      where: {
        userId: studentId,
        courseId: courseId || null,
        internshipId: internshipId || null,
        materialId: materialId || null,
        status: 'COMPLETED',
      },
      select: { amount: true },
    });
    const priorPaidTotal = priorCompleted.reduce((sum, p) => sum + Number(p.amount), 0);
    const newTotalPaid = priorPaidTotal + paidAmount;
    const remainingBalance = Math.max(0, totalTargetPrice - newTotalPaid);

    const orderRef = receiptNumber
      ? `offline_rcpt_${receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '')}`
      : `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          amount: paidAmount,
          originalAmount: totalTargetPrice,
          discountAmount: 0,
          currency: 'INR',
          status: 'COMPLETED',
          razorpayOrderId: orderRef,
          razorpayPaymentId: receiptNumber ? `rcpt_${receiptNumber}` : `man_${Date.now()}`,
          userId: studentId,
          courseId: courseId || null,
          internshipId: internshipId || null,
          materialId: materialId || null,
          isPartial: Boolean(isPartial || remainingBalance > 0),
          totalCoursePrice: courseId ? totalTargetPrice : null,
          remainingBalance,
          paymentPlan: isPartial || remainingBalance > 0 ? 'PARTIAL' : 'FULL',
          paymentMethod: String(paymentMethod),
          bankReference: bankReference ? String(bankReference) : null,
          adminNotes: adminNotes ? String(adminNotes) : `Recorded manually by admin (${req.user?.name || req.user?.id})`,
          reviewedBy: req.user?.id,
          reviewedAt: new Date(),
        },
      });

      // Grant course entitlement
      if (courseId) {
        await tx.enrollment.upsert({
          where: { userId_courseId: { userId: studentId, courseId } },
          create: { userId: studentId, courseId },
          update: {},
        });
      }

      // Grant internship entitlement
      if (internshipId) {
        await tx.internshipApplication.upsert({
          where: { internshipId_userId: { internshipId, userId: studentId } },
          create: {
            internshipId,
            userId: studentId,
            status: 'ACCEPTED',
            paidAmount: newTotalPaid,
            paymentId: p.id,
          },
          update: {
            status: 'ACCEPTED',
            paidAmount: newTotalPaid,
            paymentId: p.id,
          },
        });
      }

      // Grant material entitlement
      if (materialId) {
        await tx.materialPurchase.upsert({
          where: { materialId_userId: { materialId, userId: studentId } },
          create: {
            materialId,
            userId: studentId,
            paymentId: p.id,
            paidAmount: paidAmount,
          },
          update: {
            paymentId: p.id,
            paidAmount: paidAmount,
          },
        });
      }

      // Notify student
      await tx.notification.create({
        data: {
          userId: studentId,
          title: 'Offline Payment Recorded',
          message: `An offline fee payment of ₹${paidAmount.toLocaleString()} for "${targetTitle}" has been verified and recorded. Remaining balance: ₹${remainingBalance.toLocaleString()}.`,
          type: 'PAYMENT',
        },
      });

      return p;
    });

    await logAdminAction(
      req.user?.id,
      'RECORD_OFFLINE_PAYMENT',
      `Payment: ${payment.id}`,
      `Recorded ₹${paidAmount} offline for ${student.name} (${student.email}). Ref: ${receiptNumber || bankReference || 'N/A'}`
    );

    res.status(201).json({
      success: true,
      message: `Offline payment of ₹${paidAmount.toLocaleString()} recorded successfully.`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};



/**
 * 12. DELETE /api/admin/payments/:id
 * Delete an unpaid pending or failed payment order safely, or archive if permitted.
 * Blocks deletion of completed financial transactions.
 */
export const deleteAdminPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id || req.params.paymentId);
    const { action = 'DELETE', reason, deleteEnrollment = false, confirmedPermanent = false } = req.body || {};

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        liveClassRegistration: true,
        mentorBooking: true,
      },
    });

    if (!payment) {
      throw new AppError('Payment transaction record not found', 404);
    }

    // SAFETY CHECK: For completed payments, require explicit admin confirmation for permanent deletion
    if (payment.status === 'COMPLETED' && action === 'DELETE' && !confirmedPermanent) {
      throw new AppError(
        'Completed financial payment records require explicit confirmation to permanently delete from local database. Please confirm deletion.',
        400
      );
    }

    // 1. ARCHIVE ACTION for completed or refunded records
    if (action === 'ARCHIVE') {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          adminNotes: `[ARCHIVED on ${new Date().toISOString()} by ${req.user?.email || 'admin'}] Reason: ${reason || 'Administrative Archival'}. Previous: ${payment.adminNotes || ''}`,
          reviewedBy: req.user?.id,
          reviewedAt: new Date(),
        },
      });

      await logAdminAction(
        req.user?.id,
        'ARCHIVE_PAYMENT',
        `Payment: ${payment.id}`,
        `Archived payment record (Order: ${payment.razorpayOrderId}, Status: ${payment.status}) for ${payment.user.name} (${payment.user.email}). Reason: ${reason || 'None'}`
      );

      return res.json({
        success: true,
        message: 'Payment record has been safely archived in the platform ledger.',
        archived: true,
        data: updated,
      });
    }

    // 2. CANCEL ACTION: Mark pending payment as FAILED without hard-deleting
    if (action === 'CANCEL') {
      if (payment.status !== 'PENDING') {
        throw new AppError(`Cannot cancel a payment order with status: ${payment.status}`, 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            adminNotes: `[CANCELLED by admin on ${new Date().toISOString()}] Reason: ${reason || 'Order cancelled before payment'}`,
            reviewedBy: req.user?.id,
            reviewedAt: new Date(),
          },
        });

        // Release any reserved coupons
        await tx.couponRedemption.deleteMany({
          where: { paymentId: payment.id, status: 'RESERVED' },
        });

        // Release pending live class reservation
        if (payment.liveClassRegistration) {
          await tx.liveClassRegistration.delete({
            where: { id: payment.liveClassRegistration.id },
          });
        }
      });

      await logAdminAction(
        req.user?.id,
        'CANCEL_PAYMENT_ORDER',
        `Payment: ${payment.id}`,
        `Cancelled pending payment order ${payment.razorpayOrderId} for ${payment.user.name}`
      );

      return res.json({
        success: true,
        message: 'Pending payment order has been cancelled.',
        cancelled: true,
      });
    }

    // 3. DELETE ACTION: Permitted for PENDING, FAILED, or explicitly confirmed COMPLETED orders
    if (payment.status === 'PENDING' || payment.status === 'FAILED' || (payment.status === 'COMPLETED' && confirmedPermanent)) {
      const targetCourseId = payment.courseId;
      await prisma.$transaction(async (tx) => {
        // Release coupon reservations and redemptions
        await tx.couponRedemption.deleteMany({
          where: { paymentId: payment.id },
        });

        // Remove live class registration if attached
        if (payment.liveClassRegistration) {
          await tx.liveClassRegistration.delete({
            where: { id: payment.liveClassRegistration.id },
          });
        }

        // Unlink mentor booking if attached
        if (payment.mentorBooking) {
          await tx.mentorBooking.update({
            where: { id: payment.mentorBooking.id },
            data: { paymentId: null },
          });
        }

        // Delete material purchases tied to this payment
        if (payment.materialId) {
          await tx.materialPurchase.deleteMany({
            where: { paymentId: payment.id },
          });
        }

        // Delete hackathon registration tied to this payment
        if (payment.hackathonId) {
          await tx.hackathonRegistration.deleteMany({
            where: { paymentId: payment.id },
          });
        }

        // Delete payment reminder if attached
        await tx.scheduledPaymentReminder.deleteMany({
          where: { paymentId: payment.id },
        });

        // Delete the payment record itself
        await tx.payment.delete({
          where: { id: payment.id },
        });

        // If courseId exists and either deleteEnrollment is true or no other completed/pending payments remain for this course
        if (targetCourseId) {
          const otherValidPayments = await tx.payment.count({
            where: {
              userId: payment.userId,
              courseId: targetCourseId,
              status: { in: ['COMPLETED', 'PENDING'] },
            },
          });

          if (deleteEnrollment || otherValidPayments === 0) {
            await tx.enrollment.deleteMany({
              where: { userId: payment.userId, courseId: targetCourseId },
            });
            await tx.batchEnrollment.deleteMany({
              where: { studentId: payment.userId, batch: { courseId: targetCourseId } },
            });
          }
        }
      });

      await logAdminAction(
        req.user?.id,
        'DELETE_PAYMENT_ORDER',
        `Payment: ${payment.id}`,
        `Permanently deleted ${payment.status} payment order ${payment.razorpayOrderId} for student ${payment.user.name} (${payment.user.email}). Reason: ${reason || 'Admin deletion'}`
      );

      return res.json({
        success: true,
        message: `Payment order ${payment.razorpayOrderId} and related course records deleted successfully.`,
        deleted: true,
        removedEnrollment: !payment.courseId ? false : true,
      });
    }

    // For REFUNDED or other statuses:
    throw new AppError(
      `Cannot directly delete a payment record with status: ${payment.status}. Please archive instead to preserve audit trail.`,
      400
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 13. POST /api/admin/payments/:id/revoke-access
 * Explicitly revoke student course enrollment associated with a payment or order
 */
export const revokeStudentPaymentAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id || req.params.paymentId);
    const { reason } = req.body || {};

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!payment) throw new AppError('Payment record not found', 404);

    if (payment.courseId) {
      const targetCourseId = payment.courseId;
      await prisma.$transaction(async (tx) => {
        await tx.enrollment.deleteMany({
          where: { userId: payment.userId, courseId: targetCourseId },
        });

        await tx.batchEnrollment.deleteMany({
          where: {
            studentId: payment.userId,
            batch: { courseId: targetCourseId },
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            adminNotes: `[COURSE ACCESS REVOKED on ${new Date().toISOString()} by ${req.user?.email || 'admin'}] Reason: ${reason || 'Admin revoked access'}. ${payment.adminNotes || ''}`,
          },
        });
      });

      await logAdminAction(
        req.user?.id,
        'REVOKE_COURSE_ACCESS',
        `Course: ${payment.courseId}, Student: ${payment.userId}`,
        `Revoked course access for ${payment.user.name} on course "${payment.course?.title}". Reason: ${reason || 'Administrative Action'}`
      );

      return res.json({
        success: true,
        message: `Course access revoked for student ${payment.user.name}. Financial ledger remains intact.`,
      });
    }

    res.json({ success: true, message: 'No course enrollment tied to this payment record.' });
  } catch (error) {
    next(error);
  }
};


/**
 * 14. POST /api/admin/payments/reset-all
 * Completely reset all payment orders, transactions, and student course enrollments
 * to start fresh with a clean ledger.
 */
export const resetAllPaymentsAndEnrollments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { confirmText } = req.body || {};

    if (confirmText !== 'RESET_ALL_PAYMENTS') {
      throw new AppError('Confirmation phrase "RESET_ALL_PAYMENTS" is required to execute a complete payment ledger reset.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all coupon redemptions
      const couponRedemptions = await tx.couponRedemption.deleteMany({});

      // 2. Delete all material purchases
      const materialPurchases = await tx.materialPurchase.deleteMany({});

      // 3. Delete all hackathon registrations
      const hackathonRegistrations = await tx.hackathonRegistration.deleteMany({});

      // 4. Delete all live class registrations
      const liveClassRegistrations = await tx.liveClassRegistration.deleteMany({});

      // 5. Unlink mentor bookings
      await tx.mentorBooking.updateMany({
        data: { paymentId: null },
      });

      // 6. Delete scheduled payment reminders
      const reminders = await tx.scheduledPaymentReminder.deleteMany({});

      // 7. Delete all payment records (including COMPLETED, PENDING, FAILED, REFUNDED)
      const payments = await tx.payment.deleteMany({});

      // 8. Delete all course enrollments and batch enrollments so student dashboard is completely fresh
      const enrollments = await tx.enrollment.deleteMany({});
      const batchEnrollments = await tx.batchEnrollment.deleteMany({});

      return {
        paymentsDeleted: payments.count,
        enrollmentsDeleted: enrollments.count,
        batchEnrollmentsDeleted: batchEnrollments.count,
        couponRedemptionsDeleted: couponRedemptions.count,
        materialPurchasesDeleted: materialPurchases.count,
        hackathonRegistrationsDeleted: hackathonRegistrations.count,
        liveClassRegistrationsDeleted: liveClassRegistrations.count,
      };
    });

    await logAdminAction(
      req.user?.id,
      'RESET_ALL_PAYMENTS',
      'System Financial Ledger',
      `Executed complete platform payment and enrollment reset: ${result.paymentsDeleted} payments and ${result.enrollmentsDeleted} enrollments deleted.`
    );

    res.json({
      success: true,
      message: 'All payment orders and associated enrollments have been reset successfully. System is now fresh from clean slate.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
