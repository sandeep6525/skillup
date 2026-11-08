import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { GraduationCap, Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const ActivateMentorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = searchParams.get('token') || '';

  const [mentorInfo, setMentorInfo] = useState<{ email: string; name: string; title?: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate activation token on page load
  useEffect(() => {
    if (!token) {
      setTokenError('Missing activation token. Please use the complete activation link provided in your invitation email.');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await api.get(`/auth/activate-mentor/validate?token=${encodeURIComponent(token)}`);
        setMentorInfo(res.data.data);
      } catch (err: any) {
        setTokenError(
          err.response?.data?.error?.message ||
            'This invitation link is invalid, has expired (48h limit), or has already been used.'
        );
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/activate-mentor', {
        token,
        password,
      });

      setIsSuccess(true);
      toast.success('Account Activated', 'Your mentor account has been activated successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to activate account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8f9fc]">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-blue-100">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#173B73] flex items-center justify-center text-white mx-auto shadow-md shadow-blue-200">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#14233B]">
            Mentor Account Activation
          </h2>
          <p className="text-xs text-[#667085]">
            Set your password and activate your teaching profile on SkillUp.
          </p>
        </div>

        {/* Validation Loading State */}
        {isValidating && (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#667085]">Verifying invitation token...</p>
          </div>
        )}

        {/* Invalid Token Alert */}
        {!isValidating && tokenError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <h4 className="text-xs font-bold text-rose-900">Activation Link Invalid</h4>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">{tokenError}</p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {!isValidating && !tokenError && isSuccess && (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-emerald-900">Account Activated Successfully!</h3>
            <p className="text-xs text-emerald-700">
              Welcome to the SkillUp teaching team, <strong>{mentorInfo?.name}</strong>. Redirecting you to the login page...
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl inline-block"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Active Activation Form */}
        {!isValidating && !tokenError && !isSuccess && mentorInfo && (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#667085]">Invited Mentor</span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] rounded-md border border-[#2563EB]/20 uppercase">
                  Authorized Mentor
                </span>
              </div>
              <p className="text-xs font-bold text-[#14233B]">{mentorInfo.name}</p>
              <p className="text-[11px] text-[#667085]">{mentorInfo.email}</p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-blue-200 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-blue-200 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Activate Account & Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
