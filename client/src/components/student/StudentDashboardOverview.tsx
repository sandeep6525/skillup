import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  FileText,
  Award,
  CreditCard,
  ChevronRight,
  Eye,
  Briefcase,
  Trophy,
  FolderDown,
  Download,
  Bell,
  Clock,
  Sparkles,
  Video,
  Radio,
  ExternalLink,
} from 'lucide-react';

export const StudentDashboardOverview: React.FC = () => {
  const { user } = useAuth();

  // Guard
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'INSTRUCTOR') return <Navigate to="/mentor-dashboard" replace />;

  // Queries
  const { data: myCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['my-courses-overview'],
    queryFn: async () => {
      const res = await api.get('/learning/my-courses');
      return res.data.data;
    },
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['my-certificates-overview'],
    queryFn: async () => {
      const res = await api.get('/certificates/my');
      return res.data.data;
    },
  });


  const { data: mentorBookings = [] } = useQuery({
    queryKey: ['my-mentor-bookings-overview'],
    queryFn: async () => {
      const res = await api.get('/mentors/my-bookings');
      return res.data.data;
    },
  });

  const { data: myMaterials = [] } = useQuery({
    queryKey: ['my-materials-overview'],
    queryFn: async () => {
      const res = await api.get('/materials/my/purchases');
      return res.data.data;
    },
  });

  const { data: myInternships = [] } = useQuery({
    queryKey: ['my-internships-overview'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
  });

  const { data: myHackathons = [] } = useQuery({
    queryKey: ['my-hackathons-overview'],
    queryFn: async () => {
      const res = await api.get('/hackathons/my/registrations');
      return res.data.data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-assignments-overview'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.data;
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['student-announcements-overview'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['my-payments-history-overview'],
    queryFn: async () => {
      const res = await api.get('/payments/history');
      return res.data.data;
    },
  });

  const { data: liveClasses = [] } = useQuery({
    queryKey: ['my-live-classes-overview'],
    queryFn: async () => {
      const res = await api.get('/live-classes');
      return res.data.data;
    },
  });

  const { data: dbSummary } = useQuery({
    queryKey: ['student-dashboard-summary-overview'],
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
  const totalActiveInternships =
    dbSummary?.activeInternships ??
    myInternships.filter((a: any) => a.status === 'ACCEPTED' || a.status === 'COMPLETED').length;
  const totalMaterials = dbSummary?.purchasedMaterials ?? myMaterials.length;
  const totalHackathons = dbSummary?.registeredHackathons ?? myHackathons.length;
  const pendingAssignments =
    dbSummary?.pendingAssignments ??
    assignmentList.filter((a) => !a.submissions || a.submissions.length === 0).length;
  const totalCertificates = dbSummary?.certificatesEarned ?? certs.length;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#14233B] flex items-center gap-2">
          Welcome Back, {user?.name || 'Student'}! 👋
        </h1>
        <p className="text-xs text-[#667085] mt-1">
          Here is your verified learning progress and upcoming schedule.
        </p>
      </div>

      {/* 6 Stats Summary Cards with real database counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Enrolled Courses */}
        <Link
          to="/dashboard/learning"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#173B73] flex items-center justify-center shrink-0 mb-3 border border-blue-100">
            <BookOpen className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Courses</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {totalEnrolled}
            </span>
            <span className="text-[10px] text-[#2563EB] font-semibold mt-0.5 block">
              Curriculums
            </span>
          </div>
        </Link>

        {/* 2. Active Internships */}
        <Link
          to="/dashboard/internships"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mb-3 border border-purple-100">
            <Briefcase className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Internships</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {totalActiveInternships}
            </span>
            <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
              Active Cohorts
            </span>
          </div>
        </Link>

        {/* 3. Purchased Materials */}
        <Link
          to="/dashboard/materials"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mb-3 border border-amber-100">
            <FolderDown className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Materials</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {totalMaterials}
            </span>
            <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
              Resources
            </span>
          </div>
        </Link>

        {/* 4. Registered Hackathons */}
        <Link
          to="/dashboard/hackathons"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mb-3 border border-emerald-100">
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Hackathons</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {totalHackathons}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
              Sprints
            </span>
          </div>
        </Link>

        {/* 5. Practical Assignments */}
        <Link
          to="/dashboard/assignments"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mb-3 border border-rose-100">
            <FileText className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Assignments</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {pendingAssignments}
            </span>
            <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
              Pending
            </span>
          </div>
        </Link>

        {/* 6. Earned Certificates */}
        <Link
          to="/dashboard/certificates"
          className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between hover:shadow-md transition"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mb-3 border border-blue-100">
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <span className="text-[11px] text-[#667085] font-medium block">Certificates</span>
            <span className="text-xl sm:text-2xl font-black text-[#14233B] block leading-tight">
              {totalCertificates}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
              Badges
            </span>
          </div>
        </Link>
      </div>

      {/* ========================================================
          CONTINUE LEARNING & ENROLLED COURSES SECTION
      ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#14233B]">My Enrolled Courses</h2>
            <p className="text-xs text-[#667085]">
              Personal real-time progress, assigned mentors, lesson milestones, and payment balance
            </p>
          </div>
          <Link
            to="/dashboard/courses"
            className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
          >
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
              to="/dashboard/courses"
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
              const completedLessons =
                totalLessons > 0 ? Math.round((progressPct / 100) * totalLessons) : 0;
              const enrollmentDate = enr.enrolledAt
                ? new Date(enr.enrolledAt).toLocaleDateString()
                : 'Active';
              const payment = enr.payment;
              const isPaidInFull =
                !payment || !payment.isPartial || Number(payment.remainingBalance || 0) <= 0;
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
                        src={
                          course?.thumbnailUrl ||
                          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'
                        }
                        alt={course?.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-sm font-bold text-[#14233B] leading-tight truncate"
                          title={course?.title}
                        >
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
                        <span>
                          Completed: {completedLessons} / {totalLessons} lessons
                        </span>
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
          UPCOMING LIVE CLASSES SECTION (COURSE & BATCH SCOPED)
      ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#14233B] flex items-center gap-2">
              <Video className="w-5 h-5 text-[#2563EB]" />
              <span>Upcoming Live Classes</span>
            </h2>
            <p className="text-xs text-[#667085]">
              Real-time interactive masterclasses with your assigned mentors and cohort peers
            </p>
          </div>
          <Link
            to="/dashboard/live-classes"
            className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
          >
            <span>View All Classes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {liveClasses.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-[#667085] space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700">No live classes currently scheduled for your courses.</p>
            <p>When mentors schedule upcoming interactive sessions for your enrolled courses, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveClasses.slice(0, 3).map((item: any) => {
              const startDate = new Date(item.startTime);
              const dateStr = startDate.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = startDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isCancelled = item.status === 'CANCELLED';

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between gap-3 hover:shadow-md transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded truncate max-w-[180px]">
                        {item.course?.title || 'Interactive Course'}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-700'
                            : item.status === 'LIVE'
                            ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                            : item.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#14233B] line-clamp-1">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-[#667085] line-clamp-2">{item.description}</p>
                    )}

                    <div className="space-y-1 pt-1 text-[11px] text-[#64748B]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>{dateStr} at {timeStr} ({item.duration || 60}m) [IST]</span>
                      </div>
                      {item.instructor && (
                        <div>
                          Mentor: <span className="font-semibold text-slate-800">{item.instructor.name}</span>
                        </div>
                      )}
                      {item.meetingProvider && (
                        <div>
                          Platform: <span className="font-semibold text-slate-800">{item.meetingProvider.replace('_', ' ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isCancelled ? (
                      <span className="text-xs text-rose-500 font-medium">Session Cancelled</span>
                    ) : item.canJoin && item.meetingUrl ? (
                      <a
                        href={item.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Join Session</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="text-[#94A3B8] text-[11px] font-medium">Link unlocks 5m prior</span>
                        <Link
                          to="/dashboard/live-classes"
                          className="font-bold text-[#2563EB] hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    )}
                  </div>
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
            <h2 className="text-lg font-bold text-[#14233B]">
              Pending Assignments & Due Dates
            </h2>
            <p className="text-xs text-[#667085]">
              Hands-on engineering challenges and capstones for your enrolled courses
            </p>
          </div>
          <Link
            to="/dashboard/assignments"
            className="text-xs font-bold text-[#2563EB] hover:underline"
          >
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
              <p className="text-xs text-[#667085]">
                Verified transaction history and remaining installments
              </p>
            </div>
            <Link to="/dashboard/orders" className="text-xs font-bold text-[#2563EB] hover:underline">
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
                const title =
                  pay.course?.title ||
                  pay.internship?.title ||
                  pay.material?.title ||
                  pay.hackathon?.title ||
                  'Platform Fee';
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
                      <Link
                        to="/dashboard/orders"
                        className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5"
                      >
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
            <Link
              to="/dashboard/internships"
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>View Internships</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {myInternships.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-[#667085] text-center space-y-2">
              <p className="font-medium text-[#14233B]">You haven't applied for any internships yet.</p>
              <Link
                to="/dashboard/internships"
                className="inline-block px-4 py-2 text-xs font-bold text-white bg-[#173B73] rounded-xl hover:bg-[#14233B] transition"
              >
                Explore Internships
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myInternships.slice(0, 3).map((app: any) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex items-center justify-between gap-4"
                >
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
                          ? 'Closed'
                          : 'Under Review'}
                      </span>
                      <span className="text-[10px] text-[#98A2B3]">
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#14233B] truncate">
                      {app.internship?.title}
                    </h4>
                    <span className="text-[11px] text-[#2563EB] font-medium block">
                      {app.internship?.organization} &bull; {app.internship?.duration}
                    </span>
                  </div>

                  <Link
                    to="/dashboard/internships"
                    className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </Link>
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
            <Link
              to="/dashboard/materials"
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
            >
              <span>View Materials</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {myMaterials.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-[#667085] text-center space-y-2">
              <p className="font-medium text-[#14233B]">You haven't purchased any materials yet.</p>
              <Link
                to="/dashboard/materials"
                className="inline-block px-4 py-2 text-xs font-bold text-white bg-[#2563EB] rounded-xl hover:bg-[#173B73] transition"
              >
                Browse Materials
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myMaterials.slice(0, 3).map((p: any) => {
                const fileSizeKb = p.material?.fileSize
                  ? `${Math.round(p.material.fileSize / 1024)} KB`
                  : null;
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Direct & Course
                          </span>
                        ) : p.accessSource === 'COURSE_INCLUDED' || p.isCourseIncluded ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Course Included
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Direct Purchase
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-[#14233B] truncate">
                        {p.material?.title}
                      </h4>
                      {courseTitle && (
                        <div className="text-[10px] text-[#2563EB] font-medium truncate mt-0.5">
                          Course: {courseTitle}
                        </div>
                      )}
                    </div>

                    <Link
                      to="/dashboard/materials"
                      className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Access</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StudentDashboardOverview;
