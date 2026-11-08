import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import prisma from '../config/prisma';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

/**
 * Helper to validate a coupon against a course, internship, or learning material, user, and price
 */
export const validateCouponDiscount = async ({
  couponCode,
  courseId,
  internshipId,
  materialId,
  hackathonId,
  liveClassId,
  userId,
}: {
  couponCode: string;
  courseId?: string;
  internshipId?: string;
  materialId?: string;
  hackathonId?: string;
  liveClassId?: string;
  userId: string;
}) => {
  const normalizedCode = couponCode.trim().toUpperCase();

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
    include: {
      course: true,
      internship: true,
      material: true,
      hackathon: true,
      liveClass: true,
    },
  });

  if (!coupon) {
    throw new AppError('Coupon code not found', 404);
  }

  if (!coupon.isActive) {
    throw new AppError('This coupon is currently inactive', 400);
  }

  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    throw new AppError('This coupon is not yet active', 400);
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    throw new AppError('This coupon has expired', 400);
  }

  // Course restriction check
  if (coupon.courseId && coupon.courseId !== courseId) {
    throw new AppError(
      `This coupon is valid only for the course: "${coupon.course?.title || coupon.courseId}"`,
      400
    );
  }

  // Internship restriction check
  if (coupon.internshipId && coupon.internshipId !== internshipId) {
    throw new AppError(
      `This coupon is valid only for the internship: "${coupon.internship?.title || coupon.internshipId}"`,
      400
    );
  }

  // Material restriction check
  if (coupon.materialId && coupon.materialId !== materialId) {
    throw new AppError(
      `This coupon is valid only for the learning material: "${coupon.material?.title || coupon.materialId}"`,
      400
    );
  }

  // Hackathon restriction check
  if (coupon.hackathonId && coupon.hackathonId !== hackathonId) {
    throw new AppError(
      `This coupon is valid only for the hackathon: "${coupon.hackathon?.title || coupon.hackathonId}"`,
      400
    );
  }

  // Live Class restriction check
  if (coupon.liveClassId && coupon.liveClassId !== liveClassId) {
    throw new AppError(
      `This coupon is valid only for the live class: "${coupon.liveClass?.title || coupon.liveClassId}"`,
      400
    );
  }

  // Auto-expire reservations older than 15 minutes to release locked coupon quota
  const reservationExpiry = new Date(Date.now() - 15 * 60 * 1000);
  await prisma.couponRedemption.deleteMany({
    where: {
      status: 'RESERVED',
      redeemedAt: { lt: reservationExpiry },
    },
  });

  // Global usage limit check (active successful + valid active reservations)
  const activeReservationsCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      status: 'RESERVED',
      redeemedAt: { gte: reservationExpiry },
    },
  });

  if (coupon.usedCount + activeReservationsCount >= coupon.usageLimit) {
    throw new AppError('This coupon has reached its maximum global redemption limit', 400);
  }

  // Per-student limit check
  const studentRedemptionsCount = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId,
      status: { in: ['COMPLETED', 'RESERVED'] },
      redeemedAt: { gte: reservationExpiry },
    },
  });

  if (studentRedemptionsCount >= coupon.perStudentLimit) {
    throw new AppError(`You have already utilized this coupon code (limit: ${coupon.perStudentLimit} per student)`, 400);
  }

  // College-specific membership verification
  if (coupon.college) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.college) {
      if (user.college.toLowerCase().trim() !== coupon.college.toLowerCase().trim()) {
        throw new AppError(
          `This coupon is exclusively reserved for students of ${coupon.college}. Your profile is linked to ${user.college}.`,
          403
        );
      }
    }
  }

  // Fetch product price
  let originalPrice = 0;
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError('Course not found', 404);
    originalPrice = Number(course.discountPrice || course.price);
  } else if (internshipId) {
    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
    if (!internship) throw new AppError('Internship not found', 404);
    originalPrice = Number(internship.price);
  } else if (materialId) {
    const material = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
    if (!material) throw new AppError('Learning material not found', 404);
    originalPrice = Number(material.discountPrice || material.price);
  } else if (hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new AppError('Hackathon not found', 404);
    originalPrice = Number(hackathon.registrationFee);
  } else if (liveClassId) {
    const liveClass = await prisma.liveClass.findUnique({ where: { id: liveClassId } });
    if (!liveClass) throw new AppError('Live class session not found', 404);
    originalPrice = Number(liveClass.price);
  }

  if (coupon.minSpend && originalPrice < Number(coupon.minSpend)) {
    throw new AppError(`Minimum order amount of ₹${coupon.minSpend} required to use this coupon`, 400);
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((originalPrice * Number(coupon.discountVal)) / 100);
    if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
      discountAmount = Number(coupon.maxDiscount);
    }
  } else {
    // FIXED amount discount
    discountAmount = Number(coupon.discountVal);
  }

  // Prevent discount from exceeding original price
  if (discountAmount > originalPrice) {
    discountAmount = originalPrice;
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    coupon,
    originalPrice,
    discountAmount,
    finalPrice,
    isFree: finalPrice === 0,
  };
};

/**
 * POST /api/payments/validate-coupon - Validate Coupon for Courses, Internships, Materials
 */
export const validateCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { code, couponCode, courseId, internshipId, materialId, hackathonId, liveClassId } = req.body;
    const finalCode = (code || couponCode || '').trim();

    if (!finalCode) {
      throw new AppError('Coupon code is required', 400);
    }

    if (!courseId && !internshipId && !materialId && !hackathonId && !liveClassId) {
      throw new AppError('One of courseId, internshipId, materialId, hackathonId, or liveClassId is required', 400);
    }

    const result = await validateCouponDiscount({
      couponCode: String(finalCode),
      courseId: courseId ? String(courseId) : undefined,
      internshipId: internshipId ? String(internshipId) : undefined,
      materialId: materialId ? String(materialId) : undefined,
      hackathonId: hackathonId ? String(hackathonId) : undefined,
      liveClassId: liveClassId ? String(liveClassId) : undefined,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: `Coupon "${result.coupon.code}" applied! You save ₹${result.discountAmount}`,
      data: {
        code: result.coupon.code,
        couponCode: result.coupon.code,
        name: result.coupon.name,
        college: result.coupon.college,
        discountType: result.coupon.discountType,
        discountVal: result.coupon.discountVal,
        originalPrice: result.originalPrice,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
        finalAmount: result.finalPrice,
        isFree: result.isFree,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/orders - Unified Razorpay Order Creation
 */
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { courseId, internshipId, materialId, hackathonId, liveClassId, mentorBookingId, couponCode, isPartial, customAmount } = req.body;

    if (!courseId && !internshipId && !materialId && !hackathonId && !liveClassId && !mentorBookingId) {
      throw new AppError('A valid product ID is required for checkout', 400);
    }

    let amount = 0;
    let originalAmount = 0;
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    let description = '';
    let isPartialPayment = false;
    let remainingBalance = 0;

    // 1. COURSE PURCHASE
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Course not found', 404);

      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId } },
      });

      // Calculate total previously verified completed payments for this course
      const previousPayments = await prisma.payment.aggregate({
        where: {
          userId: req.user.id,
          courseId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });

      const previouslyPaid = Number(previousPayments._sum.amount || 0);
      let totalPayable = Number(course.discountPrice || course.price);
      let currentOutstanding = Math.max(0, totalPayable - previouslyPaid);

      if (existing && currentOutstanding <= 0) {
        throw new AppError('You are already fully enrolled in this course', 400);
      }

      // Apply coupon first if provided
      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponDiscount({
          couponCode: String(couponCode),
          courseId,
          userId: req.user.id,
        });

        appliedCouponCode = couponResult.coupon.code;
        discountAmount = couponResult.discountAmount;
        totalPayable = couponResult.finalPrice;
        currentOutstanding = Math.max(0, totalPayable - previouslyPaid);
        description = `Payment for course: ${course.title} (Coupon: ${appliedCouponCode})`;

        if (couponResult.isFree) {
          const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
              data: {
                amount: 0,
                originalAmount,
                discountAmount,
                couponCode: appliedCouponCode,
                currency: 'INR',
                status: 'COMPLETED',
                razorpayOrderId: `free_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                razorpayPaymentId: `free_grant_${Date.now()}`,
                userId: req.user!.id,
                courseId,
              },
            });

            await tx.coupon.update({
              where: { id: couponResult.coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: couponResult.coupon.id,
                userId: req.user!.id,
                courseId,
                paymentId: payment.id,
                originalAmount,
                discountAmount,
                finalAmount: 0,
                status: 'COMPLETED',
              },
            });

            await tx.enrollment.upsert({
              where: { userId_courseId: { userId: req.user!.id, courseId } },
              create: { userId: req.user!.id, courseId, progress: 0 },
              update: {},
            });

            await tx.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Free Enrollment Activated',
                message: `Congratulations! Coupon "${appliedCouponCode}" granted 100% discount. Course access is now active.`,
                type: 'PAYMENT',
              },
            });

            return payment;
          });

          return res.status(201).json({
            success: true,
            message: `100% discount applied! Course access unlocked with coupon "${appliedCouponCode}".`,
            data: {
              isFree: true,
              paymentId: result.id,
              orderId: result.razorpayOrderId,
              amount: 0,
              currency: 'INR',
            },
          });
        }
      }

      originalAmount = totalPayable;
      amount = currentOutstanding > 0 ? currentOutstanding : originalAmount;
      if (!description) {
        description = `Payment for course: ${course.title}`;
      }

      // If course is naturally free (price = 0) or outstanding is 0, enroll directly without gateway
      if (amount <= 0) {
        const result = await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              amount: 0,
              originalAmount,
              discountAmount: 0,
              currency: 'INR',
              status: 'COMPLETED',
              razorpayOrderId: `free_course_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              razorpayPaymentId: `free_course_grant_${Date.now()}`,
              userId: req.user!.id,
              courseId,
            },
          });

          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: req.user!.id, courseId } },
            create: { userId: req.user!.id, courseId, progress: 0 },
            update: {},
          });

          await tx.notification.create({
            data: {
              userId: req.user!.id,
              title: 'Course Enrollment Activated',
              message: `You are successfully enrolled in "${course.title}". Start learning today!`,
              type: 'COURSE',
            },
          });

          return payment;
        });

        return res.status(201).json({
          success: true,
          message: `Free enrollment activated for "${course.title}".`,
          data: {
            isFree: true,
            paymentId: result.id,
            orderId: result.razorpayOrderId,
            amount: 0,
            currency: 'INR',
          },
        });
      }

      // Custom / Installment Payment handling
      if (isPartial) {
        if (!course.allowInstallments) {
          throw new AppError('Partial/installment payments are not enabled for this course.', 400);
        }

        const minPermitted = Number(course.minInstallmentAmount || 500);
        if (!customAmount || Number(customAmount) < Math.min(minPermitted, currentOutstanding)) {
          throw new AppError(`The minimum initial payment for this course is ₹${minPermitted}.`, 400);
        }

        if (Number(customAmount) > currentOutstanding) {
          throw new AppError(`Payment amount cannot exceed the remaining course balance of ₹${currentOutstanding.toFixed(2)}.`, 400);
        }

        amount = Number(customAmount);
        remainingBalance = currentOutstanding - amount;
        isPartialPayment = remainingBalance > 0;
        description = isPartialPayment
          ? `Installment payment for course: ${course.title} (Remaining balance: ₹${remainingBalance.toFixed(2)})`
          : `Final balance payment for course: ${course.title}`;
      }
    }
    // 2. INTERNSHIP PURCHASE
    else if (internshipId) {
      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
      if (!internship) throw new AppError('Internship not found', 404);

      const existingApp = await prisma.internshipApplication.findUnique({
        where: { internshipId_userId: { internshipId, userId: req.user.id } },
      });
      if (existingApp && existingApp.status === 'ACCEPTED') {
        throw new AppError('You are already actively enrolled in this internship', 400);
      }

      originalAmount = Number(internship.price);
      amount = originalAmount;
      description = `Enrollment fee for internship: ${internship.title}`;

      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponDiscount({
          couponCode: String(couponCode),
          internshipId,
          userId: req.user.id,
        });

        appliedCouponCode = couponResult.coupon.code;
        discountAmount = couponResult.discountAmount;
        amount = couponResult.finalPrice;
        description = `Payment for internship: ${internship.title} (Coupon: ${appliedCouponCode})`;

        if (couponResult.isFree) {
          const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
              data: {
                amount: 0,
                originalAmount,
                discountAmount,
                couponCode: appliedCouponCode,
                currency: 'INR',
                status: 'COMPLETED',
                razorpayOrderId: `free_intern_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                razorpayPaymentId: `free_intern_grant_${Date.now()}`,
                userId: req.user!.id,
                internshipId,
              },
            });

            await tx.coupon.update({
              where: { id: couponResult.coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: couponResult.coupon.id,
                userId: req.user!.id,
                internshipId,
                paymentId: payment.id,
                originalAmount,
                discountAmount,
                finalAmount: 0,
                status: 'COMPLETED',
              },
            });

            await tx.internshipApplication.upsert({
              where: { internshipId_userId: { internshipId, userId: req.user!.id } },
              create: {
                internshipId,
                userId: req.user!.id,
                status: 'ACCEPTED',
                paidAmount: 0,
                paymentId: payment.id,
              },
              update: {
                status: 'ACCEPTED',
                paidAmount: 0,
                paymentId: payment.id,
              },
            });

            await tx.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Internship Seat Confirmed',
                message: `Congratulations! Coupon "${appliedCouponCode}" granted 100% discount. Your internship enrollment is active.`,
                type: 'COURSE',
              },
            });

            return payment;
          });

          return res.status(201).json({
            success: true,
            message: `100% discount applied! Internship seat activated with coupon "${appliedCouponCode}".`,
            data: {
              isFree: true,
              paymentId: result.id,
              orderId: result.razorpayOrderId,
              amount: 0,
              currency: 'INR',
            },
          });
        }
      }
    }
    // 3. LEARNING MATERIAL PURCHASE
    else if (materialId) {
      const material = await prisma.learningMaterial.findUnique({ where: { id: materialId } });
      if (!material) throw new AppError('Learning material not found', 404);

      const existingPurchase = await prisma.materialPurchase.findUnique({
        where: { materialId_userId: { materialId, userId: req.user.id } },
      });
      if (existingPurchase) {
        throw new AppError('You already own this learning material', 400);
      }

      originalAmount = Number(material.discountPrice || material.price);
      amount = originalAmount;
      description = `Purchase of material: ${material.title}`;

      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponDiscount({
          couponCode: String(couponCode),
          materialId,
          userId: req.user.id,
        });

        appliedCouponCode = couponResult.coupon.code;
        discountAmount = couponResult.discountAmount;
        amount = couponResult.finalPrice;
        description = `Purchase of material: ${material.title} (Coupon: ${appliedCouponCode})`;

        if (couponResult.isFree) {
          const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
              data: {
                amount: 0,
                originalAmount,
                discountAmount,
                couponCode: appliedCouponCode,
                currency: 'INR',
                status: 'COMPLETED',
                razorpayOrderId: `free_mat_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                razorpayPaymentId: `free_mat_grant_${Date.now()}`,
                userId: req.user!.id,
                materialId,
              },
            });

            await tx.coupon.update({
              where: { id: couponResult.coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: couponResult.coupon.id,
                userId: req.user!.id,
                materialId,
                paymentId: payment.id,
                originalAmount,
                discountAmount,
                finalAmount: 0,
                status: 'COMPLETED',
              },
            });

            await tx.materialPurchase.create({
              data: {
                materialId,
                userId: req.user!.id,
                paymentId: payment.id,
                paidAmount: 0,
              },
            });

            await tx.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Material Unlocked',
                message: `Coupon "${appliedCouponCode}" applied! You can now download "${material.title}".`,
                type: 'COURSE',
              },
            });

            return payment;
          });

          return res.status(201).json({
            success: true,
            message: `100% discount applied! "${material.title}" is now available in My Materials.`,
            data: {
              isFree: true,
              paymentId: result.id,
              orderId: result.razorpayOrderId,
              amount: 0,
              currency: 'INR',
            },
          });
        }
      }

      // If material is naturally free (isFree or price = 0)
      if (amount <= 0) {
        await prisma.materialPurchase.upsert({
          where: { materialId_userId: { materialId, userId: req.user.id } },
          create: {
            materialId,
            userId: req.user.id,
            paidAmount: 0,
          },
          update: {},
        });

        return res.status(201).json({
          success: true,
          message: `"${material.title}" is a free resource and has been added to My Materials.`,
          data: {
            isFree: true,
            materialId,
            amount: 0,
            currency: 'INR',
          },
        });
      }
    }
    // 4. HACKATHON REGISTRATION FEE
    else if (hackathonId) {
      const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
      if (!hackathon) throw new AppError('Hackathon not found', 404);

      const existingReg = await prisma.hackathonRegistration.findUnique({
        where: { hackathonId_userId: { hackathonId, userId: req.user.id } },
      });
      if (existingReg && existingReg.status === 'CONFIRMED') {
        throw new AppError('You are already registered for this hackathon', 400);
      }

      originalAmount = Number(hackathon.registrationFee);
      amount = originalAmount;
      description = `Registration fee for hackathon: ${hackathon.title}`;

      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponDiscount({
          couponCode: String(couponCode),
          hackathonId,
          userId: req.user.id,
        });

        appliedCouponCode = couponResult.coupon.code;
        discountAmount = couponResult.discountAmount;
        amount = couponResult.finalPrice;
        description = `Registration fee for hackathon: ${hackathon.title} (Coupon: ${appliedCouponCode})`;

        if (couponResult.isFree) {
          const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
              data: {
                amount: 0,
                originalAmount,
                discountAmount,
                couponCode: appliedCouponCode,
                currency: 'INR',
                status: 'COMPLETED',
                razorpayOrderId: `free_hack_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                razorpayPaymentId: `free_hack_grant_${Date.now()}`,
                userId: req.user!.id,
                hackathonId,
              },
            });

            await tx.coupon.update({
              where: { id: couponResult.coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: couponResult.coupon.id,
                userId: req.user!.id,
                hackathonId,
                paymentId: payment.id,
                originalAmount,
                discountAmount,
                finalAmount: 0,
                status: 'COMPLETED',
              },
            });

            await tx.hackathonRegistration.upsert({
              where: { hackathonId_userId: { hackathonId, userId: req.user!.id } },
              create: {
                hackathonId,
                userId: req.user!.id,
                status: 'CONFIRMED',
                paidFee: 0,
                paymentId: payment.id,
              },
              update: {
                status: 'CONFIRMED',
                paidFee: 0,
                paymentId: payment.id,
              },
            });

            await tx.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Hackathon Registration Confirmed',
                message: `Coupon "${appliedCouponCode}" applied! You are registered for "${hackathon.title}".`,
                type: 'COURSE',
              },
            });

            return payment;
          });

          return res.status(201).json({
            success: true,
            message: `100% discount applied! You are confirmed for "${hackathon.title}".`,
            data: {
              isFree: true,
              paymentId: result.id,
              orderId: result.razorpayOrderId,
              amount: 0,
              currency: 'INR',
            },
          });
        }
      }

      if (amount <= 0) {
        const result = await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              amount: 0,
              originalAmount,
              discountAmount: 0,
              currency: 'INR',
              status: 'COMPLETED',
              razorpayOrderId: `free_hack_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              razorpayPaymentId: `free_hack_grant_${Date.now()}`,
              userId: req.user!.id,
              hackathonId,
            },
          });

          await tx.hackathonRegistration.upsert({
            where: {
              hackathonId_userId: { hackathonId, userId: req.user!.id },
            },
            create: {
              hackathonId,
              userId: req.user!.id,
              status: 'CONFIRMED',
              paidFee: 0,
              paymentId: payment.id,
            },
            update: {
              status: 'CONFIRMED',
              paidFee: 0,
              paymentId: payment.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: req.user!.id,
              title: 'Hackathon Registration Confirmed',
              message: `You are registered for "${hackathon.title}".`,
              type: 'COURSE',
            },
          });

          return payment;
        });

        return res.status(201).json({
          success: true,
          message: `Free hackathon registration confirmed for "${hackathon.title}".`,
          data: {
            isFree: true,
            paymentId: result.id,
            orderId: result.razorpayOrderId,
            amount: 0,
            currency: 'INR',
          },
        });
      }
    }
    // 5. PAID LIVE CLASS PURCHASE
    else if (liveClassId) {
      const liveClass = await prisma.liveClass.findUnique({
        where: { id: liveClassId },
        include: { course: true, instructor: true },
      });
      if (!liveClass) throw new AppError('Live class session not found', 404);

      if (liveClass.status === 'CANCELLED') {
        throw new AppError('This live class session has been cancelled and registrations are closed', 400);
      }
      if (liveClass.status === 'COMPLETED') {
        throw new AppError('This live class session has already concluded', 400);
      }

      // Check if student already has a confirmed/paid registration
      const existingReg = await prisma.liveClassRegistration.findUnique({
        where: {
          liveClassId_studentId: {
            liveClassId,
            studentId: req.user.id,
          },
        },
      });
      if (existingReg && existingReg.status === 'PAID') {
        throw new AppError('You are already registered and have paid for this live class', 400);
      }

      // Concurrency-safe capacity check
      const currentPaidCount = await prisma.liveClassRegistration.count({
        where: {
          liveClassId,
          status: 'PAID',
        },
      });

      if (liveClass.maxCapacity && currentPaidCount >= liveClass.maxCapacity) {
        throw new AppError('This live class has reached its maximum student capacity', 400);
      }

      originalAmount = Number(liveClass.price || 0);
      amount = originalAmount;
      description = `Registration fee for Live Class: ${liveClass.title}`;

      // Support coupon validation for live classes
      if (couponCode && String(couponCode).trim()) {
        const couponResult = await validateCouponDiscount({
          couponCode: String(couponCode),
          liveClassId,
          userId: req.user.id,
        });

        appliedCouponCode = couponResult.coupon.code;
        discountAmount = couponResult.discountAmount;
        amount = couponResult.finalPrice;
        description = `Registration fee for Live Class: ${liveClass.title} (Coupon: ${appliedCouponCode})`;

        if (couponResult.isFree) {
          const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
              data: {
                amount: 0,
                originalAmount,
                discountAmount,
                couponCode: appliedCouponCode,
                currency: 'INR',
                status: 'COMPLETED',
                razorpayOrderId: `free_live_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                razorpayPaymentId: `free_live_grant_${Date.now()}`,
                userId: req.user!.id,
                liveClassId,
              },
            });

            await tx.coupon.update({
              where: { id: couponResult.coupon.id },
              data: { usedCount: { increment: 1 } },
            });

            await tx.couponRedemption.create({
              data: {
                couponId: couponResult.coupon.id,
                userId: req.user!.id,
                liveClassId,
                paymentId: payment.id,
                originalAmount,
                discountAmount,
                finalAmount: 0,
                status: 'COMPLETED',
              },
            });

            await tx.liveClassRegistration.upsert({
              where: {
                liveClassId_studentId: { liveClassId, studentId: req.user!.id },
              },
              create: {
                liveClassId,
                studentId: req.user!.id,
                paymentId: payment.id,
                status: 'PAID',
                amount: 0,
              },
              update: {
                paymentId: payment.id,
                status: 'PAID',
                amount: 0,
              },
            });

            await tx.notification.create({
              data: {
                userId: req.user!.id,
                title: 'Live Class Seat Confirmed',
                message: `You are registered for "${liveClass.title}". Access opens 5 minutes before start time in your dashboard.`,
                type: 'COURSE',
              },
            });

            return payment;
          });

          return res.status(201).json({
            success: true,
            message: `Free live class seat confirmed for "${liveClass.title}".`,
            data: {
              isFree: true,
              paymentId: result.id,
              orderId: result.razorpayOrderId,
              amount: 0,
              currency: 'INR',
            },
          });
        }
      }

      // If price is naturally 0 without coupon
      if (amount <= 0) {
        const result = await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              amount: 0,
              originalAmount,
              discountAmount: 0,
              currency: 'INR',
              status: 'COMPLETED',
              razorpayOrderId: `free_live_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              razorpayPaymentId: `free_live_grant_${Date.now()}`,
              userId: req.user!.id,
              liveClassId,
            },
          });

          await tx.liveClassRegistration.upsert({
            where: {
              liveClassId_studentId: { liveClassId, studentId: req.user!.id },
            },
            create: {
              liveClassId,
              studentId: req.user!.id,
              paymentId: payment.id,
              status: 'PAID',
              amount: 0,
            },
            update: {
              paymentId: payment.id,
              status: 'PAID',
              amount: 0,
            },
          });

          await tx.notification.create({
            data: {
              userId: req.user!.id,
              title: 'Live Class Seat Confirmed',
              message: `You are registered for "${liveClass.title}". Access opens 5 minutes before start time in your dashboard.`,
              type: 'COURSE',
            },
          });

          return payment;
        });

        return res.status(201).json({
          success: true,
          message: `Free live class seat confirmed for "${liveClass.title}".`,
          data: {
            isFree: true,
            paymentId: result.id,
            orderId: result.razorpayOrderId,
            amount: 0,
            currency: 'INR',
          },
        });
      }
    }
    // 6. MENTOR 1-ON-1 BOOKING
    else if (mentorBookingId) {
      const booking = await prisma.mentorBooking.findUnique({ where: { id: mentorBookingId } });
      if (!booking) throw new AppError('Booking not found', 404);
      originalAmount = Number(booking.amount);
      amount = originalAmount;
      description = `Payment for Mentor Booking #${booking.id}`;
    }

    // Razorpay requires amount in integer paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    let rzpOrder: { id: string; amount: number | string; currency: string };
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          userId: req.user.id,
          courseId: courseId || '',
          internshipId: internshipId || '',
          materialId: materialId || '',
          hackathonId: hackathonId || '',
          liveClassId: liveClassId || '',
          mentorBookingId: mentorBookingId || '',
          couponCode: appliedCouponCode || '',
        },
      });
    } catch (rzpErr: any) {
      console.error('[Razorpay Order Creation Failed]:', rzpErr?.error || rzpErr?.message || rzpErr);
      // Strictly restrict synthetic orders to automated isolated test runners (Jest/Supertest)
      if (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') {
        rzpOrder = {
          id: `order_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          amount: amountInPaise,
          currency: 'INR',
        };
      } else {
        const desc = rzpErr?.error?.description || rzpErr?.message || 'Payment gateway authentication failed';
        throw new AppError(
          `Razorpay order creation failed: ${desc}. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.`,
          500
        );
      }
    }

    // Record pending payment in database
    const payment = await prisma.payment.create({
      data: {
        amount,
        originalAmount,
        discountAmount,
        couponCode: appliedCouponCode,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: rzpOrder.id,
        userId: req.user.id,
        courseId: courseId || null,
        internshipId: internshipId || null,
        materialId: materialId || null,
        hackathonId: hackathonId || null,
        liveClassId: liveClassId || null,
        isPartial: isPartialPayment,
        totalCoursePrice: courseId ? originalAmount : null,
        remainingBalance: courseId ? remainingBalance : 0,
        paymentPlan: isPartialPayment ? 'PARTIAL' : 'FULL',
      },
    });

    // Create temporary reservation for coupon during checkout
    if (appliedCouponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: appliedCouponCode } });
      if (coupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: req.user.id,
            courseId: courseId || null,
            internshipId: internshipId || null,
            materialId: materialId || null,
            hackathonId: hackathonId || null,
            liveClassId: liveClassId || null,
            paymentId: payment.id,
            originalAmount,
            discountAmount,
            finalAmount: amount,
            status: 'RESERVED',
          },
        });
      }
    }

    if (mentorBookingId) {
      await prisma.mentorBooking.update({
        where: { id: mentorBookingId },
        data: { paymentId: payment.id },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: config.razorpay.keyId,
        paymentId: payment.id,
        originalAmount,
        discountAmount,
        couponCode: appliedCouponCode,
        description,
        isPartial: isPartialPayment,
        totalCoursePrice: courseId ? originalAmount : null,
        remainingBalance: courseId ? remainingBalance : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/verify - Cryptographic signature check & atomic entitlement activation
 */
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const razorpayOrderId = req.body.razorpayOrderId || req.body.razorpay_order_id;
    const razorpayPaymentId = req.body.razorpayPaymentId || req.body.razorpay_payment_id;
    const razorpaySignature = req.body.razorpaySignature || req.body.razorpay_signature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Payment signature details missing', 400);
    }

    // Verify cryptographic signature using constant-time comparison
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    // Only allow simulated signatures during automated test suites (Jest/Supertest), never during normal checkout
    const isTestModeBypass =
      (process.env.NODE_ENV === 'test' || config.nodeEnv === 'test') &&
      (razorpaySignature === 'simulated_test_signature' || razorpaySignature.startsWith('test_sig_'));

    let isAuthentic = false;
    if (isTestModeBypass) {
      isAuthentic = true;
    } else {
      try {
        const expectedBuf = Buffer.from(expectedSignature, 'utf8');
        const signatureBuf = Buffer.from(razorpaySignature, 'utf8');
        if (expectedBuf.length === signatureBuf.length) {
          isAuthentic = crypto.timingSafeEqual(expectedBuf, signatureBuf);
        }
      } catch {
        isAuthentic = false;
      }
    }

    if (!isAuthentic) {
      throw new AppError('Payment signature verification failed. Fraudulent attempt blocked.', 400);
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) {
      throw new AppError('Payment record not found', 404);
    }

    if (payment.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Payment record does not belong to the authenticated student', 403);
    }

    if (payment.status === 'COMPLETED') {
      return res.json({ success: true, message: 'Payment already verified and active' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark payment as completed
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      // 2. COURSE ENTITLEMENT
      if (payment.courseId) {
        await tx.enrollment.upsert({
          where: {
            userId_courseId: { userId: payment.userId, courseId: payment.courseId },
          },
          create: {
            userId: payment.userId,
            courseId: payment.courseId,
          },
          update: {},
        });

        // Automatically associate student with the course's active cohort batch if available
        const activeBatch = await tx.batch.findFirst({
          where: { courseId: payment.courseId },
          orderBy: { startDate: 'desc' },
        });

        if (activeBatch) {
          const currentCount = await tx.batchEnrollment.count({
            where: { batchId: activeBatch.id, isActive: true },
          });

          if (currentCount < activeBatch.maxStudents) {
            await tx.batchEnrollment.upsert({
              where: {
                batchId_studentId: {
                  batchId: activeBatch.id,
                  studentId: payment.userId,
                },
              },
              create: {
                batchId: activeBatch.id,
                studentId: payment.userId,
                isActive: true,
              },
              update: { isActive: true },
            });
          }
        }
      }

      // 3. INTERNSHIP ENTITLEMENT
      if (payment.internshipId) {
        await tx.internshipApplication.upsert({
          where: {
            internshipId_userId: {
              internshipId: payment.internshipId,
              userId: payment.userId,
            },
          },
          create: {
            internshipId: payment.internshipId,
            userId: payment.userId,
            status: 'ACCEPTED',
            paidAmount: payment.amount,
            paymentId: payment.id,
          },
          update: {
            status: 'ACCEPTED',
            paidAmount: payment.amount,
            paymentId: payment.id,
          },
        });
      }

      // 4. LEARNING MATERIAL ENTITLEMENT
      if (payment.materialId) {
        await tx.materialPurchase.upsert({
          where: {
            materialId_userId: {
              materialId: payment.materialId,
              userId: payment.userId,
            },
          },
          create: {
            materialId: payment.materialId,
            userId: payment.userId,
            paymentId: payment.id,
            paidAmount: payment.amount,
          },
          update: {
            paymentId: payment.id,
            paidAmount: payment.amount,
          },
        });
      }

      // 5. HACKATHON ENTITLEMENT
      if (payment.hackathonId) {
        await tx.hackathonRegistration.upsert({
          where: {
            hackathonId_userId: {
              hackathonId: payment.hackathonId,
              userId: payment.userId,
            },
          },
          create: {
            hackathonId: payment.hackathonId,
            userId: payment.userId,
            status: 'CONFIRMED',
            paidFee: payment.amount,
            paymentId: payment.id,
          },
          update: {
            status: 'CONFIRMED',
            paidFee: payment.amount,
            paymentId: payment.id,
          },
        });
      }

      // 5b. LIVE CLASS ENTITLEMENT
      if (payment.liveClassId) {
        await tx.liveClassRegistration.upsert({
          where: {
            liveClassId_studentId: {
              liveClassId: payment.liveClassId,
              studentId: payment.userId,
            },
          },
          create: {
            liveClassId: payment.liveClassId,
            studentId: payment.userId,
            paymentId: payment.id,
            status: 'PAID',
            amount: payment.amount,
          },
          update: {
            paymentId: payment.id,
            status: 'PAID',
            amount: payment.amount,
          },
        });
      }

      // 6. FINALIZE COUPON REDEMPTION IF APPLIED
      if (payment.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: payment.couponCode } });
        if (coupon) {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });

          const existingReservation = await tx.couponRedemption.findFirst({
            where: {
              paymentId: payment.id,
              couponId: coupon.id,
            },
          });

          if (existingReservation) {
            await tx.couponRedemption.update({
              where: { id: existingReservation.id },
              data: {
                status: 'COMPLETED',
                finalAmount: payment.amount,
                discountAmount: payment.discountAmount || 0,
                originalAmount: payment.originalAmount || payment.amount,
                redeemedAt: new Date(),
              },
            });
          } else {
            await tx.couponRedemption.create({
              data: {
                couponId: coupon.id,
                userId: payment.userId,
                courseId: payment.courseId,
                internshipId: payment.internshipId,
                materialId: payment.materialId,
                hackathonId: payment.hackathonId,
                paymentId: payment.id,
                originalAmount: payment.originalAmount || payment.amount,
                discountAmount: payment.discountAmount || 0,
                finalAmount: payment.amount,
                status: 'COMPLETED',
              },
            });
          }
        }
      }

      // 7. MENTOR BOOKING CONFIRMATION
      const booking = await tx.mentorBooking.findFirst({
        where: { paymentId: payment.id },
      });
      if (booking) {
        await tx.mentorBooking.update({
          where: { id: booking.id },
          data: { status: 'CONFIRMED' },
        });
      }

      // 8. SEND IN-APP NOTIFICATION
      await tx.notification.create({
        data: {
          userId: payment.userId,
          title: payment.liveClassId ? 'Live Class Confirmed' : 'Payment Confirmed',
          message: payment.liveClassId
            ? `Your seat for the live class has been confirmed! Access opens 5 minutes before start time.`
            : `Your payment of ₹${payment.amount} was verified successfully.${payment.isPartial ? ` Remaining balance: ₹${payment.remainingBalance}.` : ' Access has been unlocked.'}`,
          type: payment.liveClassId ? 'COURSE' : 'PAYMENT',
        },
      });

      // 9. PLATFORM-WIDE ADMIN ALERT
      const adminUsers = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      for (const adm of adminUsers) {
        await tx.notification.create({
          data: {
            userId: adm.id,
            title: 'New Revenue Received',
            message: `Student verified payment of ₹${payment.amount} for ${payment.courseId ? 'course' : 'service'}.`,
            type: 'PAYMENT',
          },
        });
      }

      // 10. MENTOR ROSTER UPDATE NOTIFICATION
      if (payment.courseId) {
        const courseWithMentor = await tx.course.findUnique({
          where: { id: payment.courseId },
          include: { instructor: { select: { id: true, email: true, name: true } } },
        });
        if (courseWithMentor?.instructorId) {
          await tx.notification.create({
            data: {
              userId: courseWithMentor.instructorId,
              title: 'New Student Enrolled',
              message: `A new student has enrolled in your course "${courseWithMentor.title}".`,
              type: 'COURSE',
            },
          });
        }
      }
    });

    // 11. SEND PROFESSIONAL RECEIPT & ENROLLMENT CONFIRMATION EMAILS (Async safe with idempotency)
    try {
      const student = await prisma.user.findUnique({ where: { id: payment.userId } });
      if (student) {
        // A. Course Receipt & Enrollment Confirmation
        if (payment.courseId) {
          const course = await prisma.course.findUnique({
            where: { id: payment.courseId },
            include: { instructor: { select: { name: true } } },
          });
          if (course) {
            // Receipt Email
            const emailData = emailTemplates.coursePurchasedReceipt({
              studentName: student.name,
              courseTitle: course.title,
              courseTitleTa: (course as any).titleTa,
              amountPaid: Number(payment.amount),
              totalPrice: Number(payment.totalCoursePrice || course.price),
              remainingBalance: Number(payment.remainingBalance || 0),
              paymentRef: razorpayPaymentId || `RCPT_${payment.id.substring(0, 8)}`,
              orderId: razorpayOrderId,
              slug: course.slug,
            });
            await sendEmail({
              to: student.email,
              subject: emailData.subject,
              html: emailData.html,
              templateCode: 'COURSE_PAYMENT_RECEIPT',
              idempotencyKey: `rcpt_course_${payment.id}_${razorpayPaymentId}`,
            });

            // Enrollment Confirmation Email
            const enrollEmail = emailTemplates.courseEnrollmentConfirmation({
              studentName: student.name,
              courseTitle: course.title,
              courseTitleTa: (course as any).titleTa,
              mentorName: course.instructor?.name || null,
              slug: course.slug,
              enrolledAt: new Date(),
            });
            await sendEmail({
              to: student.email,
              subject: enrollEmail.subject,
              html: enrollEmail.html,
              templateCode: 'COURSE_ENROLLMENT_CONFIRMATION',
              idempotencyKey: `enroll_course_${payment.id}_${course.id}`,
            });
          }
        }

        // B. Material Purchase Receipt
        if (payment.materialId) {
          const material = await prisma.learningMaterial.findUnique({ where: { id: payment.materialId } });
          if (material) {
            const matEmail = emailTemplates.materialPurchasedReceipt({
              studentName: student.name,
              materialTitle: material.title,
              amountPaid: Number(payment.amount),
              paymentRef: razorpayPaymentId || `RCPT_${payment.id.substring(0, 8)}`,
              orderId: razorpayOrderId,
            });
            await sendEmail({
              to: student.email,
              subject: matEmail.subject,
              html: matEmail.html,
              templateCode: 'MATERIAL_PURCHASE_RECEIPT',
              idempotencyKey: `rcpt_mat_${payment.id}_${razorpayPaymentId}`,
            });
          }
        }

        // C. Live Class Registration & Payment Receipt
        if (payment.liveClassId) {
          const liveClass = await prisma.liveClass.findUnique({
            where: { id: payment.liveClassId },
            include: { course: true, instructor: { select: { name: true } } },
          });
          if (liveClass) {
            const classEmail = emailTemplates.liveClassPaymentConfirmation({
              studentName: student.name,
              classTitle: liveClass.title,
              courseTitle: liveClass.course?.title || null,
              mentorName: liveClass.instructor?.name || null,
              startTime: new Date(liveClass.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
              durationMins: liveClass.duration,
              timezone: liveClass.timezone || 'IST',
              amountPaid: Number(payment.amount),
              paymentRef: razorpayPaymentId || `RCPT_${payment.id.substring(0, 8)}`,
              orderId: razorpayOrderId,
            });
            await sendEmail({
              to: student.email,
              subject: classEmail.subject,
              html: classEmail.html,
              templateCode: 'LIVE_CLASS_PAYMENT_CONFIRMATION',
              idempotencyKey: `rcpt_live_${payment.id}_${razorpayPaymentId}`,
            });
          }
        }
      }
    } catch (eErr) {
      console.error('[Payment Email Delivery Error]:', eErr);
    }

    res.json({
      success: true,
      message: 'Payment verified and access activated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/webhook - Webhook handling with rawBody signature verification
 */
export const handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      throw new AppError('Missing webhook signature', 400);
    }

    const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawPayload)
      .digest('hex');

    let isAuthentic = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');
      if (expectedBuf.length === signatureBuf.length) {
        isAuthentic = crypto.timingSafeEqual(expectedBuf, signatureBuf);
      }
    } catch {
      isAuthentic = false;
    }

    if (!isAuthentic) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;

      const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId: orderId },
      });

      if (payment && payment.status !== 'COMPLETED') {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED', razorpayPaymentId: paymentId },
          });

          if (payment.courseId) {
            await tx.enrollment.upsert({
              where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
              create: { userId: payment.userId, courseId: payment.courseId },
              update: {},
            });
          }

          if (payment.internshipId) {
            await tx.internshipApplication.upsert({
              where: { internshipId_userId: { internshipId: payment.internshipId, userId: payment.userId } },
              create: {
                internshipId: payment.internshipId,
                userId: payment.userId,
                status: 'ACCEPTED',
                paidAmount: payment.amount,
                paymentId: payment.id,
              },
              update: { status: 'ACCEPTED', paidAmount: payment.amount, paymentId: payment.id },
            });
          }

          if (payment.materialId) {
            await tx.materialPurchase.upsert({
              where: { materialId_userId: { materialId: payment.materialId, userId: payment.userId } },
              create: {
                materialId: payment.materialId,
                userId: payment.userId,
                paymentId: payment.id,
                paidAmount: payment.amount,
              },
              update: { paymentId: payment.id, paidAmount: payment.amount },
            });
          }
        });
      }
    } else if (event === 'payment.failed') {
      const orderId = payload.payment?.entity?.order_id;
      if (orderId) {
        await prisma.$transaction(async (tx) => {
          const payments = await tx.payment.findMany({
            where: { razorpayOrderId: orderId, status: 'PENDING' },
          });

          await tx.payment.updateMany({
            where: { razorpayOrderId: orderId, status: 'PENDING' },
            data: { status: 'FAILED' },
          });

          for (const p of payments) {
            await tx.couponRedemption.deleteMany({
              where: { paymentId: p.id, status: 'RESERVED' },
            });
          }

          // Send payment failure recovery email to student
          for (const p of payments) {
            try {
              const student = await tx.user.findUnique({ where: { id: p.userId } });
              if (student && student.email) {
                const course = p.courseId ? await tx.course.findUnique({ where: { id: p.courseId } }) : null;
                const material = p.materialId ? await tx.learningMaterial.findUnique({ where: { id: p.materialId } }) : null;
                const productTitle = course?.title || material?.title || 'SkillUp Learning Resource';

                const failTpl = emailTemplates.paymentFailed({
                  studentName: student.name,
                  productTitle,
                  orderId,
                  amount: Number(p.amount),
                  slug: course?.slug,
                });

                sendEmail({
                  to: student.email,
                  subject: failTpl.subject,
                  html: failTpl.html,
                  templateCode: 'PAYMENT_FAILED',
                  idempotencyKey: `pay_failed_${p.id}_${orderId}`,
                }).catch(console.error);
              }
            } catch (err) {
              console.error('[Payment Failed Email Error]:', err);
            }
          }
        });
      }
    } else if (event === 'refund.processed') {
      const paymentId = payload.refund?.entity?.payment_id;
      const refundId = payload.refund?.entity?.id;
      if (paymentId) {
        const payment = await prisma.payment.findFirst({
          where: { razorpayPaymentId: paymentId },
        });
        if (payment) {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED', refundId: refundId || 'rfnd_webhook' },
            });

            if (payment.courseId) {
              await tx.enrollment.deleteMany({
                where: { userId: payment.userId, courseId: payment.courseId },
              });
            }

            if (payment.internshipId) {
              await tx.internshipApplication.updateMany({
                where: { internshipId: payment.internshipId, userId: payment.userId },
                data: { status: 'REJECTED' },
              });
            }

            if (payment.materialId) {
              await tx.materialPurchase.deleteMany({
                where: { materialId: payment.materialId, userId: payment.userId },
              });
            }

            if (payment.liveClassId) {
              await tx.liveClassRegistration.updateMany({
                where: { liveClassId: payment.liveClassId, studentId: payment.userId },
                data: { status: 'CANCELLED' },
              });
            }

            // Restore coupon quota
            if (payment.couponCode) {
              const coupon = await tx.coupon.findUnique({ where: { code: payment.couponCode } });
              if (coupon && coupon.usedCount > 0) {
                await tx.coupon.update({
                  where: { id: coupon.id },
                  data: { usedCount: { decrement: 1 } },
                });
              }

              await tx.couponRedemption.updateMany({
                where: { paymentId: payment.id },
                data: { status: 'REFUNDED' },
              });
            }

            // Send Refund Confirmation Email to student
            try {
              const student = await tx.user.findUnique({ where: { id: payment.userId } });
              if (student && student.email) {
                const course = payment.courseId ? await tx.course.findUnique({ where: { id: payment.courseId } }) : null;
                const material = payment.materialId ? await tx.learningMaterial.findUnique({ where: { id: payment.materialId } }) : null;
                const productTitle = course?.title || material?.title || 'Course / Learning Resource';

                const refundTpl = emailTemplates.paymentRefund({
                  studentName: student.name,
                  productTitle,
                  refundAmount: Number(payment.amount),
                  refundId: refundId || 'rfnd_webhook',
                  originalPaymentRef: payment.razorpayPaymentId || payment.id,
                });

                sendEmail({
                  to: student.email,
                  subject: refundTpl.subject,
                  html: refundTpl.html,
                  templateCode: 'PAYMENT_REFUND',
                  idempotencyKey: `pay_refund_${payment.id}_${refundId || 'rfnd'}`,
                }).catch(console.error);
              }
            } catch (err) {
              console.error('[Refund Email Error]:', err);
            }
          });
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/history - Detailed student purchase history
 */
export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
        internship: { select: { id: true, title: true, organization: true } },
        material: { select: { id: true, title: true, type: true, thumbnailUrl: true } },
        hackathon: { select: { id: true, title: true, theme: true } },
        liveClass: { select: { id: true, title: true, startTime: true, duration: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
};
