import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  PlayCircle,
  CheckCircle,
  Lock,
  Clock,
  Award,
  Globe,
  Heart,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  BookOpen,
  X,
  Eye,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Tag,
  User,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { useLanguage } from '../context/LanguageContext';

export const CourseDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'instructor' | 'faqs'>('overview');
  const [openModules, setOpenModules] = useState<{ [key: string]: boolean }>({ '0': true, '1': true });
  const [previewVideo, setPreviewVideo] = useState<{ url: string; title: string } | null>(null);

  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Payment Mode (Full vs Partial/Installment)
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch Course Details
  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const res = await api.get(`/courses/${slug}`);
      return res.data.data;
    },
  });

  // Wishlist Mutation
  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate(`/login?redirect=/courses/${slug}`);
        return;
      }
      return api.post(`/courses/${course.id}/wishlist`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', slug] });
    },
  });

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
    originalPrice: number;
    isFree: boolean;
    name?: string;
    college?: string | null;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isEnrollingAfterPayment, setIsEnrollingAfterPayment] = useState(false);
  const [enrollingStep, setEnrollingStep] = useState<string>('Verifying payment details...');

  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCodeInput.trim()) return;

    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }

    setIsValidatingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await api.post('/payments/validate-coupon', {
        code: couponCodeInput.trim(),
        courseId: course.id,
      });

      const couponData = res.data.data;
      setAppliedCoupon({
        code: couponData.code,
        discountAmount: couponData.discountAmount,
        finalPrice: couponData.finalPrice,
        originalPrice: couponData.originalPrice,
        isFree: couponData.isFree,
        name: couponData.name,
        college: couponData.college,
      });
      setCouponMessage({
        type: 'success',
        text: `Coupon "${couponData.code}" applied! You saved ₹${couponData.discountAmount.toFixed(2)}${couponData.college ? ` (${couponData.college} Special)` : ''
          }`,
      });
      toast.success('Coupon Applied', `Discount of ₹${couponData.discountAmount.toFixed(2)} applied!`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Invalid or inapplicable coupon code',
      });
      toast.error('Invalid Coupon', err.response?.data?.error?.message || 'Failed to apply coupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
    setCouponMessage(null);
  };

  // Open Checkout Modal
  const handleOpenEnrollment = () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }

    if (course.isEnrolled && (!course.remainingBalance || course.remainingBalance <= 0)) {
      navigate(`/classroom/${course.slug}`);
      return;
    }

    setIsCheckoutModalOpen(true);
  };

  // Execute Razorpay Checkout / Free Grant
  const handleExecutePayment = async () => {
    if (!user) {
      navigate(`/login?redirect=/courses/${slug}`);
      return;
    }

    setPaymentError(null);

    // Validate partial amount if selected
    if (paymentMode === 'PARTIAL') {
      const minAmount = course.minInstallmentAmount ? Number(course.minInstallmentAmount) : 500;
      const parsedAmount = Number(customAmount);
      const payableTotal = appliedCoupon ? appliedCoupon.finalPrice : Number(course.discountPrice || course.price);

      if (isNaN(parsedAmount) || parsedAmount < minAmount) {
        setPaymentError(`The minimum initial payment for this course is ₹${minAmount}.`);
        return;
      }
      if (parsedAmount > payableTotal) {
        setPaymentError(`Custom payment cannot exceed total course price of ₹${payableTotal}.`);
        return;
      }
    }

    setIsCheckingOut(true);

    try {
      const payload: { courseId: string; couponCode?: string; isPartial?: boolean; customAmount?: number } = { courseId: course.id };
      if (appliedCoupon?.code) {
        payload.couponCode = appliedCoupon.code;
      }
      if (paymentMode === 'PARTIAL') {
        payload.isPartial = true;
        payload.customAmount = Number(customAmount);
      }

      const res = await api.post('/payments/orders', payload);
      const orderData = res.data.data;

      // Handle 100% Free Coupon Redemption directly
      if (orderData.isFree) {
        setIsCheckingOut(false);
        setIsCheckoutModalOpen(false);
        setIsEnrollingAfterPayment(true);
        setEnrollingStep('Redeeming enrollment pass...');

        await queryClient.invalidateQueries({ queryKey: ['course', slug] });
        await queryClient.invalidateQueries({ queryKey: ['my-courses-overview'] });
        await queryClient.invalidateQueries({ queryKey: ['student-dashboard-overview-summary'] });

        setTimeout(() => {
          setEnrollingStep('Configuring your classroom & materials...');
        }, 700);

        setTimeout(() => {
          setEnrollingStep('Redirecting to your course workspace...');
          setTimeout(() => {
            toast.success(
              'Enrollment Confirmed',
              'You have successfully enrolled in the course. Welcome to your classroom!'
            );
            navigate(`/classroom/${course.slug}`);
          }, 600);
        }, 1500);
        return;
      }

      // Trigger Razorpay
      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Student Learning',
          description: orderData.description || course.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            setIsCheckingOut(false);
            setIsCheckoutModalOpen(false);
            setIsEnrollingAfterPayment(true);
            setEnrollingStep('Securing payment verification with bank gateway...');

            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              setEnrollingStep('Activating enrollment & cohort access...');
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['course', slug] }),
                queryClient.invalidateQueries({ queryKey: ['my-courses-overview'] }),
                queryClient.invalidateQueries({ queryKey: ['student-dashboard-overview-summary'] }),
              ]);

              setTimeout(() => {
                setEnrollingStep('Preparing your course classroom...');
                setTimeout(() => {
                  toast.success(
                    'Enrollment Confirmed',
                    'You have successfully enrolled in the course. Enjoy your learning!'
                  );
                  navigate(`/classroom/${course.slug}`);
                }, 700);
              }, 800);
            } catch (vErr: any) {
              setIsEnrollingAfterPayment(false);
              toast.error(
                'Payment Verification Failed',
                vErr.response?.data?.error?.message || 'Payment verification failed'
              );
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#173B73',
          },
          modal: {
            ondismiss: () => {
              setIsCheckingOut(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error('Payment Error', 'Payment gateway could not be loaded. Please refresh the page.');
        setIsCheckingOut(false);
      }
    } catch (err: any) {
      setIsCheckingOut(false);
      toast.error('Checkout Failed', err.response?.data?.error?.message || 'Unable to initialize payment.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-[#0866E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Course Not Found</h2>
        <p className="text-xs text-slate-500">The requested course could not be located in the catalog.</p>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0866E8] text-white text-xs font-bold rounded-xl hover:bg-[#0755C5] transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Courses</span>
        </Link>
      </div>
    );
  }

  // Active Assigned Mentor
  const assignedMentor = course.assignedMentor || course.instructor || null;
  const mentorName = assignedMentor?.name || 'Assigned Faculty Mentor';
  const mentorAvatar = assignedMentor?.avatarUrl;
  const mentorTitle = assignedMentor?.title || 'Faculty Instructor & Industry Mentor';
  const mentorBio = assignedMentor?.bio || assignedMentor?.mentorProfile?.about || 'Certified domain expert supporting learner capstones, curriculum reviews, and architecture teardowns.';
  const mentorExperience = assignedMentor?.mentorProfile?.experience ? `${assignedMentor.mentorProfile.experience}+ years industry experience` : 'Experienced Industry Faculty';
  const mentorExpertise = assignedMentor?.mentorProfile?.expertise ? assignedMentor.mentorProfile.expertise.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  // Curriculum Stats
  const modulesList = course.modules || [];
  const totalLessons = modulesList.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
  const totalDurationMinutes = modulesList.reduce(
    (acc: number, m: any) => acc + (m.lessons?.reduce((lAcc: number, l: any) => lAcc + (l.duration || 0), 0) || 0),
    0
  );
  const totalResources = modulesList.reduce(
    (acc: number, m: any) => acc + (m.lessons?.reduce((lAcc: number, l: any) => lAcc + (l.resources?.length || 0), 0) || 0),
    0
  );

  const durationHours = totalDurationMinutes > 0 ? (totalDurationMinutes / 60).toFixed(1) : null;
  const courseBasePrice = Number(course.discountPrice || course.price);
  const finalPayablePrice = appliedCoupon ? appliedCoupon.finalPrice : courseBasePrice;

  return (
    <div className="pb-24 bg-[#F8FBFF] min-h-screen">
      {/* Top Breadcrumb Strip */}
      <div className="bg-white border-b border-[#D8E7FA] py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-[#526B91] flex items-center gap-2">
          <Link to="/" className="hover:text-[#0866E8] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/courses" className="hover:text-[#0866E8] transition-colors">Courses</Link>
          <span>/</span>
          <span className="text-[#092653] font-semibold truncate max-w-xs sm:max-w-md">{course.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================
              LEFT COLUMN (8 COLS): Title, Mentor Header, Tabs & Content
          ======================================================== */}
          <div className="lg:col-span-8 space-y-8">
            {/* Title & Assigned Mentor Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D8E7FA] shadow-sm space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#EAF4FF] text-[#0866E8] uppercase tracking-wider">
                  {course.category?.name || 'Professional Certification'}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#092653]">
                  {course.level || 'All Levels'}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#092653]">
                  {course.language || 'Tamil'}
                </span>
                {course.isEnrolled && (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1.5 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Enrolled Student</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#092653] leading-snug tracking-tight">
                {language === 'ta' && course.titleTa ? course.titleTa : course.title}
              </h1>

              {course.subtitle && (
                <p className="text-sm font-medium text-[#526B91]">
                  {course.subtitle}
                </p>
              )}

              {/* Verified Assigned Mentor Block */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                {mentorAvatar ? (
                  <img
                    src={mentorAvatar}
                    alt={mentorName}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-[#0866E8]/20 shadow-xs shrink-0"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#0866E8] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                    {mentorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#526B91] block">Lead Course Mentor</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Verified Faculty
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#092653] truncate">{mentorName}</h3>
                  <p className="text-xs font-medium text-[#0866E8] truncate">{mentorTitle}</p>
                </div>
              </div>

              {/* Quick Mobile Action Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-[#D8E7FA]">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-[#526B91] uppercase tracking-wider">
                      {course.isEnrolled ? 'Enrollment Status' : 'Course Fee'}
                    </span>
                    <div className="flex items-baseline gap-2">
                      {course.isEnrolled ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Active Enrollment</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-2xl font-extrabold text-[#092653]">
                            ₹{courseBasePrice.toLocaleString()}
                          </span>
                          {course.discountPrice && (
                            <span className="text-xs text-[#98A2B3] line-through">
                              ₹{Number(course.price).toLocaleString()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {course.isEnrolled && course.remainingBalance > 0 && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                      Balance Due: ₹{Number(course.remainingBalance).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {course.isEnrolled && (!course.remainingBalance || course.remainingBalance <= 0) ? (
                    <button
                      onClick={() => navigate(`/classroom/${course.slug}`)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Go to Classroom</span>
                    </button>
                  ) : course.isEnrolled && course.remainingBalance > 0 ? (
                    <button
                      onClick={handleOpenEnrollment}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <span>Pay Remaining Balance</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleOpenEnrollment}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <span>Enroll & Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Tabs (Overview, Curriculum, Instructor, FAQs) - REVIEWS REMOVED */}
              <div className="flex border-b border-[#D8E7FA] pt-2 gap-6 text-xs font-bold overflow-x-auto scrollbar-none">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'curriculum', label: 'Curriculum' },
                  { id: 'instructor', label: 'Instructor & Mentor' },
                  { id: 'faqs', label: 'FAQs' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${activeTab === tab.id
                        ? 'border-[#0866E8] text-[#0866E8] font-extrabold'
                        : 'border-transparent text-[#526B91] hover:text-[#0866E8]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 pt-2 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base font-bold text-[#092653] mb-3">About This Course</h3>
                    <div className="text-sm text-[#092653] leading-relaxed whitespace-pre-line font-normal">
                      {language === 'ta' && course.descriptionTa ? course.descriptionTa : course.description}
                    </div>
                  </div>

                  {/* Course Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[#526B91] block text-[11px]">Level</span>
                      <strong className="text-[#092653]">{course.level || 'All Levels'}</strong>
                    </div>
                    <div>
                      <span className="text-[#526B91] block text-[11px]">Language</span>
                      <strong className="text-[#092653]">{course.language || 'English'}</strong>
                    </div>
                    <div>
                      <span className="text-[#526B91] block text-[11px]">Modules</span>
                      <strong className="text-[#092653]">{modulesList.length} Units</strong>
                    </div>
                    <div>
                      <span className="text-[#526B91] block text-[11px]">Duration</span>
                      <strong className="text-[#092653]">{durationHours ? `${durationHours} Hours` : 'Self-Paced'}</strong>
                    </div>
                  </div>

                  {/* What You'll Learn */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-sm font-bold text-[#092653] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Skills & Learning Outcomes</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#092653]">
                      {[
                        'Master complete application architectures with real-world design patterns',
                        'Write resilient, industry-tested backend and frontend code',
                        'Work hands-on with databases, transactional integrity, and schema migrations',
                        'Build, test, and deploy capstone projects directly to production cloud hosts',
                        'Receive structured code teardowns from your assigned faculty mentor',
                        'Earn an industry-verified completion certificate for your professional portfolio',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CURRICULUM */}
              {activeTab === 'curriculum' && (
                <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-[#092653]">Course Curriculum & Syllabus</h3>
                      <p className="text-xs text-[#526B91] mt-0.5">
                        Interactive syllabus organized by modules, video lectures, and practice resources.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0866E8] bg-[#EAF4FF] px-3 py-1 rounded-full self-start sm:self-auto border border-blue-200">
                      {modulesList.length} Modules • {totalLessons} Lessons {durationHours ? `• ${durationHours} hrs` : ''}
                    </span>
                  </div>

                  {!course.isEnrolled && (
                    <div className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
                      <Lock className="w-4 h-4 text-[#0866E8] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Enroll in this course to unlock all lessons, videos, and study notes.</span>
                        <span className="text-blue-700/90 text-[11px] block mt-0.5">
                          Enrolled students receive complete modular video access, downloadable PDF code notes, assignments, and faculty Q&A.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {modulesList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#526B91] bg-white rounded-xl border border-dashed border-[#D8E7FA]">
                        Course curriculum is being updated by the instructor.
                      </div>
                    ) : (
                      modulesList.map((mod: any, idx: number) => {
                        const isOpen = openModules[String(idx)];
                        const modLessons = mod.lessons || [];
                        const modMins = modLessons.reduce((acc: number, l: any) => acc + (l.duration || 0), 0);
                        const modResources = modLessons.flatMap((l: any) => l.resources || []);

                        return (
                          <div key={mod.id} className="rounded-xl border border-[#D8E7FA] overflow-hidden bg-white shadow-2xs">
                            <button
                              onClick={() => setOpenModules({ ...openModules, [String(idx)]: !isOpen })}
                              className="w-full p-4 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between text-left transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-md bg-[#0866E8]/10 text-[#0866E8] text-[11px] font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-[#092653] block">
                                    {mod.title}
                                  </span>
                                  <span className="text-[11px] text-[#526B91] font-medium">
                                    {modLessons.length} lessons {modMins > 0 ? `• ${modMins} mins` : ''} {modResources.length > 0 ? `• ${modResources.length} materials` : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[#526B91]">
                                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </button>

                            {isOpen && (
                              <div className="divide-y divide-slate-100">
                                {modLessons.length === 0 ? (
                                  <div className="p-4 text-center text-[11px] text-[#526B91] italic">
                                    No lessons added to this module yet.
                                  </div>
                                ) : (
                                  modLessons.map((lesson: any, lIdx: number) => {
                                    const isPlayable = lesson.isFree || course.isEnrolled;
                                    return (
                                      <div
                                        key={lesson.id}
                                        onClick={() => {
                                          if (lesson.isFree && lesson.videoUrl) {
                                            setPreviewVideo({ url: lesson.videoUrl, title: lesson.title });
                                          } else if (course.isEnrolled) {
                                            navigate(`/classroom/${course.slug}`);
                                          } else if (!lesson.isFree) {
                                            toast.info('Enrollment Required', 'Please enroll in the course to unlock full lessons and study materials.');
                                          } else {
                                            toast.info('Preview Coming Soon', 'Free preview video is currently being prepared.');
                                          }
                                        }}
                                        className={`p-3.5 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors rounded-lg mx-2 my-1 ${isPlayable
                                            ? 'hover:bg-emerald-50/60 cursor-pointer border border-transparent hover:border-emerald-200/50'
                                            : 'hover:bg-slate-50 cursor-pointer'
                                          }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          {isPlayable ? (
                                            <PlayCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                          ) : (
                                            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                          )}
                                          <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className={`font-semibold ${isPlayable ? 'text-[#092653]' : 'text-slate-700'}`}>
                                                {lIdx + 1}. {lesson.title}
                                              </span>
                                              {lesson.isFree ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                  <PlayCircle className="w-3 h-3 text-emerald-700" />
                                                  <span>Free Preview • Watch Now</span>
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-[#526B91]">
                                                  Locked
                                                </span>
                                              )}
                                            </div>
                                            {lesson.description && (
                                              <p className="text-[11px] text-[#526B91] mt-0.5 line-clamp-1">{lesson.description}</p>
                                            )}
                                            {/* Lesson Attached Study Materials */}
                                            {lesson.resources && lesson.resources.length > 0 && (
                                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                {lesson.resources.map((res: any) => (
                                                  <span
                                                    key={res.id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50/80 text-[#0866E8] text-[10px] font-medium border border-blue-200/50"
                                                  >
                                                    <FileText className="w-3 h-3 text-[#0866E8]" />
                                                    <span>{res.title} ({res.type})</span>
                                                    {!course.isEnrolled && !lesson.isFree && (
                                                      <Lock className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                                                    )}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                          {lesson.isFree && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (lesson.videoUrl) {
                                                  setPreviewVideo({ url: lesson.videoUrl, title: lesson.title });
                                                } else {
                                                  toast.info('No Preview Video', 'Preview video link is not configured yet.');
                                                }
                                              }}
                                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <PlayCircle className="w-3 h-3" />
                                              <span>Watch Preview</span>
                                            </button>
                                          )}
                                          <span className="text-slate-400 text-[11px] font-medium">
                                            {lesson.duration ? `${lesson.duration} min` : '15 min'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INSTRUCTOR & MENTOR */}
              {activeTab === 'instructor' && (
                <div className="space-y-6 pt-2 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row items-start gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    {mentorAvatar ? (
                      <img
                        src={mentorAvatar}
                        alt={mentorName}
                        className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#0866E8]/20 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-[#0866E8] text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm">
                        {mentorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-2 flex-1">
                      <div>
                        <span className="text-[11px] font-bold text-[#0866E8] uppercase tracking-wider block">Course Faculty</span>
                        <h3 className="text-lg font-bold text-[#092653]">{mentorName}</h3>
                        <p className="text-xs font-semibold text-[#526B91]">{mentorTitle}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#526B91] pt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <Briefcase className="w-3.5 h-3.5 text-[#0866E8]" />
                          <span>{mentorExperience}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Assigned Course Mentor</span>
                        </span>
                      </div>

                      <p className="text-xs text-[#092653] leading-relaxed pt-2">
                        {mentorBio}
                      </p>

                      {mentorExpertise.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {mentorExpertise.map((exp: string, idx: number) => (
                            <span key={idx} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200 text-[#092653]">
                              {exp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FAQS */}
              {activeTab === 'faqs' && (
                <div className="space-y-3 pt-2 animate-in fade-in duration-200 text-xs">
                  {[
                    {
                      q: 'How long do I have access to this course?',
                      a: 'You receive full lifetime access to all course materials, lesson updates, and downloadable code files upon verified enrollment.',
                    },
                    {
                      q: 'Will I receive a verified certificate upon completion?',
                      a: 'Yes, completing all modules and assignment milestones unlocks an accredited SkillUp Certificate of Completion.',
                    },
                    {
                      q: 'Can I pay in installments?',
                      a: course.allowInstallments
                        ? `Yes! This course supports partial payments with a minimum initial installment of ₹${course.minInstallmentAmount || 500}.`
                        : 'Currently, this course requires a one-time full enrollment fee.',
                    },
                    {
                      q: 'How do I interact with my assigned mentor?',
                      a: 'Enrolled students can attend live weekly Q&A sessions, submit project assignments for review, and interact through the classroom portal.',
                    },
                  ].map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
                      <strong className="text-[#092653] font-bold text-xs flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[#0866E8]" />
                        <span>{faq.q}</span>
                      </strong>
                      <p className="text-[#526B91] text-[11px] leading-relaxed pl-6">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN (4 COLS): Sticky Pricing & Enrollment Card
          ======================================================== */}
          <div id="enrollment-pricing-card" className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-[#D8E7FA] shadow-sm space-y-6">
              {/* Course Thumbnail */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video group">
                <img
                  src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/95 text-[#0866E8] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Price & Discount */}
              <div className="space-y-1 border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold uppercase text-[#526B91] tracking-wider">
                  Tuition Fee
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#092653]">
                    ₹{appliedCoupon ? appliedCoupon.finalPrice.toLocaleString() : courseBasePrice.toLocaleString()}
                  </span>
                  {(appliedCoupon || course.discountPrice) && (
                    <span className="text-sm font-semibold text-[#98A2B3] line-through">
                      ₹{appliedCoupon ? appliedCoupon.originalPrice.toLocaleString() : Number(course.price).toLocaleString()}
                    </span>
                  )}
                  {appliedCoupon ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md ml-auto">
                      -₹{appliedCoupon.discountAmount.toFixed(0)} OFF
                    </span>
                  ) : course.discountPrice ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md ml-auto">
                      Special Offer
                    </span>
                  ) : null}
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-[#0866E8] font-medium pt-1">
                    Applied Coupon: <strong className="font-mono">{appliedCoupon.code}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {course.isEnrolled && (!course.remainingBalance || course.remainingBalance <= 0) ? (
                  <button
                    onClick={() => navigate(`/classroom/${course.slug}`)}
                    className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Go to My Classroom</span>
                  </button>
                ) : course.isEnrolled && course.remainingBalance > 0 ? (
                  <button
                    onClick={handleOpenEnrollment}
                    className="w-full py-3.5 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Pay Remaining Balance (₹{Number(course.remainingBalance).toFixed(2)})</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenEnrollment}
                    className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enroll Now (₹{finalPayablePrice.toLocaleString()})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => toggleWishlistMutation.mutate()}
                  className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-colors cursor-pointer ${course.isWishlisted
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <Heart className={`w-4 h-4 ${course.isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{course.isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </button>
              </div>

              {/* What is Included List */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs text-[#526B91]">
                <strong className="text-[#092653] block text-xs font-bold">This Course Includes:</strong>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-[#0866E8]" />
                  <span>{durationHours ? `${durationHours} hours on-demand video` : 'Complete video syllabus'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0866E8]" />
                  <span>{totalResources > 0 ? `${totalResources} downloadable code resources` : 'Downloadable study notes & files'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#0866E8]" />
                  <span>Full lifetime access to course updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#0866E8]" />
                  <span>Official Certificate of Completion</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0866E8]" />
                  <span>Assigned Mentor: <strong className="text-[#092653] font-semibold">{mentorName}</strong></span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D8E7FA] space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#092653]">
                  <ShieldCheck className="w-4 h-4 text-[#0866E8]" />
                  <span>SkillUp Verified Curriculum</span>
                </div>
                <p className="text-[10px] text-[#526B91]">
                  Direct mentorship with verified faculty. Secure 256-bit encrypted Razorpay checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CHECKOUT MODAL (Enrollment & Order Review)
      ======================================================== */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#D8E7FA] shadow-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#0866E8] bg-[#EAF4FF] px-2 py-0.5 rounded uppercase">
                  Checkout Order
                </span>
                <h3 className="text-base font-bold text-[#092653] mt-1 truncate max-w-sm">
                  {course.title}
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mentor Information Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {mentorAvatar ? (
                <img src={mentorAvatar} alt={mentorName} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0866E8] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {mentorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] text-[#526B91] block font-medium">Assigned Course Mentor</span>
                <h4 className="text-xs font-bold text-[#092653] truncate">{mentorName}</h4>
                <p className="text-[11px] text-[#0866E8] truncate">{mentorTitle}</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 text-xs border border-slate-100 p-3.5 rounded-xl bg-slate-50/50">
              <div className="flex justify-between text-[#526B91]">
                <span>Standard Fee</span>
                <span className="font-semibold text-[#092653]">₹{Number(course.price).toLocaleString()}</span>
              </div>

              {course.discountPrice && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Special Course Discount</span>
                  <span>-₹{(Number(course.price) - Number(course.discountPrice)).toFixed(2)}</span>
                </div>
              )}

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon ({appliedCoupon.code})</span>
                  </span>
                  <span>-₹{appliedCoupon.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#092653]">
                <span>Total Payable</span>
                <span className="text-[#0866E8]">₹{finalPayablePrice.toLocaleString()}</span>
              </div>
            </div>

            {/* College Coupon Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#092653] flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#0866E8]" />
                  <span>Apply Coupon Code</span>
                </label>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove Coupon
                  </button>
                )}
              </div>

              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. SKILLUP50"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-xs uppercase font-mono font-bold border border-[#D8E7FA] rounded-xl focus:outline-none focus:border-[#0866E8]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCodeInput.trim()}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#092653] text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {isValidatingCoupon ? 'Verifying...' : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <span>Code <strong>{appliedCoupon.code}</strong> applied</span>
                  <strong className="text-emerald-700">₹{appliedCoupon.discountAmount.toFixed(2)} OFF</strong>
                </div>
              )}

              {couponMessage && (
                <p className={`text-[11px] font-medium ${couponMessage.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>

            {/* Installments Option Selector if Allowed */}
            {course.allowInstallments && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#092653]">Payment Method</span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    Installments Available
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('FULL');
                      setPaymentError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${paymentMode === 'FULL'
                        ? 'bg-[#0866E8] text-white shadow-xs'
                        : 'text-[#526B91] hover:text-[#092653]'
                      }`}
                  >
                    Full Payment (₹{finalPayablePrice.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('PARTIAL');
                      if (!customAmount) {
                        setCustomAmount(String(course.minInstallmentAmount || 500));
                      }
                      setPaymentError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${paymentMode === 'PARTIAL'
                        ? 'bg-[#0866E8] text-white shadow-xs'
                        : 'text-[#526B91] hover:text-[#092653]'
                      }`}
                  >
                    Partial Installment
                  </button>
                </div>

                {paymentMode === 'PARTIAL' && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Initial Payment Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={course.minInstallmentAmount ? Number(course.minInstallmentAmount) : 500}
                      max={finalPayablePrice}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setPaymentError(null);
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#D8E7FA] rounded-xl text-sm font-bold text-[#092653] focus:outline-none focus:border-[#0866E8]"
                    />
                    <div className="flex justify-between items-center text-[11px] text-[#526B91]">
                      <span>Minimum required:</span>
                      <strong className="text-[#092653]">₹{course.minInstallmentAmount || 500}</strong>
                    </div>
                  </div>
                )}

                {paymentError && (
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {paymentError}
                  </p>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="flex-1 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isCheckingOut}
                className="flex-1 py-3 text-xs font-bold text-white bg-[#0866E8] hover:bg-[#0755C5] rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCheckingOut ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : appliedCoupon?.isFree ? (
                  'Redeem 100% Free Pass'
                ) : paymentMode === 'PARTIAL' && customAmount ? (
                  `Pay ₹${customAmount} with Razorpay`
                ) : (
                  `Pay ₹${finalPayablePrice.toLocaleString()} with Razorpay`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free Lesson Video Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500 text-slate-950">
                  Free Preview
                </span>
                <h3 className="text-sm font-bold text-slate-100 truncate max-w-md sm:max-w-xl">
                  {previewVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <YouTubePlayer url={previewVideo.url} title={previewVideo.title} />
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-300">
                <span className="font-semibold text-white">Enjoying this lesson?</span>
                <span className="text-slate-400 block sm:inline sm:ml-1">
                  Enroll in {course.title} to unlock all modular videos, downloadable files, and mentor Q&A.
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewVideo(null)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewVideo(null);
                    handleOpenEnrollment();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-white bg-[#0866E8] hover:bg-[#0755C5] shadow-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Enroll in Course</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Enrolling Overlay */}
      {isEnrollingAfterPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[#0866E8] animate-spin" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#0866E8] border-t-transparent animate-spin" />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full p-1.5 shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#092653] tracking-tight mb-2">
              Payment Successful!
            </h3>
            <p className="text-sm font-semibold text-[#0866E8] mb-3 animate-pulse">
              Enrolling in {course.title}...
            </p>

            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-medium text-slate-600">
                {enrollingStep}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Please do not close or refresh this tab. We are synchronizing your student enrollment and preparing your classroom.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;
