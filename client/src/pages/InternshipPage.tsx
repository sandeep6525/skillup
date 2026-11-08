import { useToast } from '../context/ToastContext';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import {
  Briefcase,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Tag,
  AlertCircle,
  Check,
  Calendar,
  Sparkles,
  Building,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface Internship {
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
  mentor?: { id: string; name: string; title: string; avatarUrl: string | null };
  _count?: { applications: number };
}

export const InternshipPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [checkoutInternship, setCheckoutInternship] = useState<Internship | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch internships
  const { data: internships = [], isLoading } = useQuery<Internship[]>({
    queryKey: ['internships'],
    queryFn: async () => {
      const res = await api.get('/internships');
      return res.data.data;
    },
  });

  // Fetch student's applications
  const { data: myApps = [] } = useQuery({
    queryKey: ['my-internship-applications'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
    enabled: !!user,
  });

  const appMap = new Map<string, string>();
  myApps.forEach((a: any) => {
    appMap.set(a.internshipId, a.status);
  });

  const handleApplyClick = (internship: Internship) => {
    if (!user) {
      navigate(`/login?redirect=/internship`);
      return;
    }
    setCheckoutInternship(internship);
    setCouponCode('');
    setCouponResult(null);
    setCouponError('');
    setNotes('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !checkoutInternship) return;
    setIsCheckingCoupon(true);
    setCouponError('');

    try {
      const res = await api.post('/payments/validate-coupon', {
        couponCode: couponCode.trim(),
        internshipId: checkoutInternship.id,
      });
      setCouponResult(res.data.data);
    } catch (err: any) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code for this internship');
      setCouponResult(null);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleExecuteApplicationOrPayment = async () => {
    if (!user || !checkoutInternship) return;
    setIsApplying(true);

    try {
      const fee = Number(checkoutInternship.discountPrice || checkoutInternship.price);
      const isPaid = fee > 0;

      // Direct free application
      if (!isPaid) {
        await api.post(`/internships/${checkoutInternship.id}/apply`, { notes });
        toast.success('Enrollment Successful', '🎉 Successfully enrolled in internship! Details available in My Internships.');
        setCheckoutInternship(null);
        queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
        queryClient.invalidateQueries({ queryKey: ['internships'] });
        navigate(`/internships/${checkoutInternship.id}/learning`);
        return;
      }

      // Paid checkout
      await api.post(`/internships/${checkoutInternship.id}/apply`, { notes });

      const res = await api.post('/payments/orders', {
        internshipId: checkoutInternship.id,
        couponCode: couponResult?.code,
      });

      const orderData = res.data.data;

      // Handle 100% coupon discount
      if (orderData.isFree) {
        toast.success('Enrollment Confirmed', 'Coupon granted 100% discount! Your seat is confirmed.');
        setCheckoutInternship(null);
        queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
        queryClient.invalidateQueries({ queryKey: ['internships'] });
        navigate(`/internships/${checkoutInternship.id}/learning`);
        return;
      }

      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Internship Program',
          description: checkoutInternship.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              toast.success('Payment Confirmed', '🎉 Payment confirmed! Your internship seat is active in My Internships.');
              setCheckoutInternship(null);
              queryClient.invalidateQueries({ queryKey: ['my-internship-applications'] });
              queryClient.invalidateQueries({ queryKey: ['internships'] });
              navigate(`/internships/${checkoutInternship.id}/learning`);
            } catch (vErr: any) {
              toast.error('Verification Error', vErr.response?.data?.error?.message || 'Payment verification failed.');
            } finally {
              setIsApplying(false);
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
      toast.error('Enrollment Failed', err.response?.data?.error?.message || 'Failed to submit application.');
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Reusable Page Header */}
      <PageHeader
        title="SkillUp Student"
        highlight="Internship Program"
        subtitle="Gain verified industry exposure and build production features through our partner hiring network."
      >
        {user && (
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#142B4F] hover:bg-[#EAF5EA] hover:border-[#55B957] transition shadow-2xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Briefcase className="w-4 h-4 text-[#55B957]" />
            <span>Go to My Internships</span>
          </button>
        )}
      </PageHeader>

      {/* Internships Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-100 animate-pulse border border-[#E4E9F0]" />
          ))}
        </div>
      ) : internships.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D8E7FA] p-8 space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#14233B]">No Internships Currently Active</h3>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Our company partner network is currently finalising next season's cohorts. Check back soon or browse our full-stack courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {internships.map((op) => {
            const status = appMap.get(op.id);
            const isAccepted = status === 'ACCEPTED' || status === 'COMPLETED';
            const isPending = status === 'PENDING';
            const fee = Number(op.discountPrice || op.price);
            const isFree = fee === 0;

            return (
              <div
                key={op.id}
                className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <Link to={`/internships/${op.id}`} className="block relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4] group">
                  <img
                    src={op.bannerUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'}
                    alt={op.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
                    }}
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF]/95 text-[#2563EB] uppercase shadow-xs">
                    {op.deliveryMode} • {op.duration}
                  </span>
                </Link>

                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#667085] flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>{op.organization}</span>
                      </span>
                    {isAccepted ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Enrolled</span>
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">
                        Payment Pending
                      </span>
                    ) : isFree ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                        Free Program
                      </span>
                    ) : (
                      <span className="text-xs font-black text-[#14233B]">
                        Fee: ₹{fee.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#14233B] leading-snug">
                    <Link to={`/internships/${op.id}`} className="hover:text-[#0866E8] transition-colors">
                      {op.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-[#2563EB] font-medium">
                    {op.technologies}
                  </p>

                  <p className="text-xs text-[#667085] line-clamp-3 leading-relaxed">
                    {op.description}
                  </p>

                  <div className="space-y-1.5 pt-2 text-xs text-[#667085] border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <span>Org: <strong className="text-[#14233B]">{op.organization}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <span>Seats: {Math.max(0, op.availableSeats - (op._count?.applications || 0))} spots left</span>
                    </div>
                    {op.applicationDeadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" />
                        <span>Deadline: {new Date(op.applicationDeadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Link
                    to={`/internships/${op.id}`}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#092653] font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </Link>

                  {isAccepted ? (
                    <button
                      onClick={() => navigate(`/internships/${op.id}/learning`)}
                      className="flex-1 py-2.5 bg-[#EAF7F0] text-[#16845B] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Classroom</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyClick(op)}
                      className="flex-1 py-2.5 bg-[#0866E8] hover:bg-[#0755C5] text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isPending ? 'Pay Fee' : isFree ? 'Enroll Free' : `Enroll`}</span>
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout / Apply Modal */}
      {checkoutInternship && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E4E9F0] shadow-xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                  Internship Enrollment
                </span>
                <h3 className="text-base font-bold text-[#14233B] mt-1">
                  {checkoutInternship.title}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutInternship(null)}
                className="text-[#667085] hover:text-[#14233B] text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {checkoutInternship.bannerUrl && (
              <div className="rounded-xl overflow-hidden aspect-video bg-slate-100 border border-[#E4E9F0]">
                <img
                  src={checkoutInternship.bannerUrl}
                  alt={checkoutInternship.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
                  }}
                />
              </div>
            )}

            {/* Fee summary if paid */}
            {Number(checkoutInternship.discountPrice || checkoutInternship.price) > 0 ? (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100 text-xs">
                <div className="flex justify-between text-[#667085]">
                  <span>Internship Fee</span>
                  <span className="font-semibold text-[#14233B]">
                    ₹{Number(checkoutInternship.discountPrice || checkoutInternship.price)}
                  </span>
                </div>

                {couponResult && (
                  <div className="flex justify-between text-[#16845B] font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Coupon ({couponResult.code})</span>
                    </span>
                    <span>-₹{couponResult.discountAmount}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-[#14233B]">
                  <span>Total Payable</span>
                  <span className="text-[#2563EB]">
                    ₹{couponResult ? couponResult.finalPrice : Number(checkoutInternship.discountPrice || checkoutInternship.price)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#EAF7F0] text-[#16845B] rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>This internship is 100% sponsored and free of cost.</span>
              </div>
            )}

            {/* Coupon input if paid */}
            {Number(checkoutInternship.discountPrice || checkoutInternship.price) > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  College or Promotional Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TRICUBE25"
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB] uppercase font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isCheckingCoupon || !couponCode.trim()}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] disabled:opacity-50 rounded-lg transition-colors shrink-0"
                  >
                    {isCheckingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {couponError && (
                  <p className="text-[11px] font-semibold text-[#C03945] flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{couponError}</span>
                  </p>
                )}

                {couponResult && (
                  <p className="text-[11px] font-semibold text-[#16845B] flex items-center gap-1 mt-1">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>Coupon applied! You save ₹{couponResult.discountAmount}</span>
                  </p>
                )}
              </div>
            )}

            {/* Optional Application Note */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                College / Motivation Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Briefly state your college, branch, or prior project experience..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setCheckoutInternship(null)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E4E9F0] text-xs font-bold text-[#667085] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteApplicationOrPayment}
                disabled={isApplying}
                className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isApplying
                  ? 'Processing...'
                  : Number(checkoutInternship.discountPrice || checkoutInternship.price) > 0
                  ? 'Pay with Razorpay'
                  : 'Confirm Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
