import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  GraduationCap,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { getMediaUrl } from '../utils/mediaUrl';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isHomePage = location.pathname === '/';

  // Unread notifications for logged-in user
  const { data: notifications = [] } = useQuery({
    queryKey: ['navbar-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data?.data || [];
    },
    enabled: Boolean(user),
    refetchInterval: 1000 * 60, // Refresh every 60s
  });

  const unreadCount = (notifications as any[]).filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-[14px] font-semibold transition-colors hover:text-[#55B957] py-1 px-3 whitespace-nowrap ${
      isActive
        ? 'text-[#55B957] font-bold after:content-[""] after:absolute after:bottom-[-6px] after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-[2.5px] after:bg-[#55B957] after:rounded-full after:shadow-[0_0_8px_rgba(85,185,87,0.4)]'
        : 'text-[#111111] hover:text-[#55B957]'
    }`;

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
      isActive
        ? 'text-[#55B957] bg-[#EAF5EA] border border-[#55B957]/30 font-bold'
        : 'text-[#111111] hover:text-[#55B957] hover:bg-slate-50'
    }`;

  const isAdminActive = location.pathname.startsWith('/admin');
  const isMentorDashboardActive = location.pathname.startsWith('/mentor-dashboard');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.06)] h-[72px]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full h-full">
        <div className="flex justify-between h-full items-center gap-4 lg:gap-6">
          
          {/* Left: SkillUp Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src="/logo.png"
              alt="SkillUp Logo"
              className="h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] font-bold text-[#000000] tracking-tight leading-none">
                Skill<span className="text-[#55B957]">Up</span>
              </span>
              <div className="hidden sm:block w-[1px] h-4 bg-slate-200" />
            </div>
          </Link>

          {/* Center Navigation */}
          <nav className="hidden lg:flex items-center space-x-2 xl:space-x-3">
            {/* 1. Home */}
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>

            {/* 2. Courses */}
            <NavLink to="/courses" className={navLinkClass}>
              Courses
            </NavLink>

            {/* 3. Internship */}
            <NavLink to="/internship" className={navLinkClass}>
              Internship
            </NavLink>

            {/* 4. Hackathons */}
            <NavLink to="/hackathons" className={navLinkClass}>
              Hackathons
            </NavLink>

            {/* 5. Materials */}
            <NavLink to="/materials" className={navLinkClass}>
              Materials
            </NavLink>

            {/* 6. Live Classes */}
            <NavLink to="/live-classes" className={navLinkClass}>
              Live Classes
            </NavLink>

            {/* 7. Achievements */}
            <NavLink to="/achievements" className={navLinkClass}>
              Achievements
            </NavLink>
          </nav>

          {/* Right Action: Search, Auth Buttons & Profile */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {/* Search Icon Trigger */}
            <Link
              to="/courses"
              title="Search courses & materials"
              className="p-2 text-[#111111] hover:text-[#55B957] hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Notification Bell for logged-in user */}
            {user && (
              <Link
                to="/notifications"
                title="Notifications"
                className="relative p-2 text-[#111111] hover:text-[#55B957] hover:bg-slate-100 rounded-full transition-all"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Authentication Buttons / Profile Avatar */}
            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-[#E2E8F0]">
                <Link
                  to={
                    user.role === 'STUDENT'
                      ? '/dashboard/profile'
                      : user.role === 'INSTRUCTOR'
                      ? '/mentor-dashboard'
                      : '/admin'
                  }
                  title={`Signed in as ${user.name} (${user.role})`}
                  className="flex items-center gap-2.5 group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#55B957] text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden group-hover:ring-2 group-hover:ring-[#55B957]/50 transition-all">
                    {user.avatarUrl ? (
                      <img src={getMediaUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="hidden xl:block text-left">
                    <span className="text-xs font-semibold text-[#111111] block leading-tight truncate max-w-[110px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[#55B957] font-medium block capitalize">
                      {user.role.toLowerCase()}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span className="hidden 2xl:inline text-rose-600">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-semibold text-[#64748B] hover:text-[#55B957] transition-colors"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#55B957] hover:bg-[#46a548] active:scale-95 rounded-full shadow-[0_4px_16px_rgba(85,185,87,0.35)] transition-all"
                >
                  <span>Sign Up</span>
                  <span className="text-xs font-bold leading-none">→</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Hamburger Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-1.5 shadow-xl max-h-[85vh] overflow-y-auto">
          {/* 1. Home */}
          <NavLink to="/" end onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Home
          </NavLink>

          {/* 2. Courses */}
          <NavLink to="/courses" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Courses
          </NavLink>

          {/* 3. Internship */}
          <NavLink to="/internship" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Internship
          </NavLink>

          {/* 4. Hackathons */}
          <NavLink to="/hackathons" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Hackathons
          </NavLink>

          {/* 5. Materials */}
          <NavLink to="/materials" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Materials
          </NavLink>

          {/* 6. Live Classes */}
          <NavLink to="/live-classes" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Live Classes
          </NavLink>

          {/* 7. Achievements */}
          <NavLink to="/achievements" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Achievements
          </NavLink>

          {user ? (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <Link
                to={user.role === 'STUDENT' ? '/dashboard' : user.role === 'INSTRUCTOR' ? '/mentor-dashboard' : '/admin'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EAF5EA] border border-[#55B957]/30 text-[#55B957] text-xs font-semibold"
              >
                <span>Open {user.role === 'STUDENT' ? 'Student Dashboard' : user.role === 'INSTRUCTOR' ? 'Mentor Portal' : 'Admin Hub'}</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout ({user.name})</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-200 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center text-xs font-semibold text-white bg-[#55B957] hover:bg-[#46a548] rounded-xl shadow-xs"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
