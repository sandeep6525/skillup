import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

// DEFAULT CATEGORIES LIST
const DEFAULT_CATEGORIES = [
  { name: 'Awards & Recognition', slug: 'awards-recognition', displayOrder: 1 },
  { name: 'Events & Workshops', slug: 'events-workshops', displayOrder: 2 },
  { name: 'Student Achievements', slug: 'student-achievements', displayOrder: 3 },
  { name: 'Projects & Innovations', slug: 'projects-innovations', displayOrder: 4 },
  { name: 'Partnerships & Collaborations', slug: 'partnerships-collaborations', displayOrder: 5 },
  { name: 'Company Milestones', slug: 'company-milestones', displayOrder: 6 },
  { name: 'Certifications', slug: 'certifications', displayOrder: 7 },
  { name: 'Other Achievements', slug: 'other-achievements', displayOrder: 8 },
];

/**
 * Ensure default categories exist
 */
const ensureDefaultCategories = async () => {
  const count = await prisma.achievementCategory.count();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.achievementCategory.create({
        data: cat,
      });
    }
  }
};

// ==========================================
// PUBLIC CONTROLLERS
// ==========================================

/**
 * GET /api/achievements - Public published achievements with filtering
 */
export const getPublicAchievements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultCategories();

    const { category, featured, page = '1', limit = '12', search } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.max(1, Math.min(50, parseInt(String(limit)) || 12));
    const skip = (pageNum - 1) * take;

    const where: any = { isPublished: true };

    if (category && category !== 'all') {
      where.OR = [
        { category: { slug: String(category) } },
        { categoryId: String(category) },
      ];
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: q } },
            { shortSummary: { contains: q } },
            { description: { contains: q } },
            { location: { contains: q } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.achievement.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: { displayOrder: 'asc' },
            select: { id: true, imageUrl: true, caption: true, displayOrder: true },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { eventDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.achievement.count({ where }),
    ]);

    const categories = await prisma.achievementCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { achievements: { where: { isPublished: true } } },
        },
      },
    });

    res.json({
      success: true,
      data: items,
      categories,
      meta: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/achievements/:slugOrId - Public achievement details
 */
export const getAchievementBySlugOrId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slugOrId = String(req.params.slugOrId);

    const achievement = await prisma.achievement.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
        isPublished: true,
      },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!achievement) {
      throw new AppError('Achievement record not found', 404);
    }

    // Related achievements in the same category
    const related = await prisma.achievement.findMany({
      where: {
        id: { not: achievement.id },
        isPublished: true,
        categoryId: achievement.categoryId,
      },
      take: 3,
      include: {
        category: true,
      },
      orderBy: { eventDate: 'desc' },
    });

    res.json({
      success: true,
      data: {
        ...achievement,
        related,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/achievements/categories - Public list of categories
 */
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultCategories();
    const categories = await prisma.achievementCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

/**
 * GET /api/achievements/admin/all - Admin list (all achievements, including drafts)
 */
export const getAdminAchievements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await ensureDefaultCategories();

    const { categoryId, status, search } = req.query;
    const where: any = {};

    if (categoryId && categoryId !== 'all') {
      where.categoryId = String(categoryId);
    }

    if (status === 'published') where.isPublished = true;
    if (status === 'draft') where.isPublished = false;

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { shortSummary: { contains: q } },
        { location: { contains: q } },
      ];
    }

    const items = await prisma.achievement.findMany({
      where,
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const categories = await prisma.achievementCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { achievements: true } },
      },
    });

    res.json({
      success: true,
      data: items,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/achievements/admin - Create new achievement
 */
export const createAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      shortSummary,
      description,
      coverImage,
      eventDate,
      location,
      isFeatured = false,
      isPublished = true,
      displayOrder = 0,
      categoryId,
      images = [], // Array of { imageUrl, caption, displayOrder }
    } = req.body;

    if (!title || !description || !coverImage) {
      throw new AppError('Title, description, and cover image are required', 400);
    }

    let slug = slugify(title);
    // ensure unique slug
    let existingSlug = await prisma.achievement.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const achievement = await prisma.achievement.create({
      data: {
        title: String(title).trim(),
        slug,
        shortSummary: shortSummary ? String(shortSummary).trim() : null,
        description: String(description).trim(),
        coverImage: String(coverImage).trim(),
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        location: location ? String(location).trim() : null,
        isFeatured: Boolean(isFeatured),
        isPublished: Boolean(isPublished),
        displayOrder: parseInt(String(displayOrder)) || 0,
        categoryId: categoryId || null,
        images: {
          create: (Array.isArray(images) ? images : []).map((img: any, idx: number) => ({
            imageUrl: String(img.imageUrl || img),
            caption: img.caption ? String(img.caption).trim() : null,
            displayOrder: img.displayOrder !== undefined ? parseInt(String(img.displayOrder)) : idx,
          })),
        },
      },
      include: {
        category: true,
        images: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Achievement published successfully',
      data: achievement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/achievements/admin/:id - Update existing achievement
 */
export const updateAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);

    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Achievement record not found', 404);
    }

    const {
      title,
      shortSummary,
      description,
      coverImage,
      eventDate,
      location,
      isFeatured,
      isPublished,
      displayOrder,
      categoryId,
      images,
    } = req.body;

    const data: any = {};
    if (title !== undefined) {
      data.title = String(title).trim();
      data.slug = slugify(title);
      const clash = await prisma.achievement.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (clash) {
        data.slug = `${data.slug}-${Date.now().toString().slice(-4)}`;
      }
    }
    if (shortSummary !== undefined) data.shortSummary = shortSummary ? String(shortSummary).trim() : null;
    if (description !== undefined) data.description = String(description).trim();
    if (coverImage !== undefined) data.coverImage = String(coverImage).trim();
    if (eventDate !== undefined) data.eventDate = eventDate ? new Date(eventDate) : null;
    if (location !== undefined) data.location = location ? String(location).trim() : null;
    if (isFeatured !== undefined) data.isFeatured = Boolean(isFeatured);
    if (isPublished !== undefined) data.isPublished = Boolean(isPublished);
    if (displayOrder !== undefined) data.displayOrder = parseInt(String(displayOrder)) || 0;
    if (categoryId !== undefined) data.categoryId = categoryId || null;

    // Replace images if provided
    if (Array.isArray(images)) {
      await prisma.achievementImage.deleteMany({ where: { achievementId: id } });
      await prisma.achievementImage.createMany({
        data: images.map((img: any, idx: number) => ({
          achievementId: id,
          imageUrl: String(img.imageUrl || img),
          caption: img.caption ? String(img.caption).trim() : null,
          displayOrder: img.displayOrder !== undefined ? parseInt(String(img.displayOrder)) : idx,
        })),
      });
    }

    const updated = await prisma.achievement.update({
      where: { id },
      data,
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
      },
    });

    res.json({
      success: true,
      message: 'Achievement updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/achievements/admin/:id - Delete achievement
 */
export const deleteAchievement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.achievement.delete({ where: { id } });
    res.json({ success: true, message: 'Achievement deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/achievements/admin/categories - Create category
 */
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, displayOrder } = req.body;
    if (!name || !String(name).trim()) {
      throw new AppError('Category name is required', 400);
    }
    const slug = slugify(name);

    const category = await prisma.achievementCategory.create({
      data: {
        name: String(name).trim(),
        slug,
        description: description ? String(description).trim() : null,
        displayOrder: parseInt(String(displayOrder)) || 0,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/achievements/admin/categories/:id - Delete category
 */
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await prisma.achievementCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Category removed' });
  } catch (error) {
    next(error);
  }
};
