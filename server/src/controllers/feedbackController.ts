import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

// Zod Schemas for Input Validation
export const studentFeedbackSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  rating: z.number().int().min(1, 'Overall rating must be between 1 and 5').max(5, 'Overall rating must be between 1 and 5'),
  contentRating: z.number().int().min(1).max(5).default(5),
  mentorRating: z.number().int().min(1).max(5).default(5),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  comment: z.string().trim().min(10, 'Feedback must be at least 10 characters').max(3000, 'Feedback cannot exceed 3000 characters'),
  suggestions: z.string().trim().max(1000).optional().nullable(),
});

export const mentorFeedbackSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  rating: z.number().int().min(1, 'Overall rating must be between 1 and 5').max(5, 'Overall rating must be between 1 and 5'),
  engagementRating: z.number().int().min(1).max(5).default(5),
  contentRating: z.number().int().min(1).max(5).default(5),
  mentorRating: z.number().int().min(1).max(5).default(5), // used for live class experience rating
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  comment: z.string().trim().min(10, 'Feedback must be at least 10 characters').max(3000, 'Feedback cannot exceed 3000 characters'),
  suggestions: z.string().trim().max(1000).optional().nullable(),
});

export const updateFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  contentRating: z.number().int().min(1).max(5).optional(),
  mentorRating: z.number().int().min(1).max(5).optional(),
  engagementRating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(3).max(150).optional(),
  comment: z.string().trim().min(10).max(3000).optional(),
  suggestions: z.string().trim().max(1000).optional().nullable(),
});

// Helper for Admin Audit Logs
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
    console.error('AuditLog creation error:', err);
  }
};

// -------------------------------------------------------------
// STUDENT CONTROLLERS
// -------------------------------------------------------------

/**
 * POST /api/feedback
 * Submit student feedback for an enrolled/purchased course
 */
export const submitStudentFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    const validated = studentFeedbackSchema.parse(req.body);

    // 1. Verify course existence
    const course = await prisma.course.findUnique({
      where: { id: validated.courseId },
      select: { id: true, title: true },
    });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // 2. Verify enrollment or payment purchase
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: validated.courseId,
        },
      },
    });

    if (!enrollment && req.user.role !== 'ADMIN') {
      throw new AppError('You can only submit feedback for courses you are enrolled in or purchased.', 403);
    }

    // 3. Prevent duplicate active feedback
    const existing = await prisma.course_feedbacks.findUnique({
      where: {
        userId_courseId_feedbackType: {
          userId,
          courseId: validated.courseId,
          feedbackType: 'STUDENT',
        },
      },
    });

    if (existing) {
      throw new AppError('You have already submitted feedback for this course. You can edit your existing feedback from My Feedback.', 409);
    }

    // 4. Create feedback (status defaults to PENDING, isPublished false)
    const newFeedback = await prisma.course_feedbacks.create({
      data: {
        id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        courseId: validated.courseId,
        feedbackType: 'STUDENT',
        rating: validated.rating,
        contentRating: validated.contentRating,
        mentorRating: validated.mentorRating,
        engagementRating: 5,
        title: validated.title,
        comment: validated.comment,
        suggestions: validated.suggestions || null,
        status: 'PENDING',
        isPublished: false,
        updatedAt: new Date(),
      },
      include: {
        courses: { select: { id: true, title: true, slug: true } },
        users: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully and is pending review by administrators.',
      data: newFeedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/my
 * Get all feedback submitted by the authenticated student
 */
export const getMyStudentFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    const feedbacks = await prisma.course_feedbacks.findMany({
      where: {
        userId,
        feedbackType: 'STUDENT',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        courses: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      },
    });

    res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/feedback/:id
 * Update feedback (owner only, student or mentor)
 */
export const updateFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user.id;

    const feedback = await prisma.course_feedbacks.findUnique({
      where: { id },
      include: { courses: { select: { id: true, title: true } } },
    });

    if (!feedback) {
      throw new AppError('Feedback not found', 404);
    }

    if (feedback.userId !== userId && req.user.role !== 'ADMIN') {
      throw new AppError('You are not authorized to edit this feedback', 403);
    }

    const validated = updateFeedbackSchema.parse(req.body);

    const updated = await prisma.course_feedbacks.update({
      where: { id },
      data: {
        rating: validated.rating !== undefined ? validated.rating : feedback.rating,
        contentRating: validated.contentRating !== undefined ? validated.contentRating : feedback.contentRating,
        mentorRating: validated.mentorRating !== undefined ? validated.mentorRating : feedback.mentorRating,
        engagementRating: validated.engagementRating !== undefined ? validated.engagementRating : feedback.engagementRating,
        title: validated.title !== undefined ? validated.title : feedback.title,
        comment: validated.comment !== undefined ? validated.comment : feedback.comment,
        suggestions: validated.suggestions !== undefined ? validated.suggestions : feedback.suggestions,
        // Reset to PENDING for moderation re-approval upon content update unless admin
        status: req.user.role === 'ADMIN' ? feedback.status : 'PENDING',
        isPublished: req.user.role === 'ADMIN' ? feedback.isPublished : false,
        updatedAt: new Date(),
      },
      include: {
        courses: { select: { id: true, title: true, slug: true } },
      },
    });

    res.json({
      success: true,
      message: 'Feedback updated successfully and resubmitted for review.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/feedback/:id
 * Delete own feedback (owner or admin)
 */
export const deleteFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = req.user.id;

    const feedback = await prisma.course_feedbacks.findUnique({
      where: { id },
      include: { courses: { select: { id: true, title: true } } },
    });

    if (!feedback) {
      throw new AppError('Feedback not found', 404);
    }

    if (feedback.userId !== userId && req.user.role !== 'ADMIN') {
      throw new AppError('You are not authorized to delete this feedback', 403);
    }

    await prisma.course_feedbacks.delete({
      where: { id },
    });

    if (req.user.role === 'ADMIN') {
      await createAuditLog(
        req.user.id,
        'DELETE_FEEDBACK',
        `Feedback: ${id} on Course: ${feedback.courses.title}`,
        `Deleted feedback submitted by user: ${feedback.userId}`
      );
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// MENTOR CONTROLLERS
// -------------------------------------------------------------

/**
 * POST /api/feedback/mentor
 * Submit mentor feedback for an assigned course
 */
export const submitMentorFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    if (req.user.role !== 'INSTRUCTOR' && req.user.role !== 'ADMIN') {
      throw new AppError('Only mentors and instructors can submit mentor feedback', 403);
    }
    const userId = req.user.id;

    const validated = mentorFeedbackSchema.parse(req.body);

    // Verify mentor is assigned to the course
    const assignment = await prisma.mentorAssignment.findFirst({
      where: {
        mentorId: userId,
        courseId: validated.courseId,
      },
    });

    // Also check if instructor created the course
    const course = await prisma.course.findUnique({
      where: { id: validated.courseId },
      select: { id: true, title: true, instructorId: true },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const isAuthorizedMentor = Boolean(assignment) || course.instructorId === userId || req.user.role === 'ADMIN';

    if (!isAuthorizedMentor) {
      throw new AppError('You are not assigned to mentor or teach this course', 403);
    }

    // Prevent duplicate active feedback
    const existing = await prisma.course_feedbacks.findUnique({
      where: {
        userId_courseId_feedbackType: {
          userId,
          courseId: validated.courseId,
          feedbackType: 'MENTOR',
        },
      },
    });

    if (existing) {
      throw new AppError('You have already submitted mentor feedback for this course. You can update your existing feedback.', 409);
    }

    const newFeedback = await prisma.course_feedbacks.create({
      data: {
        id: `fb_m_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        courseId: validated.courseId,
        feedbackType: 'MENTOR',
        rating: validated.rating,
        contentRating: validated.contentRating,
        mentorRating: validated.mentorRating, // live class experience
        engagementRating: validated.engagementRating,
        title: validated.title,
        comment: validated.comment,
        suggestions: validated.suggestions || null,
        status: 'PENDING',
        isPublished: false,
        updatedAt: new Date(),
      },
      include: {
        courses: { select: { id: true, title: true, slug: true } },
        users: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Mentor feedback submitted successfully and is pending review by administrators.',
      data: newFeedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/mentor/my
 * Get all feedback submitted by the authenticated mentor
 */
export const getMyMentorFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const userId = req.user.id;

    const feedbacks = await prisma.course_feedbacks.findMany({
      where: {
        userId,
        feedbackType: 'MENTOR',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        courses: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      },
    });

    res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// COURSE-SPECIFIC & PUBLIC FEEDBACK
// -------------------------------------------------------------

/**
 * GET /api/feedback/course/:courseId
 * Get course feedback summary & list of approved feedbacks (or user's own feedback)
 */
export const getCourseFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawCourseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
    const currentUserId = req.user?.id;

    // Check course by id or slug
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: rawCourseId }, { slug: rawCourseId }],
      },
      select: { id: true, title: true, slug: true },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // 1. Fetch approved feedbacks for public display
    const approvedFeedbacks = await prisma.course_feedbacks.findMany({
      where: {
        courseId: course.id,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            title: true,
            role: true,
            mentorProfile: { select: { expertise: true, experience: true } },
          },
        },
      },
    });

    // 2. Separate student & mentor approved reviews
    const studentReviews = approvedFeedbacks.filter((f) => f.feedbackType === 'STUDENT');
    const mentorReviews = approvedFeedbacks.filter((f) => f.feedbackType === 'MENTOR');

    // Calculate dynamic real averages
    const avgStudentRating =
      studentReviews.length > 0
        ? Number((studentReviews.reduce((sum, r) => sum + r.rating, 0) / studentReviews.length).toFixed(1))
        : 0;

    const avgMentorRating =
      mentorReviews.length > 0
        ? Number((mentorReviews.reduce((sum, r) => sum + r.rating, 0) / mentorReviews.length).toFixed(1))
        : 0;

    const avgContentRating =
      studentReviews.length > 0
        ? Number((studentReviews.reduce((sum, r) => sum + r.contentRating, 0) / studentReviews.length).toFixed(1))
        : 0;

    const avgMentorTeachingRating =
      studentReviews.length > 0
        ? Number((studentReviews.reduce((sum, r) => sum + r.mentorRating, 0) / studentReviews.length).toFixed(1))
        : 0;

    // 3. If user is logged in, fetch their own submission if present (even if pending/rejected)
    let myFeedback: any = null;
    let isEnrolled = false;
    let isAssignedMentor = false;

    if (currentUserId) {
      myFeedback = await prisma.course_feedbacks.findFirst({
        where: {
          courseId: course.id,
          userId: currentUserId,
        },
      });

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: currentUserId,
            courseId: course.id,
          },
        },
      });
      isEnrolled = Boolean(enrollment);

      const assignment = await prisma.mentorAssignment.findFirst({
        where: {
          mentorId: currentUserId,
          courseId: course.id,
        },
      });
      isAssignedMentor = Boolean(assignment);
    }

    res.json({
      success: true,
      data: {
        course: { id: course.id, title: course.title, slug: course.slug },
        stats: {
          totalReviews: approvedFeedbacks.length,
          studentReviewsCount: studentReviews.length,
          mentorReviewsCount: mentorReviews.length,
          avgStudentRating,
          avgMentorRating,
          avgContentRating,
          avgMentorTeachingRating,
        },
        studentReviews,
        mentorReviews,
        myFeedback,
        canSubmitStudent: isEnrolled,
        canSubmitMentor: isAssignedMentor,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feedback/public
 * Get approved feedbacks for homepage & public catalog
 */
export const getPublicFeedbacks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, role, rating, page = '1', limit = '10', homepageOnly } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: 'APPROVED',
    };

    if (homepageOnly === 'true') {
      where.isPublished = true;
    }

    if (courseId && typeof courseId === 'string') {
      where.courseId = courseId;
    }

    if (role && (role === 'STUDENT' || role === 'MENTOR')) {
      where.feedbackType = role;
    }

    if (rating && !isNaN(Number(rating))) {
      where.rating = Number(rating);
    }

    const [feedbacks, total] = await Promise.all([
      prisma.course_feedbacks.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          courses: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
          users: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              title: true,
              role: true,
              mentorProfile: { select: { expertise: true, experience: true } },
            },
          },
        },
      }),
      prisma.course_feedbacks.count({ where }),
    ]);

    res.json({
      success: true,
      data: feedbacks,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------
// ADMIN CONTROLLERS
// -------------------------------------------------------------

/**
 * GET /api/admin/feedback
 * List feedback submissions with filtering, search, and pagination
 */
export const getAdminFeedbacks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search, courseId, role, status, isPublished, rating, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (role && (role === 'STUDENT' || role === 'MENTOR')) {
      where.feedbackType = role;
    }

    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status as string)) {
      where.status = status;
    }

    if (isPublished !== undefined && isPublished !== '') {
      where.isPublished = isPublished === 'true';
    }

    if (rating && !isNaN(Number(rating))) {
      where.rating = Number(rating);
    }

    if (courseId && typeof courseId === 'string') {
      where.courseId = courseId;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { comment: { contains: search } },
        { users: { name: { contains: search } } },
        { users: { email: { contains: search } } },
        { courses: { title: { contains: search } } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      prisma.course_feedbacks.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          courses: { select: { id: true, title: true, slug: true } },
          users: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        },
      }),
      prisma.course_feedbacks.count({ where }),
    ]);

    res.json({
      success: true,
      data: feedbacks,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/feedback/analytics
 * Real-time metric analytics aggregated directly from database records
 */
export const getAdminFeedbackAnalytics = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalFeedback,
      pendingFeedback,
      approvedFeedback,
      rejectedFeedback,
      studentFeedbackCount,
      mentorFeedbackCount,
      publishedHomepageCount,
      allApprovedStudent,
      allApprovedMentor,
    ] = await Promise.all([
      prisma.course_feedbacks.count(),
      prisma.course_feedbacks.count({ where: { status: 'PENDING' } }),
      prisma.course_feedbacks.count({ where: { status: 'APPROVED' } }),
      prisma.course_feedbacks.count({ where: { status: 'REJECTED' } }),
      prisma.course_feedbacks.count({ where: { feedbackType: 'STUDENT' } }),
      prisma.course_feedbacks.count({ where: { feedbackType: 'MENTOR' } }),
      prisma.course_feedbacks.count({ where: { isPublished: true, status: 'APPROVED' } }),
      prisma.course_feedbacks.findMany({
        where: { feedbackType: 'STUDENT', status: 'APPROVED' },
        select: { rating: true },
      }),
      prisma.course_feedbacks.findMany({
        where: { feedbackType: 'MENTOR', status: 'APPROVED' },
        select: { rating: true },
      }),
    ]);

    const avgStudentRating =
      allApprovedStudent.length > 0
        ? Number((allApprovedStudent.reduce((sum, f) => sum + f.rating, 0) / allApprovedStudent.length).toFixed(1))
        : 0;

    const avgMentorRating =
      allApprovedMentor.length > 0
        ? Number((allApprovedMentor.reduce((sum, f) => sum + f.rating, 0) / allApprovedMentor.length).toFixed(1))
        : 0;

    res.json({
      success: true,
      data: {
        totalFeedback,
        pendingFeedback,
        approvedFeedback,
        rejectedFeedback,
        studentFeedbackCount,
        mentorFeedbackCount,
        publishedHomepageCount,
        avgStudentRating,
        avgMentorRating,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/feedback/:id
 * Complete feedback detail for review
 */
export const getAdminFeedbackById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const feedback = await prisma.course_feedbacks.findUnique({
      where: { id },
      include: {
        courses: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
        users: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    if (!feedback) {
      throw new AppError('Feedback not found', 404);
    }

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/feedback/:id/status
 * Moderation action: Approve or Reject
 */
export const updateFeedbackStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, isPublished } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('Invalid status. Must be PENDING, APPROVED, or REJECTED', 400);
    }

    const existing = await prisma.course_feedbacks.findUnique({
      where: { id },
      include: {
        courses: { select: { id: true, title: true } },
        users: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existing) {
      throw new AppError('Feedback not found', 404);
    }

    // If rejecting or setting pending, automatically unpublish from homepage
    let publishVal = existing.isPublished;
    if (status === 'REJECTED' || status === 'PENDING') {
      publishVal = false;
    } else if (status === 'APPROVED' && typeof isPublished === 'boolean') {
      publishVal = isPublished;
    }

    const updated = await prisma.course_feedbacks.update({
      where: { id },
      data: {
        status,
        isPublished: publishVal,
        updatedAt: new Date(),
      },
      include: {
        courses: { select: { id: true, title: true, slug: true } },
        users: { select: { id: true, name: true, email: true } },
      },
    });

    // Record in Admin Audit Log
    await createAuditLog(
      req.user?.id,
      'MODERATE_FEEDBACK',
      `Feedback: ${id} (${existing.courses.title})`,
      `Status updated to ${status}. Homepage Published: ${publishVal}. Reviewer: ${existing.users.name}`
    );

    res.json({
      success: true,
      message: `Feedback has been ${status.toLowerCase()}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/feedback/:id/publish
 * Toggle Homepage Visibility
 */
export const toggleFeedbackPublish = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      throw new AppError('isPublished boolean flag is required', 400);
    }

    const existing = await prisma.course_feedbacks.findUnique({
      where: { id },
      include: { courses: { select: { id: true, title: true } } },
    });

    if (!existing) {
      throw new AppError('Feedback not found', 404);
    }

    // Only approved feedback can be published to the homepage
    if (isPublished && existing.status !== 'APPROVED') {
      throw new AppError('Only approved feedback can be published to the homepage. Please approve the review first.', 400);
    }

    const updated = await prisma.course_feedbacks.update({
      where: { id },
      data: {
        isPublished,
        updatedAt: new Date(),
      },
    });

    await createAuditLog(
      req.user?.id,
      'TOGGLE_FEEDBACK_PUBLISH',
      `Feedback: ${id} (${existing.courses.title})`,
      `Homepage visibility set to ${isPublished}`
    );

    res.json({
      success: true,
      message: isPublished ? 'Feedback is now visible on the homepage.' : 'Feedback hidden from homepage.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

