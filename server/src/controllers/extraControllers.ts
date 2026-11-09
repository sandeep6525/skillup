import { Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { generateCertificatePDF } from '../utils/pdf';
import { sendEmail, emailTemplates } from '../services/emailService';

// ---------------- MENTORS ----------------
export const getMentors = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentors = await prisma.mentorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            title: true,
            email: true,
            _count: {
              select: {
                liveClassesInstructed: true,
                mentorBookings: true,
              },
            },
          },
        },
        slots: { where: { isBooked: false, startTime: { gt: new Date() } }, orderBy: { startTime: 'asc' } },
      },
    });
    res.json({ success: true, data: mentors });
  } catch (error) {
    next(error);
  }
};

export const createMentorSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const mentorProfile = await prisma.mentorProfile.findUnique({ where: { userId: req.user.id } });
    if (!mentorProfile) throw new AppError('Mentor profile not found', 404);

    const { startTime, endTime } = req.body;
    const slot = await prisma.mentorSlot.create({
      data: {
        mentorId: mentorProfile.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

export const bookMentorSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { slotId, notes } = req.body;

    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.mentorSlot.findUnique({
        where: { id: String(slotId) },
        include: { mentor: true },
      });

      if (!slot) throw new AppError('Slot not found', 404);
      if (slot.isBooked) throw new AppError('This slot has already been booked by another student', 400);

      await tx.mentorSlot.update({
        where: { id: String(slotId) },
        data: { isBooked: true },
      });

      return tx.mentorBooking.create({
        data: {
          studentId: req.user!.id,
          mentorProfileId: slot.mentorId,
          slotId: slot.id,
          notes,
          amount: slot.mentor.hourlyRate,
          meetingLink: `https://meet.jit.si/skillup-mentor-${Date.now()}`,
        },
      });
    });

    res.status(201).json({ success: true, message: 'Slot reserved successfully', data: booking });
  } catch (error) {
    next(error);
  }
};

export const getMyMentorBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const bookings = await prisma.mentorBooking.findMany({
      where: { studentId: req.user.id },
      include: {
        mentorProfile: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, title: true, email: true } },
          },
        },
        slot: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const formattedBookings = bookings.map((b: any) => ({ ...b, mentor: b.mentorProfile }));
    res.json({ success: true, data: formattedBookings });
  } catch (error) {
    next(error);
  }
};

// ---------------- LIVE CLASSES ----------------
export const getLiveClasses = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const liveClasses = await prisma.liveClass.findMany({
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { attendees: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    res.json({ success: true, data: liveClasses });
  } catch (error) {
    next(error);
  }
};

export const createLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, startTime, duration, meetingUrl, courseId } = req.body;
    const liveClass = await prisma.liveClass.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        duration: duration || 60,
        meetingUrl: meetingUrl || `https://meet.jit.si/skillup-live-${Date.now()}`,
        courseId,
      },
    });

    // Notify enrolled students of the course
    if (courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { user: { select: { id: true, email: true, name: true } }, course: { select: { title: true } } },
      });

      for (const enr of enrollments) {
        await prisma.notification.create({
          data: {
            userId: enr.userId,
            title: 'New Live Class Scheduled',
            message: `A new live class "${title}" has been scheduled for ${new Date(startTime).toLocaleString('en-IN')}.`,
            type: 'BOOKING',
            link: '/live-classes',
          },
        });

        // Send email invitation asynchronously
        sendEmail({
          to: enr.user.email,
          subject: `Live Class Invitation: ${title} — ${enr.course.title}`,
          html: emailTemplates.liveClassNotification({
            studentName: enr.user.name,
            courseTitle: enr.course.title,
            classTitle: title,
            startTime: new Date(startTime).toLocaleString('en-IN'),
            durationMins: duration || 60,
            mentorName: req.user?.name || 'SkillUp Mentor',
            meetingUrl: liveClass.meetingUrl || '',
          }).html,
        }).catch((err) => console.error('[Live Class Email Notification Error]:', err));
      }
    }

    res.status(201).json({ success: true, data: liveClass });
  } catch (error) {
    next(error);
  }
};

// ---------------- ASSIGNMENTS (COURSE & INTERNSHIP) ----------------
export const getAssignments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, internshipId } = req.query;

    let whereClause: any = { isPublished: true };

    if (courseId) {
      whereClause.courseId = String(courseId);
    }
    if (internshipId) {
      whereClause.internshipId = String(internshipId);
    }

    // Role-based scoping for authenticated students
    if (req.user && req.user.role === 'STUDENT') {
      const [enrollments, batchEnrollments, internshipApplications] = await Promise.all([
        prisma.enrollment.findMany({
          where: { userId: req.user.id },
          select: { courseId: true },
        }),
        prisma.batchEnrollment.findMany({
          where: { studentId: req.user.id, isActive: true },
          select: { batchId: true },
        }),
        prisma.internshipApplication.findMany({
          where: { userId: req.user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } },
          select: { internshipId: true },
        }),
      ]);

      const enrolledCourseIds = enrollments.map((e) => e.courseId);
      const enrolledBatchIds = batchEnrollments.map((b) => b.batchId);
      const enrolledInternshipIds = internshipApplications.map((a) => a.internshipId);

      // If user has no active course or internship enrollments
      if (enrolledCourseIds.length === 0 && enrolledInternshipIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // Build target OR criteria: (Course assignments) OR (Internship assignments)
      const allowedConditions: any[] = [];

      if (enrolledCourseIds.length > 0 && !internshipId) {
        const targetCourseIds = courseId ? (enrolledCourseIds.includes(String(courseId)) ? [String(courseId)] : []) : enrolledCourseIds;
        if (targetCourseIds.length > 0) {
          allowedConditions.push({
            courseId: { in: targetCourseIds },
            OR: [
              { batchId: null },
              enrolledBatchIds.length > 0 ? { batchId: { in: enrolledBatchIds } } : { batchId: null },
            ],
          });
        }
      }

      if (enrolledInternshipIds.length > 0 && !courseId) {
        const targetInternshipIds = internshipId ? (enrolledInternshipIds.includes(String(internshipId)) ? [String(internshipId)] : []) : enrolledInternshipIds;
        if (targetInternshipIds.length > 0) {
          allowedConditions.push({
            internshipId: { in: targetInternshipIds },
          });
        }
      }

      if (allowedConditions.length === 0) {
        return res.json({ success: true, data: [] });
      }

      whereClause = {
        isPublished: true,
        OR: allowedConditions,
      };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        internship: { select: { id: true, title: true, organization: true } },
        batch: { select: { id: true, name: true, code: true } },
        submissions: req.user ? { where: { studentId: req.user.id } } : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate by assignment ID as safeguard
    const uniqueMap = new Map<string, typeof assignments[0]>();
    for (const a of assignments) {
      if (!uniqueMap.has(a.id)) {
        uniqueMap.set(a.id, a);
      }
    }

    res.json({ success: true, data: Array.from(uniqueMap.values()) });
  } catch (error) {
    next(error);
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const assignmentId = String(req.params.assignmentId);
    const { fileUrl, content } = req.body;

    if (!fileUrl && !content) {
      throw new AppError('Please provide a solution link, text content, or uploaded file URL', 400);
    }

    // 1. Verify assignment exists and student is authorized to submit
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true, internship: true },
    });

    if (!assignment) {
      throw new AppError('Assignment not found', 404);
    }

    if (req.user.role === 'STUDENT') {
      // Course-based assignment
      if (assignment.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: req.user.id, courseId: assignment.courseId },
          },
        });

        if (!enrollment) {
          throw new AppError('Access denied. You are not enrolled in the course for this assignment.', 403);
        }

        // If batch-specific, verify batch enrollment
        if (assignment.batchId) {
          const batchEnrollment = await prisma.batchEnrollment.findUnique({
            where: {
              batchId_studentId: { batchId: assignment.batchId, studentId: req.user.id },
            },
          });
          if (!batchEnrollment || !batchEnrollment.isActive) {
            throw new AppError('Access denied. You are not a member of the cohort batch for this assignment.', 403);
          }
        }
      }
      // Internship-based assignment
      else if (assignment.internshipId) {
        const app = await prisma.internshipApplication.findFirst({
          where: {
            userId: req.user.id,
            internshipId: assignment.internshipId,
            status: { in: ['ACCEPTED', 'COMPLETED'] },
          },
        });
        if (!app) {
          throw new AppError('Access denied. You do not have an active accepted enrollment in this internship.', 403);
        }
      }
    }

    // Check deadline
    const isLate = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

    // 2. Validate content / fileUrl
    const trimmedContent = content ? String(content).trim() : null;
    const trimmedFileUrl = fileUrl ? String(fileUrl).trim() : null;

    if (trimmedContent && trimmedContent.length > 10000) {
      throw new AppError('Submission content exceeds maximum allowed length of 10,000 characters', 400);
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: req.user.id,
        },
      },
      create: {
        assignmentId,
        studentId: req.user.id,
        fileUrl: trimmedFileUrl,
        content: trimmedContent,
        status: isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        fileUrl: trimmedFileUrl,
        content: trimmedContent,
        submittedAt: new Date(),
        status: isLate ? 'LATE' : 'SUBMITTED',
      },
      include: {
        assignment: { select: { title: true, totalPoints: true } },
      },
    });

    res.json({ success: true, message: 'Assignment submitted successfully', data: submission });
  } catch (error) {
    next(error);
  }
};

// ---------------- CERTIFICATES ----------------
export const getMyCertificates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const certificates = await prisma.certificate.findMany({
      where: { userId: req.user.id },
      include: { course: { select: { title: true, instructor: { select: { name: true } } } } },
    });
    res.json({ success: true, data: certificates });
  } catch (error) {
    next(error);
  }
};

export const generateCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { courseId } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId: String(courseId) } },
    });

    if (!enrollment || enrollment.progress < 100) {
      throw new AppError('You must complete 100% of the course to claim your certificate', 400);
    }

    const certificateNo = `SKILLUP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const cert = await prisma.certificate.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId: String(courseId) } },
      create: {
        certificateNo,
        userId: req.user.id,
        courseId: String(courseId),
        pdfUrl: `/api/certificates/${certificateNo}/download`,
      },
      update: {},
    });

    // In-app Notification
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: 'Certificate Issued!',
        message: `Congratulations! Your certificate ${certificateNo} is now ready for download.`,
        type: 'COURSE',
        link: `/certificates`,
      },
    });

    // Send Certificate Email (Async safe)
    try {
      const course = await prisma.course.findUnique({ where: { id: String(courseId) } });
      const emailData = emailTemplates.certificateIssued({
        studentName: req.user.name,
        courseTitle: course?.title || 'Certified Course',
        certificateNo,
        downloadUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/certificates`,
      });
      await sendEmail({
        to: req.user.email,
        subject: emailData.subject,
        html: emailData.html,
        templateCode: 'CERTIFICATE_ISSUED',
        idempotencyKey: `cert_${cert.id}`,
      });
    } catch (eErr) {
      console.error('[Certificate Email Error]:', eErr);
    }

    res.json({ success: true, message: 'Certificate generated', data: cert });
  } catch (error) {
    next(error);
  }
};

export const downloadCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const certificateNo = String(req.params.certificateNo);

    const certificate = await prisma.certificate.findUnique({
      where: { certificateNo },
      include: {
        user: { select: { id: true, name: true } },
        course: { select: { title: true, instructor: { select: { name: true } } } },
      },
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404);
    }

    generateCertificatePDF(
      {
        certificateNo: certificate.certificateNo,
        studentName: certificate.user.name,
        courseTitle: certificate.course.title,
        instructorName: certificate.course.instructor.name,
        issuedAt: certificate.issuedAt,
      },
      res
    );
  } catch (error) {
    next(error);
  }
};

// ---------------- NOTIFICATIONS ----------------
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    if (notification.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Unauthorized to delete this notification', 403);
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    await prisma.notification.deleteMany({
      where: { userId: req.user.id },
    });

    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    next(error);
  }
};

// ---------------- SUPPORT TICKETS ----------------
export const createSupportTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { subject, message, priority } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        message,
        priority: priority || 'MEDIUM',
      },
    });

    // Send asynchronous confirmation email to student
    try {
      const studentEmail = req.user.email;
      const studentName = req.user.name || 'Student';
      const emailContent = emailTemplates.ticketCreatedStudent({
        studentName,
        ticketId: ticket.id,
        subject: ticket.subject,
        message: ticket.message,
        priority: ticket.priority,
      });

      sendEmail({
        to: studentEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        templateCode: 'SUPPORT_TICKET_STUDENT',
        recipientName: studentName,
        metadata: { ticketId: ticket.id, userId: req.user.id },
      }).catch((err) => console.error('Support ticket student email delivery failed:', err.message));

      // Notify admin team
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'admin@skillup.com';
      const adminEmailContent = emailTemplates.ticketCreatedAdmin({
        studentName,
        studentEmail,
        ticketId: ticket.id,
        subject: ticket.subject,
        message: ticket.message,
        priority: ticket.priority,
      });

      sendEmail({
        to: adminEmail,
        subject: adminEmailContent.subject,
        html: adminEmailContent.html,
        templateCode: 'SUPPORT_TICKET_ADMIN_ALERT',
        recipientName: 'Administrator',
        metadata: { ticketId: ticket.id, studentId: req.user.id },
      }).catch((err) => console.error('Support ticket admin notification failed:', err.message));
    } catch (mailErr: any) {
      console.error('Failed to trigger support ticket emails:', mailErr.message);
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user.id },
      include: { replies: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

// ---------------- ADMIN DASHBOARD STATS & OPERATIONS ----------------
export const getAdminStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Forbidden', 403);

    const { days = '30' } = req.query;
    const daysNum = parseInt(String(days), 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      totalEnrollments,
      revenueResult,
      pendingPaymentsResult,
      recentPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.enrollment.count({ where: { enrolledAt: { gte: startDate } } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PENDING', createdAt: { gte: startDate } },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
    ]);

    // Monthly breakdown for the revenue curve
    const allCompletedPayments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true, createdAt: true },
    });

    const monthlyRevenue = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    allCompletedPayments.forEach((p) => {
      const month = new Date(p.createdAt).getMonth();
      monthlyRevenue[month] += Number(p.amount);
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalCourses,
        totalEnrollments,
        totalRevenue: Number(revenueResult._sum.amount || 0),
        pendingRevenue: Number(pendingPaymentsResult._sum.amount || 0),
        recentOrders: recentPayments.map((p) => ({
          id: p.razorpayOrderId || p.id.substring(0, 8),
          student: p.user?.name || 'Student',
          course: p.course?.title || 'Program',
          amount: `₹${Number(p.amount).toLocaleString('en-IN')}`,
          status: p.status === 'COMPLETED' ? 'Paid' : p.status,
          date: new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        })),
        monthlyRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Forbidden', 403);

    const { role, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role && (role === 'STUDENT' || role === 'INSTRUCTOR' || role === 'ADMIN')) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          title: true,
          createdAt: true,
          _count: { select: { enrollments: true, coursesCreated: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Forbidden', 403);

    const { userId } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
      throw new AppError('Invalid role specified', 400);
    }

    const updated = await prisma.user.update({
      where: { id: String(userId) },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ success: true, message: `User role updated to ${role}`, data: updated });
  } catch (error) {
    next(error);
  }
};

export const testAdminSMTP = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Forbidden', 403);

    const { testSMTPConnection } = await import('../services/emailService');
    const result = await testSMTPConnection();

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};


// ---------------- HOMEPAGE CMS ----------------
export const getHomepageData = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      banners,
      testimonials,
      featuredCourses,
      categories,
      mentors,
      liveClasses,
      materials,
      internships,
      approvedFeedbacks,
      totalStudents,
      totalMentors,
      totalCourses,
      totalLiveClasses,
      totalMaterials,
      totalProjects,
      reviewStats,
      distinctEnrolledStudents,
    ] = await Promise.all([
      prisma.heroBanner.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }),
      prisma.testimonial.findMany({ where: { isActive: true }, take: 6 }),
      prisma.course.findMany({
        where: { status: 'PUBLISHED' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: { select: { id: true, name: true, avatarUrl: true } },
          category: true,
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.category.findMany({ take: 6, include: { _count: { select: { courses: true } } } }),
      prisma.mentorProfile.findMany({
        take: 4,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, title: true } },
        },
      }),
      prisma.liveClass.findMany({
        where: { status: 'SCHEDULED', startTime: { gte: new Date(Date.now() - 3600 * 1000 * 2) } },
        take: 6,
        orderBy: { startTime: 'asc' },
        include: {
          course: { select: { id: true, title: true, slug: true, price: true, discountPrice: true } },
          instructor: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.learningMaterial.findMany({
        where: { isPublished: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          fileSize: true,
          price: true,
          discountPrice: true,
          isFree: true,
          thumbnailUrl: true,
          category: true,
          createdAt: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.internship.findMany({
        where: { isPublished: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          mentor: { select: { id: true, name: true, title: true, avatarUrl: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.course_feedbacks.findMany({
        where: { status: 'APPROVED', isPublished: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          courses: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
          users: { select: { id: true, name: true, avatarUrl: true, title: true, role: true } },
        },
      }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.mentorProfile.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.liveClass.count(),
      prisma.learningMaterial.count({ where: { isPublished: true } }),
      prisma.assignment.count(),
      // Aggregate real review ratings
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),
      // Query distinct enrolled users
      prisma.enrollment.findMany({
        distinct: ['userId'],
        select: { userId: true },
      }),
    ]);

    // Calculate real dynamic feedback & review average rating
    const reviewAvg = reviewStats._avg.rating;
    const reviewCount = reviewStats._count.id;
    let avgRating = 0;
    let totalReviews = 0;

    if (reviewCount > 0 && reviewAvg !== null) {
      avgRating = Number(reviewAvg.toFixed(1));
      totalReviews = reviewCount;
    } else if (approvedFeedbacks.length > 0) {
      const sum = approvedFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = Number((sum / approvedFeedbacks.length).toFixed(1));
      totalReviews = approvedFeedbacks.length;
    } else if (testimonials.length > 0) {
      const sum = testimonials.reduce((acc, curr) => acc + (curr.rating || 5), 0);
      avgRating = Number((sum / testimonials.length).toFixed(1));
      totalReviews = testimonials.length;
    }

    let studentSatisfaction = '100%';
    if (avgRating > 0) {
      studentSatisfaction = `${Math.round((avgRating / 5) * 100)}%`;
    }

    // Real enrolled unique student count
    const uniqueEnrolledStudents = distinctEnrolledStudents.length;

    res.json({
      success: true,
      data: {
        banners,
        testimonials,
        featuredCourses,
        categories,
        mentors,
        liveClasses,
        materials,
        internships,
        feedbacks: approvedFeedbacks,
        stats: {
          totalStudents: uniqueEnrolledStudents,
          totalProjects: totalProjects || 0,
          averageRating: avgRating,
          totalReviews,
          totalMentors: totalMentors || 0,
          totalCourses: totalCourses || 0,
          totalLiveClasses: totalLiveClasses || 0,
          totalMaterials: totalMaterials || 0,
          studentSatisfaction,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

