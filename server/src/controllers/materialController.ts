import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { resolveDiskPath } from '../utils/pathUtils';

/**
 * GET /api/materials - Public marketplace browse
 */
export const getMaterials = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const materials = await prisma.learningMaterial.findMany({
      where: { isPublished: true },
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
        course: { select: { id: true, title: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials/:id - Material details with user entitlement status
 */
export const getMaterialById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const material = await prisma.learningMaterial.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { purchases: true } },
      },
    });

    let uploaderInfo: { id: string; name: string; title: string | null; avatarUrl: string | null } | null = null;
    if (material && material.uploaderId) {
      uploaderInfo = await prisma.user.findUnique({
        where: { id: material.uploaderId },
        select: { id: true, name: true, title: true, avatarUrl: true },
      });
    }

    if (!material) throw new AppError('Material not found', 404);

    let hasAccess = false;
    let purchaseStatus: 'NOT_PURCHASED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'COMPLETED' = 'NOT_PURCHASED';

    if (material.isFree || Number(material.price) === 0) {
      hasAccess = true;
      purchaseStatus = 'COMPLETED';
    } else if (req.user) {
      // 1. Check verified student purchase record
      const purchase = await prisma.materialPurchase.findUnique({
        where: {
          materialId_userId: { materialId: id, userId: req.user.id },
        },
      });

      if (purchase) {
        if (purchase.paymentId) {
          const payment = await prisma.payment.findUnique({
            where: { id: purchase.paymentId },
            select: { id: true, status: true, amount: true, razorpayOrderId: true },
          });

          if (payment) {
            if (payment.status === 'COMPLETED') {
              hasAccess = true;
              purchaseStatus = 'COMPLETED';
            } else if (payment.status === 'FAILED') {
              purchaseStatus = 'FAILED';
            } else if (payment.status === 'REFUNDED') {
              purchaseStatus = 'REFUNDED';
            } else {
              purchaseStatus = 'PENDING';
            }
          } else {
            hasAccess = true;
            purchaseStatus = 'COMPLETED';
          }
        } else {
          hasAccess = true;
          purchaseStatus = 'COMPLETED';
        }
      } else {
        // 2. Check recent payment attempt
        const latestPayment = await prisma.payment.findFirst({
          where: {
            userId: req.user.id,
            materialId: id,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (latestPayment) {
          if (latestPayment.status === 'COMPLETED') {
            hasAccess = true;
            purchaseStatus = 'COMPLETED';
          } else if (latestPayment.status === 'FAILED') {
            purchaseStatus = 'FAILED';
          } else if (latestPayment.status === 'REFUNDED') {
            purchaseStatus = 'REFUNDED';
          } else if (latestPayment.status === 'PENDING') {
            purchaseStatus = 'PENDING';
          }
        }
      }

      // 3. Check course enrollment inclusion
      if (!hasAccess && material.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: req.user.id, courseId: material.courseId },
          },
        });
        if (enrollment) {
          hasAccess = true;
          purchaseStatus = 'COMPLETED';
        }
      }

      // 4. Check internship admission inclusion
      if (!hasAccess && material.internshipId) {
        const internshipApp = await prisma.internshipApplication.findFirst({
          where: {
            userId: req.user.id,
            internshipId: material.internshipId,
            status: { in: ['ACCEPTED', 'COMPLETED'] },
          },
        });
        if (internshipApp) {
          hasAccess = true;
          purchaseStatus = 'COMPLETED';
        }
      }
    }

    // Do not leak direct file storage path to frontend if not owned
    const sanitizedMaterial = {
      ...material,
      uploader: uploaderInfo,
      fileUrl: hasAccess ? material.fileUrl : undefined,
      hasAccess,
      purchaseStatus,
      isOwnerOrAdmin: Boolean(req.user && (req.user.role === 'ADMIN' || material.uploaderId === req.user.id)),
    };

    res.json({ success: true, data: sanitizedMaterial });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials/:id/download - Stream protected file securely with access verification
 */
export const downloadMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized. Login required to download resources', 401);
    const id = String(req.params.id);

    const material = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!material) throw new AppError('Learning resource not found', 404);

    // Downloads are strictly restricted to platform ADMIN only. Students must use protected viewer.
    if (req.user.role !== 'ADMIN') {
      throw new AppError(
        'Direct download is restricted. Please use the protected online document viewer.',
        403
      );
    }

    // Determine disk file path or URL
    const resolvedPath = resolveDiskPath(material.fileUrl);

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      const fileName = path.basename(resolvedPath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(material.title)}_${fileName}"`);
      return res.download(resolvedPath);
    } else {
      // If hosted remotely (e.g. S3 / CDN)
      if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
        return res.redirect(material.fileUrl);
      }
      throw new AppError('The requested file is currently unavailable on disk', 404);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials/:id/view - Stream protected PDF/document securely inline for in-dialog viewing
 */
export const streamMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized. Login required to view resources', 401);
    const id = String(req.params.id);

    const material = await prisma.learningMaterial.findUnique({
      where: { id },
    });

    if (!material) throw new AppError('Learning resource not found', 404);

    let isAuthorized = false;

    // 1. Admins and uploaders always have access
    if (req.user.role === 'ADMIN' || material.uploaderId === req.user.id) {
      isAuthorized = true;
    }
    // 2. Free resources available to authenticated students
    else if (material.isFree || Number(material.price) === 0) {
      isAuthorized = true;
    }
    // 3. Paid resources check purchase record or course enrollment
    else {
      const purchase = await prisma.materialPurchase.findUnique({
        where: {
          materialId_userId: { materialId: id, userId: req.user.id },
        },
      });

      if (purchase) {
        if (purchase.paymentId) {
          const payment = await prisma.payment.findUnique({
            where: { id: purchase.paymentId },
            select: { status: true },
          });
          if (payment && payment.status === 'COMPLETED') {
            isAuthorized = true;
          }
        } else if (Number(purchase.paidAmount) === 0) {
          isAuthorized = true;
        }
      } else if (material.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: { userId: req.user.id, courseId: material.courseId },
          },
        });
        if (enrollment) isAuthorized = true;
      } else if (material.internshipId) {
        const internshipApp = await prisma.internshipApplication.findFirst({
          where: {
            userId: req.user.id,
            internshipId: material.internshipId,
            status: { in: ['ACCEPTED', 'COMPLETED'] },
          },
        });
        if (internshipApp) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new AppError(
        'Access denied. Please purchase this question paper/material to view it.',
        403
      );
    }

    // Determine disk file path or URL
    const resolvedPath = resolveDiskPath(material.fileUrl);

    if (resolvedPath && fs.existsSync(resolvedPath)) {
      const ext = path.extname(resolvedPath).toLowerCase();
      let contentType = 'application/pdf';
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.txt') contentType = 'text/plain';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.title)}${ext || '.pdf'}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const stream = fs.createReadStream(resolvedPath);
      return stream.pipe(res);
    } else {
      if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
        return res.redirect(material.fileUrl);
      }
      throw new AppError('The requested file is currently unavailable on disk', 404);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/materials/my/purchases - Student's purchased or saved materials
 */
export const getMyMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    // 1. Individually purchased materials
    const purchases = await prisma.materialPurchase.findMany({
      where: { userId: req.user.id },
      include: {
        material: {
          include: {
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch corresponding payments to verify real paid amounts and status
    const paymentIds = purchases.map((p) => p.paymentId).filter(Boolean) as string[];
    const payments = paymentIds.length > 0
      ? await prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: { id: true, amount: true, status: true, razorpayOrderId: true, paymentMethod: true },
        })
      : [];
    const paymentMap = new Map(payments.map((p) => [p.id, p]));

    // Format confirmed purchases (Filter out any pending, failed, or refunded transactions)
    const formattedPurchases = purchases
      .map((p) => {
        const payment = p.paymentId ? paymentMap.get(p.paymentId) : null;
        const actualPaid = payment ? Number(payment.amount) : Number(p.paidAmount);
        const paymentStatus = payment ? payment.status : 'COMPLETED';

        return {
          id: p.id,
          materialId: p.materialId,
          userId: p.userId,
          paymentId: p.paymentId,
          paidAmount: actualPaid,
          paymentStatus,
          createdAt: p.createdAt,
          isCourseIncluded: false,
          material: p.material,
        };
      })
      .filter((p) => {
        // Legitimate free material entitlement (paidAmount = 0 without pending payment) or verified COMPLETED payment
        if (p.paymentId) {
          const payment = paymentMap.get(p.paymentId);
          return payment && payment.status === 'COMPLETED';
        }
        return p.paymentStatus === 'COMPLETED' || p.paidAmount === 0;
      });

    // 2. Courses and Internships student is enrolled in
    const [enrollments, acceptedInternships] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId: req.user.id },
        select: {
          courseId: true,
          enrolledAt: true,
          course: { select: { id: true, title: true } },
        },
      }),
      prisma.internshipApplication.findMany({
        where: { userId: req.user.id, status: { in: ['ACCEPTED', 'COMPLETED'] } },
        select: {
          internshipId: true,
          appliedAt: true,
          internship: { select: { id: true, title: true, organization: true } },
        },
      }),
    ]);

    const enrolledCourseIds = enrollments.map((e) => e.courseId);
    const enrolledInternshipIds = acceptedInternships.map((i) => i.internshipId);

    // Find all materials associated with enrolled courses and internships
    const materialsFromPrograms = (enrolledCourseIds.length > 0 || enrolledInternshipIds.length > 0)
      ? await prisma.learningMaterial.findMany({
          where: {
            OR: [
              enrolledCourseIds.length > 0 ? { courseId: { in: enrolledCourseIds } } : {},
              enrolledInternshipIds.length > 0 ? { internshipId: { in: enrolledInternshipIds } } : {},
            ],
            isPublished: true,
          },
          include: {
            course: { select: { id: true, title: true } },
            internship: { select: { id: true, title: true, organization: true } },
          },
        })
      : [];

    const programMaterialsByMaterialId = new Map<string, typeof materialsFromPrograms[0]>();
    for (const m of materialsFromPrograms) {
      programMaterialsByMaterialId.set(m.id, m);
    }

    // Merge direct purchases with program materials
    const mergedList: any[] = [];
    const processedMaterialIds = new Set<string>();

    for (const purchase of formattedPurchases) {
      const isAlsoInProgram = programMaterialsByMaterialId.has(purchase.materialId);
      const programMaterial = programMaterialsByMaterialId.get(purchase.materialId);

      mergedList.push({
        ...purchase,
        isDirectlyPurchased: true,
        isCourseIncluded: isAlsoInProgram,
        accessSource: isAlsoInProgram ? 'DIRECT_AND_PROGRAM' : 'DIRECT_PURCHASE',
        associatedCourse: programMaterial?.course || purchase.material?.course || null,
        associatedInternship: programMaterial?.internship || null,
      });
      processedMaterialIds.add(purchase.materialId);
    }

    // Add remaining program-included materials that were not directly purchased
    for (const m of materialsFromPrograms) {
      if (!processedMaterialIds.has(m.id)) {
        processedMaterialIds.add(m.id);
        mergedList.push({
          id: m.internshipId ? `internship_${m.id}` : `course_${m.id}`,
          materialId: m.id,
          userId: req.user.id,
          paidAmount: 0,
          paymentStatus: m.internshipId ? 'INCLUDED_IN_INTERNSHIP' : 'INCLUDED_IN_COURSE',
          createdAt: m.createdAt,
          isDirectlyPurchased: false,
          isCourseIncluded: true,
          accessSource: m.internshipId ? 'INTERNSHIP_INCLUDED' : 'COURSE_INCLUDED',
          associatedCourse: m.course || null,
          associatedInternship: m.internship || null,
          material: m,
        });
      }
    }

    res.json({ success: true, data: mergedList });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/materials - Admin / Instructor: Create new material
 */
export const createMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const {
      title,
      description,
      fileUrl,
      type,
      fileSize,
      price,
      discountPrice,
      isFree,
      thumbnailUrl,
      category,
      courseId,
      batchId,
      internshipId,
      isPublished,
    } = req.body;

    if (!title || !fileUrl) {
      throw new AppError('Title and fileUrl are required', 400);
    }

    const materialPrice = isFree ? 0 : Number(price || 0);

    const material = await prisma.learningMaterial.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        fileUrl: String(fileUrl),
        type: type || 'PDF',
        fileSize: fileSize ? Number(fileSize) : null,
        price: materialPrice,
        discountPrice: discountPrice ? Number(discountPrice) : null,
        isFree: Boolean(isFree || materialPrice === 0),
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
        category: category || 'Development',
        courseId: courseId ? String(courseId) : null,
        batchId: batchId ? String(batchId) : null,
        internshipId: internshipId ? String(internshipId) : null,
        uploaderId: req.user.id,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
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
 * PATCH /api/materials/:id - Admin: Update material
 */
export const updateMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const existing = await prisma.learningMaterial.findUnique({ where: { id } });
    if (!existing) throw new AppError('Material not found', 404);

    if (req.user.role !== 'ADMIN' && existing.uploaderId !== req.user.id) {
      throw new AppError('Unauthorized to update this material', 403);
    }

    const data: any = { ...req.body };
    if (data.price !== undefined) data.price = Number(data.price);
    if (data.discountPrice !== undefined) data.discountPrice = Number(data.discountPrice);
    if (data.fileSize !== undefined) data.fileSize = Number(data.fileSize);
    if (data.isFree !== undefined) data.isFree = Boolean(data.isFree);

    const updated = await prisma.learningMaterial.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/materials/:id - Admin: Delete material
 */
export const deleteMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const existing = await prisma.learningMaterial.findUnique({ where: { id } });
    if (!existing) throw new AppError('Material not found', 404);

    if (req.user.role !== 'ADMIN' && existing.uploaderId !== req.user.id) {
      throw new AppError('Unauthorized to delete this material', 403);
    }

    await prisma.learningMaterial.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};
