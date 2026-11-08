import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/hackathons - Public listing
 */
export const getHackathons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const hackathons = await prisma.hackathon.findMany({
      where: { isPublished: true },
      include: {
        mentor: { select: { id: true, name: true, title: true, avatarUrl: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json({ success: true, data: hackathons });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hackathons/:id - Hackathon details
 */
export const getHackathonById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        mentor: { select: { id: true, name: true, title: true, avatarUrl: true, college: true } },
        _count: { select: { registrations: true } },
      },
    });

    if (!hackathon) throw new AppError('Hackathon not found', 404);

    res.json({ success: true, data: hackathon });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hackathons/:id/register - Register for hackathon
 */
export const registerHackathon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);
    const { teamName, teamMembers } = req.body;

    const hackathon = await prisma.hackathon.findUnique({ where: { id } });
    if (!hackathon) throw new AppError('Hackathon not found', 404);
    if (!hackathon.isPublished) throw new AppError('This hackathon is not currently open for registrations', 400);

    if (new Date(hackathon.registrationDeadline) < new Date()) {
      throw new AppError('The registration deadline has already passed', 400);
    }

    const existing = await prisma.hackathonRegistration.findUnique({
      where: { hackathonId_userId: { hackathonId: id, userId: req.user.id } },
    });

    if (existing) {
      throw new AppError('You are already registered for this hackathon', 400);
    }

    const fee = Number(hackathon.registrationFee);
    const isPaid = fee > 0;

    const registration = await prisma.hackathonRegistration.create({
      data: {
        hackathonId: id,
        userId: req.user.id,
        teamName: teamName ? String(teamName) : null,
        teamMembers: teamMembers ? String(teamMembers) : null,
        status: isPaid ? 'REGISTERED' : 'CONFIRMED',
        paidFee: 0,
      },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        userId: req.user.id,
        title: isPaid ? 'Hackathon Registration Pending Payment' : 'Hackathon Registration Confirmed',
        message: isPaid
          ? `Registration for "${hackathon.title}" created. Please complete registration fee of ₹${fee} to confirm.`
          : `You are confirmed for "${hackathon.title}". Get ready to innovate!`,
        type: 'COURSE',
      },
    });

    res.status(201).json({
      success: true,
      message: isPaid ? 'Registration initiated. Please complete payment.' : 'Successfully registered for hackathon!',
      data: registration,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hackathons/my/registrations - Student's registered hackathons
 */
export const getMyHackathons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const registrations = await prisma.hackathonRegistration.findMany({
      where: { userId: req.user.id },
      include: {
        hackathon: {
          include: {
            mentor: { select: { id: true, name: true, title: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({ success: true, data: registrations });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hackathons - Admin: Create hackathon
 */
export const createHackathon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const {
      title,
      description,
      theme,
      organizer,
      mentorId,
      startDate,
      endDate,
      registrationDeadline,
      mode,
      location,
      minTeamSize,
      maxTeamSize,
      eligibility,
      registrationFee,
      rules,
      prizes,
      bannerUrl,
      isPublished,
    } = req.body;

    if (!title || !description || !startDate || !endDate || !registrationDeadline) {
      throw new AppError('Title, description, startDate, endDate, and registrationDeadline are required', 400);
    }

    const hackathon = await prisma.hackathon.create({
      data: {
        title: String(title),
        description: String(description),
        theme: theme || 'AI & Full-Stack Systems',
        organizer: organizer || 'SkillUp Global',
        mentorId: mentorId ? String(mentorId) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationDeadline: new Date(registrationDeadline),
        mode: mode || 'ONLINE',
        location: location || null,
        minTeamSize: minTeamSize ? Number(minTeamSize) : 1,
        maxTeamSize: maxTeamSize ? Number(maxTeamSize) : 4,
        eligibility: eligibility || 'Open to all students & developers',
        registrationFee: registrationFee ? Number(registrationFee) : 0,
        rules: rules || null,
        prizes: prizes || null,
        bannerUrl: bannerUrl || null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
    });

    res.status(201).json({ success: true, data: hackathon });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/hackathons/:id - Admin: Update hackathon
 */
export const updateHackathon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const data: any = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    if (data.registrationDeadline) data.registrationDeadline = new Date(data.registrationDeadline);
    if (data.registrationFee !== undefined) data.registrationFee = Number(data.registrationFee);

    const updated = await prisma.hackathon.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hackathons/:id/participants - Admin: View participants
 */
export const getHackathonParticipants = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const participants = await prisma.hackathonRegistration.findMany({
      where: { hackathonId: id },
      include: {
        user: { select: { id: true, name: true, email: true, college: true, phone: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({ success: true, data: participants });
  } catch (error) {
    next(error);
  }
};



/**
 * DELETE /api/hackathons/:id - Delete or archive hackathon safely
 */
export const deleteHackathon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const id = String(req.params.id);

    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        registrations: { select: { id: true, teamName: true, paidFee: true } },
        payments: { select: { id: true, amount: true } },
        coupons: { select: { id: true } },
      },
    });

    if (!hackathon) throw new AppError('Hackathon not found', 404);

    const hasRegistrations = hackathon.registrations.length > 0;
    const hasFinancialRecords = hackathon.payments.length > 0;

    // Safety: If participants registered or payments exist, close and archive
    if (hasRegistrations || hasFinancialRecords) {
      await prisma.hackathon.update({
        where: { id },
        data: {
          isPublished: false,
        },
      });

      return res.json({
        success: true,
        archived: true,
        message: `Hackathon "${hackathon.title}" has ${hackathon.registrations.length} registered participant(s) or payment records. It has been safely closed & archived to preserve participant submissions and financial audit records.`,
      });
    }

    // Safe deletion for unused hackathon
    await prisma.$transaction([
      prisma.coupon.deleteMany({ where: { hackathonId: id } }),
      prisma.hackathon.delete({ where: { id } }),
    ]);

    res.json({
      success: true,
      archived: false,
      message: `Hackathon "${hackathon.title}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
