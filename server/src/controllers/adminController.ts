import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { testSMTPConnection, sendEmail, emailTemplates } from '../services/emailService';
import { generateCorporateExcelWorkbook, ReportColumn, ReportSummaryItem } from '../utils/excelExporter';

// Helper to log audit actions
const createAuditLog = async (userId: string | undefined, action: string, resource: string, details?: string) => {
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
    console.error('Failed to log audit event:', err);
  }
};

/**
 * 1. GET /api/admin/overview - Real platform-wide telemetry & commercial analytics
 */
export const getAdminOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalCourses,
      totalBatches,
      totalEnrollments,
      totalPayments,
      pendingPayments,
      refundRequests,
      upcomingClasses,
      pendingTickets,
      recentUsers,
      recentPayments,
      recentAudits,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.batch.count(),
      prisma.enrollment.count(),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true, remainingBalance: true },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'REFUNDED' } }),
      prisma.liveClass.count({ where: { startTime: { gte: new Date() } } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, isVerified: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const actualCollectedRevenue = Number(totalPayments._sum.amount || 0);
    const outstandingBalance = Number(totalPayments._sum.remainingBalance || 0);

    // Compute actual monthly revenue distribution for past 12 months from database
    const monthlyRevenue = Array(12).fill(0);
    const completedPaymentsAll = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true, createdAt: true },
    });

    const now = new Date();
    for (const p of completedPaymentsAll) {
      const pDate = new Date(p.createdAt);
      // Calculate months difference
      const diffMonths = (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth());
      if (diffMonths >= 0 && diffMonths < 12) {
        // Index 11 is current month, 10 is previous month, etc.
        const monthIndex = 11 - diffMonths;
        monthlyRevenue[monthIndex] += Number(p.amount);
      }
    }

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          totalStudents,
          totalInstructors,
          totalCourses,
          totalBatches,
          totalEnrollments,
          totalRevenue: actualCollectedRevenue, // Money actually received
          actualCollectedRevenue,
          outstandingBalance, // Clearly distinguished, not counted as revenue
          pendingPayments,
          refundRequests,
          upcomingClasses,
          pendingTickets,
        },
        monthlyRevenue,
        recentUsers,
        recentPayments,
        recentAudits,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. USER MANAGEMENT
 * GET /api/admin/users
 */
export const getAdminUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search ? String(req.query.search) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          isVerified: true,
          title: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              mentorAssignments: true,
              coursesCreated: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:userId/role - Update user role & permissions
 */
export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await createAuditLog(req.user?.id, 'UPDATE_ROLE', `User: ${user.name} (${user.id})`, `Role updated to ${role}`);

    res.json({ success: true, data: user, message: `Role updated to ${role}` });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:userId/status - Toggle user active/verified status
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const { isVerified } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: Boolean(isVerified) },
      select: { id: true, name: true, email: true, isVerified: true },
    });

    await createAuditLog(req.user?.id, 'TOGGLE_STATUS', `User: ${user.name}`, `Verification set to ${isVerified}`);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. MENTOR MANAGEMENT & ONBOARDING WORKFLOW
 * POST /api/admin/mentors/invite - Admin invites/creates a new Mentor
 */
export const inviteMentor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, title, courseId, batchId } = req.body;

    if (!name || !email) {
      throw new AppError('Mentor name and email are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.role === 'INSTRUCTOR') {
        throw new AppError('A mentor account with this email already exists', 400);
      } else {
        throw new AppError(`An account with this email already exists as a ${existingUser.role.toLowerCase()}`, 400);
      }
    }

    // Verify course/batch existence if provided
    let assignedCourseTitle: string | null = null;
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Specified course not found', 404);
      assignedCourseTitle = course.title;
    }

    if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw new AppError('Specified batch not found', 404);
    }

    // Generate single-use, secure, expiring invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours validity

    // Store invitation record (invaliding any prior pending invitations for this email)
    await prisma.mentorInvitation.deleteMany({
      where: { email: normalizedEmail, isUsed: false },
    });

    const invitation = await prisma.mentorInvitation.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        title: title ? title.trim() : 'Teaching Mentor',
        courseId: courseId || null,
        batchId: batchId || null,
        tokenHashed,
        expiresAt,
        createdBy: req.user?.id || 'admin',
      },
    });

    const activationUrl = `${config.clientUrl}/activate-mentor?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    // Send invitation email
    const template = emailTemplates.mentorInvitation({
      name: name.trim(),
      activationUrl,
      courseTitle: assignedCourseTitle,
    });

    let emailDelivered = false;
    let emailStatusMessage = '';

    try {
      const sendResult = await sendEmail({
        to: normalizedEmail,
        subject: template.subject,
        html: template.html,
        templateCode: 'MENTOR_INVITATION',
        idempotencyKey: `mentor_invitation_${invitation.id}_${Date.now()}`,
      });
      emailDelivered = Boolean(sendResult && !sendResult.skipped);
      emailStatusMessage = emailDelivered
        ? `Invitation email sent to ${normalizedEmail}`
        : `Email dispatched (Development delivery mode)`;
    } catch (mailErr: any) {
      console.warn('[Mentor Invitation Email Notice]:', mailErr?.message);
      emailDelivered = false;
      emailStatusMessage = 'Development Mode: Email server did not send message. Use the secure activation link directly.';
    }

    await createAuditLog(
      req.user?.id,
      'INVITE_MENTOR',
      `Mentor: ${name} (${normalizedEmail})`,
      `Invited with initial Course: ${assignedCourseTitle || 'NONE'}`
    );

    res.status(201).json({
      success: true,
      message: `Mentor account created and invitation issued successfully. ${emailStatusMessage}`,
      data: {
        id: invitation.id,
        name: invitation.name,
        email: invitation.email,
        title: invitation.title,
        expiresAt: invitation.expiresAt,
        emailDelivered,
        activationUrl: config.nodeEnv !== 'production' ? activationUrl : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/assign - Central Admin Mentor Assignment (AUTOMATIC STUDENT SYNC)
 */
export const assignMentorToScope = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mentorId, courseId, batchId, scope } = req.body;

    if (!mentorId || !courseId) {
      throw new AppError('Mentor ID and Course ID are required', 400);
    }

    const mentor = await prisma.user.findUnique({ where: { id: String(mentorId) } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    if (mentor.role !== 'INSTRUCTOR' && mentor.role !== 'ADMIN') {
      throw new AppError('Assigned user must have a Mentor/Instructor or Admin role', 400);
    }

    if (!mentor.isVerified && mentor.role !== 'ADMIN') {
      throw new AppError('Cannot assign deactivated or unverified mentor. Please activate the mentor account first.', 400);
    }

    const course = await prisma.course.findUnique({ where: { id: String(courseId) } });
    if (!course) throw new AppError('Course not found', 404);

    // Validate scope and batch
    const isCourseWide = !batchId || scope === 'COURSE_WIDE';
    const effectiveScope = isCourseWide ? 'COURSE_WIDE' : 'SPECIFIC_BATCH';
    const normalizedBatchId = isCourseWide ? null : String(batchId);

    // If a specific batch is provided, validate that it belongs to the selected course
    let targetBatch = null;
    if (normalizedBatchId) {
      targetBatch = await prisma.batch.findUnique({ where: { id: normalizedBatchId } });
      if (!targetBatch) {
        throw new AppError('Selected batch not found', 404);
      }
      if (targetBatch.courseId !== course.id) {
        throw new AppError('The selected batch does not belong to the selected course', 400);
      }
    }

    // Separate Course-wide and Specific-Batch assignment creation/update to avoid Prisma composite null constraint issues
    let assignment;
    if (isCourseWide) {
      // Find existing course-wide assignment for this mentor and course
      const existingCourseWide = await prisma.mentorAssignment.findFirst({
        where: {
          mentorId: mentor.id,
          courseId: course.id,
          batchId: null,
        },
      });

      if (existingCourseWide) {
        assignment = await prisma.mentorAssignment.update({
          where: { id: existingCourseWide.id },
          data: {
            scope: 'COURSE_WIDE',
            updatedAt: new Date(),
          },
          include: {
            mentor: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        });
      } else {
        assignment = await prisma.mentorAssignment.create({
          data: {
            mentorId: mentor.id,
            courseId: course.id,
            batchId: null,
            scope: 'COURSE_WIDE',
          },
          include: {
            mentor: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        });
      }
    } else {
      // Specific batch assignment: safe to query by unique mentorId, courseId, batchId
      const existingBatchAssignment = await prisma.mentorAssignment.findFirst({
        where: {
          mentorId: mentor.id,
          courseId: course.id,
          batchId: normalizedBatchId,
        },
      });

      if (existingBatchAssignment) {
        assignment = await prisma.mentorAssignment.update({
          where: { id: existingBatchAssignment.id },
          data: {
            scope: 'SPECIFIC_BATCH',
            updatedAt: new Date(),
          },
          include: {
            mentor: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        });
      } else {
        assignment = await prisma.mentorAssignment.create({
          data: {
            mentorId: mentor.id,
            courseId: course.id,
            batchId: normalizedBatchId,
            scope: 'SPECIFIC_BATCH',
          },
          include: {
            mentor: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        });
      }
    }

    // Automatic Student Synchronization:
    // If a specific batch was selected, ensure all enrolled course students for that batch are linked in batchEnrollment
    if (normalizedBatchId) {
      const existingEnrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id },
        select: { userId: true },
      });

      for (const enr of existingEnrollments) {
        await prisma.batchEnrollment.upsert({
          where: {
            batchId_studentId: {
              batchId: normalizedBatchId,
              studentId: enr.userId,
            },
          },
          create: {
            batchId: normalizedBatchId,
            studentId: enr.userId,
            isActive: true,
          },
          update: { isActive: true },
        });
      }
    }

    // Notify mentor of new course/batch assignment
    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: `Assigned to: ${assignment.course.title}`,
        message: `You have been assigned to mentor ${assignment.batch ? assignment.batch.name : 'all batches in this course (Course-wide)'}. All enrolled students are now automatically available in your Mentor Portal.`,
        type: 'COURSE',
        link: '/mentor-dashboard',
      },
    }).catch(() => {});

    // Send email to mentor with idempotency
    try {
      if (mentor.email) {
        const studentCount = normalizedBatchId
          ? await prisma.batchEnrollment.count({ where: { batchId: normalizedBatchId, isActive: true } })
          : await prisma.enrollment.count({ where: { courseId: course.id } });

        const emailData = emailTemplates.mentorCourseAssigned({
          mentorName: mentor.name,
          courseTitle: assignment.course.title,
          batchName: assignment.batch?.name || null,
          studentCount,
        });

        await sendEmail({
          to: mentor.email,
          subject: emailData.subject,
          html: emailData.html,
          templateCode: 'MENTOR_COURSE_ASSIGNED',
          idempotencyKey: `mentor_assign_${mentor.id}_${course.id}_${normalizedBatchId || 'all'}`,
        });
      }
    } catch (eErr) {
      console.error('[Mentor Assignment Email Error]:', eErr);
    }

    await createAuditLog(
      req.user?.id,
      'ASSIGN_MENTOR',
      `Mentor: ${mentor.name}`,
      `Assigned to Course: ${assignment.course.title}, Batch: ${assignment.batch?.code || 'ALL (Course-wide)'}`
    );

    res.status(201).json({
      success: true,
      message: 'Mentor assigned successfully. Eligible students are now automatically linked.',
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/mentors - List all mentors with assigned batches, courses, status, and enrolled student counts
 */
export const getAdminMentors = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentors = await prisma.user.findMany({
      where: { role: { in: ['INSTRUCTOR', 'ADMIN'] } },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        title: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        mentorProfile: true,
        mentorAssignments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
                enrollments: {
                  select: { userId: true },
                },
              },
            },
            batch: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
                startDate: true,
                endDate: true,
                enrollments: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    studentId: true,
                    student: { select: { id: true, name: true, email: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute aggregated statistics for each mentor
    const formattedMentors = mentors.map((m) => {
      const assignedCoursesMap = new Map<string, any>();
      const assignedBatchesMap = new Map<string, any>();
      const studentIdsSet = new Set<string>();

      m.mentorAssignments.forEach((a) => {
        if (a.course) {
          assignedCoursesMap.set(a.course.id, a.course);
          // If course-wide, add all enrolled students of this course to student count
          if (!a.batchId || a.scope === 'COURSE_WIDE') {
            a.course.enrollments?.forEach((e: any) => {
              if (e.userId) studentIdsSet.add(e.userId);
            });
          }
        }
        if (a.batch) {
          assignedBatchesMap.set(a.batch.id, a.batch);
          a.batch.enrollments?.forEach((e) => {
            if (e.studentId) studentIdsSet.add(e.studentId);
          });
        }
      });

      return {
        ...m,
        assignedCoursesCount: assignedCoursesMap.size,
        assignedBatchesCount: assignedBatchesMap.size,
        totalStudentsUnderCohorts: studentIdsSet.size,
        assignedCourses: Array.from(assignedCoursesMap.values()),
        assignedBatches: Array.from(assignedBatchesMap.values()),
      };
    });

    // Also fetch pending invitations for complete visibility
    const pendingInvitations = await prisma.mentorInvitation.findMany({
      where: { isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { mentors: formattedMentors, pendingInvitations } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/mentors/:id - Get detailed mentor profile, assignments, and audit tracking
 */
export const getAdminMentorById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const mentor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        title: true,
        bio: true,
        phone: true,
        college: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        mentorProfile: true,
        mentorAssignments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnailUrl: true,
                enrollments: {
                  select: {
                    id: true,
                    userId: true,
                    enrolledAt: true,
                    user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                  },
                },
              },
            },
            batch: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
                startDate: true,
                endDate: true,
                enrollments: {
                  where: { isActive: true },
                  select: {
                    id: true,
                    studentId: true,
                    enrolledAt: true,
                    student: { select: { id: true, name: true, email: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
        liveClassesInstructed: {
          take: 10,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            title: true,
            startTime: true,
            status: true,
            meetingUrl: true,
            meetingProvider: true,
            course: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!mentor) {
      throw new AppError('Mentor not found', 404);
    }

    const latestInvitation = await prisma.mentorInvitation.findFirst({
      where: { email: mentor.email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    });

    // Compute aggregated student count including course-wide assignments
    const studentIdsSet = new Set<string>();
    mentor.mentorAssignments.forEach((a) => {
      if (a.batch) {
        a.batch.enrollments?.forEach((e) => {
          if (e.studentId) studentIdsSet.add(e.studentId);
        });
      } else if (a.course) {
        a.course.enrollments?.forEach((e: any) => {
          if (e.userId) studentIdsSet.add(e.userId);
        });
      }
    });

    res.json({
      success: true,
      data: {
        ...mentor,
        totalStudentsUnderCohorts: studentIdsSet.size,
        invitationStatus: latestInvitation
          ? latestInvitation.isUsed
            ? 'ACTIVATED'
            : latestInvitation.expiresAt < new Date()
            ? 'EXPIRED'
            : 'PENDING'
          : mentor.isVerified
          ? 'ACTIVE'
          : 'UNVERIFIED',
        latestInvitation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/mentors/:id - Update mentor profile details
 */
export const updateMentorProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { name, title, bio, phone, college, expertise, hourlyRate, about } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new AppError('Mentor not found', 404);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(title !== undefined ? { title: title ? String(title).trim() : null } : {}),
        ...(bio !== undefined ? { bio: bio ? String(bio).trim() : null } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(college !== undefined ? { college: college ? String(college).trim() : null } : {}),
      },
    });

    if (expertise || hourlyRate !== undefined || about !== undefined) {
      await prisma.mentorProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          expertise: expertise ? String(expertise) : 'Teaching Mentor',
          hourlyRate: Number(hourlyRate) || 0,
          about: about ? String(about) : '',
        },
        update: {
          ...(expertise ? { expertise: String(expertise) } : {}),
          ...(hourlyRate !== undefined ? { hourlyRate: Number(hourlyRate) } : {}),
          ...(about !== undefined ? { about: String(about) } : {}),
        },
      });
    }

    await createAuditLog(
      req.user?.id,
      'UPDATE_MENTOR_PROFILE',
      `Mentor: ${updatedUser.name} (${id})`,
      'Updated mentor demographic profile'
    );

    res.json({ success: true, message: 'Mentor profile updated successfully', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/:id/resend-invitation - Resend activation link with fresh 48-hour token
 */
export const resendMentorInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });

    let email = user ? user.email : '';
    let name = user ? user.name : '';

    if (!user) {
      // Check if id is an invitation id
      const inv = await prisma.mentorInvitation.findUnique({ where: { id } });
      if (!inv) throw new AppError('Mentor or invitation record not found', 404);
      email = inv.email;
      name = inv.name;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Invalidate existing pending invitations
    await prisma.mentorInvitation.deleteMany({
      where: { email: normalizedEmail, isUsed: false },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const newInvitation = await prisma.mentorInvitation.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        title: user?.title || 'Teaching Mentor',
        tokenHashed,
        expiresAt,
        createdBy: req.user?.id || 'admin',
      },
    });

    const activationUrl = `${config.clientUrl}/activate-mentor?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    let emailDelivered = false;
    try {
      const template = emailTemplates.mentorInvitation({
        name: name.trim(),
        activationUrl,
        courseTitle: null,
      });

      const sendResult = await sendEmail({
        to: normalizedEmail,
        subject: template.subject,
        html: template.html,
        templateCode: 'MENTOR_INVITATION_RESEND',
        idempotencyKey: `mentor_resend_${newInvitation.id}_${Date.now()}`,
      });
      emailDelivered = Boolean(sendResult && !sendResult.skipped);
    } catch (err: any) {
      console.warn('[Resend Invitation Email Notice]:', err?.message);
    }

    await createAuditLog(
      req.user?.id,
      'RESEND_MENTOR_INVITATION',
      `Mentor: ${name} (${normalizedEmail})`,
      'Issued fresh 48-hour secure activation token'
    );

    res.json({
      success: true,
      message: emailDelivered
        ? `Fresh activation link sent to ${normalizedEmail}.`
        : 'Fresh activation link generated.',
      data: {
        emailDelivered,
        expiresAt: newInvitation.expiresAt,
        activationUrl: config.nodeEnv !== 'production' ? activationUrl : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/:id/deactivate - Deactivate mentor, revoke tokens/sessions
 */
export const deactivateMentor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;

    const mentor = await prisma.user.findUnique({ where: { id } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isVerified: false,
        refreshToken: null, // Revoke active refresh token session
      },
    });

    await createAuditLog(
      req.user?.id,
      'DEACTIVATE_MENTOR',
      `Mentor: ${mentor.name} (${id})`,
      `Account deactivated. Reason: ${reason || 'Administrative action'}`
    );

    res.json({
      success: true,
      message: `Mentor ${mentor.name} has been deactivated. Login and class scheduling access revoked.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/:id/reactivate - Reactivate mentor access
 */
export const reactivateMentor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const mentor = await prisma.user.findUnique({ where: { id } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { isVerified: true },
    });

    await createAuditLog(
      req.user?.id,
      'REACTIVATE_MENTOR',
      `Mentor: ${mentor.name} (${id})`,
      'Account reactivated by administrator'
    );

    res.json({
      success: true,
      message: `Mentor ${mentor.name} has been reactivated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/:id/assignments/courses - Assign a course to a mentor
 */
export const assignMentorCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentorId = String(req.params.id);
    const { courseId, batchId } = req.body;

    if (!courseId) throw new AppError('Course ID is required', 400);

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const course = await prisma.course.findUnique({ where: { id: String(courseId) } });
    if (!course) throw new AppError('Course not found', 404);

    let assignment;
    const existing = await prisma.mentorAssignment.findFirst({
      where: {
        mentorId,
        courseId: String(courseId),
        ...(batchId ? { batchId: String(batchId) } : { batchId: null }),
      },
    });

    if (existing) {
      assignment = await prisma.mentorAssignment.update({
        where: { id: existing.id },
        data: { scope: batchId ? 'SPECIFIC_BATCH' : 'COURSE_WIDE' },
        include: {
          course: { select: { title: true } },
          batch: { select: { name: true, code: true } },
        },
      });
    } else {
      assignment = await prisma.mentorAssignment.create({
        data: {
          mentorId,
          courseId: String(courseId),
          batchId: batchId ? String(batchId) : null,
          scope: batchId ? 'SPECIFIC_BATCH' : 'COURSE_WIDE',
        },
        include: {
          course: { select: { title: true } },
          batch: { select: { name: true, code: true } },
        },
      });
    }

    await createAuditLog(
      req.user?.id,
      'ASSIGN_COURSE',
      `Mentor: ${mentor.name}`,
      `Assigned course ${course.title}`
    );

    res.status(201).json({
      success: true,
      message: `Assigned course ${course.title} to mentor.`,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/mentors/:id/assignments/courses/:courseId - Remove course assignment
 */
export const removeMentorCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentorId = String(req.params.id);
    const courseId = String(req.params.courseId);

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const course = await prisma.course.findUnique({ where: { id: courseId } });

    // Remove all assignments linking this mentor to this course
    const deleted = await prisma.mentorAssignment.deleteMany({
      where: { mentorId, courseId },
    });

    await createAuditLog(
      req.user?.id,
      'REMOVE_COURSE_ASSIGNMENT',
      `Mentor: ${mentor.name}`,
      `Removed assignment for course ${course?.title || courseId}`
    );

    res.json({
      success: true,
      message: `Removed course assignment successfully. (${deleted.count} record(s) removed)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/mentors/:id/assignments/batches - Assign batch to mentor
 */
export const assignMentorBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentorId = String(req.params.id);
    const { batchId } = req.body;

    if (!batchId) throw new AppError('Batch ID is required', 400);

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const batch = await prisma.batch.findUnique({
      where: { id: String(batchId) },
      include: { course: true },
    });
    if (!batch) throw new AppError('Batch not found', 404);

    // Reassignment rule: Remove any prior mentor assigned specifically to this batch
    await prisma.mentorAssignment.deleteMany({
      where: { batchId: batch.id },
    });

    const assignment = await prisma.mentorAssignment.create({
      data: {
        mentorId,
        courseId: batch.courseId,
        batchId: batch.id,
        scope: 'SPECIFIC_BATCH',
      },
      include: {
        course: { select: { title: true } },
        batch: { select: { name: true, code: true } },
      },
    });

    await createAuditLog(
      req.user?.id,
      'ASSIGN_BATCH',
      `Mentor: ${mentor.name}`,
      `Assigned batch ${batch.code}`
    );

    res.status(201).json({
      success: true,
      message: `Assigned batch ${batch.code} to mentor.`,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/mentors/:id/assignments/batches/:batchId - Remove batch assignment
 */
export const removeMentorBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const mentorId = String(req.params.id);
    const batchId = String(req.params.batchId);

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor) throw new AppError('Mentor not found', 404);

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });

    const deleted = await prisma.mentorAssignment.deleteMany({
      where: { mentorId, batchId },
    });

    await createAuditLog(
      req.user?.id,
      'REMOVE_BATCH_ASSIGNMENT',
      `Mentor: ${mentor.name}`,
      `Removed assignment for batch ${batch?.code || batchId}`
    );

    res.json({
      success: true,
      message: `Removed batch assignment successfully. (${deleted.count} record(s) removed)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/mentors/:id - Safe mentor removal / soft archive
 */
export const removeMentor = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason, force } = req.body || {};

    const mentor = await prisma.user.findUnique({
      where: { id },
      include: {
        liveClassesInstructed: { where: { status: { in: ['SCHEDULED', 'LIVE'] } } },
        mentorAssignments: true,
      },
    });

    if (!mentor) throw new AppError('Mentor not found', 404);

    // Dependency check: Active live classes or batches
    if (mentor.liveClassesInstructed.length > 0 && !force) {
      throw new AppError(
        `Cannot remove mentor: Mentor has ${mentor.liveClassesInstructed.length} active or scheduled live classes. Please cancel or reassign them first.`,
        400
      );
    }

    // Soft archive: deactivate user, clear assignments, revoke refresh token
    await prisma.$transaction([
      prisma.mentorAssignment.deleteMany({ where: { mentorId: id } }),
      prisma.user.update({
        where: { id },
        data: {
          isVerified: false,
          refreshToken: null,
          role: 'STUDENT', // Revoke instructor role
        },
      }),
    ]);

    await createAuditLog(
      req.user?.id,
      'REMOVE_MENTOR',
      `Mentor: ${mentor.name} (${id})`,
      `Mentor revoked & soft-archived. Reason: ${reason || 'Administrative removal'}`
    );

    res.json({
      success: true,
      message: `Mentor ${mentor.name} has been safely removed and their assignments revoked. Educational history and audit trails preserved.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. BATCH MANAGEMENT
 * POST /api/admin/batches - Create a new cohort batch
 */
export const createBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, courseId, startDate, endDate, maxStudents } = req.body;

    if (!name || !code || !courseId || !startDate) {
      throw new AppError('Name, code, courseId, and startDate are required', 400);
    }

    const batch = await prisma.batch.create({
      data: {
        name,
        code,
        courseId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        maxStudents: Number(maxStudents) || 60,
      },
      include: {
        course: { select: { title: true } },
      },
    });

    await createAuditLog(req.user?.id, 'CREATE_BATCH', `Batch: ${batch.code}`, `Associated with ${batch.course.title}`);

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/batches - List all platform batches
 */
export const getAdminBatches = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        course: { select: { id: true, title: true } },
        mentorAssignments: {
          include: { mentor: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            enrollments: true,
            liveClasses: true,
            assignments: true,
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
 * 5. STUDENT ENROLLMENT ADMINISTRATION
 * POST /api/admin/students/enroll - Admin enrolls student into course and batch
 */
export const adminEnrollStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { studentId, courseId, batchId } = req.body;

    if (!studentId || !courseId) {
      throw new AppError('Student ID and Course ID are required', 400);
    }

    // 1. Course Enrollment
    const courseEnrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: studentId, courseId },
      },
      update: {},
      create: { userId: studentId, courseId, progress: 0 },
    });

    // 2. Batch Enrollment if batchId provided
    let batchEnrollment = null;
    if (batchId) {
      batchEnrollment = await prisma.batchEnrollment.upsert({
        where: {
          batchId_studentId: { batchId, studentId },
        },
        update: { isActive: true },
        create: { batchId, studentId, isActive: true },
      });
    }

    await createAuditLog(req.user?.id, 'ENROLL_STUDENT', `Student: ${studentId}`, `Enrolled in Course: ${courseId}, Batch: ${batchId || 'None'}`);

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully and automatically visible to batch mentors.',
      data: { courseEnrollment, batchEnrollment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. ORDERS, PAYMENTS & REFUNDS
 * GET /api/admin/orders
 */
export const getAdminOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';
    const productType = req.query.productType ? String(req.query.productType).trim().toUpperCase() : '';
    const minAmount = req.query.minAmount ? Number(req.query.minAmount) : undefined;
    const maxAmount = req.query.maxAmount ? Number(req.query.maxAmount) : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (productType === 'COURSE') where.courseId = { not: null };
    else if (productType === 'INTERNSHIP') where.internshipId = { not: null };
    else if (productType === 'MATERIAL') where.materialId = { not: null };
    else if (productType === 'HACKATHON') where.hackathonId = { not: null };
    else if (productType === 'LIVE_CLASS' || productType === 'LIVECLASS' || productType === 'LIVE CLASS') where.liveClassId = { not: null };

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { razorpayOrderId: { contains: search } },
        { razorpayPaymentId: { contains: search } },
        { couponCode: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { course: { title: { contains: search } } },
        { material: { title: { contains: search } } },
        { internship: { title: { contains: search } } },
        { hackathon: { title: { contains: search } } },
        { liveClass: { title: { contains: search } } },
      ];
    }

    const [totalRecords, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          course: { select: { id: true, title: true, price: true } },
          material: { select: { id: true, title: true, price: true, type: true } },
          internship: { select: { id: true, title: true, price: true } },
          hackathon: { select: { id: true, title: true, registrationFee: true } },
          liveClass: { select: { id: true, title: true, price: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/orders/:id/refund - Process refund request
 */
export const refundOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paymentId = String(req.params.id);
    const { reason } = req.body;

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundReason: reason || 'Administrative Refund',
        refundId: `ref_${Date.now()}`,
      },
      include: { user: true, course: true },
    });

    // Deactivate course enrollment upon refund
    if (payment.courseId) {
      await prisma.enrollment.deleteMany({
        where: { userId: payment.userId, courseId: payment.courseId },
      });
    }

    // Restore coupon quota and mark redemption as REFUNDED if coupon was used
    if (payment.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: payment.couponCode } });
      if (coupon && coupon.usedCount > 0) {
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { decrement: 1 } },
        });
      }

      await prisma.couponRedemption.updateMany({
        where: { paymentId: payment.id },
        data: { status: 'REFUNDED' },
      });
    }

    await createAuditLog(req.user?.id, 'REFUND_ORDER', `Payment: ${payment.id}`, `Refunded ₹${payment.amount}. Reason: ${reason}`);

    res.json({ success: true, message: 'Order refunded and access revoked successfully', data: payment });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. COLLEGE COUPONS & DISCOUNTS MANAGEMENT
 * GET /api/admin/coupons - List all coupons with stats, course info, and redemptions count
 */
export const getAdminCoupons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const college = req.query.college ? String(req.query.college).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { college: { contains: search } },
      ];
    }
    if (college) {
      where.college = { contains: college };
    }
    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, price: true } },
        internship: { select: { id: true, title: true, price: true } },
        material: { select: { id: true, title: true, price: true } },
        hackathon: { select: { id: true, title: true, registrationFee: true } },
        _count: { select: { redemptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary statistics for dashboard cards
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter((c) => c.isActive && (!c.validUntil || new Date(c.validUntil) > new Date())).length;
    const totalRedemptionsCount = coupons.reduce((sum, c) => sum + c.usedCount, 0);

    const redemptions = await prisma.couponRedemption.findMany({
      where: { status: 'COMPLETED' },
      select: { originalAmount: true, discountAmount: true, finalAmount: true },
    });
    const totalOriginalValue = redemptions.reduce((sum, r) => sum + Number(r.originalAmount), 0);
    const totalDiscountsGranted = redemptions.reduce((sum, r) => sum + Number(r.discountAmount), 0);
    const totalRevenueCollected = redemptions.reduce((sum, r) => sum + Number(r.finalAmount), 0);

    res.json({
      success: true,
      data: coupons,
      analytics: {
        totalCoupons,
        activeCoupons,
        totalRedemptionsCount,
        totalOriginalValue,
        totalDiscountsGranted,
        totalRevenueCollected,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/coupons - Create College-Specific Coupon
 */
export const createCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      code,
      name,
      description,
      college,
      courseId,
      internshipId,
      materialId,
      hackathonId,
      discountType,
      discountVal,
      minSpend,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      perStudentLimit,
      isActive,
    } = req.body;

    if (!code || discountVal === undefined || discountVal === null) {
      throw new AppError('Coupon code and discount value are required', 400);
    }

    const normalizedCode = String(code).trim().toUpperCase();

    // Check duplicate code
    const existing = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      throw new AppError(`Coupon code "${normalizedCode}" already exists`, 400);
    }

    if (discountType === 'PERCENTAGE' && (Number(discountVal) <= 0 || Number(discountVal) > 100)) {
      throw new AppError('Percentage discount must be between 1 and 100', 400);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        name: name ? String(name).trim() : null,
        description: description ? String(description).trim() : null,
        college: college ? String(college).trim() : null,
        courseId: courseId || null,
        internshipId: internshipId || null,
        materialId: materialId || null,
        hackathonId: hackathonId || null,
        discountType: discountType || 'PERCENTAGE',
        discountVal: Number(discountVal),
        minSpend: minSpend ? Number(minSpend) : null,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        usageLimit: usageLimit ? Number(usageLimit) : 100,
        perStudentLimit: perStudentLimit ? Number(perStudentLimit) : 1,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        course: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true } },
        material: { select: { id: true, title: true } },
        hackathon: { select: { id: true, title: true } },
      },
    });

    await createAuditLog(
      req.user?.id,
      'CREATE_COLLEGE_COUPON',
      `Coupon: ${coupon.code}`,
      `College: ${coupon.college || 'Universal'} | Value: ${coupon.discountVal} (${coupon.discountType})`
    );

    res.status(201).json({ success: true, data: coupon, message: 'Coupon created successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/coupons/:id - Update Coupon
 */
export const updateCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const couponId = String(req.params.id);
    const {
      name,
      description,
      college,
      courseId,
      internshipId,
      materialId,
      hackathonId,
      discountType,
      discountVal,
      minSpend,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      perStudentLimit,
      isActive,
    } = req.body;

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(name !== undefined && { name: name ? String(name).trim() : null }),
        ...(description !== undefined && { description }),
        ...(college !== undefined && { college: college ? String(college).trim() : null }),
        ...(courseId !== undefined && { courseId: courseId || null }),
        ...(internshipId !== undefined && { internshipId: internshipId || null }),
        ...(materialId !== undefined && { materialId: materialId || null }),
        ...(hackathonId !== undefined && { hackathonId: hackathonId || null }),
        ...(discountType && { discountType }),
        ...(discountVal !== undefined && { discountVal: Number(discountVal) }),
        ...(minSpend !== undefined && { minSpend: minSpend ? Number(minSpend) : null }),
        ...(maxDiscount !== undefined && { maxDiscount: maxDiscount ? Number(maxDiscount) : null }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(usageLimit !== undefined && { usageLimit: Number(usageLimit) }),
        ...(perStudentLimit !== undefined && { perStudentLimit: Number(perStudentLimit) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
      include: {
        course: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true } },
        material: { select: { id: true, title: true } },
        hackathon: { select: { id: true, title: true } },
      },
    });

    await createAuditLog(req.user?.id, 'UPDATE_COUPON', `Coupon: ${coupon.code}`, `Updated coupon settings`);

    res.json({ success: true, data: coupon, message: 'Coupon updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/coupons/:id/toggle - Toggle active/inactive status
 */
export const toggleCouponStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const couponId = String(req.params.id);
    const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!existing) throw new AppError('Coupon not found', 404);

    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: !existing.isActive },
    });

    await createAuditLog(
      req.user?.id,
      'TOGGLE_COUPON',
      `Coupon: ${coupon.code}`,
      `Active status changed to ${coupon.isActive}`
    );

    res.json({ success: true, data: coupon, message: `Coupon is now ${coupon.isActive ? 'Active' : 'Inactive'}` });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/coupons/redemptions - View redemption history with filters
 */
export const getCouponRedemptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const couponId = req.query.couponId ? String(req.query.couponId) : '';
    const status = req.query.status ? String(req.query.status) : '';

    const where: any = {};
    if (couponId) where.couponId = couponId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { coupon: { code: { contains: search } } },
        { coupon: { college: { contains: search } } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { course: { title: { contains: search } } },
      ];
    }

    const redemptions = await prisma.couponRedemption.findMany({
      where,
      include: {
        coupon: { select: { id: true, code: true, name: true, college: true, discountType: true, discountVal: true } },
        user: { select: { id: true, name: true, email: true, college: true } },
        course: { select: { id: true, title: true, price: true } },
      },
      orderBy: { redeemedAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: redemptions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/coupons/export-csv - Export coupon redemptions to CSV format
 */
export const exportCouponRedemptionsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();

    const redemptions = await prisma.couponRedemption.findMany({
      include: {
        coupon: { select: { code: true, college: true, discountType: true, discountVal: true } },
        user: { select: { name: true, email: true, college: true } },
        course: { select: { title: true } },
      },
      orderBy: { redeemedAt: 'desc' },
    });

    const totalRedemptions = redemptions.length;
    const totalDiscountsGranted = redemptions.reduce((sum, r) => sum + Number(r.discountAmount || 0), 0);
    const totalRevenueGenerated = redemptions.reduce((sum, r) => sum + Number(r.finalAmount || 0), 0);

    const summaryItems: ReportSummaryItem[] = [
      { label: 'Total Redemptions', value: totalRedemptions },
      { label: 'Total Discounts (INR)', value: `₹${totalDiscountsGranted.toLocaleString('en-IN')}` },
      { label: 'Net Revenue (INR)', value: `₹${totalRevenueGenerated.toLocaleString('en-IN')}` },
    ];

    const formattedRows = redemptions.map((r) => ({
      id: r.id,
      code: r.coupon.code,
      college: r.coupon.college || 'Universal',
      userName: r.user.name,
      userEmail: r.user.email,
      studentCollege: r.user.college || r.coupon.college || 'N/A',
      courseTitle: r.course?.title || 'General Item',
      originalAmount: Number(r.originalAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      status: r.status,
      redeemedAt: new Date(r.redeemedAt).toISOString().split('T')[0],
    }));

    const columns: ReportColumn[] = [
      { header: 'Redemption ID', key: 'id', width: 26 },
      { header: 'Coupon Code', key: 'code', width: 16, alignment: 'center' },
      { header: 'College Affiliate', key: 'college', width: 20 },
      { header: 'Student Name', key: 'userName', width: 22 },
      { header: 'Student Email', key: 'userEmail', width: 26 },
      { header: 'Student College', key: 'studentCollege', width: 22 },
      { header: 'Course / Item', key: 'courseTitle', width: 26 },
      { header: 'Original Price (INR)', key: 'originalAmount', width: 18, format: 'currency' },
      { header: 'Discount Applied (INR)', key: 'discountAmount', width: 20, format: 'currency' },
      { header: 'Final Paid (INR)', key: 'finalAmount', width: 18, format: 'currency' },
      { header: 'Status', key: 'status', width: 14, alignment: 'center' },
      { header: 'Redeemed On', key: 'redeemedAt', width: 15, format: 'date', alignment: 'center' },
    ];

    if (format === 'csv') {
      const headers = columns.map((c) => c.header);
      const escapeCsv = (val: any) => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`;
      const csvContent = [
        headers.join(','),
        ...formattedRows.map((row) => columns.map((c) => escapeCsv(row[c.key as keyof typeof row])).join(',')),
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=SkillUp_Coupon_Redemptions_${new Date().toISOString().split('T')[0]}.csv`);
      res.status(200).send(csvContent);
      return;
    }

    await generateCorporateExcelWorkbook({
      res,
      filenameBase: 'SkillUp_Coupon_Redemptions',
      sheets: [
        {
          sheetName: 'Coupon Redemptions',
          title: 'SkillUp - Institutional Coupon & Discount Redemptions',
          category: 'Promotional & Affiliate Performance',
          subtitle: `Campus Partnerships Dossier (${totalRedemptions} records)`,
          summaryItems,
          columns,
          rows: formattedRows,
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. MENTOR PAYOUTS & COMMISSIONS
 * GET /api/admin/payouts
 */
export const getAdminPayouts = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payouts = await prisma.mentorPayout.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payouts });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/payouts - Record or approve payout
 */
export const createMentorPayout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mentorId, amount, periodStart, periodEnd, notes } = req.body;

    if (!mentorId || !amount) {
      throw new AppError('Mentor ID and amount are required', 400);
    }

    const payout = await prisma.mentorPayout.create({
      data: {
        mentorId,
        amount: Number(amount),
        periodStart: new Date(periodStart || Date.now() - 30 * 86400000),
        periodEnd: new Date(periodEnd || Date.now()),
        status: 'PAID',
        notes: notes || 'Monthly verified teaching settlement',
        processedAt: new Date(),
      },
    });

    // Send Mentor Compensation Statement Email
    try {
      const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
      if (mentor && mentor.email) {
        const emailData = emailTemplates.mentorPayoutStatement({
          mentorName: mentor.name,
          amount: Number(payout.amount),
          payoutRef: `PAYOUT_${payout.id.substring(0, 8).toUpperCase()}`,
          payoutDate: payout.processedAt || new Date(),
          notes: payout.notes,
        });

        await sendEmail({
          to: mentor.email,
          subject: emailData.subject,
          html: emailData.html,
          templateCode: 'MENTOR_PAYOUT_STATEMENT',
          idempotencyKey: `payout_statement_${payout.id}`,
        });
      }
    } catch (eErr) {
      console.error('[Mentor Payout Email Error]:', eErr);
    }

    await createAuditLog(req.user?.id, 'PROCESS_PAYOUT', `Mentor: ${mentorId}`, `Settled amount ₹${amount}`);

    res.status(201).json({ success: true, data: payout });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. CERTIFICATES ADMINISTRATION
 * GET /api/admin/certificates
 */
export const getAdminCertificates = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const certs = await prisma.certificate.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });
    res.json({ success: true, data: certs });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. CMS & ANNOUNCEMENTS
 * GET /api/admin/cms
 */
export const getAdminCMS = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [banners, testimonials] = await Promise.all([
      prisma.heroBanner.findMany({ orderBy: { order: 'asc' } }),
      prisma.testimonial.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({ success: true, data: { banners, testimonials } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/cms/banners - Create hero banner
 */
export const createHeroBanner = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, subtitle, ctaText, ctaLink, badgeText, imageUrl } = req.body;
    const banner = await prisma.heroBanner.create({
      data: {
        title,
        subtitle,
        ctaText: ctaText || 'Explore Courses',
        ctaLink: ctaLink || '/courses',
        badgeText: badgeText || '🚀 SkillUp Featured',
        imageUrl,
      },
    });

    await createAuditLog(req.user?.id, 'CREATE_BANNER', `Banner: ${title}`);

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. AUDIT LOGS
 * GET /api/admin/audit-logs
 */
export const getAdminAuditLogs = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. PLATFORM SETTINGS & SMTP TEST
 * GET /api/admin/settings
 */
export const getAdminSettings = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: {
        platformName: 'SkillUp Enterprise Learning Platform',
        supportEmail: 'support@tricubedigitalsolutions.com',
        paymentGateway: 'Razorpay (Test / Live Integrated)',
        liveProvider: 'LiveKit Cloud WebRTC & Jitsi Meet',
        maintenanceMode: false,
        smtpConfigured: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. SUPPORT TICKETS (ADMIN VIEW)
 * GET /api/admin/tickets
 */
export const getAdminTickets = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tickets/:id/status
 */
export const updateAdminTicketStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, replyMessage } = req.body;
    const ticket = await prisma.supportTicket.update({
      where: { id: String(id) },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (replyMessage && String(replyMessage).trim()) {
      await prisma.ticketReply.create({
        data: {
          ticketId: String(id),
          userId: req.user!.id,
          message: String(replyMessage).trim(),
          isAdmin: true,
        },
      });
    }

    // Send email notification to student on status update / resolution
    if (ticket.user?.email) {
      try {
        const emailContent = emailTemplates.ticketStatusUpdate({
          studentName: ticket.user.name || 'Student',
          ticketId: ticket.id,
          subject: ticket.subject,
          status,
          replyMessage: replyMessage ? String(replyMessage).trim() : undefined,
        });

        sendEmail({
          to: ticket.user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          templateCode: 'SUPPORT_TICKET_STATUS_UPDATE',
          recipientName: ticket.user.name,
          metadata: { ticketId: ticket.id, status },
        }).catch((err) => console.error('Ticket status update email delivery failed:', err.message));
      } catch (mailErr: any) {
        console.error('Failed to trigger ticket status email:', mailErr.message);
      }
    }

    await createAuditLog(req.user?.id, 'UPDATE_TICKET_STATUS', `Ticket: ${id}`, `Status changed to ${status}`);
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. LIVE CLASSES (ADMIN OVERSIGHT)
 * POST /api/admin/live-classes - Admin create paid/free live class
 */
export const createAdminLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      startTime,
      duration = 60,
      courseId,
      batchId,
      internshipId,
      instructorId,
      meetingUrl,
      meetingProvider,
      fee,
      price,
      maxCapacity,
      timezone,
    } = req.body;

    if (!title || !startTime) {
      throw new AppError('Class title and scheduled start time are required', 400);
    }

    const assignedMentorId = instructorId ? String(instructorId) : req.user!.id;
    const finalPrice = Number(price !== undefined ? price : fee !== undefined ? fee : 0);
    const roomName = `skillup-room-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const liveClass = await prisma.liveClass.create({
      data: {
        roomName,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        startTime: new Date(startTime),
        duration: parseInt(String(duration), 10) || 60,
        courseId: courseId ? String(courseId) : null,
        batchId: batchId ? String(batchId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        instructorId: assignedMentorId,
        price: finalPrice,
        maxCapacity: maxCapacity ? parseInt(String(maxCapacity), 10) : 100,
        timezone: timezone ? String(timezone).trim() : 'IST',
        meetingUrl: meetingUrl ? String(meetingUrl).trim() : `/live-classes/${roomName}/room`,
        meetingProvider: meetingProvider ? String(meetingProvider).trim() : 'OTHER',
      },
      include: {
        course: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true, organization: true } },
        batch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog(
      req.user?.id,
      'CREATE_LIVE_CLASS',
      `LiveClass: ${liveClass.title} (${liveClass.id})`,
      `Admin scheduled live class with fee ₹${finalPrice}`
    );

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: {
        ...liveClass,
        price: Number(liveClass.price),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/live-classes - View all live classes with filtering
 */
export const getAdminLiveClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { mentorId, courseId, batchId, internshipId, status } = req.query;

    const where: any = {};
    if (mentorId) where.instructorId = String(mentorId);
    if (courseId) where.courseId = String(courseId);
    if (batchId) where.batchId = String(batchId);
    if (internshipId) where.internshipId = String(internshipId);
    if (status) where.status = String(status);

    const classes = await prisma.liveClass.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true, organization: true } },
        batch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
        registrations: {
          include: {
            student: { select: { id: true, name: true, email: true, phone: true } },
            payment: { select: { id: true, razorpayOrderId: true, amount: true, status: true } },
          },
        },
        _count: { select: { attendees: true, attendanceRegister: true, registrations: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    const formatted = classes.map((cls) => {
      const paidRegs = cls.registrations.filter((r) => r.status === 'PAID');
      const pendingRegs = cls.registrations.filter((r) => r.status === 'PENDING');
      const collectedRevenue = paidRegs.reduce((sum, r) => sum + Number(r.amount), 0);

      return {
        ...cls,
        price: Number(cls.price),
        totalRegistrations: cls.registrations.length,
        paidRegistrations: paidRegs.length,
        pendingRegistrations: pendingRegs.length,
        collectedRevenue,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/live-classes/:id - Reschedule, update meeting URL, fee, capacity, or reassign mentor
 */
export const updateAdminLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { title, description, startTime, duration, meetingUrl, meetingProvider, instructorId, courseId, batchId, internshipId, status, price, maxCapacity, timezone } = req.body;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: { course: true, batch: true, internship: true },
    });

    if (!liveClass) throw new AppError('Live class not found', 404);

    if (instructorId) {
      const mentor = await prisma.user.findUnique({ where: { id: String(instructorId) } });
      if (!mentor) throw new AppError('Target mentor not found', 404);
    }

    if (meetingUrl) {
      const urlPattern = /^https:\/\/[^\s$.?#].[^\s]*$/i;
      const isLocalDev = config.nodeEnv !== 'production' && (meetingUrl.startsWith('http://localhost') || meetingUrl.startsWith('/live-classes'));
      if (!isLocalDev && !urlPattern.test(meetingUrl)) {
        throw new AppError('Meeting URL must be a valid secure HTTPS link (or local development link)', 400);
      }
    }

    const updated = await prisma.liveClass.update({
      where: { id },
      data: {
        ...(title ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(startTime ? { startTime: new Date(startTime) } : {}),
        ...(duration ? { duration: Number(duration) } : {}),
        ...(courseId !== undefined ? { courseId: courseId ? String(courseId) : null } : {}),
        ...(batchId !== undefined ? { batchId: batchId ? String(batchId) : null } : {}),
        ...(internshipId !== undefined ? { internshipId: internshipId ? String(internshipId) : null } : {}),
        ...(meetingUrl ? { meetingUrl: String(meetingUrl).trim() } : {}),
        ...(meetingProvider ? { meetingProvider: String(meetingProvider).trim() } : {}),
        ...(instructorId ? { instructorId: String(instructorId) } : {}),
        ...(status ? { status } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(maxCapacity !== undefined ? { maxCapacity: parseInt(String(maxCapacity), 10) } : {}),
        ...(timezone ? { timezone: String(timezone).trim() } : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true, organization: true } },
        batch: { select: { id: true, name: true, code: true } },
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog(
      req.user?.id,
      'UPDATE_LIVE_CLASS',
      `LiveClass: ${updated.title} (${id})`,
      `Updated live class parameters / mentor reassignment`
    );

    res.json({ success: true, message: 'Live class updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/live-classes/:id - Admin cancel live class
 */
export const cancelAdminLiveClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason, forceDelete } = req.body || {};

    const liveClass = await prisma.liveClass.findUnique({
      where: { id },
      include: {
        _count: {
          select: { registrations: true, attendees: true, payments: true }
        }
      }
    });
    if (!liveClass) throw new AppError('Live class not found', 404);

    // If query ?force=true or body.forceDelete is passed, and no completed payments/attendance exist, perform a clean hard delete
    const shouldHardDelete = req.query.force === 'true' || forceDelete === true;
    if (shouldHardDelete) {
      // Clean up relations first in a transaction
      await prisma.$transaction([
        prisma.attendanceRecord.deleteMany({ where: { liveClassId: id } }),
        prisma.liveClassAttendee.deleteMany({ where: { liveClassId: id } }),
        prisma.liveClassMessage.deleteMany({ where: { liveClassId: id } }),
        prisma.liveClassRegistration.deleteMany({ where: { liveClassId: id } }),
        prisma.couponRedemption.deleteMany({ where: { liveClassId: id } }),
        prisma.liveClass.delete({ where: { id } }),
      ]);

      await createAuditLog(
        req.user?.id,
        'DELETE_LIVE_CLASS',
        `LiveClass: ${liveClass.title} (${id})`,
        `Class permanently deleted by administrator.`
      );

      return res.json({
        success: true,
        message: `Live class "${liveClass.title}" has been permanently deleted.`,
        data: null,
      });
    }

    const cancelled = await prisma.liveClass.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        course: { select: { title: true } },
        batch: { select: { name: true } },
      },
    });

    await createAuditLog(
      req.user?.id,
      'CANCEL_LIVE_CLASS',
      `LiveClass: ${liveClass.title} (${id})`,
      `Class cancelled by administrator. Reason: ${reason || 'Administrative cancellation'}`
    );

    res.json({
      success: true,
      message: `Live class "${liveClass.title}" has been cancelled. Historical attendance and records preserved.`,
      data: cancelled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. COMPREHENSIVE LEARNING & ENROLLMENT OVERSIGHT (ADMIN)
 * GET /api/admin/oversight/learning
 */
export const getAdminLearningOversight = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [courses, internships, recentMaterials, upcomingClasses] = await Promise.all([
      // 1. Courses with active enrollments, assigned mentors, materials count, and lessons count
      prisma.course.findMany({
        include: {
          instructor: { select: { id: true, name: true, email: true, title: true } },
          mentorAssignments: {
            include: {
              mentor: { select: { id: true, name: true, email: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          batches: {
            include: {
              _count: { select: { enrollments: true } },
            },
          },
          _count: {
            select: {
              enrollments: true,
              learningMaterials: true,
              liveClasses: true,
              modules: true,
            },
          },
          modules: {
            include: {
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Internships with applicant enrollments, assigned mentors, materials, and live classes
      prisma.internship.findMany({
        include: {
          mentor: { select: { id: true, name: true, email: true, title: true } },
          _count: {
            select: {
              applications: true,
              learningMaterials: true,
              liveClasses: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Recently published or updated learning materials
      prisma.learningMaterial.findMany({
        take: 10,
        include: {
          course: { select: { id: true, title: true } },
          internship: { select: { id: true, title: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      // 4. Upcoming scheduled live classes
      prisma.liveClass.findMany({
        take: 10,
        where: { status: { in: ['SCHEDULED', 'LIVE'] } },
        include: {
          course: { select: { id: true, title: true } },
          internship: { select: { id: true, title: true } },
          instructor: { select: { id: true, name: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    // Format courses summary
    const formattedCourses = courses.map((c) => {
      const totalLessons = c.modules.reduce((acc, m) => acc + (m._count?.lessons || 0), 0);
      const activeEnrollments = c._count.enrollments;
      const materialsCount = c._count.learningMaterials;
      const hasNoContent = totalLessons === 0 && materialsCount === 0;

      return {
        id: c.id,
        type: 'COURSE',
        title: c.title,
        slug: c.slug,
        status: c.status,
        price: Number(c.price),
        discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
        instructor: c.instructor,
        mentors: c.mentorAssignments.map((a) => a.mentor),
        activeEnrollments,
        totalLessons,
        materialsCount,
        liveClassesCount: c._count.liveClasses,
        hasNoContent,
      };
    });

    // Format internships summary
    const formattedInternships = internships.map((i) => {
      const materialsCount = i._count.learningMaterials;
      const liveClassesCount = i._count.liveClasses;
      const hasNoContent = materialsCount === 0 && liveClassesCount === 0;

      return {
        id: i.id,
        type: 'INTERNSHIP',
        title: i.title,
        organization: i.organization,
        isPublished: i.isPublished,
        price: Number(i.price),
        discountPrice: i.discountPrice ? Number(i.discountPrice) : null,
        mentor: i.mentor,
        activeEnrollments: i._count.applications,
        materialsCount,
        liveClassesCount,
        hasNoContent,
      };
    });

    res.json({
      success: true,
      data: {
        courses: formattedCourses,
        internships: formattedInternships,
        recentMaterials,
        upcomingClasses,
        metrics: {
          totalCourses: courses.length,
          totalInternships: internships.length,
          programsWithoutContent:
            formattedCourses.filter((c) => c.hasNoContent).length +
            formattedInternships.filter((i) => i.hasNoContent).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};



/**
 * 16. ADMIN: ALL LEARNING MATERIALS (COURSES & INTERNSHIPS)
 * GET /api/admin/materials
 */
export const getAdminMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, internshipId, search } = req.query;

    const materials = await prisma.learningMaterial.findMany({
      where: {
        ...(courseId ? { courseId: String(courseId) } : {}),
        ...(internshipId ? { internshipId: String(internshipId) } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: String(search) } },
                { description: { contains: String(search) } },
              ],
            }
          : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, code: true } },
        internship: { select: { id: true, title: true, organization: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

/**
 * 17. ADMIN: ALL ASSIGNMENTS (COURSES & INTERNSHIPS)
 * GET /api/admin/assignments
 */
export const getAdminAssignments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { courseId, internshipId, search } = req.query;

    const assignments = await prisma.assignment.findMany({
      where: {
        ...(courseId ? { courseId: String(courseId) } : {}),
        ...(internshipId ? { internshipId: String(internshipId) } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: String(search) } },
                { description: { contains: String(search) } },
              ],
            }
          : {}),
      },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true, code: true } },
        internship: { select: { id: true, title: true, organization: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. ADMIN: ALL SUBMISSIONS (COURSES & INTERNSHIPS)
 * GET /api/admin/submissions
 */
export const getAdminSubmissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { assignmentId, status, search } = req.query;

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        ...(assignmentId ? { assignmentId: String(assignmentId) } : {}),
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
              student: {
                OR: [
                  { name: { contains: String(search) } },
                  { email: { contains: String(search) } },
                ],
              },
            }
          : {}),
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignment: {
          include: {
            course: { select: { id: true, title: true } },
            internship: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};



/**
 * DELETE /api/admin/users/:userId - Delete or archive user account safely
 */
export const deleteAdminUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const currentAdminId = req.user?.id;

    if (userId === currentAdminId) {
      throw new AppError('You cannot delete your own logged-in admin account.', 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        payments: { select: { id: true, amount: true, status: true } },
        coursesCreated: { select: { id: true, title: true } },
        batchEnrollments: { select: { id: true } },
        enrollments: { select: { id: true } },
        sessionAttendances: { select: { id: true } },
        certificates: { select: { id: true } },
      },
    });

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Safety: Prevent deleting the last active Super Admin
    if (targetUser.role === 'ADMIN') {
      const activeAdminCount = await prisma.user.count({
        where: { role: 'ADMIN', isVerified: true },
      });
      if (activeAdminCount <= 1) {
        throw new AppError('Action blocked: Cannot delete the last remaining active Administrator.', 400);
      }
    }

    const isPermanent = req.body?.permanent === true || req.query?.permanent === 'true';

    const hasFinancialOrAcademicHistory =
      targetUser.payments.length > 0 ||
      targetUser.coursesCreated.length > 0 ||
      targetUser.certificates.length > 0 ||
      targetUser.enrollments.length > 0 ||
      targetUser.sessionAttendances.length > 0;

    if (hasFinancialOrAcademicHistory && !isPermanent) {
      // Soft-archive unless permanent deletion is requested
      await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
          refreshToken: null,
          bio: targetUser.bio ? `[ARCHIVED ACCOUNT] ${targetUser.bio}` : '[ARCHIVED ACCOUNT]',
        },
      });

      await createAuditLog(
        req.user?.id,
        'ARCHIVE_USER',
        `User: ${targetUser.name} (${targetUser.email})`,
        `Account deactivated & archived to preserve records.`
      );

      return res.json({
        success: true,
        archived: true,
        message: `Account for "${targetUser.name}" has completed records and has been deactivated. Click Delete again with permanent confirmation to completely wipe.`,
      });
    }

    // Permanent cascade delete: Cleanly remove all associated records
    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications, wishlists, lessonProgress, reviews
      await tx.notification.deleteMany({ where: { userId } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.lessonProgress.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.course_feedbacks.deleteMany({ where: { userId: userId } });
      await tx.ticketReply.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.couponRedemption.deleteMany({ where: { userId } });
      await tx.attendanceRecord.deleteMany({ where: { studentId: userId } });
      await tx.assignmentSubmission.deleteMany({ where: { studentId: userId } });
      await tx.assessmentSubmission.deleteMany({ where: { studentId: userId } });
      await tx.certificate.deleteMany({ where: { userId } });
      await tx.batchEnrollment.deleteMany({ where: { studentId: userId } });
      await tx.enrollment.deleteMany({ where: { userId } });
      await tx.materialPurchase.deleteMany({ where: { userId } });
      await tx.liveClassAttendee.deleteMany({ where: { userId } });
      await tx.liveClassMessage.deleteMany({ where: { userId } });
      await tx.liveClassRegistration.deleteMany({ where: { studentId: userId } });
      await tx.hackathonRegistration.deleteMany({ where: { userId } });
      await tx.internshipApplication.deleteMany({ where: { userId } });
      await tx.scheduledPaymentReminder.deleteMany({ where: { studentId: userId } });

      // 2. Mentor-specific relations
      const mentorProf = await tx.mentorProfile.findUnique({ where: { userId } });
      if (mentorProf) {
        await tx.mentorBooking.deleteMany({ where: { mentorProfileId: mentorProf.id } });
        await tx.mentorSlot.deleteMany({ where: { mentorId: mentorProf.id } });
        await tx.mentorProfile.delete({ where: { id: mentorProf.id } });
      }
      await tx.mentorBooking.deleteMany({ where: { studentId: userId } });
      await tx.mentorAssignment.deleteMany({ where: { mentorId: userId } });
      await tx.mentorAnnouncement.deleteMany({ where: { authorId: userId } });

      // 3. Unlink or clean live classes instructed
      await tx.liveClass.deleteMany({ where: { instructorId: userId } });
      await tx.internshipVideoLesson.deleteMany({ where: { mentorId: userId } });

      // 4. If instructor has courses created, reassign or delete if empty
      const createdCourses = await tx.course.findMany({ where: { instructorId: userId } });
      for (const crs of createdCourses) {
        // If course has no payments or enrollments, delete it safely
        const pCount = await tx.payment.count({ where: { courseId: crs.id } });
        const eCount = await tx.enrollment.count({ where: { courseId: crs.id } });
        if (pCount === 0 && eCount === 0) {
          await tx.module.deleteMany({ where: { courseId: crs.id } });
          await tx.course.delete({ where: { id: crs.id } });
        } else {
          // Reassign to current admin
          await tx.course.update({
            where: { id: crs.id },
            data: { instructorId: req.user!.id }
          });
        }
      }

      // 5. Delete user payments if any
      await tx.payment.deleteMany({ where: { userId } });

      // 6. Delete user account
      await tx.user.delete({ where: { id: userId } });
    });

    await createAuditLog(
      req.user?.id,
      'DELETE_USER',
      `User: ${targetUser.name} (${targetUser.email})`,
      `User account and related relations deleted permanently.`
    );

    return res.json({
      success: true,
      archived: false,
      message: `User account "${targetUser.name}" deleted permanently.`,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * DELETE /api/admin/batches/:batchId - Delete or archive batch cohort safely
 */
export const deleteAdminBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const batchId = String(req.params.batchId);

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: { select: { id: true } },
        liveClasses: { select: { id: true, title: true, status: true } },
        mentorAssignments: { select: { id: true } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!batch) {
      throw new AppError('Cohort batch not found', 404);
    }

    const hasEnrolledStudents = batch.enrollments.length > 0;
    const hasLiveClasses = batch.liveClasses.length > 0;

    if (hasEnrolledStudents || hasLiveClasses) {
      // Safe archival: Mark COMPLETED or ARCHIVED, detach active assignments
      await prisma.$transaction([
        prisma.batch.update({
          where: { id: batchId },
          data: { status: 'COMPLETED' },
        }),
        prisma.mentorAssignment.deleteMany({ where: { batchId } }),
      ]);

      await createAuditLog(
        req.user?.id,
        'ARCHIVE_BATCH',
        `Batch: ${batch.name} (${batch.code})`,
        `Batch has ${batch.enrollments.length} enrolled student(s) and ${batch.liveClasses.length} live class(es). Marked COMPLETED and unassigned mentors.`
      );

      return res.json({
        success: true,
        archived: true,
        message: `Batch "${batch.name}" (${batch.code}) has ${batch.enrollments.length} enrolled student(s) or live class history. It has been safely closed & archived to preserve student progress.`,
      });
    }

    // Permanent delete if completely unutilized
    await prisma.$transaction([
      prisma.mentorAssignment.deleteMany({ where: { batchId } }),
      prisma.batch.delete({ where: { id: batchId } }),
    ]);

    await createAuditLog(
      req.user?.id,
      'DELETE_BATCH',
      `Batch: ${batch.name} (${batch.code})`,
      `Batch permanently deleted.`
    );

    res.json({
      success: true,
      archived: false,
      message: `Batch "${batch.name}" (${batch.code}) deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/coupons/:id - Delete or deactivate coupon safely
 */
export const deleteAdminCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const couponId = String(req.params.id);

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        redemptions: { select: { id: true, finalAmount: true, redeemedAt: true } },
      },
    });

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    if (coupon.redemptions.length > 0 || coupon.usedCount > 0) {
      // Cannot delete coupons with financial redemption history
      await prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: false },
      });

      await createAuditLog(
        req.user?.id,
        'DEACTIVATE_COUPON',
        `Coupon: ${coupon.code}`,
        `Coupon has ${coupon.redemptions.length} recorded redemptions. Deactivated to preserve financial audit trail.`
      );

      return res.json({
        success: true,
        archived: true,
        message: `Coupon "${coupon.code}" has ${coupon.redemptions.length} redemption audit records. It has been safely deactivated instead of permanently destroyed.`,
      });
    }

    await prisma.coupon.delete({ where: { id: couponId } });

    await createAuditLog(
      req.user?.id,
      'DELETE_COUPON',
      `Coupon: ${coupon.code}`,
      `Unredeemed coupon permanently deleted.`
    );

    res.json({
      success: true,
      archived: false,
      message: `Coupon "${coupon.code}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/certificates/:id - Revoke and archive issued certificate
 */
export const deleteAdminCertificate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert) {
      throw new AppError('Certificate not found', 404);
    }

    await prisma.certificate.delete({ where: { id } });

    await createAuditLog(
      req.user?.id,
      'REVOKE_CERTIFICATE',
      `Certificate: ${cert.certificateNo}`,
      `Revoked for student ${cert.user.name} (${cert.user.email}) on course "${cert.course.title}".`
    );

    res.json({
      success: true,
      message: `Certificate ${cert.certificateNo} revoked successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/tickets/:id - Delete or archive support ticket
 */
export const deleteAdminTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        replies: { select: { id: true } },
      },
    });

    if (!ticket) {
      throw new AppError('Support ticket not found', 404);
    }

    // Safety: If ticket is OPEN or IN_PROGRESS and has replies, prefer closing
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && ticket.replies.length > 0) {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'CLOSED' },
      });

      await createAuditLog(
        req.user?.id,
        'CLOSE_TICKET',
        `Ticket: ${ticket.subject} (${id})`,
        `Closed active ticket with replies instead of destroying conversation history.`
      );

      return res.json({
        success: true,
        archived: true,
        message: `Ticket "${ticket.subject}" has conversation replies and was safely closed rather than permanently destroyed.`,
      });
    }

    await prisma.$transaction([
      prisma.ticketReply.deleteMany({ where: { ticketId: id } }),
      prisma.supportTicket.delete({ where: { id } }),
    ]);

    await createAuditLog(
      req.user?.id,
      'DELETE_TICKET',
      `Ticket: ${ticket.subject} (${id})`,
      `Support ticket and associated replies removed.`
    );

    res.json({
      success: true,
      archived: false,
      message: `Support ticket "${ticket.subject}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};



/**
 * DELETE /api/admin/students/:studentId/enrollments/:courseId
 * Admin removes a course enrollment or revokes course access while preserving payment history
 */
export const removeStudentEnrollment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = String(req.params.studentId);
    const courseId = String(req.params.courseId);

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: studentId, courseId },
      },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true } },
      },
    });

    if (!enrollment) {
      throw new AppError('Enrollment record not found for this student and course', 404);
    }

    // Remove enrollment and related batch enrollment for this course
    await prisma.$transaction([
      prisma.batchEnrollment.deleteMany({
        where: {
          studentId,
          batch: { courseId },
        },
      }),
      prisma.enrollment.delete({
        where: {
          userId_courseId: { userId: studentId, courseId },
        },
      }),
    ]);

    await createAuditLog(
      req.user?.id,
      'REVOKE_ENROLLMENT',
      `Student: ${enrollment.user.name} (${studentId})`,
      `Revoked access to course "${enrollment.course.title}". Financial transaction records remain intact.`
    );

    res.json({
      success: true,
      message: `Successfully revoked enrollment access to "${enrollment.course.title}" for ${enrollment.user.name}. Financial audit history is preserved.`,
    });
  } catch (error) {
    next(error);
  }
};
