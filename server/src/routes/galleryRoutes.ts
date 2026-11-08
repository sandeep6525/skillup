import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

// ==========================================
// PUBLIC HOMEPAGE ENDPOINT
// ==========================================
router.get('/gallery/public', async (_req, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      prisma.gallerySetting.findUnique({ where: { id: 'default' } }),
      prisma.galleryItem.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        settings: settings || {
          isEnabled: true,
          sectionTitle: 'Discover. Learn. Create.',
          sectionBadge: 'EXPLORE SKILLUP',
          sectionDesc: 'Explore our learning experiences, student projects, workshops and technical programs.',
          defaultIndex: 0,
        },
        items: items || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN MANAGEMENT ENDPOINTS
// ==========================================

// 1. Get all gallery items (including disabled) and current settings
router.get('/admin/gallery', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [settings, items] = await Promise.all([
      prisma.gallerySetting.upsert({
        where: { id: 'default' },
        update: {},
        create: {
          id: 'default',
          isEnabled: true,
          sectionTitle: 'Discover. Learn. Create.',
          sectionBadge: 'EXPLORE SKILLUP',
          sectionDesc: 'Explore our learning experiences, student projects, workshops and technical programs.',
          defaultIndex: 0,
        },
      }),
      prisma.galleryItem.findMany({
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    res.json({
      success: true,
      data: { settings, items },
    });
  } catch (error) {
    next(error);
  }
});

// 2. Create new gallery image item
router.post('/admin/gallery/items', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, label, description, imageUrl, link, displayOrder, isActive, isDefault } = req.body;

    if (!title || !label || !imageUrl) {
      throw new AppError('Title, label, and image URL are required', 400);
    }

    // Determine display order if not provided
    let order = Number(displayOrder);
    if (isNaN(order)) {
      const highest = await prisma.galleryItem.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      order = (highest?.displayOrder ?? -1) + 1;
    }

    if (isDefault) {
      // Unset previous defaults
      await prisma.galleryItem.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const item = await prisma.galleryItem.create({
      data: {
        title: title.trim(),
        label: label.trim(),
        description: description?.trim() || '',
        imageUrl: imageUrl.trim(),
        link: link?.trim() || '#',
        displayOrder: order,
        isActive: isActive !== false,
        isDefault: Boolean(isDefault),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

// 3. Update existing gallery item
router.put('/admin/gallery/items/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { title, label, description, imageUrl, link, displayOrder, isActive, isDefault } = req.body;

    const existing = await prisma.galleryItem.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Gallery item not found', 404);
    }

    if (isDefault) {
      await prisma.galleryItem.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.galleryItem.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        label: label !== undefined ? label.trim() : existing.label,
        description: description !== undefined ? description?.trim() : existing.description,
        imageUrl: imageUrl !== undefined ? imageUrl.trim() : existing.imageUrl,
        link: link !== undefined ? link?.trim() : existing.link,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : existing.displayOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
      },
    });

    res.json({
      success: true,
      message: 'Gallery item updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// 4. Delete gallery item
router.delete('/admin/gallery/items/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.galleryItem.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Gallery item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// 5. Reorder multiple gallery items in batch
router.put('/admin/gallery/reorder', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { orderIds } = req.body; // Array of item IDs in desired order
    if (!Array.isArray(orderIds)) {
      throw new AppError('orderIds must be an array of item IDs', 400);
    }

    await prisma.$transaction(
      orderIds.map((id, index) =>
        prisma.galleryItem.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    );

    res.json({
      success: true,
      message: 'Gallery items reordered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// 6. Update gallery section settings (toggle visibility, titles, default index)
router.put('/admin/gallery/settings', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isEnabled, sectionTitle, sectionBadge, sectionDesc, defaultIndex } = req.body;

    const settings = await prisma.gallerySetting.upsert({
      where: { id: 'default' },
      update: {
        ...(isEnabled !== undefined && { isEnabled: Boolean(isEnabled) }),
        ...(sectionTitle !== undefined && { sectionTitle: sectionTitle.trim() }),
        ...(sectionBadge !== undefined && { sectionBadge: sectionBadge.trim() }),
        ...(sectionDesc !== undefined && { sectionDesc: sectionDesc.trim() }),
        ...(defaultIndex !== undefined && { defaultIndex: Number(defaultIndex) }),
      },
      create: {
        id: 'default',
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
        sectionTitle: sectionTitle?.trim() || 'Discover. Learn. Create.',
        sectionBadge: sectionBadge?.trim() || 'EXPLORE SKILLUP',
        sectionDesc: sectionDesc?.trim() || 'Explore our learning experiences, student projects, workshops and technical programs.',
        defaultIndex: Number(defaultIndex) || 0,
      },
    });

    res.json({
      success: true,
      message: 'Gallery settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

