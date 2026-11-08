import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  Tag,
  AlertCircle,
  Sparkles,
  Award,
  ArrowLeft,
  Building,
  ShieldCheck,
  Check,
  Globe,
  Clock,
} from 'lucide-react';

interface HackathonDetail {
  id: string;
  title: string;
  description: string;
  theme: string;
  organizer: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  mode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  location: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  eligibility: string;
  registrationFee: string | number;
  rules: string | null;
  prizes: string | null;
  bannerUrl?: string | null;
  mentor?: { id: string; name: string; title: string; avatarUrl: string | null; college?: string | null } | null;
  _count?: { registrations: number };
}

export const HackathonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // 1. Fetch Hackathon Details
  const {
    data: hackathon,
    isLoading,
    error,
    refetch,
  } = useQuery<HackathonDetail>({
    queryKey: ['hackathon-detail', id],
    queryFn: async () => {
      const res = await api.get(`/hackathons/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  // 2. Fetch User Registrations
  const { data: myRegistrations = [] } = useQuery({
    queryKey: ['my-hackathons'],
    queryFn: async () => {
      const res = await api.get('/hackathons/my/registrations');
      return res.data.data;
    },
    enabled: Boolean(user),
  });

  const myReg = myRegistrations.find((r: any) => r.hackathonId === id);
  const isRegistered = Boolean(myReg);

  // 3. Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !hackathon) return;
    setIsCheckingCoupon(true);
    setCouponError('');

    try {
      const res = await api.post('/payments/validate-coupon', {
        couponCode: couponCode.trim(),
        hackathonId: hackathon.id,
      });
      setCouponResult(res.data.data);
      toast.success('Coupon Applied', `Discount of ₹${res.data.data.discountAmount} applied!`);
    } catch (err: any) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code for this hackathon.');
      setCouponResult(null);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  // 4. Register Click
  const handleOpenRegistration = () => {
    if (!user) {
      navigate(`/login?redirect=/hackathons/${id}`);
      return;
    }
    if (isRegistered) {
      navigate('/dashboard');
      return;
    }
    setCheckoutModalOpen(true);
  };

  // 5. Execute Registration / Payment
  const handleExecuteRegistration = async () => {
    if (!user) {
      navigate(`/login?redirect=/hackathons/${id}`);
      return;
    }
    if (!hackathon) return;

    if (!teamName.trim()) {
      toast.error('Team Name Required', 'Please enter your team or project name.');
      return;
    }

    setIsRegistering(true);

    try {
      const fee = Number(hackathon.registrationFee);
      const isPaid = fee > 0;

      // Free Entry Flow
      if (!isPaid) {
        await api.post(`/hackathons/${hackathon.id}/register`, {
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
        });
        toast.success('Registration Confirmed', 'You have been registered for this hackathon! Check My Registrations.');
        setCheckoutModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
        refetch();
        navigate('/dashboard');
        return;
      }

      // Paid Gateway Flow
      const res = await api.post('/payments/orders', {
        hackathonId: hackathon.id,
        couponCode: couponResult?.code,
      });

      const orderData = res.data.data;

      // 100% Free coupon grant
      if (orderData.isFree) {
        await api.post(`/hackathons/${hackathon.id}/register`, {
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
        });
        toast.success('Registration Confirmed', 'Coupon granted 100% discount! Team registration confirmed.');
        setIsRegistering(false);
        setCheckoutModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
        refetch();
        navigate('/dashboard');
        return;
      }

      // Razorpay Checkout
      if ((window as any).Razorpay && orderData.orderId) {
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'SkillUp Hackathon Challenge',
          description: hackathon.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              // Create registration after payment verification
              await api.post(`/hackathons/${hackathon.id}/register`, {
                teamName: teamName.trim(),
                teamMembers: teamMembers.trim(),
              });

              toast.success('Payment Verified', 'Registration confirmed! Your team is registered.');
              setCheckoutModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
              refetch();
              navigate('/dashboard');
            } catch (vErr: any) {
              toast.error('Verification Error', vErr.response?.data?.error?.message || 'Payment verification failed.');
            } finally {
              setIsRegistering(false);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#0866E8',
          },
          modal: {
            ondismiss: () => {
              setIsRegistering(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.error('Gateway Error', 'Payment gateway could not be loaded. Please refresh.');
        setIsRegistering(false);
      }
    } catch (err: any) {
      toast.error('Registration Failed', err.response?.data?.error?.message || 'Could not complete registration.');
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#0866E8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#526B91]">Loading hackathon challenge details...</p>
        </div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#D8E7FA] p-8 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#092653]">Hackathon Not Found</h2>
          <p className="text-xs text-[#526B91]">The requested hackathon challenge could not be found or has concluded.</p>
          <Link
            to="/hackathons"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0866E8] text-white text-xs font-bold rounded-xl hover:bg-[#0755C5] transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hackathons</span>
          </Link>
        </div>
      </div>
    );
  }

  const fee = Number(hackathon.registrationFee);
  const isFree = fee === 0;
  const finalPayable = couponResult ? couponResult.finalAmount : fee;
  const isDeadlinePassed = new Date(hackathon.registrationDeadline) < new Date();

  return (
    <div className="min-h-screen bg-[#F8FBFF] pb-20">
      {/* Top Breadcrumb */}
      <div className="border-b border-[#D8E7FA] bg-white sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            to="/hackathons"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#526B91] hover:text-[#0866E8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hackathons</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#0866E8] bg-[#EAF4FF] px-2.5 py-1 rounded-full uppercase tracking-wider">
              {hackathon.mode} • Team: {hackathon.minTeamSize}-{hackathon.maxTeamSize}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#EAF4FF] text-[#0866E8] uppercase tracking-wider">
                  {hackathon.mode}
                </span>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#092653]">
                  Theme: {hackathon.theme}
                </span>
                {isRegistered ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1.5 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Registered Team</span>
                  </span>
                ) : isDeadlinePassed ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Registration Closed
                  </span>
                ) : isFree ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Free Entry Hackathon
                  </span>
                ) : null}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#092653] leading-snug tracking-tight">
                {hackathon.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-3 border-t border-slate-100 text-xs text-[#526B91]">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#0866E8]" />
                  <span>
                    Organizer: <strong className="text-[#092653] font-semibold">{hackathon.organizer}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0866E8]" />
                  <span>Team Size: {hackathon.minTeamSize}-{hackathon.maxTeamSize} Builders</span>
                </div>

                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#0866E8]" />
                  <span>{hackathon._count?.registrations || 0} teams registered</span>
                </div>
              </div>
            </div>

            {/* Banner Image Preview */}
            {hackathon.bannerUrl && (
              <div className="bg-white rounded-2xl border border-[#D8E7FA] overflow-hidden shadow-sm aspect-video w-full bg-slate-900">
                <img
                  src={hackathon.bannerUrl}
                  alt={hackathon.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80';
                  }}
                />
              </div>
            )}

            {/* Complete Description */}
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#092653] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#0866E8]" />
                <span>Problem Statement & Challenge Scope</span>
              </h2>

              <div className="prose prose-slate max-w-none text-sm text-[#092653] leading-relaxed whitespace-pre-line font-normal">
                {hackathon.description}
              </div>
            </div>

            {/* Prizes & Awards */}
            {hackathon.prizes && (
              <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-[#092653] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Prizes & Recognition Pool</span>
                </h2>

                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 font-semibold leading-relaxed">
                  {hackathon.prizes}
                </div>
              </div>
            )}

            {/* Rules & Guidelines */}
            {hackathon.rules && (
              <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-8 space-y-4 shadow-sm text-xs">
                <h2 className="text-base sm:text-lg font-bold text-[#092653] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0866E8]" />
                  <span>Rules & Code Submission Guidelines</span>
                </h2>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-[#092653] leading-relaxed whitespace-pre-line font-normal">
                  {hackathon.rules}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-20">
            <div className="bg-white rounded-2xl border border-[#D8E7FA] p-6 sm:p-7 space-y-6 shadow-sm">
              {/* Fee Section */}
              <div className="space-y-1 border-b border-slate-100 pb-5">
                <span className="text-[11px] font-bold uppercase text-[#526B91] tracking-wider">
                  Registration Entry Fee
                </span>
                <div className="flex items-baseline gap-2">
                  {isFree ? (
                    <span className="text-3xl font-black text-emerald-600">FREE</span>
                  ) : (
                    <span className="text-3xl font-black text-[#092653]">
                      ₹{fee.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {isFree ? '100% Free student entry' : 'Per-team registration entry'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {isRegistered ? (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>View Team in Dashboard</span>
                  </button>
                ) : isDeadlinePassed ? (
                  <button
                    disabled
                    className="w-full py-3.5 px-4 bg-slate-200 text-slate-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <span>Registration Closed</span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenRegistration}
                    className="w-full py-3.5 px-4 bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{isFree ? 'Register Team Free' : `Register Team (₹${fee.toLocaleString()})`}</span>
                  </button>
                )}
              </div>

              {/* Schedule Meta */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Starts On</span>
                  <strong className="text-[#092653]">{new Date(hackathon.startDate).toLocaleDateString()}</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Ends On</span>
                  <strong className="text-[#092653]">{new Date(hackathon.endDate).toLocaleDateString()}</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Deadline</span>
                  <strong className="text-[#092653]">{new Date(hackathon.registrationDeadline).toLocaleDateString()}</strong>
                </div>

                <div className="flex justify-between items-center text-[#526B91]">
                  <span>Eligible</span>
                  <strong className="text-[#092653] text-right truncate max-w-[160px]">{hackathon.eligibility}</strong>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D8E7FA] space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#092653]">
                  <ShieldCheck className="w-4 h-4 text-[#0866E8]" />
                  <span>SkillUp Verified Challenge</span>
                </div>
                <p className="text-[10px] text-[#526B91]">
                  Official team registration with verified credential. Submissions evaluated by jury.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D8E7FA] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#0866E8] bg-[#EAF4FF] px-2 py-0.5 rounded uppercase">
                  Hackathon Entry
                </span>
                <h3 className="text-base font-bold text-[#092653] mt-1">{hackathon.title}</h3>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#526B91] uppercase tracking-wider block">
                  Team Name (or Individual Project Name) *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Neural Builders"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8E7FA] focus:outline-none focus:border-[#0866E8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#526B91] uppercase tracking-wider block">
                  Team Member Names & Emails (Optional)
                </label>
                <textarea
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(e.target.value)}
                  placeholder="e.g. John (john@test.com), Priya (priya@test.com)"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8E7FA] focus:outline-none focus:border-[#0866E8]"
                />
              </div>

              {!isFree && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="text-[11px] font-bold text-[#526B91] uppercase tracking-wider block">
                    Have a Coupon Code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SKILLUP50"
                      className="flex-1 px-3 py-2 text-xs uppercase font-mono rounded-xl border border-[#D8E7FA] focus:outline-none focus:border-[#0866E8]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCheckingCoupon || !couponCode.trim()}
                      className="px-4 py-2 text-xs font-bold text-[#092653] bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingCoupon ? 'Verifying...' : 'Apply'}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>
                  )}

                  {couponResult && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Original Fee</span>
                        <span className="line-through">₹{couponResult.originalPrice}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount ({couponResult.couponCode})</span>
                        <span>-₹{couponResult.discountAmount}</span>
                      </div>
                      <div className="flex justify-between text-[#092653] font-extrabold pt-1 border-t border-emerald-200">
                        <span>Total Payable</span>
                        <span>₹{couponResult.finalAmount}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-[#D8E7FA] text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRegistration}
                disabled={isRegistering}
                className="w-1/2 py-2.5 rounded-xl bg-[#0866E8] hover:bg-[#0755C5] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isRegistering
                  ? 'Confirming...'
                  : !isFree
                  ? `Pay ₹${finalPayable} with Razorpay`
                  : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HackathonDetailPage;

