import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/client';
import { User, Mail, Phone, Briefcase, Check, ShieldCheck, KeyRound, Camera } from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { getMediaUrl } from '../../utils/mediaUrl';

interface ProfileEditTabProps {
  portalType: 'ADMIN' | 'MENTOR';
}

export const ProfileEditTab: React.FC<ProfileEditTabProps> = ({ portalType }) => {
  const { user, login } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Validation Error', 'Full Name is required.');
      return;
    }

    setLoading(true);
    setIsSaved(false);

    try {
      const res = await api.patch('/auth/profile', {
        name: name.trim(),
        title: title.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl || null,
      });

      const token = localStorage.getItem('skillup_token') || '';
      login(token, res.data.data);
      setIsSaved(true);
      toast.success('Profile Updated', 'Your profile details and avatar have been saved successfully.');
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: any) {
      toast.apiError(err, 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Validation Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Validation Error', 'New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordSaved(false);

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password Changed', 'Your account password has been updated securely.');
      setTimeout(() => setPasswordSaved(false), 3500);
    } catch (err: any) {
      toast.apiError(err, 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Info Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E4E9F0] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={getMediaUrl(avatarUrl)}
              alt={user?.name || 'User Avatar'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#2563EB]/20 shadow-xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#173B73] to-[#2563EB] text-white font-extrabold text-2xl flex items-center justify-center shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14233B]">{user?.name}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                <ShieldCheck className="w-3 h-3" />
                {portalType === 'ADMIN' ? 'Administrator' : 'Verified Mentor'}
              </span>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">{user?.email}</p>
            <p className="text-[11px] text-[#4779C7] font-medium mt-0.5">
              {user?.title || (portalType === 'ADMIN' ? 'Platform Administrator' : 'Technical Mentor & Instructor')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Profile Edit Form */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-5">
        <div className="border-b border-[#EDF0F4] pb-4">
          <h3 className="text-sm font-bold text-[#14233B]">Profile Information & Credentials</h3>
          <p className="text-xs text-[#667085] mt-0.5">
            Update your public display name, professional headline, avatar picture, contact details, and institutional bio.
          </p>
        </div>

        {isSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Profile credentials and avatar updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          {/* Profile Avatar Upload */}
          <div className="p-4 rounded-xl border border-[#E4E9F0] bg-[#F8F9FC]">
            <ImageUpload
              label="Profile Avatar Picture"
              value={avatarUrl}
              onChange={(url) => setAvatarUrl(url)}
              helperText="Upload JPG, PNG, WEBP (Square 1:1, Max 5MB). Displays in platform navigation and instructor profiles."
              aspectRatio="1/1"
              maxSizeMB={5}
              fallbackText="No avatar uploaded yet"
              folder="avatars"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#4779C7]" />
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#4779C7]" />
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-[#4779C7]" />
                Professional Title / Headline
              </label>
              <input
                type="text"
                placeholder={portalType === 'ADMIN' ? 'Head of Academic Operations' : 'Lead Full-Stack Instructor & Mentor'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#4779C7]" />
                Contact Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14233B] mb-1.5">
              Biography & Professional Summary
            </label>
            <textarea
              rows={4}
              placeholder={
                portalType === 'ADMIN'
                  ? 'Administrative oversight, institutional accreditation, and educational program goals...'
                  : 'Industry experience, core specializations, teaching philosophy, and student mentoring accomplishments...'
              }
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Change Section */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-5">
        <div className="border-b border-[#EDF0F4] pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#14233B]">Security & Password</h3>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Update your account password to keep administrative and teaching credentials secure.
          </p>
        </div>

        {passwordSaved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14233B] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:bg-white focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-[#14233B]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? 'Updating Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditTab;
