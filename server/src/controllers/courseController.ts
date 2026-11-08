import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { CourseStatus } from '@prisma/client';

export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      category,
      level,
      status,
      sort,
      page = '1',
      limit = '12',
    } = req.query;

    const pageNumber = Math.max(1, parseInt(String(page), 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNumber - 1) * pageSize;

    const where: any = {};

    if (status) {
      where.status = status as CourseStatus;
    } else {
      where.status = 'PUBLISHED';
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    if (category) {
      where.category = { slug: String(category) };
    }

    if (level && level !== 'All Levels') {
      where.level = String(level);
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-low') orderBy = { price: 'asc' };
    else if (sort === 'price-high') orderBy = { price: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          instructor: {
            select: { id: true, name: true, avatarUrl: true, title: true },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          mentorAssignments: {
            include: {
              mentor: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          _count: {
            select: { enrollments: true, reviews: true, modules: true },
          },
          reviews: {
            select: { rating: true },
          },
        },
      }),
    ]);

    const formattedCourses = courses.map((course: any) => {
      const avgRating =
        course.reviews && course.reviews.length > 0
          ? course.reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / course.reviews.length
          : 5.0;

      const activeAssignment = course.mentorAssignments?.find((a: any) => a.scope === 'COURSE_WIDE') || course.mentorAssignments?.[0];
      const effectiveMentor = activeAssignment?.mentor || course.instructor || null;

      const { reviews, ...rest } = course;
      return {
        ...rest,
        assignedMentor: effectiveMentor,
        mentor: effectiveMentor,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalEnrollments: course._count.enrollments,
        totalModules: course._count.modules,
      };
    });

    res.json({
      success: true,
      data: formattedCourses,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slug = String(req.params.slug);

    const course: any = await prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            title: true,
            mentorProfile: {
              select: { expertise: true, experience: true, about: true, hourlyRate: true, rating: true, totalReviews: true }
            }
          },
        },
        mentorAssignments: {
          include: {
            mentor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                bio: true,
                title: true,
                mentorProfile: {
                  select: { expertise: true, experience: true, about: true, hourlyRate: true, rating: true, totalReviews: true }
                }
              }
            },
            batch: { select: { id: true, name: true, code: true } }
          },
          orderBy: { assignedAt: 'desc' }
        },
        category: true,
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                titleTa: true,
                duration: true,
                order: true,
                isFree: true,
                videoUrl: true,
                description: true,
                descriptionTa: true,
                resources: {
                  select: {
                    id: true,
                    title: true,
                    fileUrl: true,
                    fileType: true,
                    fileSize: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { enrollments: true, reviews: true },
        },
      },
    });

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    let isEnrolled = false;
    let isWishlisted = false;

    if (req.user) {
      const [enrollment, wishlist] = await Promise.all([
        prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
        }),
        prisma.wishlist.findUnique({
          where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
        }),
      ]);
      isEnrolled = !!enrollment;
      isWishlisted = !!wishlist;
    }

    // Determine access entitlement based on installmentPolicy:
    // If course.installmentPolicy === 'RESTRICTED' and student has outstanding balance, content remains restricted
    let hasFullContentAccess = isEnrolled;
    let studentRemainingBalance = 0;

    if (isEnrolled && req.user) {
      const courseFee = Number(course.discountPrice || course.price);
      const payments = await prisma.payment.findMany({
        where: {
          userId: req.user.id,
          courseId: course.id,
          status: 'COMPLETED',
        },
        select: { amount: true, discountAmount: true, isPartial: true, remainingBalance: true },
      });
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalCouponDiscount = payments.reduce((sum, p) => sum + Number(p.discountAmount || 0), 0);
      studentRemainingBalance = Math.max(0, courseFee - totalPaid - totalCouponDiscount);

      if (course.installmentPolicy === 'RESTRICTED' && studentRemainingBalance > 0) {
        hasFullContentAccess = false;
      }
    }

    const isOwner = req.user && (req.user.id === course.instructorId || req.user.role === 'ADMIN');
    if (!hasFullContentAccess && !isOwner && course.modules) {
      course.modules = course.modules.map((m: any) => ({
        ...m,
        lessons: m.lessons.map((l: any) => ({
          ...l,
          videoUrl: l.isFree ? l.videoUrl : null,
          resources: l.isFree
            ? l.resources.map((r: any) => ({ ...r, type: r.fileType || 'PDF' }))
            : l.resources.map((r: any) => ({
                id: r.id,
                title: r.title,
                type: r.fileType || 'PDF',
                fileUrl: null, // Protected: file link locked until purchase
              })),
        })),
      }));
    } else if (course.modules) {
      course.modules = course.modules.map((m: any) => ({
        ...m,
        lessons: m.lessons.map((l: any) => ({
          ...l,
          resources: (l.resources || []).map((r: any) => ({ ...r, type: r.fileType || 'PDF' })),
        })),
      }));
    }

    const avgRating =
      course.reviews && course.reviews.length > 0
        ? course.reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / course.reviews.length
        : 5.0;

    // Determine effective assigned mentor (check COURSE_WIDE assignment first, then latest mentor assignment, then course instructor)
    const activeAssignment = course.mentorAssignments?.find((a: any) => a.scope === 'COURSE_WIDE') || course.mentorAssignments?.[0];
    const effectiveMentor = activeAssignment?.mentor || course.instructor || null;

    res.json({
      success: true,
      data: {
        ...course,
        assignedMentor: effectiveMentor,
        mentor: effectiveMentor,
        averageRating: parseFloat(avgRating.toFixed(1)),
        isEnrolled,
        isWishlisted,
        hasFullContentAccess,
        remainingBalance: studentRemainingBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const {
      title,
      titleTa,
      subtitle,
      description,
      descriptionTa,
      price,
      discountPrice,
      allowInstallments,
      minInstallmentAmount,
      installmentCount,
      installmentPolicy,
      categoryId,
      category,
      level,
      language,
      thumbnailUrl,
      previewVideoUrl,
      instructorId,
    } = req.body;

    const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);

    // Resolve categoryId if category name or categoryId is provided
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && typeof category === 'string' && category.trim()) {
      const foundCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: category.trim() } },
            { slug: { equals: category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') } },
          ],
        },
      });
      if (foundCategory) {
        resolvedCategoryId = foundCategory.id;
      }
    }

    // Determine instructorId (Admin can assign any valid mentor/instructor, defaults to caller)
    let assignedInstructorId = req.user.id;
    if (instructorId && req.user.role === 'ADMIN') {
      const targetInstructor = await prisma.user.findUnique({ where: { id: String(instructorId) } });
      if (targetInstructor) {
        assignedInstructorId = targetInstructor.id;
      }
    }

    const course = await prisma.course.create({
      data: {
        title,
        titleTa: titleTa || null,
        slug,
        subtitle,
        description,
        descriptionTa: descriptionTa || null,
        price,
        discountPrice,
        allowInstallments: Boolean(allowInstallments),
        minInstallmentAmount: minInstallmentAmount ? Number(minInstallmentAmount) : null,
        installmentCount: installmentCount ? Number(installmentCount) : 1,
        installmentPolicy: installmentPolicy || 'RESTRICTED',
        categoryId: resolvedCategoryId || null,
        level: level || 'All Levels',
        language: language || 'English',
        thumbnailUrl,
        previewVideoUrl,
        status: req.body.status || 'PUBLISHED',
        instructorId: assignedInstructorId,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const existingCourse = await prisma.course.findUnique({ where: { id } });
    if (!existingCourse) throw new AppError('Course not found', 404);

    const authorized = await canManageCourse(id, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You can only edit your own courses or assigned curriculum', 403);
    }

    const {
      title,
      titleTa,
      subtitle,
      description,
      descriptionTa,
      price,
      discountPrice,
      allowInstallments,
      minInstallmentAmount,
      installmentCount,
      installmentPolicy,
      categoryId,
      category,
      level,
      language,
      thumbnailUrl,
      previewVideoUrl,
      status,
      instructorId,
    } = req.body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (titleTa !== undefined) updateData.titleTa = titleTa ? String(titleTa).trim() : null;
    if (subtitle !== undefined) updateData.subtitle = subtitle ? String(subtitle).trim() : null;
    if (description !== undefined) updateData.description = String(description);
    if (descriptionTa !== undefined) updateData.descriptionTa = descriptionTa ? String(descriptionTa) : null;
    if (level !== undefined) updateData.level = String(level);
    if (language !== undefined) updateData.language = String(language);
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl ? String(thumbnailUrl) : null;
    if (previewVideoUrl !== undefined) updateData.previewVideoUrl = previewVideoUrl ? String(previewVideoUrl) : null;
    if (status !== undefined) updateData.status = status;

    if (price !== undefined) updateData.price = Number(price);
    if (discountPrice !== undefined) updateData.discountPrice = discountPrice !== null && discountPrice !== '' ? Number(discountPrice) : null;
    if (allowInstallments !== undefined) updateData.allowInstallments = Boolean(allowInstallments);
    if (minInstallmentAmount !== undefined) updateData.minInstallmentAmount = minInstallmentAmount ? Number(minInstallmentAmount) : null;
    if (installmentCount !== undefined) updateData.installmentCount = installmentCount ? Number(installmentCount) : 1;
    if (installmentPolicy !== undefined) updateData.installmentPolicy = String(installmentPolicy);

    // Resolve categoryId if category name or categoryId is provided
    let resolvedCategoryId = categoryId !== undefined ? categoryId : undefined;
    if (!resolvedCategoryId && typeof category === 'string' && category.trim()) {
      const foundCategory = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { equals: category.trim() } },
            { slug: { equals: category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') } },
          ],
        },
      });
      if (foundCategory) {
        resolvedCategoryId = foundCategory.id;
      }
    }
    if (resolvedCategoryId !== undefined) {
      updateData.categoryId = resolvedCategoryId ? String(resolvedCategoryId) : null;
    }

    // Only platform ADMIN can reassign the primary instructor
    if (instructorId !== undefined && req.user.role === 'ADMIN') {
      if (instructorId) {
        const newInstructor = await prisma.user.findUnique({ where: { id: String(instructorId) } });
        if (newInstructor) {
          updateData.instructorId = newInstructor.id;
        }
      }
    }

    const updated = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        instructor: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const existingCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        enrollments: { select: { id: true } },
        payments: { select: { id: true, amount: true } },
        batches: { select: { id: true, name: true } },
        mentorAssignments: { select: { id: true } },
        certificates: { select: { id: true } },
      },
    });
    if (!existingCourse) throw new AppError('Course not found', 404);

    const authorized = await canManageCourse(id, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You can only delete your own courses', 403);
    }

    const hasEnrolledStudents = existingCourse.enrollments.length > 0;
    const hasFinancialRecords = existingCourse.payments.length > 0;
    const hasBatchesOrCerts = existingCourse.batches.length > 0 || existingCourse.certificates.length > 0;

    // Safety: If course has active students, payment records, or issued certificates, safely archive/deactivate
    if (hasEnrolledStudents || hasFinancialRecords || hasBatchesOrCerts) {
      await prisma.course.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
        },
      });

      return res.json({
        success: true,
        archived: true,
        message: `Course "${existingCourse.title}" has active enrollments (${existingCourse.enrollments.length}) or payment history. It has been safely deactivated & archived to preserve academic and financial records.`,
      });
    }

    // Completely unutilized course: safe permanent deletion
    await prisma.course.delete({ where: { id } });

    res.json({ success: true, archived: false, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to verify whether user is authorized to manage course curriculum
 * (Platform Admin, Course Instructor, or Active Assigned Mentor)
 */
export const canManageCourse = async (courseId: string, user?: { id: string; role: string }) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) return false;
  if (course.instructorId === user.id) return true;

  const assignment = await prisma.mentorAssignment.findFirst({
    where: {
      courseId,
      mentorId: user.id,
    },
  });

  return !!assignment;
};

export const addModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const courseId = String(req.params.courseId);
    const { title, titleTa, order } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Course not found', 404);

    const authorized = await canManageCourse(courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to manage curriculum for this course', 403);
    }

    const module = await prisma.module.create({
      data: {
        title,
        titleTa: titleTa || null,
        order: order || 0,
        courseId,
      },
    });

    res.status(201).json({ success: true, data: module });
  } catch (error) {
    next(error);
  }
};

export const getCourseModules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = String(req.params.courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });
    if (!course) throw new AppError('Course not found', 404);

    let isEnrolled = false;
    let isManager = false;

    if (req.user) {
      isManager = await canManageCourse(courseId, req.user);
      if (!isManager) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: req.user.id, courseId } },
        });
        isEnrolled = !!enrollment;
      }
    }

    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: { resources: true },
        },
      },
    });

    // If student is not enrolled and not manager, mask non-free video URLs and resources
    if (!isEnrolled && !isManager) {
      const sanitizedModules = modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          videoUrl: l.isFree ? l.videoUrl : null,
          resources: l.isFree ? l.resources : [],
        })),
      }));
      return res.json({ success: true, data: sanitizedModules });
    }

    res.json({ success: true, data: modules });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const moduleId = String(req.params.moduleId);
    const { title, titleTa, order } = req.body;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new AppError('Module not found', 404);

    const authorized = await canManageCourse(module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to update modules for this course', 403);
    }

    const updated = await prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(title !== undefined && { title }),
        ...(titleTa !== undefined && { titleTa }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const moduleId = String(req.params.moduleId);

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new AppError('Module not found', 404);

    const authorized = await canManageCourse(module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to delete modules for this course', 403);
    }

    await prisma.module.delete({ where: { id: moduleId } });
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const validateVideoUrl = (url?: string | null): boolean => {
  if (!url || !url.trim()) return true; // optional
  const trimmed = url.trim();
  // Check YouTube, Vimeo, or direct video file / upload paths
  const isYouTube = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)/i.test(trimmed);
  const isVimeo = /(?:vimeo\.com\/(?:video\/)?\d+)/i.test(trimmed);
  const isDirectVideo = /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(trimmed) || /^\/?uploads\/(resources|thumbnails|avatars|submissions)\//i.test(trimmed);
  const isSecureUrl = /^https?:\/\//i.test(trimmed);

  return isYouTube || isVimeo || isDirectVideo || isSecureUrl;
};

export const addLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const moduleId = String(req.params.moduleId);
    const { title, titleTa, description, descriptionTa, videoUrl, duration, order, isFree } = req.body;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new AppError('Module not found', 404);

    const authorized = await canManageCourse(module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to add lessons to this course', 403);
    }

    if (videoUrl && !validateVideoUrl(videoUrl)) {
      throw new AppError('Invalid video URL. Supported: YouTube, Vimeo, hosted MP4/WebM, or server uploaded video.', 400);
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        titleTa: titleTa || null,
        description,
        descriptionTa: descriptionTa || null,
        videoUrl: videoUrl ? String(videoUrl).trim() : null,
        duration: duration ? Number(duration) : 0,
        order: order !== undefined ? Number(order) : 0,
        isFree: Boolean(isFree),
        moduleId,
      },
    });

    res.status(201).json({ success: true, data: lesson });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);
    const { title, titleTa, description, descriptionTa, videoUrl, duration, order, isFree } = req.body;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new AppError('Lesson not found', 404);

    const authorized = await canManageCourse(lesson.module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to update lessons for this course', 403);
    }

    if (videoUrl && !validateVideoUrl(videoUrl)) {
      throw new AppError('Invalid video URL. Supported: YouTube, Vimeo, hosted MP4/WebM, or server uploaded video.', 400);
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined && { title }),
        ...(titleTa !== undefined && { titleTa }),
        ...(description !== undefined && { description }),
        ...(descriptionTa !== undefined && { descriptionTa }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl ? String(videoUrl).trim() : null }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isFree !== undefined && { isFree: Boolean(isFree) }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new AppError('Lesson not found', 404);

    const authorized = await canManageCourse(lesson.module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to delete lessons for this course', 403);
    }

    await prisma.lesson.delete({ where: { id: lessonId } });
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addLessonResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const lessonId = String(req.params.lessonId);
    const { title, fileUrl, fileSize, fileType } = req.body;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new AppError('Lesson not found', 404);

    const authorized = await canManageCourse(lesson.module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to add resources for this course', 403);
    }

    const resource = await prisma.lessonResource.create({
      data: {
        title,
        fileUrl,
        fileSize: fileSize ? Number(fileSize) : null,
        fileType: fileType || 'application/pdf',
        lessonId,
      },
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};

export const deleteLessonResource = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const resourceId = String(req.params.resourceId);

    const resource = await prisma.lessonResource.findUnique({
      where: { id: resourceId },
      include: { lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!resource) throw new AppError('Resource not found', 404);

    const authorized = await canManageCourse(resource.lesson.module.courseId, req.user);
    if (!authorized) {
      throw new AppError('Forbidden: You are not authorized to delete resources for this course', 403);
    }

    await prisma.lessonResource.delete({ where: { id: resourceId } });
    res.json({ success: true, message: 'Lesson resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { courses: true } },
      },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const courseId = String(req.params.courseId);

    const existing = await prisma.wishlist.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId } },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { userId_courseId: { userId: req.user.id, courseId } },
      });
      return res.json({ success: true, message: 'Removed from wishlist', isWishlisted: false });
    }

    await prisma.wishlist.create({
      data: { userId: req.user.id, courseId },
    });

    res.json({ success: true, message: 'Added to wishlist', isWishlisted: true });
  } catch (error) {
    next(error);
  }
};

export const addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const courseId = String(req.params.courseId);
    const { rating, comment } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user.id, courseId } },
    });

    if (!enrollment && req.user.role !== 'ADMIN') {
      throw new AppError('Only enrolled students can review this course', 403);
    }

    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId: req.user.id, courseId } },
      create: {
        userId: req.user.id,
        courseId,
        rating: Math.min(5, Math.max(1, rating)),
        comment,
      },
      update: {
        rating: Math.min(5, Math.max(1, rating)),
        comment,
      },
    });

    res.json({ success: true, message: 'Review saved', data: review });
  } catch (error) {
    next(error);
  }
};
