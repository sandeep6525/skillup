import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/internships - Public listings
 */
export const getInternships = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const internships = await prisma.internship.findMany({
      where: { isPublished: true },
      include: {
        mentor: {
          select: { id: true, name: true, title: true, avatarUrl: true },
        },
        _count: {
          select: { applications: true },
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
 * GET /api/internships/:id - Single internship details
 */
export const getInternshipById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        mentor: {
          select: { id: true, name: true, title: true, avatarUrl: true, college: true },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!internship) throw new AppError('Internship not found', 404);

    res.json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/internships/:id/apply - Apply for free internship or initialize application
 */
export const applyInternship = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);
    const { notes, resumeUrl } = req.body;

    const internship = await prisma.internship.findUnique({
      where: { id },
    });

    if (!internship) throw new AppError('Internship not found', 404);
    if (!internship.isPublished) throw new AppError('This internship is not accepting applications', 400);

    if (internship.applicationDeadline && new Date(internship.applicationDeadline) < new Date()) {
      throw new AppError('The application deadline for this internship has passed', 400);
    }

    const applicationCount = await prisma.internshipApplication.count({
      where: { internshipId: id },
    });

    if (applicationCount >= internship.availableSeats) {
      throw new AppError('This internship has reached maximum capacity', 400);
    }

    // Check existing application
    const existing = await prisma.internshipApplication.findUnique({
      where: {
        internshipId_userId: { internshipId: id, userId: req.user.id },
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new AppError('You are already actively enrolled in this internship', 400);
      }
      return res.json({
        success: true,
        message: 'Existing application found',
        data: existing,
      });
    }

    const isPaid = Number(internship.price) > 0;

    // For free internships: activate immediately as ACCEPTED
    // For paid internships: created as PENDING until payment confirmation
    const application = await prisma.internshipApplication.create({
      data: {
        internshipId: id,
        userId: req.user.id,
        notes: notes ? String(notes) : null,
        resumeUrl: resumeUrl ? String(resumeUrl) : null,
        status: isPaid ? 'PENDING' : 'ACCEPTED',
        paidAmount: 0,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: isPaid ? 'Internship Application Initiated' : 'Internship Enrollment Confirmed',
        message: isPaid
          ? `Your application for "${internship.title}" is initiated. Complete fee payment of ₹${internship.price} to activate your seat.`
          : `Congratulations! Your seat for "${internship.title}" has been confirmed.`,
        type: 'COURSE',
      },
    });

    res.status(201).json({
      success: true,
      message: isPaid
        ? 'Application initiated. Please complete payment to activate enrollment.'
        : 'Successfully enrolled in internship!',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/internships/my/applications - Student's own applications & enrollments
 */
export const getMyInternshipApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const applications = await prisma.internshipApplication.findMany({
      where: { userId: req.user.id },
      include: {
        internship: {
          include: {
            mentor: { select: { id: true, name: true, title: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/internships - Admin: Create new internship
 */
export const createInternship = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const {
      title,
      description,
      organization,
      mentorId,
      technologies,
      duration,
      deliveryMode,
      startDate,
      endDate,
      applicationDeadline,
      eligibility,
      price,
      discountPrice,
      registrationFee,
      allowInstallments,
      minInstallmentAmount,
      installmentCount,
      installmentPolicy,
      refundPolicy,
      paymentRequiredBeforeAccess,
      availableSeats,
      bannerUrl,
      isPublished,
    } = req.body;

    if (!title || !description || !technologies) {
      throw new AppError('Title, description, and technologies are required', 400);
    }

    let assignedMentorId: string | null = null;
    if (mentorId && String(mentorId).trim() !== '' && String(mentorId).trim() !== 'none') {
      const mentor = await prisma.user.findUnique({ where: { id: String(mentorId).trim() } });
      if (!mentor) throw new AppError('Assigned mentor not found', 404);
      if (mentor.role !== 'INSTRUCTOR' && mentor.role !== 'ADMIN') {
        throw new AppError('Assigned mentor must have a Mentor/Instructor or Admin role', 400);
      }
      assignedMentorId = mentor.id;
    }

    const internship = await prisma.internship.create({
      data: {
        title: String(title).trim(),
        description: String(description).trim(),
        organization: organization ? String(organization).trim() : 'SkillUp Partner Network',
        mentorId: assignedMentorId,
        technologies: String(technologies).trim(),
        duration: duration ? String(duration).trim() : '3 Months',
        deliveryMode: deliveryMode || 'HYBRID',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        eligibility: eligibility ? String(eligibility).trim() : 'Engineering students & recent graduates',
        price: price !== undefined ? Number(price) : 0,
        discountPrice: discountPrice !== undefined && discountPrice !== null && discountPrice !== '' ? Number(discountPrice) : null,
        registrationFee: registrationFee !== undefined && registrationFee !== null && registrationFee !== '' ? Number(registrationFee) : 0,
        allowInstallments: Boolean(allowInstallments),
        minInstallmentAmount: minInstallmentAmount ? Number(minInstallmentAmount) : null,
        installmentCount: installmentCount ? Number(installmentCount) : 1,
        installmentPolicy: installmentPolicy || 'RESTRICTED',
        refundPolicy: refundPolicy ? String(refundPolicy) : null,
        paymentRequiredBeforeAccess: paymentRequiredBeforeAccess !== undefined ? Boolean(paymentRequiredBeforeAccess) : true,
        availableSeats: availableSeats !== undefined ? Number(availableSeats) : 50,
        bannerUrl: bannerUrl || null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
      include: {
        mentor: {
          select: { id: true, name: true, email: true, title: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({ success: true, data: internship });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/internships/:id - Admin: Update internship
 */
export const updateInternship = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const existingInternship = await prisma.internship.findUnique({ where: { id } });
    if (!existingInternship) throw new AppError('Internship not found', 404);

    const data: any = { ...req.body };
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.discountPrice !== undefined) data.discountPrice = data.discountPrice ? Number(data.discountPrice) : null;
    if (data.registrationFee !== undefined) data.registrationFee = data.registrationFee ? Number(data.registrationFee) : 0;
    if (data.allowInstallments !== undefined) data.allowInstallments = Boolean(data.allowInstallments);
    if (data.minInstallmentAmount !== undefined) data.minInstallmentAmount = data.minInstallmentAmount ? Number(data.minInstallmentAmount) : null;
    if (data.installmentCount !== undefined) data.installmentCount = data.installmentCount ? Number(data.installmentCount) : 1;
    if (data.paymentRequiredBeforeAccess !== undefined) data.paymentRequiredBeforeAccess = Boolean(data.paymentRequiredBeforeAccess);
    if (data.availableSeats !== undefined) data.availableSeats = Number(data.availableSeats);
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.applicationDeadline) data.applicationDeadline = new Date(data.applicationDeadline);

    // Normalize mentorId (null, empty string, or valid mentor)
    if ('mentorId' in data) {
      if (!data.mentorId || String(data.mentorId).trim() === '' || String(data.mentorId).trim() === 'none') {
        data.mentorId = null;
      } else {
        const mentor = await prisma.user.findUnique({ where: { id: String(data.mentorId).trim() } });
        if (!mentor) throw new AppError('Assigned mentor not found', 404);
        if (mentor.role !== 'INSTRUCTOR' && mentor.role !== 'ADMIN') {
          throw new AppError('Assigned mentor must have a Mentor/Instructor or Admin role', 400);
        }
        data.mentorId = mentor.id;
      }
    }

    const updated = await prisma.internship.update({
      where: { id },
      data,
      include: {
        mentor: {
          select: { id: true, name: true, email: true, title: true, avatarUrl: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/internships/:id/applicants - Admin: View applicants for a specific internship
 */
export const getInternshipApplicants = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const applicants = await prisma.internshipApplication.findMany({
      where: { internshipId: id },
      include: {
        user: { select: { id: true, name: true, email: true, college: true, phone: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json({ success: true, data: applicants });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/internships/applications/:id/status - Admin: Update applicant status
 */
export const updateApplicationStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    if (!['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'].includes(status)) {
      throw new AppError('Invalid status. Supported: PENDING, ACCEPTED, REJECTED, COMPLETED', 400);
    }

    const updated = await prisma.internshipApplication.update({
      where: { id },
      data: {
        status,
        ...(notes !== undefined ? { notes: String(notes) } : {}),
      },
      include: {
        internship: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify user of decision
    await prisma.notification.create({
      data: {
        userId: updated.userId,
        title: `Internship Status: ${status}`,
        message: `Your application status for "${updated.internship.title}" has been updated to ${status}.`,
        type: 'COURSE',
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/internships/admin/all - Admin: List all internships (published and unpublished) with full applicant statistics
 */
export const getAdminInternships = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const internships = await prisma.internship.findMany({
      include: {
        mentor: {
          select: { id: true, name: true, email: true, title: true, avatarUrl: true },
        },
        _count: {
          select: { applications: true },
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
 * GET /api/internships/admin/applications - Admin: List all student applications with filters
 */
export const getAllInternshipApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { internshipId, status, search } = req.query;

    const where: any = {};
    if (internshipId) where.internshipId = String(internshipId);
    if (status && status !== 'ALL') where.status = String(status);
    if (search) {
      where.user = {
        OR: [
          { name: { contains: String(search) } },
          { email: { contains: String(search) } },
        ],
      };
    }

    const applications = await prisma.internshipApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            college: true,
            phone: true,
            avatarUrl: true,
          },
        },
        internship: {
          include: {
            mentor: { select: { id: true, name: true, title: true } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/internships/admin/enroll - Admin: Directly enroll a student or assign mentor
 */
export const assignInternshipStudent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { internshipId, userId, status, notes } = req.body;

    if (!internshipId || !userId) {
      throw new AppError('Internship ID and User ID are required', 400);
    }

    const internship = await prisma.internship.findUnique({ where: { id: String(internshipId) } });
    if (!internship) throw new AppError('Internship not found', 404);

    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) throw new AppError('Student user not found', 404);

    const application = await prisma.internshipApplication.upsert({
      where: {
        internshipId_userId: {
          internshipId: String(internshipId),
          userId: String(userId),
        },
      },
      update: {
        status: status || 'ACCEPTED',
        notes: notes ? String(notes) : undefined,
      },
      create: {
        internshipId: String(internshipId),
        userId: String(userId),
        status: status || 'ACCEPTED',
        notes: notes ? String(notes) : 'Directly enrolled by administrator',
        paidAmount: 0,
      },
      include: {
        internship: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Internship Program Placement',
        message: `You have been allocated a placement in the "${internship.title}" internship program.`,
        type: 'COURSE',
      },
    });

    res.status(201).json({
      success: true,
      message: `Student ${user.name} assigned to internship successfully.`,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/internships/:id - Admin: Delete an internship program
 */
export const deleteInternship = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.internship.findUnique({ where: { id } });
    if (!existing) throw new AppError('Internship not found', 404);

    await prisma.internship.delete({ where: { id } });

    res.json({ success: true, message: 'Internship program deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/internships/:id/learning - Dedicated learning portal data for enrolled students, mentors, & admins
 */
export const getInternshipLearningData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        mentor: {
          select: { id: true, name: true, title: true, email: true, avatarUrl: true },
        },
        assignments: {
          where: { isPublished: true },
          include: {
            submissions: req.user ? { where: { studentId: req.user.id } } : false,
          },
          orderBy: { createdAt: 'desc' },
        },
        learningMaterials: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
        },
        videoLessons: {
          orderBy: { lessonOrder: 'asc' },
        },
        liveClasses: {
          include: {
            instructor: { select: { id: true, name: true, title: true, avatarUrl: true } },
          },
          orderBy: { startTime: 'asc' },
        },
        applications: {
          where: { status: { in: ['ACCEPTED', 'COMPLETED'] } },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, college: true } },
          },
        },
        _count: {
          select: { applications: true, liveClasses: true, learningMaterials: true, assignments: true },
        },
      },
    });

    if (!internship) throw new AppError('Internship program not found', 404);

    // Authorization check: Admins and assigned mentors have full access
    const isPrivileged = req.user.role === 'ADMIN' || internship.mentorId === req.user.id;
    let enrollment: any = null;

    if (!isPrivileged) {
      enrollment = await prisma.internshipApplication.findFirst({
        where: {
          userId: req.user.id,
          internshipId: id,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
      });

      if (!enrollment) {
        throw new AppError(
          'Access denied. You must have an active, accepted enrollment in this internship cohort to view learning materials.',
          403
        );
      }
    }

    // Mask live class private meeting URLs if outside early join window
    const now = Date.now();
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000;

    const sanitizedLiveClasses = internship.liveClasses.map((cls) => {
      const startTime = new Date(cls.startTime).getTime();
      const endTime = startTime + (cls.duration || 60) * 60 * 1000;
      const isStartingSoonOrLive =
        (now >= startTime - EARLY_JOIN_WINDOW_MS && now <= endTime) || cls.status === 'LIVE';
      const isEligibleToJoin = (isPrivileged || isStartingSoonOrLive) && cls.status !== 'CANCELLED';

      return {
        ...cls,
        canJoin: isEligibleToJoin,
        isEarlyJoinOpen: isStartingSoonOrLive,
        meetingUrl: isEligibleToJoin ? cls.meetingUrl : null,
      };
    });

    // Filter dedicated video lessons: Students see PUBLISHED only; Mentors/Admins see all
    const videoLessons = (internship.videoLessons || []).filter(
      (v) => isPrivileged || v.status === 'PUBLISHED'
    );

    // Filter learning materials into documents/files
    const documentsAndFiles = internship.learningMaterials.filter(
      (m) => m.type !== 'VIDEO_RECORDING' && !(m.fileUrl && (m.fileUrl.includes('youtube') || m.fileUrl.includes('vimeo') || m.fileUrl.endsWith('.mp4')))
    );

    // Also support any legacy recorded videos in learning materials
    const legacyRecordedVideos = internship.learningMaterials.filter(
      (m) => m.type === 'VIDEO_RECORDING' || (m.fileUrl && (m.fileUrl.includes('youtube') || m.fileUrl.includes('vimeo') || m.fileUrl.endsWith('.mp4')))
    ).map((m) => ({
      id: m.id,
      internshipId: id,
      mentorId: m.uploaderId,
      title: m.title,
      description: m.description,
      videoUrl: m.fileUrl,
      thumbnailUrl: m.thumbnailUrl,
      moduleName: m.module || 'General',
      lessonOrder: 1,
      duration: 0,
      status: m.isPublished ? 'PUBLISHED' : 'DRAFT',
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    const allVideoLessons = [...videoLessons, ...legacyRecordedVideos];

    res.json({
      success: true,
      data: {
        internship: {
          id: internship.id,
          title: internship.title,
          description: internship.description,
          organization: internship.organization,
          technologies: internship.technologies,
          duration: internship.duration,
          deliveryMode: internship.deliveryMode,
          startDate: internship.startDate,
          endDate: internship.endDate,
          mentor: internship.mentor,
        },
        enrollmentStatus: enrollment ? enrollment.status : isPrivileged ? 'INSTRUCTOR_ACCESS' : 'NONE',
        learningMaterials: documentsAndFiles,
        recordedVideos: allVideoLessons,
        videoLessons: allVideoLessons,
        liveClasses: sanitizedLiveClasses,
        assignments: internship.assignments || [],
        enrolledStudents: isPrivileged ? internship.applications.map((a: any) => a.user) : [],
        stats: {
          totalMaterials: documentsAndFiles.length,
          totalVideos: allVideoLessons.length,
          totalLiveClasses: sanitizedLiveClasses.length,
          totalAssignments: internship.assignments?.length || 0,
          totalStudents: internship.applications?.length || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * --------------------------------------------------------------------------------------
 * Dedicated Internship Video Lessons CRUD Endpoints (Mentor, Student, Admin)
 * --------------------------------------------------------------------------------------
 */

/**
 * GET /api/internships/:id/videos - Retrieve all video lessons for an internship
 */
export const getInternshipVideoLessons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const internshipId = String(req.params.id);

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      select: { id: true, mentorId: true },
    });
    if (!internship) throw new AppError('Internship program not found', 404);

    const isPrivileged = req.user.role === 'ADMIN' || internship.mentorId === req.user.id;

    if (!isPrivileged) {
      const enrollment = await prisma.internshipApplication.findFirst({
        where: {
          userId: req.user.id,
          internshipId,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
      });

      if (!enrollment) {
        throw new AppError('Access denied. You must have an active enrollment in this internship.', 403);
      }
    }

    const videoLessons = await prisma.internshipVideoLesson.findMany({
      where: {
        internshipId,
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
      },
      orderBy: { lessonOrder: 'asc' },
    });

    res.json({ success: true, data: videoLessons });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/internships/videos/:lessonId - Retrieve single video lesson details & authorized video URL
 */
export const getInternshipVideoLessonById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);

    const lesson = await prisma.internshipVideoLesson.findUnique({
      where: { id: lessonId },
      include: {
        internship: {
          select: {
            id: true,
            title: true,
            mentorId: true,
            _count: {
              select: {
                applications: { where: { status: { in: ['ACCEPTED', 'COMPLETED'] } } },
              },
            },
          },
        },
      },
    });

    if (!lesson) throw new AppError('Video lesson not found', 404);

    const isPrivileged = req.user.role === 'ADMIN' || lesson.internship.mentorId === req.user.id;

    if (!isPrivileged) {
      if (lesson.status !== 'PUBLISHED') {
        throw new AppError('This video lesson is currently unpublished and unavailable.', 403);
      }

      const enrollment = await prisma.internshipApplication.findFirst({
        where: {
          userId: req.user.id,
          internshipId: lesson.internshipId,
          status: { in: ['ACCEPTED', 'COMPLETED'] },
        },
      });

      if (!enrollment) {
        throw new AppError('Access denied. You are not enrolled in this internship program.', 403);
      }
    }

    res.json({
      success: true,
      data: {
        ...lesson,
        enrolledStudentsCount: lesson.internship._count.applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/internships/:id/videos - Mentor / Admin creates a new video lesson
 */
export const createInternshipVideoLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const internshipId = String(req.params.id);
    const { title, description, videoUrl, thumbnailUrl, moduleName, lessonOrder, duration, status } = req.body;

    if (!title || !videoUrl) {
      throw new AppError('Video lesson title and video URL are required', 400);
    }

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      select: { id: true, mentorId: true },
    });
    if (!internship) throw new AppError('Internship program not found', 404);

    if (req.user.role !== 'ADMIN' && internship.mentorId !== req.user.id) {
      throw new AppError('Unauthorized. You are not the assigned mentor for this internship program.', 403);
    }

    const lesson = await prisma.internshipVideoLesson.create({
      data: {
        internshipId,
        mentorId: req.user.id,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        videoUrl: String(videoUrl).trim(),
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null,
        moduleName: moduleName ? String(moduleName).trim() : 'Module 1: Foundations',
        lessonOrder: lessonOrder ? Number(lessonOrder) : 1,
        duration: duration ? Number(duration) : 0,
        status: status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      },
      include: {
        internship: {
          select: {
            title: true,
            _count: {
              select: {
                applications: { where: { status: { in: ['ACCEPTED', 'COMPLETED'] } } },
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Internship video lesson created successfully',
      data: {
        ...lesson,
        enrolledStudentsCount: lesson.internship._count.applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/internships/videos/:lessonId - Mentor / Admin updates video lesson
 */
export const updateInternshipVideoLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);
    const { title, description, videoUrl, thumbnailUrl, moduleName, lessonOrder, duration, status } = req.body;

    const existing = await prisma.internshipVideoLesson.findUnique({
      where: { id: lessonId },
      include: {
        internship: {
          select: {
            mentorId: true,
            _count: {
              select: {
                applications: { where: { status: { in: ['ACCEPTED', 'COMPLETED'] } } },
              },
            },
          },
        },
      },
    });
    if (!existing) throw new AppError('Video lesson not found', 404);

    if (req.user.role !== 'ADMIN' && existing.internship.mentorId !== req.user.id) {
      throw new AppError('Unauthorized. You cannot modify video lessons for an internship not assigned to you.', 403);
    }

    const updated = await prisma.internshipVideoLesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(videoUrl !== undefined ? { videoUrl: String(videoUrl).trim() } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null } : {}),
        ...(moduleName !== undefined ? { moduleName: moduleName ? String(moduleName).trim() : null } : {}),
        ...(lessonOrder !== undefined ? { lessonOrder: Number(lessonOrder) } : {}),
        ...(duration !== undefined ? { duration: Number(duration) } : {}),
        ...(status !== undefined ? { status: status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED' } : {}),
      },
    });

    res.json({
      success: true,
      message: 'Video lesson updated successfully',
      data: {
        ...updated,
        enrolledStudentsCount: existing.internship._count.applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/internships/videos/:lessonId - Mentor / Admin deletes video lesson
 */
export const deleteInternshipVideoLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);

    const existing = await prisma.internshipVideoLesson.findUnique({
      where: { id: lessonId },
      include: { internship: { select: { mentorId: true } } },
    });
    if (!existing) throw new AppError('Video lesson not found', 404);

    if (req.user.role !== 'ADMIN' && existing.internship.mentorId !== req.user.id) {
      throw new AppError('Unauthorized. You cannot delete video lessons for an internship not assigned to you.', 403);
    }

    await prisma.internshipVideoLesson.delete({ where: { id: lessonId } });

    res.json({ success: true, message: 'Internship video lesson deleted successfully' });
  } catch (error) {
    next(error);
  }
};

