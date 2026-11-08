import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Award,
  Trophy,
  Briefcase,
  FolderDown,
  CreditCard,
  User,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Compass,
  Video,
  MessageSquareQuote,
} from 'lucide-react';
import { getMediaUrl } from '../../utils/mediaUrl';

export const StudentPortalLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Unread notifications for logged-in student
  const { data: notifications = [] } = useQuery({
    queryKey: ['student-portal-notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    enabled: Boolean(user),
    refetchInterval: 1000 * 60,
  });

  const unreadCount = (notifications as any[]).filter((n) => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * 12 Portal Navigation items as specified in requirements:
   * 1. Dashboard
   * 2. My Learning
   * 3. Live Classes
   * 4. Assignments
   * 5. Certificates
   * 6. My Courses
   * 7. My Hackathons
   * 8. My Internships
   * 9. My Materials
   * 10. Orders & Payments
   * 11. Profile
   * 12. Logout (rendered persistently at bottom)
   */
  const sidebarItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', end: true },
    { label: 'My Learning', icon: BookOpen, path: '/dashboard/learning' },
    { label: 'Live Classes', icon: Video, path: '/dashboard/live-classes' },
    { label: 'Assignments', icon: FileText, path: '/dashboard/assignments' },
    { label: 'Certificates', icon: Award, path: '/dashboard/certificates' },
    { label: 'My Courses', icon: Compass, path: '/dashboard/courses' },
    { label: 'My Hackathons', icon: Trophy, path: '/dashboard/hackathons' },
    { label: 'My Internships', icon: Briefcase, path: '/dashboard/internships' },
    { label: 'My Materials', icon: FolderDown, path: '/dashboard/materials' },
    { label: 'My Feedback', icon: MessageSquareQuote, path: '/dashboard/feedback' },
    { label: 'Orders & Payments', icon: CreditCard, path: '/dashboard/orders' },
    { label: 'Profile', icon: User, path: '/dashboard/profile' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Route to learning or courses search
    navigate(`/dashboard/courses?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="h-screen w-screen flex bg-[#F6F8FB] text-[#172033] overflow-hidden font-sans">
      {/* ========================================================
          A. LEFT SIDEBAR (Desktop: Persistent; Mobile: Drawer)
      ======================================================== */}
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E4E9F0] flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-sm md:shadow-none h-full overflow-hidden`}
      >
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Top Logo & Portal Branding */}
          <div className="p-5 pb-4 border-b border-[#EDF0F4] flex items-center justify-between shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img src="/logo.png" alt="SkillUp Logo" className="h-8 w-auto object-contain group-hover:scale-105 transition-transform" />
              <div>
                <span className="text-lg font-black text-[#14233B] tracking-tight block leading-none">
                  Skill<span className="text-[#8B00FF]">Up</span>
                </span>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block mt-1">
                  Student Portal
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links (1 to 11) */}
          <nav className="p-3 space-y-1 overflow-y-auto flex-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-bold border-l-3 border-[#2563EB] shadow-2xs'
                        : 'text-[#667085] hover:bg-[#F6F8FB] hover:text-[#172033]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#2563EB]' : 'text-[#4779C7]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* 12. Bottom Logout Button (Persistent at Bottom) */}
        <div className="p-3 border-t border-[#EDF0F4] shrink-0 bg-white space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-[#C03945] hover:bg-[#FFF0F0] rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#C03945]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          B. MAIN DASHBOARD CONTENT AREA & PERSISTENT HEADER
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#E4E9F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Open portal menu"
            >
              <Menu className="w-5 h-5 text-[#14233B]" />
            </button>

            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-80 md:w-96">
              <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, classes, materials..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
              />
            </form>
          </div>

          {/* Right Header: Notifications & Student Avatar/Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/notifications"
              className="p-2 text-slate-500 hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded-xl transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#667085]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2563EB] ring-2 ring-white" />
              )}
            </Link>

            <Link
              to="/dashboard/profile"
              className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-[#E2E8F0] hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#173B73] to-[#2563EB] text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100 shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img
                    src={getMediaUrl(user.avatarUrl)}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0) || 'S'
                )}
              </div>
              <div className="hidden sm:block text-left max-w-[140px] md:max-w-[180px]">
                <span className="text-xs font-semibold text-[#14233B] block leading-tight truncate">
                  {user?.name}
                </span>
                <span className="text-[10px] text-[#667085] block truncate">
                  {user?.email}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* ========================================================
            C. DYNAMIC MAIN CONTENT VIEW (<Outlet />)
        ======================================================== */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-[#F6F8FB]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default StudentPortalLayout;
