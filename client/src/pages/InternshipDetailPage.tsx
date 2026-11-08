import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  Briefcase,
  Clock,
  Calendar,
  Users,
  CheckCircle,
  Tag,
  AlertCircle,
  Check,
  Building,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
  User,
  Share2,
  Phone,
  Mail,
  FileText,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';

interface InternshipDetail {
  id: string;
  title: string;
  description: string;
  organization: string;
  technologies: string;
  duration: string;
  deliveryMode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  startDate: string | null;
  endDate: string | null;
  applicationDeadline: string | null;
  eligibility: string;
  price: string | number;
  discountPrice?: string | number | null;
  availableSeats: number;
  bannerUrl: string | null;
  mentor?: { id: string; name: string; title: string; avatarUrl: string | null; college?: string | null } | null;
  refundPolicy?: string | null;
  _count?: { applications: number };
}

export const InternshipDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shouldAutoOpenApply = searchParams.get('action') === 'apply';

  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Application Form Fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [collegeName, setCollegeName] = useState((user as any)?.college || '');
  const [degreeBranch, setDegreeBranch] = useState('');
  const [gradYear, setGradYear] = useState('2025');
  const [skills, setSkills] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [notes, setNotes] = useState('');

  // 1. Fetch Internship Details
  const {
    data: internship,
    isLoading,
    error,
    refetch,
  } = useQuery<InternshipDetail>({
    queryKey: ['internship-detail', id],
    queryFn: async () => {
      const res = await api.get(`/internships/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 2. Fetch User's Applications to verify enrollment status
  const { data: myApps = [] } = useQuery({
    queryKey: ['my-internship-applications'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
    enabled: Boolean(user),
  });

  const myApp = myApps.find((a: any) => a.internshipId === id);
  const isEnrolledOrAccepted = myApp?.status === 'ACCEPTED' || myApp?.status === 'COMPLETED';
  const isPendingPayment = myApp?.status === 'PENDING';

  // Automatically open modal if ?action=apply was passed and user is logged in
  useEffect(() => {
    if (shouldAutoOpenApply && user && internship) {
      if (!isEnrolledOrAccepted) {
        setIsCheckoutModalOpen(true);
      }
    }
  }, [shouldAutoOpenApply, user, internship, isEnrolledOrAccepted]);

  // Keep pre-filled user details updated
  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.name || '');
      if (!email) setEmail(user.email || '');
      if (!phone && (user as any).phone) setPhone((user as any).phone);
      if (!collegeName && (user as any).college) setCollegeName((user as any).college);
    }
  }, [user]);

  // 3. Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !internship) return;
    setIsCheckingCoupon(true);
    setCouponError('');

    try {
      const res = await api.post('/payments/validate-coupon', {
        couponCode: couponCode.trim(),
        internshipId: internship.id,
      });
      setCouponResult(res.data.data);
      toast.success('Coupon Applied', `Discount of ₹${res.data.data.discountAmount} applied!`);
    } catch (err: any) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code for this internship');
      setCouponResult(null);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  // 4. Enroll or Checkout Handler
  const handleOpenEnrollment = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/internship/${id}?action=apply`)}`);
      return;
    }
    if (isEnrolledOrAccepted) {
      navigate(`/internships/${id}/learning`);
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  // Resume Upload Handler
  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', 'Please select a resume file under 10MB (PDF/DOC).');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'resumes');

    setIsUploadingResume(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedPath = res.data?.data?.fileUrl || res.data?.data?.url;
      setResumeUrl(uploadedPath);
      toast.success('Resume Uploaded', 'Your resume was successfully uploaded.');
    } catch (uErr: any) {
      toast.error('Upload Failed', uErr.response?.data?.error?.message || 'Failed to upload resume file.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  // 5. Execute Application / Gateway Checkout
  const handleExecuteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/internship/${id}?action=apply`)}`);
      return;
    }
    if (!internship) return;

    if (!fullName.trim() || !email.trim() || !phone.trim() || !collegeName.trim()) {
      toast.error('Missing Required Fields', 'Please complete all required contact and college fields.');
      return;
    }

    const compiledNotes = [
      `Applicant: ${fullName.trim()} | Email: ${email.trim()} | Phone: ${phone.trim()}`,
      `College: ${collegeName.trim()} | Degree/Branch: ${degreeBranch.trim() || 'N/A'} | Grad Year: ${gradYear}`,
      skills.trim() ? `Key Skills: ${skills.trim()}` : null,
      notes.trim() ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    setIsApplying(true);
    try {
      const baseFee = Number(internship.discountPrice || internship.price);
      const isPaid = baseFee > 0;

      // Direct free application if naturally ₹0
      if (!isPaid) {
        await api.post(`/internships/${internship.id}/apply`, {
          notes: compiledNotes,
          resumeUrl: resumeUrl || null,
        });
        toast.success(
          'Application Submitted',
          'Your application has been received and confirmed! Check My Internships in your dashboard.'
        );
        setIsCheckoutModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
        queryClient.invalidateQueries({ queryKey: ['student-portal-internships'] });
        refetch();
        navigate(`/dashboard/internships`);
        return;
      }

      // Paid / Coupon checkout
      await api.post(`/internships/${internship.id}/apply`, {
        notes: compiledNotes,
        resumeUrl: resumeUrl || null,
      });

      const res = await api.post('/payments/orders', {
        internshipId: internship.id,
        couponCode: couponResult?.code,
      });

      const orderData = res.data.data;

      // 100% Free grant via coupon
      if (orderData.isFree) {
        setIsApplying(false);
        setIsCheckoutModalOpen(false);
        toast.success('Enrollment Confirmed', '100% discount applied! Your seat is activated.');
        queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
        queryClient.invalidateQueries({ queryKey: ['student-portal-internships'] });
        refetch();
        navigate(`/dashboard/internships`);
        return;
      }

      // Razorpay Checkout
      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Internship Program',
          description: internship.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.success('Payment Verified', 'Enrollment confirmed! Your internship seat is fully activated.');
              setIsCheckoutModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
              queryClient.invalidateQueries({ queryKey: ['student-portal-internships'] });
              refetch();
              navigate(`/dashboard/internships`);
            } catch (vErr: any) {
              toast.error('Verification Failed', vErr.response?.data?.error?.message || 'Payment verification failed.');
            } finally {
              setIsApplying(false);
            }
          },
          prefill: {
            name: fullName,
            email: email,
            contact: phone,
          },
          theme: {
            color: '#2563EB',
          },
          modal: {
            ondismiss: () => {
              setIsApplying(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error('Payment Error', 'Payment gateway could not be loaded. Please refresh.');
        setIsApplying(false);
      }
    } catch (err: any) {
      toast.error('Application Failed', err.response?.data?.error?.message || 'Failed to submit application.');
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#64748B]">Loading internship details...</p>
        </div>
      </div>
    );
  }

  if (error || !internship) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#102A56]">Internship Not Found</h2>
          <p className="text-xs text-[#64748B]">The requested internship program could not be found or is inactive.</p>
          <Link
            to="/internship"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#1D4ED8] transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Internships</span>
          </Link>
        </div>
      </div>
    );
  }

  const baseFee = Number(internship.discountPrice || internship.price);
  const isFree = baseFee === 0;
  const finalPayable = couponResult ? couponResult.finalPrice : baseFee;
  const techList = internship.technologies
    ? internship.technologies.split(',').map((t: string) => t.trim())
    : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#102A56] py-10 sm:py-14">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
          <Link to="/" className="hover:text-[#102A56] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/internship" className="hover:text-[#102A56] transition-colors">
            Internships
          </Link>
          <span>/</span>
          <span className="text-[#102A56] font-semibold truncate max-w-xs">{internship.title}</span>
        </div>

        {/* Main Grid: Left Details & Right Admission Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (8 cols): Banner, Title, Description, Skills, Mentor */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Cover Image Banner */}
            {internship.bannerUrl && (
              <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-[#E2E8F0] shadow-xs">
                <img
                  src={getMediaUrl(internship.bannerUrl)}
                  alt={internship.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Main Title & Organization Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{internship.organization || 'SkillUp Partner Network'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold border border-blue-200">
                  <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{internship.duration || '3 Months'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] text-[#5DBA58] text-xs font-semibold border border-[#5DBA58]/30 uppercase">
                  <span>{internship.deliveryMode} Mode</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#102A56] tracking-tight leading-tight">
                {internship.title}
              </h1>

              {/* Technologies Badges */}
              {techList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {techList.map((tech, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#102A56] text-xs font-semibold"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Comprehensive Program Description */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-[#102A56] tracking-tight flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#2563EB]" />
                <span>Program Overview & Practical Scope</span>
              </h2>
              <div className="text-sm sm:text-base text-[#64748B] leading-relaxed whitespace-pre-line">
                {internship.description}
              </div>
            </div>

            {/* Eligibility & Qualifications */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-[#102A56] tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#5DBA58]" />
                <span>Eligibility & Recommended Skills</span>
              </h2>
              <div className="text-sm text-[#64748B] space-y-2">
                <p>
                  <strong>Target Learners:</strong> {internship.eligibility || 'Students & recent graduates pursuing technical degrees.'}
                </p>
                <p>
                  <strong>Required Foundations:</strong> Familiarity with {internship.technologies} or general programming fundamentals.
                </p>
              </div>
            </div>

            {/* Assigned Mentor Card (If available) */}
            {internship.mentor && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {internship.mentor.avatarUrl ? (
                    <img
                      src={getMediaUrl(internship.mentor.avatarUrl)}
                      alt={internship.mentor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50 text-[#2563EB]">
                      <User className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider block">
                    Lead Cohort Mentor
                  </span>
                  <h3 className="text-base font-bold text-[#102A56]">{internship.mentor.name}</h3>
                  <p className="text-xs text-[#64748B]">{internship.mentor.title}</p>
                </div>
              </div>
            )}

          </div>

          {/* Right Column (4 cols): Sticky Application & Pricing Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 shadow-lg space-y-6">
              
              {/* Fee Information */}
              <div>
                <span className="text-xs font-semibold text-[#64748B] block mb-1">
                  Internship Fee & Registration
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#102A56]">
                    {isFree ? 'Free' : `₹${baseFee.toLocaleString('en-IN')}`}
                  </span>
                  {internship.discountPrice && Number(internship.discountPrice) < Number(internship.price) && (
                    <span className="text-sm text-[#94A3B8] line-through">
                      ₹{Number(internship.price).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Main CTA Action */}
              <button
                onClick={handleOpenEnrollment}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#2563EB] to-[#4ea849] hover:brightness-110 active:scale-98 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isEnrolledOrAccepted ? (
                  <>
                    <span>Go to My Internship</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Apply Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Key Details List */}
              <div className="border-t border-[#F1F5F9] pt-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-[#64748B]">
                  <span>Delivery Format</span>
                  <strong className="text-[#102A56] uppercase">{internship.deliveryMode}</strong>
                </div>

                <div className="flex justify-between items-center text-[#64748B]">
                  <span>Duration</span>
                  <strong className="text-[#102A56]">{internship.duration || '3 Months'}</strong>
                </div>

                <div className="flex justify-between items-center text-[#64748B]">
                  <span>Available Seats</span>
                  <strong className="text-[#102A56]">{internship.availableSeats || 50} Cohort Seats</strong>
                </div>

                <div className="flex justify-between items-center text-[#64748B]">
                  <span>Application Deadline</span>
                  <strong className="text-[#102A56]">
                    {internship.applicationDeadline
                      ? new Date(internship.applicationDeadline).toLocaleDateString()
                      : 'Rolling Admission'}
                  </strong>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#102A56]">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <span>SkillUp Verified Hiring Partner</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Project deliverables, verified portfolio credentials, and live mentorship included.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Structured Internship Application Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded uppercase">
                  Candidate Application Form
                </span>
                <h3 className="text-lg font-bold text-[#102A56] mt-1">{internship.title}</h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteEnrollment} className="space-y-4">
              
              {/* Candidate Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Candidate name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Graduation Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                    placeholder="e.g. 2025 / 2026"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* College & Degree Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    College / University *
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. IIT Madras / Anna University"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                    Degree & Department
                  </label>
                  <input
                    type="text"
                    value={degreeBranch}
                    onChange={(e) => setDegreeBranch(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Key Skills */}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  Key Skills & Tools
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Python, SQL, Git, React"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Resume Upload File */}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  Upload Resume (PDF or DOC - Max 10MB)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-2 rounded-xl border border-dashed border-[#2563EB] bg-blue-50 text-[#2563EB] text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploadingResume ? 'Uploading...' : 'Choose Resume File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeFileChange}
                      className="hidden"
                      disabled={isUploadingResume}
                    />
                  </label>
                  {resumeUrl && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resume Attached</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Fee summary if paid */}
              {!isFree && (
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Internship Admission Fee</span>
                    <span className="font-semibold text-[#102A56]">₹{baseFee}</span>
                  </div>

                  {couponResult && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>Coupon ({couponResult.code})</span>
                      </span>
                      <span>-₹{couponResult.discountAmount}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#102A56]">
                    <span>Total Payable</span>
                    <span className="text-[#2563EB]">₹{finalPayable}</span>
                  </div>
                </div>
              )}

              {/* Coupon Code Input if paid */}
              {!isFree && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Have a coupon code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SKILLUP50"
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB] uppercase font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCheckingCoupon || !couponCode.trim()}
                      className="px-4 py-2 text-xs font-bold text-[#102A56] bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition cursor-pointer shrink-0"
                    >
                      {isCheckingCoupon ? 'Verifying...' : 'Apply'}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Additional Notes */}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="State any specific areas of interest or portfolio links..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApplying || isUploadingResume}
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#4ea849] hover:brightness-110 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isApplying
                    ? 'Submitting...'
                    : !isFree
                    ? `Pay ₹${finalPayable} with Razorpay`
                    : 'Submit Application'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default InternshipDetailPage;

