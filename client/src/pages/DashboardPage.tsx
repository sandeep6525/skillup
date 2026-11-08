import { useToast } from '../context/ToastContext';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { OrdersPaymentsPage } from './OrdersPaymentsPage';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  Users,
  FileText,
  Award,
  CreditCard,
  User,
  Settings,
  LogOut,
  Search,
  Bell,
  PlayCircle,
  Clock,
  Calendar,
  ExternalLink,
  ChevronRight,
  Eye,
  Briefcase,
  Trophy,
  FolderDown,
  Download,
  CheckCircle2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const toast = useToast();
  const { user, logout } = useAuth();

  // Internal Guard: Non-students redirected to their specialized portals
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (user?.role === 'INSTRUCTOR') {
    return <Navigate to="/mentor-dashboard" replace />;
  }

  // Queries
  const { data: myCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const res = await api.get('/learning/my-courses');
      return res.data.data;
    },
  });

  const { data: certificates } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const res = await api.get('/certificates/my');
      return res.data.data;
    },
  });

  const { data: liveClasses } = useQuery({
    queryKey: ['live-classes'],
    queryFn: async () => {
      const res = await api.get('/live-classes');
      return res.data.data;
    },
  });

  const { data: mentorBookings } = useQuery({
    queryKey: ['my-mentor-bookings'],
    queryFn: async () => {
      const res = await api.get('/mentors/my-bookings');
      return res.data.data;
    },
  });

  const { data: myMaterials = [] } = useQuery({
    queryKey: ['my-materials'],
    queryFn: async () => {
      const res = await api.get('/materials/my/purchases');
      return res.data.data;
    },
  });

  const { data: myInternships = [] } = useQuery({
    queryKey: ['my-internships'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
  });

  const { data: myHackathons = [] } = useQuery({
    queryKey: ['my-hackathons'],
    queryFn: async () => {
      const res = await api.get('/hackathons/my/registrations');
      return res.data.data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.data;
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['my-payments-history'],
    queryFn: async () => {
      const res = await api.get('/payments/history');
      return res.data.data;
    },
  });

  const { data: dbSummary } = useQuery({
    queryKey: ['student-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/learning/dashboard-summary');
      return res.data.data;
    },
  });

  const enrollments: any[] = myCourses || [];
  const certs: any[] = certificates || [];
  const bookings: any[] = mentorBookings || [];
  const assignmentList: any[] = assignments || [];

  // Summary Metrics calculations using live database aggregate counts
  const totalEnrolled = dbSummary?.enrolledCourses ?? enrollments.length;
  const totalMaterials = dbSummary?.purchasedMaterials ?? myMaterials.length;
  const totalHackathons = dbSummary?.registeredHackathons ?? myHackathons.length;
  const pendingAssignments = dbSummary?.pendingAssignments ?? assignmentList.filter((a) => !a.submissions || a.submissions.length === 0).length;
  const totalCertificates = dbSummary?.certificatesEarned ?? certs.length;

  const location = useLocation();
  const isOrdersTab = location.pathname === '/dashboard/orders' || location.pathname === '/orders';

  const sidebarItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', active: location.pathname === '/dashboard' },
    { label: 'My Learning', icon: BookOpen, path: '/dashboard/learning', active: location.pathname === '/dashboard/learning' },
    { label: 'Assignments', icon: FileText, path: '/dashboard/assignments', active: location.pathname === '/dashboard/assignments' },
    { label: 'Certificates', icon: Award, path: '/dashboard/certificates', active: location.pathname === '/dashboard/certificates' },
    { label: 'My Hackathons', icon: Trophy, path: '/dashboard/hackathons', active: location.pathname === '/dashboard/hackathons' },
    { label: 'My Internships', icon: Briefcase, path: '/dashboard/internships', active: location.pathname === '/dashboard/internships' },
    { label: 'My Materials', icon: FolderDown, path: '/dashboard/materials', active: location.pathname === '/dashboard/materials' },
    { label: 'Orders & Payments', icon: CreditCard, path: '/dashboard/orders', active: isOrdersTab },
    { label: 'Profile', icon: User, path: '/dashboard/profile', active: location.pathname === '/dashboard/profile' },
  ];

  return (
    <div className="h-full bg-[#F6F8FB] flex overflow-hidden">
      {/* ========================================================
          LEFT PERSISTENT SIDEBAR
      ======================================================== */}
      <aside className="w-64 bg-white border-r border-[#E4E9F0] hidden md:flex flex-col justify-between shrink-0 h-full overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo Area */}
          <div className="p-6 pb-4 shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#173B73] flex items-center justify-center text-white shadow-xs">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#14233B]">
                SkillUp
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] rounded uppercase border border-[#2563EB]/20">
                Student
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-4 overflow-y-auto flex-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    item.active
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-l-2 border-[#2563EB]'
                      : 'text-[#667085] hover:bg-[#F6F8FB] hover:text-[#172033]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-[#4779C7]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-[#E4E9F0] shrink-0 bg-white">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-[#C03945] hover:bg-[#FFF0F0] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top bar with search and profile */}
        <header className="h-16 bg-white border-b border-[#E4E9F0] px-6 sm:px-8 flex items-center justify-between shrink-0 z-20">
          <div className="relative w-72 sm:w-96">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses, classes, mentors..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-[#f8f9fc] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="flex items-center gap-4">
            <Link to="/notifications" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-[#EAF5EA] rounded-xl transition-colors relative">
              <Bell className="w-4 h-4" />
            </Link>
            <Link to="/profile" className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#173B73] to-[#2563EB] text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100 overflow-hidden shrink-0">
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
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold text-[#14233B] block leading-tight">{user?.name}</span>
                <span className="text-[10px] text-[#667085] block">{user?.email}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-8">
          {isOrdersTab ? (
            <OrdersPaymentsPage />
          ) : (
            <>
              {/* Welcome Title */}
              <div>
                <h1 className="text-2xl font-extrabold text-[#14233B] flex items-center gap-2">
                  Welcome Back, {user?.name || 'Student'}! 👋
                </h1>
                <p className="text-xs text-[#667085] mt-1">Here is your verified learning progress and upcoming schedule.</p>
              </div>

              {/* 5 Stats Summary Cards (Without Live Classes) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* 1. Enrolled Courses */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#173B73] flex items-center justify-center shrink-0 mb-3 border border-blue-100">
                    <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] font-medium block">Enrolled Courses</span>
                    <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
                      {totalEnrolled}
                    </span>
                    <span className="text-[10px] text-[#2563EB] font-semibold mt-0.5 block">Total Curriculums</span>
                  </div>
                </div>

                {/* 2. Purchased Materials */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mb-3 border border-amber-100">
                    <FolderDown className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] font-medium block">Purchased Materials</span>
                    <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
                      {totalMaterials}
                    </span>
                    <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">Unlocked Resources</span>
                  </div>
                </div>

                {/* 3. Registered Hackathons */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mb-3 border border-emerald-100">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] font-medium block">Hackathons</span>
                    <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
                      {totalHackathons}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Registered Sprints</span>
                  </div>
                </div>

                {/* 4. Practical Assignments */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mb-3 border border-rose-100">
                    <FileText className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] font-medium block">Assignments</span>
                    <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
                      {pendingAssignments}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">Pending Review</span>
                  </div>
                </div>

                {/* 5. Earned Certificates */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mb-3 border border-blue-100">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] font-medium block">Certificates</span>
                    <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
                      {totalCertificates}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">Verified Badges</span>
                  </div>
                </div>
              </div>

          {/* ========================================================
              CONTINUE LEARNING & ENROLLED COURSES SECTION
          ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#14233B]">My Enrolled Courses</h2>
                <p className="text-xs text-[#667085]">Personal real-time progress, assigned mentors, lesson milestones, and payment balance</p>
              </div>
              <Link to="/courses" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                <span>Browse Courses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {coursesLoading ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#E4E9F0] text-xs text-[#667085]">
                Loading your enrolled courses...
              </div>
            ) : enrollments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#CBD5E1] space-y-3">
                <BookOpen className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#14233B]">You haven't enrolled in any courses yet.</h3>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Browse our course catalog to find the right curriculum and start your learning journey.
                </p>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enr: any) => {
                  const course = enr.course;
                  const progressPct = enr.progress || 0;
                  const totalLessons = enr.totalLessons || 0;
                  const completedLessons = totalLessons > 0 ? Math.round((progressPct / 100) * totalLessons) : 0;
                  const enrollmentDate = enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : 'Active';
                  const payment = enr.payment;
                  const isPaidInFull = !payment || !payment.isPartial || Number(payment.remainingBalance || 0) <= 0;
                  const remainingBalance = Number(payment?.remainingBalance || 0);

                  return (
                    <div
                      key={enr.id}
                      className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                    >
                      <div>
                        {/* Course Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={course?.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'}
                            alt={course?.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-[#14233B] leading-tight truncate" title={course?.title}>
                              {course?.title}
                            </h3>
                            <span className="text-[11px] text-[#667085] block mt-1">
                              Mentor: {course?.instructor?.name || 'SkillUp Faculty'}
                            </span>
                            <span className="text-[10px] text-[#64748B] block">
                              Enrolled: {enrollmentDate}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar & Completed Lessons */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] font-semibold text-[#667085]">
                            <span>Completed: {completedLessons} / {totalLessons} lessons</span>
                            <span className="text-[#2563EB] font-bold">{progressPct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Payment & Remaining Balance status */}
                        <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                          <span className="text-[#64748B] text-[11px]">Payment Status:</span>
                          {isPaidInFull ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              Paid in Full
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Bal: ₹{remainingBalance}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/classroom/${course?.slug || course?.id}`}
                        className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition-colors shadow-xs"
                      >
                        {progressPct === 100 ? 'Review Course' : 'Continue Learning'}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              PENDING ASSIGNMENTS & DUE DATES SECTION
          ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#14233B]">Pending Assignments & Due Dates</h2>
                <p className="text-xs text-[#667085]">Hands-on engineering challenges and capstones</p>
              </div>
              <Link to="/dashboard/assignments" className="text-xs font-bold text-[#2563EB] hover:underline">
                View All Assignments
              </Link>
            </div>

            {assignmentList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-[#667085] space-y-1">
                <p className="font-semibold text-slate-700">No course assignments currently assigned.</p>
                <p>When instructors release assignments for your enrolled courses, they will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignmentList.slice(0, 3).map((item: any) => {
                  const isSubmitted = item.submissions && item.submissions.length > 0;
                  const submission = isSubmitted ? item.submissions[0] : null;

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between gap-3 hover:shadow-md transition"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded truncate max-w-[200px]">
                            {item.course?.title || 'Course Module'}
                          </span>
                          <span className="text-[10px] text-[#64748B]">
                            {item.totalPoints} pts
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#14233B] truncate">{item.title}</h4>
                        <p className="text-xs text-[#667085] line-clamp-2">{item.description}</p>
                        <span className="text-[11px] text-[#64748B] block mt-1">
                          Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Self-paced'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {isSubmitted ? (
                          <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                            Submitted {submission?.grade ? `(${submission.grade} pts)` : ''}
                          </span>
                        ) : (
                          <Link
                            to="/dashboard/assignments"
                            className="px-3.5 py-1.5 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors"
                          >
                            Submit Solution
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              TWO COLUMN SECTION: Recent Announcements & Recent Payments
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Announcements */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#2563EB]" />
                    <span>Recent Announcements</span>
                  </h2>
                  <p className="text-xs text-[#667085]">Platform notices, mentor feedback, and updates</p>
                </div>
                <Link to="/notifications" className="text-xs font-bold text-[#2563EB] hover:underline">
                  View All
                </Link>
              </div>

              {(announcements as any[]).length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-[#667085]">
                  No new announcements or notifications.
                </div>
              ) : (
                <div className="space-y-3">
                  {(announcements as any[]).slice(0, 3).map((notif: any) => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#14233B]">{notif.title}</h4>
                          <span className="text-[10px] text-[#98A2B3]">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-1 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Payments & Remaining Course Balances */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#2563EB]" />
                    <span>Recent Payments & Course Balances</span>
                  </h2>
                  <p className="text-xs text-[#667085]">Verified transaction history and remaining installments</p>
                </div>
                <Link to="/orders" className="text-xs font-bold text-[#2563EB] hover:underline">
                  View Orders
                </Link>
              </div>

              {(paymentHistory as any[]).length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-[#667085]">
                  No payment records found.
                </div>
              ) : (
                <div className="space-y-3">
                  {(paymentHistory as any[]).slice(0, 3).map((pay: any) => {
                    const title = pay.course?.title || pay.internship?.title || pay.material?.title || pay.hackathon?.title || 'Platform Fee';
                    const itemType = pay.courseId
                      ? 'Course'
                      : pay.materialId
                      ? 'Material'
                      : pay.hackathonId
                      ? 'Hackathon'
                      : pay.internshipId
                      ? 'Internship'
                      : 'Mentorship';
                    const remaining = Number(pay.remainingBalance || 0);

                    return (
                      <div
                        key={pay.id}
                        className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase">
                              {itemType}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{pay.razorpayOrderId?.slice(-8) || pay.id.slice(-6)}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#14233B] truncate">{title}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                            <span className="font-semibold text-slate-900">Paid: ₹{pay.amount}</span>
                            <span>&bull;</span>
                            <span>{new Date(pay.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                          {remaining > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Due: ₹{remaining}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              Completed
                            </span>
                          )}
                          <Link to="/orders" className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5">
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              TWO COLUMN SECTION: Mentor 1-on-1 Sessions & Recent Certificates
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Mentor 1-on-1 Sessions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#14233B]">Mentor 1-on-1 Sessions</h2>
                  <p className="text-xs text-[#667085]">Personalized career roadmaps and code reviews</p>
                </div>
                <Link to="/mentors" className="text-xs font-bold text-[#2563EB] hover:underline">
                  Book Session
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-[#667085] flex items-center justify-between">
                  <span>No upcoming 1-on-1 mentor sessions booked.</span>
                  <Link
                    to="/mentors"
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] rounded-lg hover:bg-[#2563EB] hover:text-white transition"
                  >
                    Find Mentor
                  </Link>
                </div>
              ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 2).map((bk: any) => {
                      const slotDate = bk.slot?.startTime ? new Date(bk.slot.startTime) : new Date(bk.createdAt);
                      return (
                        <div
                          key={bk.id}
                          className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex flex-col items-center justify-center shrink-0 border border-amber-100">
                              <span className="text-base font-black leading-none">{slotDate.getDate()}</span>
                              <span className="text-[9px] font-bold uppercase">{slotDate.toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[#14233B] truncate">{bk.notes || '1-on-1 Mentorship Session'}</h4>
                              <span className="text-[10px] text-amber-700 font-medium block">
                                With {bk.mentor?.user?.name || 'Verified Mentor'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={bk.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span>Meeting</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Certificates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#14233B]">Recent Certificates</h2>
                  <Link to="/certificates" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {certs.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-[#667085] text-center">
                    No certificates earned yet. Complete 100% of any enrolled course to receive your verified credential.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certs.slice(0, 2).map((crt: any) => (
                      <div
                        key={crt.id}
                        className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#EAF7F0] text-[#16845B] flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-[#14233B] truncate">{crt.course?.title || 'SkillUp Verified Certificate'}</h4>
                            <span className="text-[10px] text-[#667085] block">
                              Issued {new Date(crt.issuedAt).toLocaleDateString()} &bull; #{crt.certificateNo}
                            </span>
                          </div>
                        </div>
                        <Link
                          to="/certificates"
                          className="px-3 py-1 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          {/* ========================================================
              MY INTERNSHIPS & MY PURCHASED MATERIALS ROW
          ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            {/* My Internships */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#2563EB]" />
                    <span>My Internships</span>
                  </h2>
                  <p className="text-xs text-[#667085]">Active placements and cohort applications</p>
                </div>
                <Link to="/internship" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                  <span>Explore Internships</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myInternships.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-[#667085] text-center space-y-2">
                  <p className="font-medium text-[#14233B]">You haven't applied for any internships yet.</p>
                  <Link
                    to="/internship"
                    className="inline-block px-4 py-2 text-xs font-bold text-white bg-[#173B73] rounded-xl hover:bg-[#14233B] transition"
                  >
                    Explore Internships
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myInternships.map((app: any) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-16 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-[#E4E9F0]">
                          <img
                            src={app.internship?.bannerUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80'}
                            alt={app.internship?.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              app.status === 'ACCEPTED' || app.status === 'COMPLETED'
                                ? 'bg-[#EAF7F0] text-[#16845B]'
                                : app.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : app.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {app.status === 'ACCEPTED'
                              ? 'Enrolled'
                              : app.status === 'COMPLETED'
                              ? 'Completed'
                              : app.status === 'REJECTED'
                              ? 'Application Closed'
                              : Number(app.internship?.price || 0) > 0 && Number(app.paidAmount || 0) === 0
                              ? 'Payment Pending'
                              : 'Application Under Review'}
                          </span>
                          <span className="text-[10px] text-[#98A2B3]">
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#14233B] truncate">
                          {app.internship?.title}
                        </h4>
                        <span className="text-[11px] text-[#2563EB] font-medium block">
                          {app.internship?.organization} &bull; {app.internship?.duration}
                        </span>
                      </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to="/internship"
                          className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-xs font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Link>
                        {app.status === 'ACCEPTED' ? (
                          <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                            Enrolled
                          </span>
                        ) : (
                          <Link
                            to="/internship"
                            className="px-2.5 py-1.5 rounded-lg bg-[#173B73] text-white text-xs font-bold hover:bg-[#14233B] transition"
                          >
                            Complete Fee
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Purchased Materials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
                    <FolderDown className="w-4 h-4 text-[#2563EB]" />
                    <span>My Purchased Materials</span>
                  </h2>
                  <p className="text-xs text-[#667085]">Purchased handbooks, code templates & PDFs</p>
                </div>
                <Link to="/materials" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                  <span>Browse Materials</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myMaterials.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-[#667085] text-center space-y-2">
                  <p className="font-medium text-[#14233B]">You haven't purchased any materials yet.</p>
                  <Link
                    to="/materials"
                    className="inline-block px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-xl hover:bg-[#173B73] transition"
                  >
                    Browse Materials
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myMaterials.map((p: any) => {
                    const fileSizeKb = p.material?.fileSize ? `${Math.round(p.material.fileSize / 1024)} KB` : null;
                    const courseTitle = p.associatedCourse?.title || p.material?.course?.title;

                    return (
                      <div
                        key={p.id || p.materialId}
                        className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase">
                              {p.material?.type || 'PDF'}
                            </span>
                            {fileSizeKb && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {fileSizeKb}
                              </span>
                            )}
                            {p.accessSource === 'DIRECT_AND_COURSE' ? (
                              <>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Direct Purchase
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EAF5EA] text-[#4ea849] border border-[#5DBA58]/30">
                                  Course Included
                                </span>
                              </>
                            ) : p.accessSource === 'COURSE_INCLUDED' || p.paymentStatus === 'INCLUDED_IN_COURSE' || p.isCourseIncluded ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EAF5EA] text-[#4ea849] border border-[#5DBA58]/30">
                                Course Included
                              </span>
                            ) : p.paidAmount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Direct Purchase
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Free Resource
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-[#14233B] truncate">
                            {p.material?.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#667085] mt-0.5">
                            <span>
                              {p.isDirectlyPurchased || p.paidAmount > 0
                                ? `Purchased ${new Date(p.createdAt).toLocaleDateString()} (₹${p.paidAmount})`
                                : `Enrolled Access`}
                            </span>
                            {courseTitle && (
                              <>
                                <span>&bull;</span>
                                <span className="text-[#2563EB] font-medium">Course: {courseTitle}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const res = await api.get(`/materials/${p.materialId}/download`, {
                                responseType: 'blob',
                              });
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${p.material?.title || 'Material'}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            } catch {
                              toast.error('Download Failed', 'Download failed. Please check permissions.');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title="Download Material"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              MY HACKATHONS SECTION
          ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E4E9F0] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#2563EB]" />
                  <span>My Hackathons</span>
                </h2>
                <p className="text-xs text-[#667085]">Registered innovation sprints and project submissions</p>
              </div>
              <Link to="/hackathons" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
                <span>Browse Hackathons</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {myHackathons.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F6F8FB] border border-[#EDF0F4] text-center space-y-2">
                <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-[#667085] font-medium">You haven't registered for any hackathons yet.</p>
                <Link
                  to="/hackathons"
                  className="inline-block px-4 py-2 text-xs font-bold text-white bg-[#173B73] rounded-xl hover:bg-[#14233B] transition shadow-xs"
                >
                  Browse Hackathons
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myHackathons.map((reg: any) => (
                  <div
                    key={reg.id}
                    className="rounded-xl border border-[#E4E9F0] bg-white shadow-2xs overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4]">
                      <img
                        src={reg.hackathon?.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80'}
                        alt={reg.hackathon?.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80';
                        }}
                      />
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase shadow-xs ${
                          reg.status === 'CONFIRMED'
                            ? 'bg-[#EAF7F0] text-[#16845B]'
                            : reg.status === 'REGISTERED'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {reg.status}
                      </span>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[#98A2B3]">
                            {new Date(reg.hackathon?.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#14233B] line-clamp-1">{reg.hackathon?.title}</h4>
                        <p className="text-[11px] text-[#2563EB] mt-0.5">{reg.hackathon?.theme}</p>
                      </div>

                      <div className="text-[11px] text-[#667085] space-y-1 pt-2 border-t border-[#EDF0F4]">
                        {reg.teamName && (
                          <div>
                            <span className="font-semibold text-[#14233B]">Team:</span> {reg.teamName}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-[#14233B]">Mode:</span> {reg.hackathon?.mode}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

