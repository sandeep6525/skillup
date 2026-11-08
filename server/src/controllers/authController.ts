import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

// Cryptographically secure 6-digit OTP generator
const generateSecureOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const generateTokens = (user: { id: string; email: string; role: any }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

/**
 * Step 1: Initiate Registration and send 6-digit Email OTP
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, password, role, title, bio } = req.body;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    if (!normalizedEmail || !password || !name) {
      throw new AppError('Full name, email address and password are required', 400);
    }

    // Phone number validation: Indian 10-digit mobile number by default or international E.164
    if (!phone || !phone.trim()) {
      throw new AppError('Phone number is mandatory for student registration', 400);
    }

    const cleanPhone = phone.trim();
    const phoneRegex = /^(\+?\d{1,4}[-\s]?)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone.replace(/\s+/g, ''))) {
      throw new AppError('Please provide a valid 10-digit phone number', 400);
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 400);
    }

    // Check if user already exists with this phone number
    const existingPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists', 400);
    }

    // Role security check: Public registration is strictly for Students only.
    if (role && role !== 'STUDENT') {
      throw new AppError('Public registration is restricted to Students. Mentor accounts must be invited and authorized by an Administrator.', 403);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateSecureOTP();
    const otpHashed = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Store pending registration with OTP hash (always STUDENT role)
    await prisma.oTPVerification.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: name.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        role: 'STUDENT',
        title,
        bio,
        otpHashed,
        expiresAt,
        attempts: 0,
      },
      update: {
        name: name.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        role: 'STUDENT',
        title,
        bio,
        otpHashed,
        expiresAt,
        attempts: 0,
      },
    });

    // Send email with OTP via SMTP (with templateCode)
    const template = emailTemplates.registrationOTP(name, otp);
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: template.subject,
      html: template.html,
      templateCode: 'EMAIL_VERIFICATION_OTP',
      idempotencyKey: `otp_${normalizedEmail}_${Date.now()}`,
    });

    if (!emailResult) {
      throw new AppError(
        'Email delivery failed. Please verify the mail server configuration or try again later.',
        503
      );
    }

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email address',
      data: {
        email: normalizedEmail,
        expiresInSeconds: 300,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Verify 6-digit OTP and complete Account Creation
 */
export const verifyRegistrationOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new AppError('Email and OTP are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const pending = await prisma.oTPVerification.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      throw new AppError('No pending registration found for this email. Please register again.', 404);
    }

    // Check expiration
    if (new Date() > pending.expiresAt) {
      await prisma.oTPVerification.delete({ where: { id: pending.id } });
      throw new AppError('Verification code has expired. Please request a new code.', 400);
    }

    // Check attempt limit (max 5)
    if (pending.attempts >= 5) {
      await prisma.oTPVerification.delete({ where: { id: pending.id } });
      throw new AppError('Too many failed attempts. Please register again to receive a fresh code.', 429);
    }

    // Verify OTP hash
    const isMatch = await bcrypt.compare(String(otp).trim(), pending.otpHashed);
    if (!isMatch) {
      await prisma.oTPVerification.update({
        where: { id: pending.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 4 - pending.attempts;
      throw new AppError(`Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Final attempt failed.'}`, 400);
    }

    // Complete account creation in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          phone: pending.phone || null,
          password: pending.password,
          role: pending.role,
          title: pending.title,
          bio: pending.bio,
          isVerified: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          title: true,
          bio: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      // Cleanup pending OTP record
      await tx.oTPVerification.delete({ where: { id: pending.id } });
      return user;
    });

    const { accessToken, refreshToken } = generateTokens(newUser);

    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken },
    });

    // Send Welcome Email asynchronously with templateCode & idempotencyKey
    const isMentor = newUser.role === 'INSTRUCTOR';
    const welcomeTpl = isMentor ? emailTemplates.mentorWelcome(newUser.name) : emailTemplates.welcome(newUser.name);
    sendEmail({
      to: newUser.email,
      subject: welcomeTpl.subject,
      html: welcomeTpl.html,
      templateCode: isMentor ? 'MENTOR_WELCOME' : 'STUDENT_WELCOME',
      idempotencyKey: `welcome_${newUser.id}`,
    }).catch(console.error);

    res.status(201).json({
      success: true,
      message: 'Account verified and created successfully',
      data: { user: newUser, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP with cooldown guard
 */
export const resendRegistrationOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const pending = await prisma.oTPVerification.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      throw new AppError('No pending registration found for this email', 404);
    }

    // 60 seconds cooldown guard
    const elapsedSeconds = (Date.now() - new Date(pending.updatedAt).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitTime = Math.ceil(60 - elapsedSeconds);
      throw new AppError(`Please wait ${waitTime} seconds before requesting a new code`, 429);
    }

    const otp = generateSecureOTP();
    const otpHashed = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.oTPVerification.update({
      where: { id: pending.id },
      data: {
        otpHashed,
        expiresAt,
        attempts: 0,
      },
    });

    const template = emailTemplates.registrationOTP(pending.name, otp);
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: template.subject,
      html: template.html,
      templateCode: 'EMAIL_VERIFICATION_OTP',
      idempotencyKey: `otp_resend_${normalizedEmail}_${Date.now()}`,
    });

    if (!emailResult) {
      throw new AppError(
        'Email delivery failed. Please verify the mail server configuration or try again later.',
        503
      );
    }

    res.json({
      success: true,
      message: 'A fresh verification code has been sent to your email',
      data: { email: normalizedEmail, expiresInSeconds: 300 },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Mentor / Instructor Account Status Verification
    if (user.role === 'INSTRUCTOR' && !user.isVerified) {
      throw new AppError('Your mentor account is pending activation or administrator approval. Please check your invitation email or contact the administrator.', 403);
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: { user: sanitizedUser, accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(token, config.jwtRefreshSecret) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokens = generateTokens(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    next(new AppError('Invalid refresh token', 401));
  }
};

/**
 * Logout
 */
export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { refreshToken: null },
      });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Current Authenticated User
 */
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        bio: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        mentorProfile: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Profile Update
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { name, title, bio, phone, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(title !== undefined && { title }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        bio: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
      },
    });

    res.json({ success: true, message: 'Profile updated', data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password (Sends hashed single-use token via SMTP)
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, a password reset link has been sent' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Invalidate existing unused tokens for this email
    await prisma.passwordReset.updateMany({
      where: { email: normalizedEmail, isUsed: false },
      data: { isUsed: true },
    });

    // Record new reset token
    await prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        tokenHashed,
        expiresAt,
      },
    });

    const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;
    const template = emailTemplates.passwordReset(user.name, resetUrl);

    const emailSent = await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      templateCode: 'PASSWORD_RESET',
      idempotencyKey: `pwd_reset_${user.id}_${Date.now()}`,
    });

    if (!emailSent) {
      throw new AppError(
        'Email delivery failed. Please verify the mail server configuration or try again later.',
        503
      );
    }

    res.json({ success: true, message: 'Password reset link has been dispatched to your email' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password, email } = req.body;
    if (!token || !password) throw new AppError('Token and new password required', 400);

    const tokenHashed = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        tokenHashed,
        isUsed: false,
        expiresAt: { gt: new Date() },
        ...(email && { email: email.toLowerCase().trim() }),
      },
    });

    if (!resetRecord) {
      throw new AppError('Password reset link is invalid, already used, or has expired', 400);
    }

    const user = await prisma.user.findUnique({ where: { email: resetRecord.email } });
    if (!user) {
      throw new AppError('User account not found', 404);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          refreshToken: null, // invalidate old sessions
        },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      }),
    ]);

    // Send confirmation email
    const confirmTpl = emailTemplates.passwordChanged(user.name);
    sendEmail({
      to: user.email,
      subject: confirmTpl.subject,
      html: confirmTpl.html,
      templateCode: 'PASSWORD_CHANGED',
      idempotencyKey: `pwd_changed_${user.id}_${Date.now()}`,
    }).catch(console.error);

    res.json({ success: true, message: 'Password has been successfully updated. You can now login.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Legacy Verify Email Link endpoint
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Verification token required', 400);

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) throw new AppError('Invalid or expired verification token', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    res.json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/activate-mentor/validate?token=...
 * Validates mentor invitation token without exposing secrets
 */
export const validateMentorActivationToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = String(req.query.token || '').trim();
    if (!rawToken) {
      throw new AppError('Activation token is required', 400);
    }

    const tokenHashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await prisma.mentorInvitation.findFirst({
      where: {
        tokenHashed,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        courseId: true,
        batchId: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      throw new AppError('Invitation link is invalid, has expired, or has already been used', 400);
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        name: invitation.name,
        title: invitation.title,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/activate-mentor
 * Allows invited mentor to set their own password and activate account
 */
export const activateMentorAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      throw new AppError('Activation token and password are required', 400);
    }

    const tokenHashed = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const invitation = await prisma.mentorInvitation.findFirst({
      where: {
        tokenHashed,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new AppError('Activation link is invalid, already used, or has expired', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedEmail = invitation.email.toLowerCase().trim();

    // Execute user creation / activation and atomic token claim in a transaction
    const activatedUser = await prisma.$transaction(async (tx) => {
      // 1. Atomic claim: ensure this invocation is the exclusive winner of the token
      const claimResult = await tx.mentorInvitation.updateMany({
        where: {
          id: invitation.id,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      if (claimResult.count === 0) {
        throw new AppError('Activation link is invalid, already used, or has expired', 400);
      }

      // 2. Check if user already exists (e.g. created during invite as unverified, or pre-existing)
      const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
      let userRecord;

      if (existing) {
        userRecord = await tx.user.update({
          where: { id: existing.id },
          data: {
            password: hashedPassword,
            role: 'INSTRUCTOR',
            isVerified: true,
            title: invitation.title || existing.title,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
            avatarUrl: true,
            isVerified: true,
          },
        });
      } else {
        userRecord = await tx.user.create({
          data: {
            name: invitation.name,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'INSTRUCTOR',
            title: invitation.title || 'Teaching Mentor',
            isVerified: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
            avatarUrl: true,
            isVerified: true,
          },
        });
      }

      // Ensure mentor profile exists
      await tx.mentorProfile.upsert({
        where: { userId: userRecord.id },
        create: {
          userId: userRecord.id,
          expertise: invitation.title || 'Full-Stack Development',
          hourlyRate: 0,
          about: `Teaching mentor for SkillUp platform.`,
          experience: 2,
          isAvailable: true,
        },
        update: {
          isAvailable: true,
        },
      });

      // If pre-assigned to a course/batch, ensure mentor assignment
      if (invitation.courseId) {
        const existingAssignment = await tx.mentorAssignment.findFirst({
          where: {
            mentorId: userRecord.id,
            courseId: invitation.courseId,
            ...(invitation.batchId ? { batchId: invitation.batchId } : {}),
          },
        });

        if (!existingAssignment) {
          await tx.mentorAssignment.create({
            data: {
              mentorId: userRecord.id,
              courseId: invitation.courseId,
              batchId: invitation.batchId || null,
              scope: invitation.batchId ? 'SPECIFIC_BATCH' : 'COURSE_WIDE',
            },
          });
        }
      }

      return userRecord;
    });

    const { accessToken, refreshToken } = generateTokens(activatedUser);
    await prisma.user.update({
      where: { id: activatedUser.id },
      data: { refreshToken },
    });

    // Send Welcome Email
    const welcomeTpl = emailTemplates.mentorWelcome(activatedUser.name);
    sendEmail({
      to: activatedUser.email,
      subject: welcomeTpl.subject,
      html: welcomeTpl.html,
      templateCode: 'MENTOR_WELCOME',
      idempotencyKey: `mentor_welcome_${activatedUser.id}`,
    }).catch(console.error);

    res.json({
      success: true,
      message: 'Mentor account activated successfully. Welcome to SkillUp!',
      data: {
        user: activatedUser,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
