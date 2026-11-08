import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { KeyRound, Mail, Lock, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8f9fc]">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5EA] text-[#55B957] flex items-center justify-center mx-auto border border-slate-200">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-indigo-950">Forgot Password</h2>
          <p className="text-xs text-slate-500">
            Enter your account email and we'll send you a single-use recovery link.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-semibold text-sm">Recovery Link Sent!</p>
              <p className="text-[11px] text-emerald-700">
                If an account with <strong>{email}</strong> exists, you will receive a secure reset link valid for 30 minutes.
              </p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55B957] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Account Email</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r bg-[#55B957] hover:bg-[#46a548]  rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-[#55B957]">
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        email,
        password,
      });
      setSuccessMsg(res.data.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Invalid or expired reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8f9fc]">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5EA] text-[#55B957] flex items-center justify-center mx-auto border border-slate-200">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-indigo-950">Set New Password</h2>
          <p className="text-xs text-slate-500">
            Create a secure password for your SkillUp account.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center">
            {successMsg} Redirecting to login...
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r bg-[#55B957] hover:bg-[#46a548]  rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

