import { useToast } from '../context/ToastContext';
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  Eye,
} from 'lucide-react';

interface Hackathon {
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
  _count?: { registrations: number };
}

export const HackathonsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [checkoutHackathon, setCheckoutHackathon] = useState<Hackathon | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<any | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // Fetch hackathons
  const { data: hackathons = [], isLoading } = useQuery<Hackathon[]>({
    queryKey: ['hackathons'],
    queryFn: async () => {
      const res = await api.get('/hackathons');
      return res.data.data;
    },
  });

  // Fetch student's registrations
  const { data: myRegistrations = [] } = useQuery({
    queryKey: ['my-hackathons'],
    queryFn: async () => {
      const res = await api.get('/hackathons/my/registrations');
      return res.data.data;
    },
    enabled: !!user,
  });

  const regMap = new Map<string, string>();
  myRegistrations.forEach((r: any) => {
    regMap.set(r.hackathonId, r.status);
  });

  const handleRegisterClick = (hackathon: Hackathon) => {
    if (!user) {
      navigate(`/login?redirect=/hackathons`);
      return;
    }
    setCheckoutHackathon(hackathon);
    setTeamName('');
    setTeamMembers('');
    setCouponCode('');
    setCouponResult(null);
    setCouponError('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !checkoutHackathon) return;
    setIsCheckingCoupon(true);
    setCouponError('');

    try {
      const res = await api.post('/payments/validate-coupon', {
        couponCode: couponCode.trim(),
        hackathonId: checkoutHackathon.id,
      });
      setCouponResult(res.data.data);
    } catch (err: any) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code for this hackathon');
      setCouponResult(null);
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleExecuteRegistration = async () => {
    if (!user || !checkoutHackathon) return;

    if (!teamName.trim()) {
      toast.error('Team Name Required', 'Please enter your team or project name.');
      return;
    }

    setIsRegistering(true);

    try {
      const fee = Number(checkoutHackathon.registrationFee);
      const isPaid = fee > 0;

      // Free Entry Flow
      if (!isPaid) {
        await api.post(`/hackathons/${checkoutHackathon.id}/register`, {
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
        });
        toast.success('Registration Confirmed', 'You have been registered for this hackathon! Check My Registrations.');
        setCheckoutHackathon(null);
        queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
        queryClient.invalidateQueries({ queryKey: ['hackathons'] });
        navigate('/dashboard');
        return;
      }

      // Paid Gateway Flow
      const res = await api.post('/payments/orders', {
        hackathonId: checkoutHackathon.id,
        couponCode: couponResult?.code,
      });

      const orderData = res.data.data;

      // 100% Free coupon grant
      if (orderData.isFree) {
        await api.post(`/hackathons/${checkoutHackathon.id}/register`, {
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
        });
        toast.success('Registration Confirmed', 'Coupon granted 100% discount! Team registration confirmed.');
        setIsRegistering(false);
        setCheckoutHackathon(null);
        queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
        queryClient.invalidateQueries({ queryKey: ['hackathons'] });
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
          description: checkoutHackathon.title,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              await api.post('/payments/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              // Create registration record after verified payment
              await api.post(`/hackathons/${checkoutHackathon.id}/register`, {
                teamName: teamName.trim(),
                teamMembers: teamMembers.trim(),
              });

              toast.success('Payment Verified', 'Registration confirmed! Your team is registered.');
              setCheckoutHackathon(null);
              queryClient.invalidateQueries({ queryKey: ['my-hackathons'] });
              queryClient.invalidateQueries({ queryKey: ['hackathons'] });
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
            color: '#173B73',
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#EDF0F4]">
        <div>
          
          <h1 className="text-3xl font-extrabold text-[#14233B] mt-1">
            SkillUp National & Global Hackathons
          </h1>
          <p className="text-sm text-[#667085] mt-1 max-w-2xl">
            Compete in 48-hour build challenges, solve real partner problem statements, and earn verified credentials and cash prizes.
          </p>
        </div>

        {user && (
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl border border-[#D5E5FA] text-xs font-bold text-[#0866E8] hover:bg-[#EAF4FF] transition shadow-2xs flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Trophy className="w-4 h-4" />
            <span>My Hackathons</span>
          </button>
        )}
      </div>

      {/* Hackathons Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-slate-100 animate-pulse border border-[#E4E9F0]" />
          ))}
        </div>
      ) : hackathons.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#D8E7FA] p-8 space-y-3">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#14233B]">No Hackathons Open for Registration</h3>
          <p className="text-xs text-[#667085] max-w-md mx-auto">
            Upcoming seasonal hackathons and coding tournaments will appear here. Join our community to receive alerts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((h) => {
            const isRegistered = regMap.has(h.id);
            const fee = Number(h.registrationFee);
            const isFree = fee === 0;

            return (
              <div
                key={h.id}
                className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <Link to={`/hackathons/${h.id}`} className="block relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4] group">
                  <img
                    src={h.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80'}
                    alt={h.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80';
                    }}
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF]/95 text-[#2563EB] uppercase shadow-xs">
                    {h.mode} • Team: {h.minTeamSize}-{h.maxTeamSize}
                  </span>
                </Link>

                <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                    {isRegistered ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Registered</span>
                      </span>
                    ) : isFree ? (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                        Free Entry
                      </span>
                    ) : (
                      <span className="text-xs font-black text-[#14233B]">
                        Fee: ₹{fee.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#14233B] leading-snug">
                    <Link to={`/hackathons/${h.id}`} className="hover:text-[#0866E8] transition-colors">
                      {h.title}
                    </Link>
                  </h3>

                  <p className="text-xs text-[#2563EB] font-medium flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>Theme: {h.theme}</span>
                  </p>

                  <p className="text-xs text-[#667085] line-clamp-3 leading-relaxed">
                    {h.description}
                  </p>

                  <div className="space-y-1.5 pt-2 text-xs text-[#667085] border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <span>Starts: {new Date(h.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <span>Participants: {h._count?.registrations || 0} teams registered</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Link
                    to={`/hackathons/${h.id}`}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#092653] font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </Link>

                  {isRegistered ? (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="flex-1 py-2.5 bg-[#EAF7F0] text-[#16845B] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegisterClick(h)}
                      className="flex-1 py-2.5 bg-[#0866E8] hover:bg-[#0755C5] text-white font-bold rounded-xl text-xs transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isFree ? 'Register Free' : `Register`}</span>
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal */}
      {checkoutHackathon && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E4E9F0] shadow-xl p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                  Hackathon Entry
                </span>
                <h3 className="text-base font-bold text-[#14233B] mt-1">
                  {checkoutHackathon.title}
                </h3>
              </div>
              <button
                onClick={() => setCheckoutHackathon(null)}
                className="text-[#667085] hover:text-[#14233B] text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {checkoutHackathon.bannerUrl && (
              <div className="rounded-xl overflow-hidden aspect-video bg-slate-100 border border-[#E4E9F0]">
                <img
                  src={checkoutHackathon.bannerUrl}
                  alt={checkoutHackathon.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80';
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  Team Name (or Individual Project Name)
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Neural Builders"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  Team Member Names & Emails (Optional)
                </label>
                <textarea
                  value={teamMembers}
                  onChange={(e) => setTeamMembers(e.target.value)}
                  placeholder="e.g. John (john@test.com), Priya (priya@test.com)"
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {Number(checkoutHackathon.registrationFee) > 0 && (
                <div className="pt-2 border-t border-[#EDF0F4] space-y-2">
                  <label className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                    Have a Coupon Code?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HACK50, CAMPUS100"
                      className="flex-1 px-3 py-1.5 text-xs font-mono uppercase rounded-lg border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isCheckingCoupon || !couponCode.trim()}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#14233B] hover:bg-[#2563EB] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isCheckingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-semibold">{couponError}</p>
                  )}

                  {couponResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Original Fee</span>
                        <span className="line-through">₹{couponResult.originalPrice}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount ({couponResult.couponCode})</span>
                        <span>-₹{couponResult.discountAmount}</span>
                      </div>
                      <div className="flex justify-between text-[#14233B] font-extrabold pt-1 border-t border-emerald-200">
                        <span>Payable Amount</span>
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
                onClick={() => setCheckoutHackathon(null)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E4E9F0] text-xs font-bold text-[#667085] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRegistration}
                disabled={isRegistering}
                className="w-1/2 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRegistering
                  ? 'Confirming...'
                  : Number(checkoutHackathon.registrationFee) > 0
                  ? `Pay ₹${couponResult ? couponResult.finalAmount : checkoutHackathon.registrationFee}`
                  : 'Confirm Registration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
