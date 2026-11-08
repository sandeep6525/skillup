import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Radio,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Lock,
  ExternalLink,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  X,
  Play,
  Layers,
  ChevronRight,
  Check,
  ShieldCheck,
  Info,
  CalendarDays,
  GraduationCap,
  Sparkle,
} from 'lucide-react';

interface LiveClassItem {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  duration: number;
  meetingUrl?: string | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  courseId?: string | null;
  batchId?: string | null;
  internshipId?: string | null;
  instructorId?: string | null;
  price: number;
  maxCapacity: number;
  timezone: string;
  meetingProvider?: string | null;
  course?: {
    id: string;
    title: string;
    slug?: string;
    thumbnailUrl?: string | null;
  } | null;
  instructor?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    title?: string | null;
  } | null;
  _count?: {
    registrations: number;
    attendees: number;
  };
  registeredCount?: number;
  remainingSeats?: number | null;
  isRegistered?: boolean;
  isCourseEnrolled?: boolean;
  isInternshipEnrolled?: boolean;
  registrationStatus?: string;
  canJoin?: boolean;
  isEarlyJoinOpen?: boolean;
}

export const LiveClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'ADMIN';
  const isMentor = user?.role === 'INSTRUCTOR';

  // Filters & State
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'ENROLLED'
  >('ALL');
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'DATE_ASC' | 'DATE_DESC' | 'PRICE_ASC' | 'PRICE_DESC'>('DATE_ASC');

  // Checkout modal state
  const [selectedClassForCheckout, setSelectedClassForCheckout] = useState<LiveClassItem | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Admin Modals
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveClassItem | null>(null);
  const [viewingRegistrationsClass, setViewingRegistrationsClass] = useState<any | null>(null);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);

  // Admin Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formDuration, setFormDuration] = useState('60');
  const [formCourseId, setFormCourseId] = useState('');
  const [formInstructorId, setFormInstructorId] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formMaxCapacity, setFormMaxCapacity] = useState('100');
  const [formMeetingUrl, setFormMeetingUrl] = useState('');
  const [formMeetingProvider, setFormMeetingProvider] = useState('GOOGLE_MEET');
  const [formStatus, setFormStatus] = useState<'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('SCHEDULED');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // 1. Fetch public live classes
  const {
    data: liveClasses = [],
    isLoading,
    refetch,
  } = useQuery<LiveClassItem[]>({
    queryKey: ['public-live-classes'],
    queryFn: async () => {
      const res = await api.get('/live-classes?public=true');
      return res.data.data;
    },
  });

  // 2. Fetch student enrolled courses if logged in
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['student-enrolled-courses-live-page', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await api.get('/courses/enrolled');
      return res.data.data || [];
    },
    enabled: !!user,
  });

  const enrolledCourseIdSet = useMemo(
    () => new Set(enrolledCourses.map((e: any) => e.courseId || e.course?.id || e.id)),
    [enrolledCourses]
  );

  // 3. If Admin or Mentor, fetch full admin list with registrations
  const { data: adminLiveClassesData = [], refetch: refetchAdminClasses } = useQuery({
    queryKey: ['admin-live-classes-overview', user?.role],
    queryFn: async () => {
      const res = await api.get('/admin/live-classes');
      return res.data.data;
    },
    enabled: isAdmin || isMentor,
  });

  // 4. Fetch platform mentors and courses for admin assignment modal
  const { data: mentorsList = [] } = useQuery({
    queryKey: ['admin-mentors-dropdown'],
    queryFn: async () => {
      const res = await api.get('/admin/mentors');
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  const { data: coursesList = [] } = useQuery({
    queryKey: ['admin-courses-dropdown'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // Count active Live Now classes
  const liveNowCount = useMemo(
    () => liveClasses.filter((c) => c.status === 'LIVE').length,
    [liveClasses]
  );

  // Extract unique courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    return Array.from(
      new Set(
        liveClasses
          .map((c) => c.course?.title)
          .filter(Boolean)
      )
    ) as string[];
  }, [liveClasses]);

  // Enrolled Sessions Count for Student
  const enrolledSessionsCount = useMemo(() => {
    return liveClasses.filter((c) => {
      const isCourseEnrolled = Boolean(c.courseId && enrolledCourseIdSet.has(c.courseId));
      return c.isRegistered || isCourseEnrolled;
    }).length;
  }, [liveClasses, enrolledCourseIdSet]);

  // Mentor Assigned Sessions
  const mentorAssignedClasses = useMemo(() => {
    if (!isMentor || !user) return [];
    return liveClasses.filter((c) => c.instructorId === user.id);
  }, [liveClasses, isMentor, user]);

  // Filter & Sort Logic
  const filteredClasses = useMemo(() => {
    return liveClasses
      .filter((cls) => {
        // Search filter
        const query = search.toLowerCase().trim();
        const matchesSearch =
          !query ||
          cls.title.toLowerCase().includes(query) ||
          (cls.description && cls.description.toLowerCase().includes(query)) ||
          (cls.instructor?.name && cls.instructor.name.toLowerCase().includes(query)) ||
          (cls.course?.title && cls.course.title.toLowerCase().includes(query));

        // Course filter
        const matchesCourse = selectedCourse === 'ALL' || cls.course?.title === selectedCourse;

        // Date filter
        let matchesDate = true;
        if (dateFilter) {
          const classDate = new Date(cls.startTime).toISOString().slice(0, 10);
          matchesDate = classDate === dateFilter;
        }

        // Status filter
        let matchesStatus = true;
        if (selectedStatusFilter !== 'ALL') {
          matchesStatus = cls.status === selectedStatusFilter;
        }

        // Category Tab filter
        let matchesCategory = true;
        const isCourseEnrolled = Boolean(cls.courseId && enrolledCourseIdSet.has(cls.courseId));
        const isEnrolled = cls.isRegistered || isCourseEnrolled;

        if (activeCategoryTab === 'LIVE') {
          matchesCategory = cls.status === 'LIVE';
        } else if (activeCategoryTab === 'UPCOMING') {
          matchesCategory = cls.status === 'SCHEDULED' && new Date(cls.startTime).getTime() > Date.now();
        } else if (activeCategoryTab === 'COMPLETED') {
          matchesCategory = cls.status === 'COMPLETED';
        } else if (activeCategoryTab === 'ENROLLED') {
          matchesCategory = isEnrolled;
        }

        return matchesSearch && matchesCourse && matchesDate && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();

        if (sortBy === 'DATE_ASC') return timeA - timeB;
        if (sortBy === 'DATE_DESC') return timeB - timeA;
        if (sortBy === 'PRICE_ASC') return Number(a.price) - Number(b.price);
        if (sortBy === 'PRICE_DESC') return Number(b.price) - Number(a.price);
        return 0;
      });
  }, [
    liveClasses,
    search,
    selectedCourse,
    dateFilter,
    selectedStatusFilter,
    activeCategoryTab,
    sortBy,
    enrolledCourseIdSet,
  ]);

  // Featured session logic: prioritize live now, else the next upcoming class
  const featuredSession = useMemo(() => {
    if (liveClasses.length === 0) return null;
    const liveNow = liveClasses.find((c) => c.status === 'LIVE');
    if (liveNow) return liveNow;
    const upcoming = [...liveClasses]
      .filter((c) => c.status === 'SCHEDULED' && new Date(c.startTime).getTime() > Date.now())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return upcoming[0] || liveClasses[0];
  }, [liveClasses]);

  // Handle Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !selectedClassForCheckout) return;
    setIsApplyingCoupon(true);
    try {
      const res = await api.post('/payments/validate-coupon', {
        code: couponInput.trim(),
        liveClassId: selectedClassForCheckout.id,
      });
      setAppliedCoupon(res.data.data);
      toast.success('Coupon Applied', res.data.message || 'Discount applied successfully!');
    } catch (err: any) {
      toast.error('Invalid Coupon', err.response?.data?.error?.message || 'Could not apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Handle Checkout / Payment via Razorpay
  const handleProceedToPayment = async () => {
    if (!user) {
      toast.info('Authentication Required', 'Please log in or create an account to register for live classes');
      navigate('/login?redirect=/live-classes');
      return;
    }

    if (!selectedClassForCheckout) return;
    setIsProcessingPayment(true);

    try {
      const orderPayload: any = {
        liveClassId: selectedClassForCheckout.id,
      };
      if (appliedCoupon?.code) {
        orderPayload.couponCode = appliedCoupon.code;
      }

      const res = await api.post('/payments/orders', orderPayload);
      const orderData = res.data.data;

      // Case 1: Free registration
      if (orderData.isFree) {
        toast.success(
          'Registration Confirmed!',
          `You are registered for "${selectedClassForCheckout.title}". Access opens 5 minutes before session time in your dashboard.`
        );
        setSelectedClassForCheckout(null);
        setAppliedCoupon(null);
        setCouponInput('');
        queryClient.invalidateQueries({ queryKey: ['public-live-classes'] });
        queryClient.invalidateQueries({ queryKey: ['student-portal-live-classes'] });
        refetch();
        return;
      }

      // Case 2: Paid via Razorpay
      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'SkillUp Live Engineering',
          description: `Registration for: ${selectedClassForCheckout.title}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              toast.success(
                'Payment Verified & Seat Confirmed!',
                `Your live class seat is reserved. A receipt and joining instructions have been emailed to ${user.email}.`
              );
              setSelectedClassForCheckout(null);
              setAppliedCoupon(null);
              setCouponInput('');
              queryClient.invalidateQueries({ queryKey: ['public-live-classes'] });
              queryClient.invalidateQueries({ queryKey: ['student-portal-live-classes'] });
              refetch();
            } catch (vErr: any) {
              toast.error(
                'Payment Verification Failed',
                vErr.response?.data?.error?.message || 'Payment signature could not be verified'
              );
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: { color: '#10264B' },
          modal: {
            ondismiss: () => setIsProcessingPayment(false),
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.warning(
          'Gateway Initializing',
          'Razorpay payment gateway is initializing. Please retry in a few seconds.'
        );
      }
    } catch (err: any) {
      toast.error('Order Creation Failed', err.response?.data?.error?.message || 'Could not initiate registration');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Open Admin Upsert Modal (Create or Edit)
  const openUpsertModal = (cls?: LiveClassItem) => {
    if (cls) {
      setEditingSession(cls);
      setFormTitle(cls.title || '');
      setFormDescription(cls.description || '');
      const localTime = new Date(new Date(cls.startTime).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormStartTime(localTime);
      setFormDuration(String(cls.duration || 60));
      setFormCourseId(cls.courseId || '');
      setFormInstructorId(cls.instructorId || '');
      setFormPrice(String(cls.price || 0));
      setFormMaxCapacity(String(cls.maxCapacity || 100));
      setFormMeetingUrl(cls.meetingUrl || '');
      setFormMeetingProvider(cls.meetingProvider || 'GOOGLE_MEET');
      setFormStatus(cls.status || 'SCHEDULED');
    } else {
      setEditingSession(null);
      setFormTitle('');
      setFormDescription('');
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
      defaultTime.setMinutes(0, 0, 0);
      const localTime = new Date(defaultTime.getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormStartTime(localTime);
      setFormDuration('60');
      setFormCourseId(coursesList[0]?.id || '');
      setFormInstructorId(mentorsList[0]?.id || user?.id || '');
      setFormPrice('0');
      setFormMaxCapacity('100');
      setFormMeetingUrl('');
      setFormMeetingProvider('GOOGLE_MEET');
      setFormStatus('SCHEDULED');
    }
    setIsUpsertModalOpen(true);
  };

  // Submit Admin Form
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartTime) {
      toast.error('Validation Error', 'Title and scheduled start time are required.');
      return;
    }

    setIsSubmittingForm(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        startTime: new Date(formStartTime).toISOString(),
        duration: parseInt(formDuration, 10) || 60,
        courseId: formCourseId || null,
        instructorId: formInstructorId || null,
        price: parseFloat(formPrice) || 0,
        maxCapacity: parseInt(formMaxCapacity, 10) || 100,
        meetingUrl: formMeetingUrl.trim() || null,
        meetingProvider: formMeetingProvider,
        status: formStatus,
      };

      if (editingSession) {
        await api.patch(`/admin/live-classes/${editingSession.id}`, payload);
        toast.success('Session Updated', `Live class "${formTitle}" updated successfully.`);
      } else {
        await api.post('/admin/live-classes', payload);
        toast.success('Session Scheduled', `Live class "${formTitle}" created successfully.`);
      }

      setIsUpsertModalOpen(false);
      refetch();
      if (isAdmin || isMentor) refetchAdminClasses();
    } catch (err: any) {
      toast.error('Operation Failed', err.response?.data?.error?.message || 'Could not save session.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Admin Session
  const handleDeleteSession = async (cls: LiveClassItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${cls.title}"?`)) {
      return;
    }
    setIsDeletingSessionId(cls.id);
    try {
      await api.delete(`/admin/live-classes/${cls.id}?force=true`);
      toast.success('Session Deleted', `"${cls.title}" has been permanently removed.`);
      refetch();
      if (isAdmin || isMentor) refetchAdminClasses();
    } catch (err: any) {
      toast.error('Delete Failed', err.response?.data?.error?.message || 'Could not delete session.');
    } finally {
      setIsDeletingSessionId(null);
    }
  };

  // Handle Student / Participant Joining
  const handleJoinClick = (cls: LiveClassItem) => {
    if (!user) {
      navigate(`/login?redirect=/live-classes`);
      return;
    }

    const isHost = isAdmin || (isMentor && cls.instructorId === user.id);
    const isEnrolled = cls.isRegistered || Boolean(cls.courseId && enrolledCourseIdSet.has(cls.courseId));

    if (!isHost && !isEnrolled && Number(cls.price) > 0) {
      setSelectedClassForCheckout(cls);
      return;
    }

    const now = Date.now();
    const startTime = new Date(cls.startTime).getTime();
    const endTime = startTime + (cls.duration || 60) * 60 * 1000;
    const EARLY_JOIN_WINDOW_MS = 5 * 60 * 1000;

    if (!isHost && now < startTime - EARLY_JOIN_WINDOW_MS) {
      const waitMinutes = Math.ceil((startTime - EARLY_JOIN_WINDOW_MS - now) / 60000);
      toast.info(
        'Session Not Started Yet',
        `The live classroom join link opens 5 minutes before scheduled start time (in approximately ${waitMinutes} minutes).`
      );
      return;
    }

    if (now > endTime && cls.status !== 'LIVE') {
      toast.warning('Session Concluded', 'This live class session has ended.');
      return;
    }

    // Direct to room or meeting link
    if (cls.meetingUrl && cls.meetingUrl.startsWith('http') && !cls.meetingUrl.includes('/room')) {
      window.open(cls.meetingUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate(`/live-classes/${cls.id}/room`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-[#10264B] flex flex-col">
      {/* ========================================================
          1. PAGE HERO SECTION
      ======================================================== */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-10 pb-12 sm:pt-14 sm:pb-16">
        {/* Subtle background ambient gradients */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-gradient-to-br from-[#EAF5EA] to-[#F7FAF7] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 rounded-full bg-[#EAF5EA]/50 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              {/* Live Now Indicator Pill */}
              <div className="flex flex-wrap items-center gap-3">
                 

                {liveNowCount > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5EA] border border-[#5DBA58]/40 shadow-xs text-xs font-bold text-[#267A36] animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5DBA58] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5DBA58]" />
                    </span>
                    <span>{liveNowCount} {liveNowCount === 1 ? 'Class Live Now' : 'Classes Live Now'}</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#171717] tracking-tight leading-tight">
                Live Learning{' '}
                <span className="text-[#5DBA58]">
                  Sessions
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Learn directly from industry mentors through interactive live classes. Participate in hands-on code reviews, real-time Q&A, and cohort teardowns.
              </p>
            </div>

            {/* Quick Actions for Staff or Student */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {isAdmin && (
                <button
                  onClick={() => openUpsertModal()}
                  className="px-4 py-2.5 rounded-xl bg-[#5DBA58] hover:bg-[#4ea849] text-white text-xs font-bold shadow-md shadow-[#5DBA58]/20 hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Live Session</span>
                </button>
              )}

              {isMentor && (
                <Link
                  to="/mentor-dashboard"
                  className="px-4 py-2.5 rounded-xl bg-[#10264B] text-white text-xs font-bold hover:bg-slate-900 transition flex items-center gap-2 shadow-2xs"
                >
                  <Video className="w-4 h-4 text-emerald-300" />
                  <span>Mentor Schedule</span>
                </Link>
              )}

              {user && (
                <button
                  onClick={() => setActiveCategoryTab('ENROLLED')}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[#10264B] hover:border-[#5DBA58] text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-[#5DBA58]" />
                  <span>My Enrolled ({enrolledSessionsCount})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. CATEGORY TABS & FILTER TOOLBAR
      ======================================================== */}
      <section className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Top Row: Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
            {[
              { id: 'ALL', label: 'All Sessions', count: liveClasses.length },
              { id: 'LIVE', label: 'Live Now', count: liveNowCount, isLive: true },
              {
                id: 'UPCOMING',
                label: 'Upcoming',
                count: liveClasses.filter(
                  (c) => c.status === 'SCHEDULED' && new Date(c.startTime).getTime() > Date.now()
                ).length,
              },
              {
                id: 'COMPLETED',
                label: 'Completed',
                count: liveClasses.filter((c) => c.status === 'COMPLETED').length,
              },
              ...(user
                ? [
                    {
                      id: 'ENROLLED',
                      label: 'My Enrolled Classes',
                      count: enrolledSessionsCount,
                    },
                  ]
                : []),
            ].map((tab: any) => {
              const isActive = activeCategoryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategoryTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-[#10264B] text-white shadow-slate-300'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {tab.isLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Search, Course Filter, Date Filter, Sort */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search sessions, mentors, or topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#5DBA58] focus:bg-white transition shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Course filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-700 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Courses</option>
                  {uniqueCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-700 shadow-2xs">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="LIVE">Live Only</option>
                <option value="SCHEDULED">Scheduled Only</option>
                <option value="COMPLETED">Completed Only</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="DATE_ASC">Date: Soonest First</option>
                <option value="DATE_DESC">Date: Latest First</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. MAIN CONTENT: FEATURED CLASS & 3-COLUMN SESSION GRID
      ======================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 flex-1">
        {/* Mentor Specific Overview Banner if logged in as mentor */}
        {isMentor && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-slate-50 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5DBA58] text-white flex items-center justify-center font-bold shadow-xs">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#10264B]">
                  Welcome Mentor, {user?.name}
                </h3>
                <p className="text-xs text-slate-600">
                  You have {mentorAssignedClasses.length} assigned session(s) on your roster.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/mentor-dashboard"
                className="px-4 py-2 rounded-xl bg-white border border-[#5DBA58]/50 text-xs font-bold text-[#5DBA58] hover:bg-[#EAF5EA] transition shadow-2xs"
              >
                Open Mentor Portal
              </Link>
            </div>
          </div>
        )}

        {/* 3.1 FEATURED LIVE SESSION (Shown when viewing All or Upcoming) */}
        {featuredSession && !search && activeCategoryTab === 'ALL' && (
          <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Left / Top: Thumbnail & Live Tag */}
              <div className="lg:col-span-5 relative bg-slate-900 min-h-[260px] lg:min-h-full overflow-hidden">
                <img
                  src={
                    getMediaUrl(featuredSession.course?.thumbnailUrl) ||
                    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'
                  }
                  alt={featuredSession.title}
                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500 ease-out"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

                {/* Status Indicator */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  {featuredSession.status === 'LIVE' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white shadow-md animate-pulse">
                      <Radio className="w-3.5 h-3.5" />
                      <span>LIVE CLASS RUNNING</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#5DBA58]" />
                      <span>Featured Masterclass</span>
                    </span>
                  )}
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-xs">
                    <Clock className="w-3 h-3 text-emerald-300" />
                    <span>{featuredSession.duration || 60} Minutes Interactive</span>
                  </span>
                </div>
              </div>

              {/* Right: Details & Enrollment */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#5DBA58] bg-[#EAF5EA] px-3 py-1 rounded-full border border-emerald-200/60">
                      {featuredSession.course?.title || 'Core Engineering Session'}
                    </span>

                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(featuredSession.startTime).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#10264B] leading-snug">
                    {featuredSession.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {featuredSession.description ||
                      'Comprehensive live practical teardown and real-time coding session with dedicated Q&A and architecture insights.'}
                  </p>

                  {/* Mentor & Capacity details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        {featuredSession.instructor?.avatarUrl ? (
                          <img
                            src={getMediaUrl(featuredSession.instructor.avatarUrl)}
                            alt={featuredSession.instructor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-700">
                            {featuredSession.instructor?.name?.charAt(0) || 'M'}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-[#10264B] block text-xs">
                          {featuredSession.instructor?.name || 'Assigned Mentor'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {featuredSession.instructor?.title || 'Lead Faculty'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-[#5DBA58] shrink-0" />
                      <div>
                        <span className="font-bold text-[#10264B] block">
                          {featuredSession.remainingSeats !== null
                            ? `${featuredSession.remainingSeats} Seats Available`
                            : 'Open Cohort'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Scheduled for{' '}
                          {new Date(featuredSession.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({featuredSession.timezone || 'IST'})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer / Join CTA */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 block font-medium">Session Fee</span>
                    <span className="text-xl font-extrabold text-[#10264B]">
                      {Number(featuredSession.price) === 0 ? 'Complimentary / Free' : `₹${Number(featuredSession.price).toLocaleString()} INR`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleJoinClick(featuredSession)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                        featuredSession.status === 'LIVE'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 animate-pulse'
                          : 'bg-[#10264B] hover:bg-slate-900 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{featuredSession.status === 'LIVE' ? 'Join Live Now' : 'Enter Classroom'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => openUpsertModal(featuredSession)}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#5DBA58] hover:bg-[#EAF5EA] transition"
                        title="Edit Session"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3.2 SESSIONS GRID HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#10264B]">
              {activeCategoryTab === 'ENROLLED'
                ? 'Your Enrolled Live Classes'
                : activeCategoryTab === 'LIVE'
                ? 'Sessions Currently Live'
                : 'All Live Sessions'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} matching your criteria
            </p>
          </div>

          {(search || dateFilter || selectedCourse !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setDateFilter('');
                setSelectedCourse('ALL');
                setSelectedStatusFilter('ALL');
              }}
              className="text-xs font-bold text-[#5DBA58] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* 3.3 LOADING SKELETON */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        )}

        {/* 3.4 EMPTY STATE */}
        {!isLoading && filteredClasses.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-[#5DBA58] flex items-center justify-center mx-auto shadow-xs">
              <Video className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#10264B]">No live sessions found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find any scheduled live sessions matching your search or active filter tab.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCourse('ALL');
                setDateFilter('');
                setSelectedStatusFilter('ALL');
                setActiveCategoryTab('ALL');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#10264B] text-white text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* 3.5 RESPONSIVE 3-COLUMN SESSION CARDS GRID */}
        {!isLoading && filteredClasses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredClasses.map((item, idx) => {
                const startDate = new Date(item.startTime);
                const dateStr = startDate.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = startDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const priceNum = Number(item.price || 0);
                const isCancelled = item.status === 'CANCELLED';
                const isCompleted = item.status === 'COMPLETED';
                const isLive = item.status === 'LIVE';
                const isCourseLinked = Boolean(item.courseId);
                const isEnrolledInCourse = Boolean(
                  item.courseId && enrolledCourseIdSet.has(item.courseId)
                );
                const isRegistered = Boolean(item.isRegistered) || isEnrolledInCourse;
                const canJoinSession = Boolean(item.canJoin);
                const isFull = item.maxCapacity && (item.remainingSeats ?? 1) <= 0;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.25) }}
                    className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-[#5DBA58]/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                  >
                    {/* Thumbnail & Badges */}
                    <div className="relative aspect-16/9 bg-slate-900 overflow-hidden">
                      <img
                        src={
                          getMediaUrl(item.course?.thumbnailUrl) ||
                          'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80'
                        }
                        alt={item.title}
                        className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

                      {/* Top status & Category badges */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-xs">
                          <Calendar className="w-3 h-3 text-[#5DBA58]" />
                          <span>{dateStr}</span>
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                            isCancelled
                              ? 'bg-rose-500 text-white'
                              : isCompleted
                              ? 'bg-slate-700 text-white'
                              : isLive
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Bottom Info on Thumbnail */}
                      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-white text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs font-medium">
                          <Clock className="w-3 h-3 text-emerald-300" />
                          <span>{timeStr} ({item.duration || 60}m)</span>
                        </span>

                        {isRegistered && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-bold backdrop-blur-xs shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Enrolled</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Course Name */}
                        <span className="text-[11px] font-bold text-[#5DBA58] line-clamp-1">
                          {item.course?.title || 'Interactive Masterclass'}
                        </span>

                        {/* Title */}
                        <h3 className="font-extrabold text-[#10264B] text-base leading-snug line-clamp-2 hover:text-[#5DBA58] transition-colors">
                          {item.title}
                        </h3>

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Mentor Details & Seats */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            {item.instructor?.avatarUrl ? (
                              <img
                                src={getMediaUrl(item.instructor.avatarUrl)}
                                alt={item.instructor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 text-xs">
                                {item.instructor?.name?.charAt(0) || 'M'}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#10264B] block text-xs line-clamp-1">
                              {item.instructor?.name || 'Assigned Mentor'}
                            </span>
                            <span className="text-[10px] text-slate-500 block">Lead Mentor</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            {item.remainingSeats !== null
                              ? `${item.remainingSeats} seats left`
                              : 'Open Cohort'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.maxCapacity ? `Max ${item.maxCapacity}` : 'Unlimited'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Pricing & Action Button */}
                    <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fee</span>
                        <span className="font-extrabold text-sm sm:text-base text-[#10264B]">
                          {isCourseLinked
                            ? 'Included'
                            : priceNum === 0
                            ? 'Free'
                            : `₹${priceNum.toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              onClick={() => openUpsertModal(item)}
                              title="Edit Session"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#EAF5EA] text-slate-500 hover:text-[#5DBA58] transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(item)}
                              disabled={isDeletingSessionId === item.id}
                              title="Delete Session"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Student / Participant Action */}
                        {isCancelled ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold">
                            Cancelled
                          </span>
                        ) : isCompleted ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                            Concluded
                          </span>
                        ) : canJoinSession ? (
                          <button
                            onClick={() => handleJoinClick(item)}
                            className="px-4 py-2 rounded-xl bg-[#5DBA58] hover:bg-[#4ea849] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Join Class</span>
                          </button>
                        ) : isCourseLinked && !isEnrolledInCourse ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-amber-700 font-medium">Purchase this course to access</span>
                            <Link
                              to={`/courses/${item.course?.slug || item.courseId}`}
                              className="px-4 py-2 rounded-xl bg-[#5DBA58] hover:bg-[#4ea849] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            >
                              <span>Enroll in Course</span>
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        ) : isRegistered ? (
                          <button
                            onClick={() => handleJoinClick(item)}
                            className="px-4 py-2 rounded-xl bg-[#5DBA58] hover:bg-[#4ea849] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Join Class</span>
                          </button>
                        ) : isFull ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold">
                            Cohort Full
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (!user) {
                                navigate('/login?redirect=/live-classes');
                              } else {
                                setSelectedClassForCheckout(item);
                                setAppliedCoupon(null);
                                setCouponInput('');
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#5DBA58] hover:bg-[#4ea849] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{priceNum === 0 ? 'Register Free' : 'Register Now'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 3.6 ADMIN REGISTRATIONS OVERSIGHT TABLE (If Admin Logged in) */}
        {isAdmin && adminLiveClassesData.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#10264B]">
                  Administrative Live Session Oversight & Rosters
                </h3>
                <p className="text-xs text-slate-500">
                  Track real-time registrations, attendee counts, and revenue collected across cohorts.
                </p>
              </div>

              <button
                onClick={() => openUpsertModal()}
                className="px-4 py-2 rounded-xl bg-[#10264B] text-white text-xs font-bold hover:bg-slate-900 transition flex items-center gap-1.5 self-start cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Schedule New Session</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Session Title</th>
                      <th className="py-3 px-4">Course / Program</th>
                      <th className="py-3 px-4">Mentor</th>
                      <th className="py-3 px-4">Start Time</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Registrations</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Admin Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminLiveClassesData.map((cls: any) => (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#10264B]">
                          {cls.title}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {cls.course?.title || 'Standalone Masterclass'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {cls.instructor?.name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(cls.startTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#10264B]">
                          {Number(cls.price) === 0 ? 'Free' : `₹${Number(cls.price).toLocaleString()}`}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setViewingRegistrationsClass(cls)}
                            className="px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] font-bold text-[11px] hover:bg-blue-100 transition cursor-pointer"
                          >
                            {cls.totalRegistrations ?? cls.paidRegistrations ?? 0} Students &rarr;
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cls.status === 'LIVE'
                                ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                                : cls.status === 'COMPLETED'
                                ? 'bg-slate-100 text-slate-600'
                                : cls.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {cls.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openUpsertModal(cls)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5DBA58] hover:bg-[#EAF5EA] transition"
                              title="Edit Session"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(cls)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          4. REGISTRATION / PAYMENT CHECKOUT MODAL
      ======================================================== */}
      {selectedClassForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5DBA58] uppercase tracking-wider bg-[#EAF5EA] px-2.5 py-0.5 rounded-full mb-2">
                  <Sparkles className="w-3 h-3" />
                  Live Masterclass Registration
                </span>
                <h3 className="text-xl font-extrabold text-[#10264B]">
                  {selectedClassForCheckout.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClassForCheckout(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mentor:</span>
                <span className="font-bold text-[#10264B]">
                  {selectedClassForCheckout.instructor?.name || 'Assigned Instructor'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Time:</span>
                <span className="font-semibold text-[#10264B]">
                  {new Date(selectedClassForCheckout.startTime).toLocaleString()} ({selectedClassForCheckout.timezone || 'IST'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-[#10264B]">{selectedClassForCheckout.duration || 60} Minutes</span>
              </div>
            </div>

            {/* Coupon Code Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#10264B]">
                Have a Coupon Code?
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter coupon code (e.g. WELCOME100)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58] uppercase font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponInput.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#10264B] transition disabled:opacity-50 cursor-pointer"
                >
                  {isApplyingCoupon ? 'Verifying...' : 'Apply'}
                </button>
              </div>

              {appliedCoupon && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied! You saved ₹{appliedCoupon.discountAmount}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Standard Fee:</span>
                <span>₹{Number(selectedClassForCheckout.price || 0).toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount:</span>
                  <span>- ₹{Number(appliedCoupon.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#10264B] border-t border-slate-200 pt-2">
                <span>Total Payable:</span>
                <span>
                  {appliedCoupon
                    ? `₹${Number(appliedCoupon.finalPrice).toFixed(2)}`
                    : `₹${Number(selectedClassForCheckout.price || 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Trust and Policy Note */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
              <p className="flex items-center gap-1 font-semibold text-[#10264B]">
                <Lock className="w-3.5 h-3.5 text-[#2563EB]" />
                Verified & Cryptographically Secured Payment
              </p>
              <p>
                Meeting URLs unlock exactly 5 minutes before scheduled start time directly in your student dashboard.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedClassForCheckout(null)}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={isProcessingPayment}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#5DBA58] to-[#2563EB] hover:bg-[#4ea849] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Confirm & Register</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. ADMIN CREATE / EDIT LIVE SESSION MODAL
      ======================================================== */}
      {isUpsertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#5DBA58] uppercase tracking-wider block mb-1">
                  Admin Live Session Control
                </span>
                <h3 className="text-xl font-extrabold text-[#10264B]">
                  {editingSession ? `Edit: ${editingSession.title}` : 'Schedule New Live Class'}
                </h3>
              </div>
              <button
                onClick={() => setIsUpsertModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Class Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Automation & Data Extraction Masterclass"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description / Agenda</label>
                <textarea
                  rows={3}
                  placeholder="Describe what students will learn during this live interactive session..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                />
              </div>

              {/* Course & Mentor selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Associated Course</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  >
                    <option value="">Standalone / No Course Required</option>
                    {coursesList.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assign Mentor / Instructor *</label>
                  <select
                    value={formInstructorId}
                    onChange={(e) => setFormInstructorId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  >
                    <option value="">Select Mentor</option>
                    {mentorsList.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date/Time and Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Start Time (Local) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  />
                </div>
              </div>

              {/* Price, Capacity & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Price (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Seat Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={formMaxCapacity}
                    onChange={(e) => setFormMaxCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Session Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">Live Now</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Meeting URL & Provider */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Provider</label>
                  <select
                    value={formMeetingProvider}
                    onChange={(e) => setFormMeetingProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  >
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="ZOOM">Zoom</option>
                    <option value="LIVEKIT">Built-in LiveKit</option>
                    <option value="OTHER">Other / Custom</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Meeting Link (Protected until 5m prior)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xyz-abc-def"
                    value={formMeetingUrl}
                    onChange={(e) => setFormMeetingUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#5DBA58]"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUpsertModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2.5 rounded-xl bg-[#10264B] hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingForm ? 'Saving Session...' : editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          6. ADMIN REGISTRATIONS ROSTER MODAL
      ======================================================== */}
      {viewingRegistrationsClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-[#5DBA58] uppercase tracking-wider block">
                  Student Enrollment Roster
                </span>
                <h3 className="text-lg font-extrabold text-[#10264B]">
                  {viewingRegistrationsClass.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingRegistrationsClass(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 text-xs">
              {!viewingRegistrationsClass.registrations || viewingRegistrationsClass.registrations.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span>No students have registered for this specific session yet.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingRegistrationsClass.registrations.map((reg: any) => (
                      <tr key={reg.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-[#10264B]">
                          {reg.student?.name || 'Student'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {reg.student?.email}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#10264B]">
                          ₹{Number(reg.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              reg.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {reg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingRegistrationsClass(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

