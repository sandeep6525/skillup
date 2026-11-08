import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import fs from 'fs';
import path from 'path';

/**
 * Remove local file safely if it belongs to /uploads/partners
 */
const removeUploadedLogoFile = (fileUrl?: string | null) => {
  if (!fileUrl) return;
  try {
    // Only remove local uploads within the uploads/partners directory
    if (fileUrl.startsWith('/uploads/partners/') || fileUrl.includes('/uploads/partners/')) {
      const filename = path.basename(fileUrl);
      const filePath = path.join(__dirname, '../../uploads/partners', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('Failed to remove partner logo file:', err);
  }
};

/**
 * Basic SVG Sanitizer to strip potentially malicious scripts/tags
 */
const sanitizeSvgIfPresent = (file: Express.Multer.File) => {
  if (file.mimetype.includes('svg') || file.originalname.toLowerCase().endsWith('.svg')) {
    const filePath = file.path;
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf-8');
      // Strip script tags, onload, onerror, javascript: URIs
      content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      content = content.replace(/on\w+="[^"]*"/gi, '');
      content = content.replace(/on\w+='[^']*'/gi, '');
      content = content.replace(/javascript:[^"']*/gi, '');
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
};

/**
 * Public: Get all active partners for homepage carousel
 * GET /api/partners
 */
export const getPublicPartners = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        websiteUrl: true,
        description: true,
        displayOrder: true,
        isFeatured: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all partners (active & inactive)
 * GET /api/admin/partners
 */
export const getAdminPartners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, status } = req.query;

    const where: any = {};
    if (search && typeof search === 'string') {
      where.name = { contains: search };
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const partners = await prisma.partner.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create partner
 * POST /api/admin/partners
 */
export const createPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, websiteUrl, description, displayOrder, isActive, isFeatured } = req.body;
    let logoUrl = req.body.logoUrl;

    if (req.file) {
      sanitizeSvgIfPresent(req.file);
      const relativeUrl = `/uploads/partners/${req.file.filename}`;
      logoUrl = relativeUrl;
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Partner company name is required', 400);
    }

    if (!logoUrl || typeof logoUrl !== 'string' || !logoUrl.trim()) {
      throw new AppError('Partner logo is required', 400);
    }

    // URL validation if websiteUrl provided
    if (websiteUrl && websiteUrl.trim()) {
      try {
        new URL(websiteUrl.trim());
      } catch {
        throw new AppError('Please provide a valid website URL (including https:// or http://)', 400);
      }
    }

    const parsedOrder = displayOrder !== undefined ? parseInt(displayOrder, 10) : 0;
    const parsedIsActive = isActive === undefined ? true : (isActive === true || isActive === 'true');
    const parsedIsFeatured = isFeatured === undefined ? false : (isFeatured === true || isFeatured === 'true');

    const partner = await prisma.partner.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl.trim(),
        websiteUrl: websiteUrl ? websiteUrl.trim() : null,
        description: description ? description.trim() : null,
        displayOrder: isNaN(parsedOrder) ? 0 : parsedOrder,
        isActive: parsedIsActive,
        isFeatured: parsedIsFeatured,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update partner
 * PATCH /api/admin/partners/:id
 */
export const updatePartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, websiteUrl, description, displayOrder, isActive, isFeatured } = req.body;

    const existing = await prisma.partner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Partner not found', 404);
    }

    let logoUrl = req.body.logoUrl;
    if (req.file) {
      sanitizeSvgIfPresent(req.file);
      logoUrl = `/uploads/partners/${req.file.filename}`;
      // Clean up old logo file if it's being replaced and not shared
      if (existing.logoUrl && existing.logoUrl !== logoUrl) {
        // Check if other partners use the same file
        const duplicateCount = await prisma.partner.count({
          where: { logoUrl: existing.logoUrl, id: { not: id } },
        });
        if (duplicateCount === 0) {
          removeUploadedLogoFile(existing.logoUrl);
        }
      }
    }

    if (name !== undefined && (!name || !name.trim())) {
      throw new AppError('Partner company name cannot be empty', 400);
    }

    if (websiteUrl !== undefined && websiteUrl !== null && websiteUrl.trim() !== '') {
      try {
        new URL(websiteUrl.trim());
      } catch {
        throw new AppError('Please provide a valid website URL (including https:// or http://)', 400);
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl.trim();
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl ? websiteUrl.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (displayOrder !== undefined) {
      const order = parseInt(displayOrder, 10);
      updateData.displayOrder = isNaN(order) ? 0 : order;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive === true || isActive === 'true';
    }
    if (isFeatured !== undefined) {
      updateData.isFeatured = isFeatured === true || isFeatured === 'true';
    }

    const updated = await prisma.partner.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Partner updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete partner
 * DELETE /api/admin/partners/:id
 */
export const deletePartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.partner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Partner not found', 404);
    }

    await prisma.partner.delete({
      where: { id },
    });

    // Clean up old logo file if no other partner record is referencing it
    if (existing.logoUrl) {
      const duplicateCount = await prisma.partner.count({
        where: { logoUrl: existing.logoUrl },
      });
      if (duplicateCount === 0) {
        removeUploadedLogoFile(existing.logoUrl);
      }
    }

    res.json({
      success: true,
      message: 'Partner deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};
