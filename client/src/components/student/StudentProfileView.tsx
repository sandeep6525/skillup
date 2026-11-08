import { useToast } from '../../context/ToastContext';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { User, Mail, Phone, BookOpen, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export const StudentProfileView: React.FC = () => {
  const toast = useToast();
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSaved(false);

    try {
      const res = await api.patch('/auth/profile', {
        name,
        title,
        bio,
        phone,
      });
      login(localStorage.getItem('skillup_token') || '', res.data.data);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      toast.apiError(err, 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
          <User className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Account Governance & Credentials</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] mt-1">
          Update your student identification, public developer bio, and contact preferences.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E9F0] shadow-xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#F1F5F9]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#173B73] to-[#2563EB] text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#14233B]">{user?.name}</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] inline-block mt-0.5 border border-[#2563EB]/20">
              Student Account
            </span>
          </div>
        </div>

        {isSaved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile credentials updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] text-xs focus:bg-white focus:outline-hidden focus:border-[#2563EB] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1">Headline / Role Focus</label>
              <input
                type="text"
                placeholder="e.g. Aspiring Full-Stack Software Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] text-xs focus:bg-white focus:outline-hidden focus:border-[#2563EB] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] text-xs focus:bg-white focus:outline-hidden focus:border-[#2563EB] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14233B] mb-1">Bio / Goals</label>
            <textarea
              rows={4}
              placeholder="Tell mentors and peer cohort engineers about your technical background and goals..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] text-xs focus:bg-white focus:outline-hidden focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default StudentProfileView;
