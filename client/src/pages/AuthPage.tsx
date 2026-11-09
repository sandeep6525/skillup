import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GraduationCap, Mail, Lock, User, ArrowRight, ShieldCheck, RefreshCw, ArrowLeft, Phone } from 'lucide-react';

export const AuthPage: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login } = useAuth();
  const toast = useToast();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification Step
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Form Submit (Login or Step 1 Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMsg('Full Name is required.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('Email Address is required.');
        return;
      }
      if (!phone.trim()) {
        setErrorMsg('Phone Number is required.');
        return;
      }
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const phoneRegex = /^(\+?\d{1,4}[-\s]?)?[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!password) {
        setErrorMsg('Password is required.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify your confirmation password.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const cleanPhone = phone.trim().replace(/\s+/g, '');
        const res = await api.post('/auth/register', {
          name: name.trim(),
          email: email.trim(),
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          password,
          role: 'STUDENT',
        });
        setSuccessMsg(res.data.message || 'Verification code sent to your email.');
        setStep('otp');
        setResendCooldown(60);
      } else {
        const res = await api.post('/auth/login', {
          email,
          password,
        });
        const loggedUser = res.data.data.user;
        login(res.data.data.accessToken, loggedUser);
        toast.success('Welcome Back', 'You have logged in successfully.');

        // Role-Based Explicit Redirection:
        // Student -> /dashboard, Mentor -> /mentor-dashboard, Admin -> /admin
        if (redirect && redirect !== '/dashboard') {
          navigate(redirect);
        } else if (loggedUser.role === 'ADMIN') {
          navigate('/admin');
        } else if (loggedUser.role === 'INSTRUCTOR') {
          navigate('/mentor-dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Digit Input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle Backspace navigation in OTP
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp: fullOtp,
      });
      const verifiedUser = res.data.data.user;
      login(res.data.data.accessToken, verifiedUser);

      if (redirect && redirect !== '/dashboard') {
        navigate(redirect);
      } else if (verifiedUser.role === 'ADMIN') {
        navigate('/admin');
      } else if (verifiedUser.role === 'INSTRUCTOR') {
        navigate('/mentor-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg('');
    setIsResending(true);

    try {
      const res = await api.post('/auth/resend-otp', { email });
      setSuccessMsg(res.data.message || 'Fresh verification code sent!');
      setResendCooldown(60);
      setOtpValues(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8f9fc]">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
        
        {/* Step: OTP Verification Screen */}
        {step === 'otp' ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF5EA] text-indigo-600 flex items-center justify-center mx-auto border border-slate-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-indigo-950">Verify Your Email</h2>
              <p className="text-xs text-slate-500">
                We've sent a 6-digit verification code to <br />
                <span className="font-semibold text-slate-800">{email}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleVerifyOTP} className="space-y-6">
              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between gap-2">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-12 h-13 text-center text-xl font-bold text-indigo-950 bg-[#EAF5EA]/50 border border-[#55B957]/30 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 text-sm font-bold text-white bg-[#55B957] hover:bg-[#46a548] rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Verify & Activate Account</span>
                )}
              </button>
            </form>

            {/* Resend & Change Email Actions */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMsg('');
                }}
                className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isResending}
                className={`font-semibold flex items-center gap-1 ${
                  resendCooldown > 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-indigo-600 hover:underline'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Step: Regular Register or Login Form */
          <>
            <div className="text-center space-y-2">
              <img src="/logo.png" alt="SkillUp Logo" className="h-14 w-auto mx-auto object-contain" />
              <h2 className="text-2xl font-extrabold text-indigo-950">
                {mode === 'login' ? 'Sign in to SkillUp' : 'Create your SkillUp account'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? 'Welcome back! Accelerate your engineering journey today.'
                  : 'Join global developers learning and building with top mentors.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Alex Rivera"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="developer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      name="phoneNumber"
                      placeholder="9876543210"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/\D/g, '');
                        setPhone(numeric);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-[#55B957] hover:bg-[#46a548] rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Continue to Verification'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'register' && (
              <p className="text-[11px] text-center text-slate-500 pt-1">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
              </p>
            )}

            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-indigo-600 hover:underline">
                    Sign up free
                  </Link>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-indigo-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};


