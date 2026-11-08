import { Router } from 'express';
import { z } from 'zod';
import * as paymentController from '../controllers/paymentController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

const createOrderSchema = z.object({
  courseId: z.string().optional(),
  internshipId: z.string().optional(),
  materialId: z.string().optional(),
  hackathonId: z.string().optional(),
  liveClassId: z.string().optional(),
  mentorBookingId: z.string().optional(),
  couponCode: z.string().optional(),
  isPartial: z.boolean().optional(),
  customAmount: z.number().positive().optional(),
}).refine(
  (data) => !!(data.courseId || data.internshipId || data.materialId || data.hackathonId || data.liveClassId || data.mentorBookingId),
  { message: 'One of courseId, internshipId, materialId, hackathonId, liveClassId, or mentorBookingId is required' }
);

const validateCouponSchema = z.object({
  code: z.string().optional(),
  couponCode: z.string().optional(),
  courseId: z.string().optional(),
  internshipId: z.string().optional(),
  materialId: z.string().optional(),
  hackathonId: z.string().optional(),
  liveClassId: z.string().optional(),
}).refine((data) => !!(data.code || data.couponCode), {
  message: 'Coupon code is required (code or couponCode)',
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
  liveClassId: z.string().optional(),
  courseId: z.string().optional(),
  internshipId: z.string().optional(),
  materialId: z.string().optional(),
  hackathonId: z.string().optional(),
}).refine(
  (data) => (data.razorpayOrderId || data.razorpay_order_id) &&
            (data.razorpayPaymentId || data.razorpay_payment_id) &&
            (data.razorpaySignature || data.razorpay_signature),
  { message: 'Payment signature details missing' }
);

router.post('/validate-coupon', authenticate, validate(validateCouponSchema), paymentController.validateCoupon);
router.post('/orders', authenticate, validate(createOrderSchema), paymentController.createOrder);
router.post('/create-order', authenticate, validate(createOrderSchema), paymentController.createOrder);
router.post('/verify', authenticate, validate(verifyPaymentSchema), paymentController.verifyPayment);
router.post('/webhook', paymentController.handleRazorpayWebhook);
router.get('/history', authenticate, paymentController.getPaymentHistory);

export default router;
