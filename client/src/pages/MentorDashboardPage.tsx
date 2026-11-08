import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Video,
  CheckSquare,
  FolderOpen,
  FileText,
  FileCheck2,
  TrendingUp,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Clock,
  Search,
  Filter,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Download,
  Upload,
  UserCheck,
  UserX,
  X,
  Send,
  Layers,
  Award,
  Edit2,
  Trash2,
  MessageSquareQuote,
  Briefcase,
} from 'lucide-react';
import { MentorFeedbackTab } from '../components/MentorFeedbackTab';
import { ProfileEditTab } from '../components/common/ProfileEditTab';
import { getMediaUrl } from '../utils/mediaUrl';

type MentorTab =
  | 'dashboard'
  | 'courses'
  | 'internships'
  | 'feedback'
  | 'batches'
  | 'students'
  | 'schedule'
  | 'live-classes'
  | 'attendance'
  | 'materials'
  | 'assignments'
  | 'assessments'
  | 'progress'
  | 'communication'
  | 'notifications'
  | 'reports'
  | 'settings';

export const MentorDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<MentorTab>('dashboard');

  // Modal & Selection States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAttendanceClassId, setSelectedAttendanceClassId] = useState<string | null>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [feedbackGrade, setFeedbackGrade] = useState<number>(90);
  const [feedbackRemarks, setFeedbackRemarks] = useState('');

  // Scheduling Form
  const [schedTitle, setSchedTitle] = useState('');
  const [schedCourseId, setSchedCourseId] = useState('');
  const [schedBatchId, setSchedBatchId] = useState('');
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedEndTime, setSchedEndTime] = useState('');
  const [schedDuration, setSchedDuration] = useState('60');
  const [schedDescription, setSchedDescription] = useState('');
  const [schedAgenda, setSchedAgenda] = useState('');
  const [schedMeetingUrl, setSchedMeetingUrl] = useState('');
  const [schedMeetingProvider, setSchedMeetingProvider] = useState('GOOGLE_MEET');
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [classStatusFilter, setClassStatusFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Material Form
  const [matTargetType, setMatTargetType] = useState<'COURSE' | 'INTERNSHIP'>('COURSE');
  const [matTitle, setMatTitle] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matFileUrl, setMatFileUrl] = useState('');
  const [matType, setMatType] = useState('PDF');
  const [matCourseId, setMatCourseId] = useState('');
  const [matBatchId, setMatBatchId] = useState('');
  const [matInternshipId, setMatInternshipId] = useState('');
  const [matModule, setMatModule] = useState('');

  // Assignment Form
  const [asgnTargetType, setAsgnTargetType] = useState<'COURSE' | 'INTERNSHIP'>('COURSE');
  const [asgnTitle, setAsgnTitle] = useState('');
  const [asgnDescription, setAsgnDescription] = useState('');
  const [asgnInstructions, setAsgnInstructions] = useState('');
  const [asgnModule, setAsgnModule] = useState('');
  const [asgnDueDate, setAsgnDueDate] = useState('');
  const [asgnPoints, setAsgnPoints] = useState('100');
  const [asgnCourseId, setAsgnCourseId] = useState('');
  const [asgnBatchId, setAsgnBatchId] = useState('');
  const [asgnInternshipId, setAsgnInternshipId] = useState('');

  // Grading Status State
  const [feedbackStatus, setFeedbackStatus] = useState<'GRADED' | 'NEEDS_REVISION'>('GRADED');

  // Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annBatchId, setAnnBatchId] = useState('');

  // Search and Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: string; remarks: string }>>({});

  // Route Protection: INSTRUCTOR or ADMIN only
  if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  // 1. Fetch Mentor Dashboard Summary Metrics & Feeds
  const { data: dashboardData, isLoading: dashLoading } = useQuery({
    queryKey: ['mentor-dashboard-data'],
    queryFn: async () => {
      const res = await api.get('/mentor/dashboard');
      return res.data.data;
    },
  });

  // 2. Fetch Authorized Courses
  const { data: coursesData } = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: async () => {
      const res = await api.get('/mentor/courses');
      return res.data.data;
    },
  });

  // 2b. Fetch Supervised Internships
  const { data: internshipsData, isLoading: internshipsLoading } = useQuery({
    queryKey: ['mentor-internships'],
    queryFn: async () => {
      const res = await api.get('/mentor/internships');
      return res.data.data;
    },
  });

  // 3. Fetch Authorized Batches
  const { data: batchesData } = useQuery({
    queryKey: ['mentor-batches'],
    queryFn: async () => {
      const res = await api.get('/mentor/batches');
      return res.data.data;
    },
  });

  // 4. Fetch Automatic Authorized Students List
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['mentor-students', studentSearch, studentBatchFilter],
    queryFn: async () => {
      const res = await api.get(`/mentor/students?search=${studentSearch}&batchId=${studentBatchFilter}`);
      return res.data.data;
    },
    enabled: activeTab === 'students' || activeTab === 'progress',
  });

  // 5. Fetch Single Student Profile (Modal/Detail)
  const { data: studentProfileData } = useQuery({
    queryKey: ['mentor-student-profile', selectedStudentId],
    queryFn: async () => {
      const res = await api.get(`/mentor/students/${selectedStudentId}`);
      return res.data.data;
    },
    enabled: !!selectedStudentId,
  });

  // 6. Fetch Classes
  const { data: classesData, refetch: refetchClasses } = useQuery({
    queryKey: ['mentor-classes'],
    queryFn: async () => {
      const res = await api.get('/mentor/classes');
      return res.data.data;
    },
    enabled: activeTab === 'schedule' || activeTab === 'live-classes' || activeTab === 'attendance',
  });

  // 7. Fetch Attendance Register for a specific class
  const { data: classAttendanceData, refetch: refetchAttendance } = useQuery({
    queryKey: ['mentor-class-attendance', selectedAttendanceClassId],
    queryFn: async () => {
      const res = await api.get(`/mentor/attendance/${selectedAttendanceClassId}`);
      const data = res.data.data;
      const initialMap: Record<string, { status: string; remarks: string }> = {};
      data.roster.forEach((item: any) => {
        initialMap[item.studentId] = { status: item.status, remarks: item.remarks || '' };
      });
      setAttendanceRecords(initialMap);
      return data;
    },
    enabled: !!selectedAttendanceClassId,
  });

  // 8. Fetch Materials
  const { data: materialsData, refetch: refetchMaterials } = useQuery({
    queryKey: ['mentor-materials'],
    queryFn: async () => {
      const res = await api.get('/mentor/materials');
      return res.data.data;
    },
    enabled: activeTab === 'materials',
  });

  // 9. Fetch Assignments
  const { data: assignmentsData, refetch: refetchAssignments } = useQuery({
    queryKey: ['mentor-assignments'],
    queryFn: async () => {
      const res = await api.get('/mentor/assignments');
      return res.data.data;
    },
    enabled: activeTab === 'assignments' || activeTab === 'dashboard',
  });

  // 10. Fetch Assessments
  const { data: assessmentsData, refetch: refetchAssessments } = useQuery({
    queryKey: ['mentor-assessments'],
    queryFn: async () => {
      const res = await api.get('/mentor/assessments');
      return res.data.data;
    },
    enabled: activeTab === 'assessments',
  });

  // 11. Fetch Announcements
  const { data: announcementsData, refetch: refetchAnnouncements } = useQuery({
    queryKey: ['mentor-announcements'],
    queryFn: async () => {
      const res = await api.get('/mentor/announcements');
      return res.data.data;
    },
    enabled: activeTab === 'communication',
  });

  // Schedule Class Mutation
  const scheduleMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/mentor/classes', payload);
    },
    onSuccess: () => {
      toast.success('Live Class Scheduled', 'The session has been scheduled and enrolled cohort students notified.');
      setIsScheduleModalOpen(false);
      setSchedTitle('');
      setSchedStartTime('');
      setSchedMeetingUrl('');
      setSchedDescription('');
      refetchClasses();
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard-data'] });
    },
    onError: (err: any) => {
      toast.error('Scheduling Failed', err.response?.data?.error?.message || 'Failed to schedule class');
    },
  });

  // Edit / Reschedule Live Class Mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return api.patch(`/mentor/classes/${id}`, payload);
    },
    onSuccess: () => {
      toast.success('Live Class Updated', 'Class details and schedule have been updated.');
      setEditingClass(null);
      refetchClasses();
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard-data'] });
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.response?.data?.error?.message || 'Failed to update class');
    },
  });

  // Cancel Live Class Mutation
  const cancelClassMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/mentor/classes/${id}`);
    },
    onSuccess: () => {
      toast.success('Class Cancelled', 'The live class has been cancelled. Attendance records preserved.');
      refetchClasses();
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard-data'] });
    },
    onError: (err: any) => {
      toast.error('Cancellation Failed', err.response?.data?.error?.message || 'Failed to cancel class');
    },
  });

  // Mark Attendance Mutation
  const attendanceMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(attendanceRecords).map(([studentId, val]) => ({
        studentId,
        status: val.status,
        remarks: val.remarks,
      }));
      return api.post(`/mentor/attendance/${selectedAttendanceClassId}`, { records });
    },
    onSuccess: () => {
      toast.success('Attendance Saved', 'Attendance register finalized and saved successfully!');
      setIsAttendanceModalOpen(false);
      refetchClasses();
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard-data'] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to record attendance');
    },
  });

  // Create Material Mutation
  const materialMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/mentor/materials', payload);
    },
    onSuccess: () => {
      toast.success('Material Published', 'Learning material published to authorized students!');
      setIsMaterialModalOpen(false);
      setMatTitle('');
      setMatFileUrl('');
      refetchMaterials();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to publish material');
    },
  });

  // Create Assignment Mutation
  const assignmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/mentor/assignments', payload);
    },
    onSuccess: () => {
      toast.success('Assignment Released', 'Assignment released for student submission!');
      setIsAssignmentModalOpen(false);
      setAsgnTitle('');
      setAsgnDescription('');
      refetchAssignments();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to create assignment');
    },
  });

  // Grade Submission Mutation
  const gradeMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/mentor/submissions/${selectedSubmission.id}/grade`, {
        grade: feedbackGrade,
        feedback: feedbackRemarks,
        status: feedbackStatus,
      });
    },
    onSuccess: () => {
      toast.success('Graded Successfully', 'Marks and feedback awarded! Student notified.');
      setIsGradingModalOpen(false);
      setSelectedSubmission(null);
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard-data'] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to grade submission');
    },
  });

  // Announcement Mutation
  const announcementMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/mentor/announcements', payload);
    },
    onSuccess: () => {
      toast.success('Announcement Posted', 'Announcement published to cohort communication feed!');
      setAnnTitle('');
      setAnnMessage('');
      refetchAnnouncements();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to post announcement');
    },
  });

  const metrics = dashboardData?.metrics || {
    assignedCourses: 0,
    assignedBatches: 0,
    totalStudents: 0,
    todayClasses: 0,
    upcomingClasses: 0,
    pendingAttendance: 0,
    pendingAssignments: 0,
    pendingAssessments: 0,
  };

  // Mentor Dashboard Sidebar Navigation Links (Prompt Specific)
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'internships', label: 'My Internships', icon: Briefcase },
    { id: 'feedback', label: 'Course Feedback', icon: MessageSquareQuote },
    { id: 'students', label: 'My Students', icon: Users },
    { id: 'live-classes', label: 'Live Classes', icon: Video },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'progress', label: 'Certificates / Student Progress', icon: Award },
    { id: 'settings', label: 'Profile', icon: Settings },
  ];

  return (
    <div className="h-full bg-[#F6F8FB] flex flex-col md:flex-row font-sans text-[#172033] overflow-hidden">
      {/* ========================================================
          SIDEBAR: Professional Commercial SaaS Navigation
      ======================================================== */}
      <aside className="w-full md:w-64 bg-white border-r border-[#E4E9F0] flex flex-col justify-between shrink-0 shadow-xs h-full overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo Header */}
          <div className="p-5 border-b border-[#EDF0F4] flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="SkillUp Logo" className="h-8 w-auto object-contain" />
              <div>
                <span className="text-lg font-bold text-[#14233B] tracking-tight block leading-none">
                  Skill<span className="text-[#55B957]">Up</span>
                </span>
                <span className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wider block mt-1">
                  Mentor Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as MentorTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-l-3 border-[#2563EB]'
                      : 'text-[#667085] hover:bg-[#F6F8FB] hover:text-[#172033]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#4779C7]'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'assignments' && metrics.pendingAssignments > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FFF6E5] text-[#B7791F] rounded-full">
                      {metrics.pendingAssignments}
                    </span>
                  )}
                  {item.id === 'attendance' && metrics.pendingAttendance > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FFF0F0] text-[#C03945] rounded-full">
                      {metrics.pendingAttendance}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Account & Logout */}
        <div className="p-3 border-t border-[#EDF0F4] space-y-1 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('settings')}
            className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Edit Profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-1 ring-[#2563EB]/20">
              {user.avatarUrl ? (
                <img
                  src={getMediaUrl(user.avatarUrl)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-[#14233B] block truncate">{user.name}</span>
              <span className="text-[11px] text-[#667085] block truncate">{user.email}</span>
            </div>
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#C03945] hover:bg-[#FFF0F0] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN WORKSPACE
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#E4E9F0] px-6 sm:px-8 flex items-center justify-between shrink-0 z-20">
          <div>
            <h1 className="text-lg font-bold text-[#14233B] capitalize">
              {activeTab.replace('-', ' ')}
            </h1>
            <p className="text-xs text-[#667085]">
              {activeTab === 'dashboard' && 'Welcome back, Mentor! Overview of your teaching cohorts and tasks.'}
              {activeTab === 'courses' && 'Courses assigned to you by platform administrators.'}
              {activeTab === 'internships' && 'Industry internship programs and student cohorts under your supervision.'}
              {activeTab === 'feedback' && 'Academic curriculum reflections and student learning outcomes feedback.'}
              {activeTab === 'batches' && 'Authorized batches and cohorts under your teaching supervision.'}
              {activeTab === 'students' && 'Automatically synchronized enrolled students for your assigned batches.'}
              {activeTab === 'schedule' && 'Live timetable and session management.'}
              {activeTab === 'live-classes' && 'Live WebRTC classes and conference rooms.'}
              {activeTab === 'attendance' && 'Official session attendance register and presence logs.'}
              {activeTab === 'materials' && 'Course syllabi, presentation slides, notes, and code repositories.'}
              {activeTab === 'assignments' && 'Assignments evaluation and student code submissions.'}
              {activeTab === 'assessments' && 'Online quizzes, tests, and academic scorecards.'}
              {activeTab === 'progress' && 'Student cohort progress analytics and performance tracking.'}
              {activeTab === 'communication' && 'Cohort notices, announcements, and student interactions.'}
              {activeTab === 'reports' && 'Exportable attendance, submission, and completion analytics.'}
              {activeTab === 'settings' && 'Mentor teaching profile, credentials, and settings.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (coursesData && coursesData.length > 0) {
                  setSchedCourseId(coursesData[0].id);
                  if (batchesData && batchesData.length > 0) setSchedBatchId(batchesData[0].id);
                }
                setIsScheduleModalOpen(true);
              }}
              className="px-3 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Schedule Class</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* ========================================================
              TAB 1: OPERATIONAL MENTOR DASHBOARD
          ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 8 Commercial Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Assigned Courses</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.assignedCourses}</span>
                  <span className="text-[11px] text-[#4779C7] font-medium mt-1 block">Active curriculum</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Assigned Batches</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.assignedBatches}</span>
                  <span className="text-[11px] text-[#4779C7] font-medium mt-1 block">Live cohorts</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Eligible Students</span>
                  <span className="text-2xl font-bold text-[#16845B] mt-1 block">{metrics.totalStudents}</span>
                  <span className="text-[11px] text-[#16845B] font-medium mt-1 block">Auto-synchronized</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Today's Classes</span>
                  <span className="text-2xl font-bold text-[#2563EB] mt-1 block">{metrics.todayClasses}</span>
                  <span className="text-[11px] text-[#2563EB] font-medium mt-1 block">Scheduled for today</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Upcoming Classes</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.upcomingClasses}</span>
                  <span className="text-[11px] text-[#667085] font-medium mt-1 block">Next 7 days</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Pending Attendance</span>
                  <span className="text-2xl font-bold text-[#B7791F] mt-1 block">{metrics.pendingAttendance}</span>
                  <span className="text-[11px] text-[#B7791F] font-medium mt-1 block">Awaiting completion</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Pending Submissions</span>
                  <span className="text-2xl font-bold text-[#C03945] mt-1 block">{metrics.pendingAssignments}</span>
                  <span className="text-[11px] text-[#C03945] font-medium mt-1 block">Awaiting evaluation</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Assessments to Grade</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.pendingAssessments}</span>
                  <span className="text-[11px] text-[#667085] font-medium mt-1 block">Tests completed</span>
                </div>
              </div>

              {/* Today's Schedule & Actionable Tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Schedule & Course Progress */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Today's Schedule */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#2563EB]" />
                        <h2 className="text-sm font-bold text-[#14233B]">Today's Scheduled Sessions</h2>
                      </div>
                      <span className="text-[11px] text-[#667085]">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {dashboardData?.todaySchedule?.length === 0 ? (
                      <div className="py-8 text-center bg-[#F6F8FB] rounded-lg border border-[#EDF0F4]">
                        <CheckCircle2 className="w-8 h-8 text-[#16845B] mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-semibold text-[#14233B]">No classes scheduled for today</p>
                        <p className="text-[11px] text-[#667085] mt-0.5">Use the "Schedule Class" button to add a new cohort session.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData?.todaySchedule?.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-lg border border-[#E4E9F0] flex items-center justify-between hover:bg-[#F6F8FB] transition-colors"
                          >
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-[#14233B] block">{item.title}</span>
                              <div className="flex items-center gap-3 text-[11px] text-[#667085]">
                                <span>Course: {item.course?.title}</span>
                                {item.batch && <span className="font-medium text-[#2563EB]">Batch: {item.batch.code}</span>}
                                <span>Time: {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({item.duration} mins)</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.meetingUrl && (
                                <a
                                  href={item.meetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <span>Start Session</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedAttendanceClassId(item.id);
                                  setIsAttendanceModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors"
                              >
                                Attendance
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Course Progress & Cohort Enrollment */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs">
                    <h2 className="text-sm font-bold text-[#14233B] mb-4">Assigned Courses & Average Completion</h2>
                    <div className="space-y-4">
                      {dashboardData?.courseProgress?.map((c: any) => (
                        <div key={c.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-[#14233B]">{c.title}</span>
                            <span className="text-[#2563EB]">{c.avgProgress}% avg. completion</span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[#667085]">
                            <span>{c.studentCount} active enrolled students</span>
                            <span>{c.batchCount} active cohorts</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#EDF0F4] overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                              style={{ width: `${c.avgProgress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Col: Recent Activity & Quick Operations */}
                <div className="space-y-6">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs space-y-3">
                    <h2 className="text-sm font-bold text-[#14233B]">Quick Operations</h2>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => setActiveTab('students')}
                        className="p-3 text-left rounded-lg border border-[#E4E9F0] hover:bg-[#F6F8FB] transition-colors"
                      >
                        <Users className="w-4 h-4 text-[#2563EB] mb-1.5" />
                        <span className="font-semibold block text-[#14233B]">View Students</span>
                        <span className="text-[10px] text-[#667085]">Eligible cohorts</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('assignments')}
                        className="p-3 text-left rounded-lg border border-[#E4E9F0] hover:bg-[#F6F8FB] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#B7791F] mb-1.5" />
                        <span className="font-semibold block text-[#14233B]">Review Work</span>
                        <span className="text-[10px] text-[#667085]">Grade papers</span>
                      </button>
                      <button
                        onClick={() => {
                          if (coursesData && coursesData.length > 0) setMatCourseId(coursesData[0].id);
                          setIsMaterialModalOpen(true);
                        }}
                        className="p-3 text-left rounded-lg border border-[#E4E9F0] hover:bg-[#F6F8FB] transition-colors"
                      >
                        <FolderOpen className="w-4 h-4 text-[#16845B] mb-1.5" />
                        <span className="font-semibold block text-[#14233B]">Upload Notes</span>
                        <span className="text-[10px] text-[#667085]">PDF & Code</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('communication')}
                        className="p-3 text-left rounded-lg border border-[#E4E9F0] hover:bg-[#F6F8FB] transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-[#173B73] mb-1.5" />
                        <span className="font-semibold block text-[#14233B]">Announce</span>
                        <span className="text-[10px] text-[#667085]">Broadcast update</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time Activity Feed */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs">
                    <h2 className="text-sm font-bold text-[#14233B] mb-3">Recent Cohort Activity</h2>
                    <div className="space-y-3">
                      {dashboardData?.recentActivity?.map((act: any) => (
                        <div key={act.id} className="flex items-start gap-2.5 pb-2.5 border-b border-[#EDF0F4] last:border-0 last:pb-0">
                          <div className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#14233B] block leading-tight">{act.title}</span>
                            <span className="text-[11px] text-[#667085] block">{act.description}</span>
                            <span className="text-[10px] text-[#98A2B3] block mt-0.5">
                              {new Date(act.time).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: MY COURSES
          ======================================================== */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs">
                <div>
                  <h2 className="text-base font-bold text-[#14233B]">My Assigned Courses</h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Courses you are officially assigned to instruct or mentor. Manage course syllabus, day-by-day modules, video lessons, and downloadable resources.
                  </p>
                </div>
                <Link
                  to="/course-management"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Curriculum Studio</span>
                </Link>
              </div>

              {!coursesData || coursesData.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E4E9F0] p-12 text-center max-w-xl mx-auto shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#14233B]">No Courses Assigned Yet</h3>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    You currently do not have any teaching or mentor course assignments. Once an administrator assigns you as the lead instructor or cohort mentor, your assigned courses and curriculum controls will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {coursesData.map((course: any) => (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#2563EB]/40 transition group"
                    >
                      <div>
                        {/* Course Thumbnail */}
                        <div className="aspect-16/9 bg-[#173B73] relative overflow-hidden">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/50 text-xs">
                              <BookOpen className="w-8 h-8 mb-1 opacity-60" />
                              <span>Course Thumbnail</span>
                            </div>
                          )}

                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-[#14233B]/80 backdrop-blur-xs text-white rounded-md">
                              {course.category?.name || 'Development'}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <span className="px-2.5 py-1 text-[10px] font-bold bg-white/95 text-[#173B73] rounded-md shadow-xs">
                              {course.level || 'All Levels'}
                            </span>
                          </div>
                        </div>

                        {/* Course Body Details */}
                        <div className="p-5 space-y-3">
                          <h3 className="text-sm font-bold text-[#14233B] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>

                          {/* Completion Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between items-center text-[11px] font-semibold">
                              <span className="text-[#667085]">Curriculum Progress</span>
                              <span className="text-[#2563EB]">
                                {course.curriculumCompletionRate ?? 0}% Avg. Completion
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-[#EDF0F4] overflow-hidden">
                              <div
                                className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                                style={{ width: `${course.curriculumCompletionRate ?? 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-[#F6F8FB] border border-[#EDF0F4] text-[11px] pt-2">
                            <div>
                              <span className="text-[#667085] block text-[10px]">Students</span>
                              <span className="font-bold text-[#14233B]">
                                {course.totalEnrolledStudents ?? course._count?.enrollments ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#667085] block text-[10px]">Lessons</span>
                              <span className="font-bold text-[#14233B]">
                                {course.totalLessons ?? 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#667085] block text-[10px]">Materials</span>
                              <span className="font-bold text-[#14233B]">
                                {course.totalMaterials ?? course._count?.learningMaterials ?? 0}
                              </span>
                            </div>
                          </div>

                          {/* Upcoming Live Classes Widget */}
                          {course.upcomingLiveClassesList && course.upcomingLiveClassesList.length > 0 ? (
                            <div className="p-2.5 rounded-xl bg-[#EAF5EA]/60 border border-blue-100 space-y-1">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#173B73]">
                                <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                                <span>Upcoming Live Session:</span>
                              </div>
                              <p className="text-[11px] text-[#14233B] font-medium truncate">
                                {course.upcomingLiveClassesList[0].title}
                              </p>
                              <p className="text-[10px] text-[#667085]">
                                {new Date(course.upcomingLiveClassesList[0].startTime).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          ) : (
                            <div className="p-2 text-center text-[11px] text-[#98A2B3] italic bg-slate-50/70 rounded-lg">
                              No live classes scheduled
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="p-5 pt-0 border-t border-[#EDF0F4] mt-2 space-y-2">
                        <Link
                          to={`/course-management?courseId=${course.id}`}
                          className="w-full py-2.5 text-xs font-bold text-center text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl block transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Manage Curriculum</span>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/classroom/${course.slug}`}
                            className="flex-1 py-1.5 text-[11px] font-semibold text-center text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg block transition-colors"
                          >
                            Student Classroom
                          </Link>
                          <button
                            onClick={() => {
                              setSchedCourseId(course.id);
                              setIsScheduleModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-semibold text-[#14233B] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                            title="Schedule Live Class"
                          >
                            <Calendar className="w-3 h-3 text-[#2563EB]" />
                            <span>Schedule</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2B: MY INTERNSHIPS
          ======================================================== */}
          {activeTab === 'internships' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs">
                <div>
                  <h2 className="text-base font-bold text-[#14233B]">My Supervised Internships</h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Industry training programs where you are officially assigned as the supervising mentor. Track cohort candidates, live sessions, and materials.
                  </p>
                </div>
                <Link
                  to="/internship"
                  className="px-4 py-2 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#2563EB]/20 rounded-xl transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Public Catalog</span>
                </Link>
              </div>

              {internshipsLoading ? (
                <div className="p-12 text-center text-xs text-[#667085]">Loading assigned internships...</div>
              ) : !internshipsData || internshipsData.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E4E9F0] p-12 text-center max-w-xl mx-auto shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-[#14233B]">No Internships Assigned Yet</h3>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    You currently do not have any active internship mentorship assignments. When an administrator designates you as supervising mentor for an internship cohort, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {internshipsData.map((item: any) => {
                    const acceptedCount = item.applications?.length || 0;
                    const totalSeats = item.availableSeats || 50;

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs flex flex-col justify-between hover:border-[#2563EB]/40 transition group"
                      >
                        <div>
                          {/* Banner */}
                          <div className="aspect-16/9 bg-[#173B73] relative overflow-hidden">
                            <img
                              src={item.bannerUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
                              }}
                            />
                            <div className="absolute top-3 left-3">
                              <span className="px-2.5 py-1 text-[10px] font-bold bg-[#14233B]/80 backdrop-blur-xs text-white rounded-md">
                                {item.deliveryMode}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-md shadow-xs ${
                                  item.isPublished ? 'bg-[#EAF7F0] text-[#16845B]' : 'bg-[#FFF6E5] text-[#B7791F]'
                                }`}
                              >
                                {item.isPublished ? 'Published' : 'Draft'}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="p-5 space-y-3">
                            <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                              {item.organization}
                            </div>
                            <h3 className="text-sm font-bold text-[#14233B] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>

                            <div className="pt-2 border-t border-[#EDF0F4] space-y-1.5 text-[11px] text-[#667085]">
                              <div className="flex justify-between">
                                <span>Tech Stack:</span>
                                <span className="font-semibold text-[#14233B] truncate max-w-[170px]">{item.technologies}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Duration:</span>
                                <span className="font-semibold text-[#14233B]">{item.duration}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Active Candidates:</span>
                                <span className="font-bold text-[#16845B]">
                                  {acceptedCount} / {totalSeats} Seats
                                </span>
                              </div>
                            </div>

                            {/* Candidate List preview */}
                            {item.applications && item.applications.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block mb-1.5">
                                  Enrolled Students ({item.applications.length})
                                </span>
                                <div className="space-y-1 max-h-28 overflow-y-auto bg-[#F8F9FA] p-2 rounded-lg border border-[#EDF0F4]">
                                  {item.applications.map((app: any) => (
                                    <div key={app.id} className="flex items-center justify-between text-[11px] bg-white p-1 rounded border border-[#E4E9F0]">
                                      <span className="font-semibold text-[#14233B] truncate max-w-[130px]">{app.user?.name}</span>
                                      <span className="text-[10px] text-[#667085] truncate max-w-[140px]">{app.user?.email}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Link */}
                        <div className="p-4 border-t border-[#EDF0F4] bg-[#F6F8FB]/50 flex items-center justify-between gap-2">
                          <Link
                            to={`/internship/${item.id}/learning`}
                            className="px-3 py-1.5 text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Internship Hub</span>
                          </Link>
                          <span className="text-[10px] text-[#667085] font-semibold">
                            Supervising Mentor
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 3: MY BATCHES
          ======================================================== */}
          {activeTab === 'batches' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-[#EDF0F4] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#14233B]">Authorized Teaching Cohorts</h3>
                  <span className="text-xs text-[#667085]">
                    Showing {batchesData?.length || 0} active cohorts assigned by platform admin
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">Cohort Code</th>
                        <th className="py-3 px-4">Batch Name</th>
                        <th className="py-3 px-4">Course Name</th>
                        <th className="py-3 px-4">Enrolled Students</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {batchesData?.map((batch: any) => (
                        <tr key={batch.id} className="hover:bg-[#F6F8FB] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#2563EB]">{batch.code}</td>
                          <td className="py-3 px-4 font-semibold text-[#14233B]">{batch.name}</td>
                          <td className="py-3 px-4 text-[#667085]">{batch.course?.title}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#16845B] bg-[#EAF7F0] px-2 py-0.5 rounded-md">
                              {batch._count?.enrollments || 0} students
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#667085]">{new Date(batch.startDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] rounded-full">
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setStudentBatchFilter(batch.id);
                                setActiveTab('students');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-md transition-colors"
                            >
                              View Students
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: STUDENTS MANAGEMENT (AUTOMATIC ASSIGNMENT DISPLAY)
          ======================================================== */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={studentBatchFilter}
                    onChange={(e) => setStudentBatchFilter(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-hidden focus:border-[#2563EB]"
                  >
                    <option value="">All Assigned Batches</option>
                    {batchesData?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Automatic Student Roster Table */}
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#EDF0F4] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2563EB]" />
                    <h3 className="text-xs font-bold text-[#14233B]">
                      Authorized Students ({studentsData?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#16845B] font-medium bg-[#EAF7F0] px-2 py-0.5 rounded-md">
                    Synchronized from Course/Batch Enrollments
                  </span>
                </div>

                {studentsLoading ? (
                  <div className="p-12 text-center text-xs text-[#667085]">Loading authorized student records...</div>
                ) : studentsData?.length === 0 ? (
                  <div className="p-12 text-center">
                    <UserX className="w-10 h-10 text-[#667085] mx-auto mb-2 opacity-50" />
                    <h4 className="text-sm font-bold text-[#14233B]">No Students Enrolled</h4>
                    <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto">
                      No eligible students have enrolled in this batch yet. When an admin assigns you to a batch, any newly enrolled students automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Course</th>
                          <th className="py-3 px-4">Batch</th>
                          <th className="py-3 px-4">Attendance Rate</th>
                          <th className="py-3 px-4">Curriculum Progress</th>
                          <th className="py-3 px-4">Latest Score</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EDF0F4]">
                        {studentsData?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-[#F6F8FB] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-semibold text-[#14233B] block">{item.name}</span>
                                  <span className="text-[11px] text-[#667085] block">{item.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#14233B] font-medium">{item.courseTitle}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[#2563EB] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded-md">
                                {item.batchCode}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  item.attendancePercentage >= 75 ? 'text-[#16845B]' : 'text-[#C03945]'
                                }`}
                              >
                                {item.attendancePercentage}%
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-24 space-y-1">
                                <div className="flex justify-between text-[10px] text-[#667085]">
                                  <span>{item.progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#EDF0F4] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#2563EB] rounded-full"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {item.latestAssessmentScore !== null ? (
                                <span className="font-bold text-[#14233B]">{item.latestAssessmentScore} pts</span>
                              ) : (
                                <span className="text-[#98A2B3] italic">No test yet</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setSelectedStudentId(item.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-md transition-colors"
                              >
                                View Record
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 5: CLASS SCHEDULE
          ======================================================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#14233B]">Scheduled & Historical Classes</h3>
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Session</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {classesData?.map((session: any) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl border border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#2563EB]/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#14233B]">{session.title}</h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              session.status === 'COMPLETED'
                                ? 'bg-[#EAF7F0] text-[#16845B]'
                                : 'bg-[#EFF6FF] text-[#2563EB]'
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#667085]">
                          <span>Course: {session.course?.title}</span>
                          {session.batch && <span>Cohort: {session.batch.code}</span>}
                          <span>
                            Time: {new Date(session.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        {session.description && <p className="text-xs text-[#667085] mt-1">{session.description}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.meetingUrl && session.status !== 'CANCELLED' && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Enter Room</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedAttendanceClassId(session.id);
                            setIsAttendanceModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors cursor-pointer"
                        >
                          Mark Attendance
                        </button>
                        {session.status !== 'CANCELLED' && session.status !== 'COMPLETED' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingClass(session);
                                setSchedTitle(session.title);
                                setSchedCourseId(session.courseId || '');
                                setSchedBatchId(session.batchId || '');
                                setSchedDuration(String(session.duration || 60));
                                setSchedDescription(session.description || '');
                                setSchedMeetingUrl(session.meetingUrl || '');
                                setSchedMeetingProvider(session.meetingProvider || 'GOOGLE_MEET');
                                const d = new Date(session.startTime);
                                const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                setSchedStartTime(localIso);
                                setIsScheduleModalOpen(true);
                              }}
                              title="Edit / Reschedule Session"
                              className="p-1.5 rounded-lg border border-[#E4E9F0] text-[#667085] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: 'Cancel Live Session',
                                  message: `Are you sure you want to cancel the live class "${session.title}"? Historical records will remain intact.`,
                                  confirmText: 'Cancel Class',
                                  isDestructive: true,
                                });
                                if (confirmed) {
                                  cancelClassMutation.mutate(session.id);
                                }
                              }}
                              title="Cancel Session"
                              className="p-1.5 rounded-lg border border-[#E4E9F0] text-[#C03945] hover:bg-[#FFF0F0] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 6: LIVE CLASSES & ROOMS
          ======================================================== */}
          {activeTab === 'live-classes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#14233B]">Live Classes & Interactive Sessions</h3>
                  <p className="text-xs text-[#667085] mt-0.5">Manage live sessions for your assigned courses and cohorts</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    setSchedTitle('');
                    setSchedDescription('');
                    setSchedAgenda('');
                    setSchedMeetingUrl('');
                    setSchedMeetingProvider('GOOGLE_MEET');
                    setSchedCourseId(coursesData?.[0]?.id || '');
                    setSchedBatchId('');
                    setSchedDuration('60');
                    const now = new Date();
                    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
                    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setSchedStartTime(localIso);
                    const end = new Date(now.getTime() + 60 * 60000);
                    setSchedEndTime(new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                    setIsScheduleModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Schedule Live Class</span>
                </button>
              </div>

              {/* Status Filter Badges */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E9F0] pb-3">
                {[
                  { key: 'ALL', label: 'All Sessions' },
                  { key: 'UPCOMING', label: 'Upcoming' },
                  { key: 'LIVE', label: 'Happening Now' },
                  { key: 'COMPLETED', label: 'Completed' },
                  { key: 'CANCELLED', label: 'Cancelled' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setClassStatusFilter(tab.key as any)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      classStatusFilter === tab.key
                        ? 'bg-[#173B73] text-white shadow-2xs'
                        : 'bg-white text-[#667085] border border-[#E4E9F0] hover:bg-[#F6F8FB]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {(() => {
                const nowMs = Date.now();
                const filtered = (classesData || []).filter((c: any) => {
                  const startMs = new Date(c.startTime).getTime();
                  const endMs = startMs + (c.duration || 60) * 60000;
                  const isLiveNow = (nowMs >= startMs - 5 * 60000 && nowMs <= endMs) || c.status === 'LIVE';

                  if (classStatusFilter === 'LIVE') return isLiveNow && c.status !== 'CANCELLED';
                  if (classStatusFilter === 'UPCOMING') return (c.status === 'SCHEDULED' || startMs > nowMs) && !isLiveNow && c.status !== 'CANCELLED' && c.status !== 'COMPLETED';
                  if (classStatusFilter === 'COMPLETED') return c.status === 'COMPLETED' || (endMs < nowMs && c.status !== 'CANCELLED');
                  if (classStatusFilter === 'CANCELLED') return c.status === 'CANCELLED';
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#CBD5E1] text-xs text-[#667085] space-y-2">
                      <Video className="w-8 h-8 text-[#94A3B8] mx-auto" />
                      <p className="font-semibold text-slate-700">No {classStatusFilter !== 'ALL' ? classStatusFilter.toLowerCase() : ''} live classes found.</p>
                      <p>Schedule a live session for your assigned courses to interact with students in real time.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map((c: any) => {
                      const start = new Date(c.startTime);
                      const isCancelled = c.status === 'CANCELLED';

                      return (
                        <div key={c.id} className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-3 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">
                                  {c.course?.title || 'Interactive Course'} {c.batch ? `• ${c.batch.code}` : '• Course-Wide'}
                                </span>
                                <h4 className="text-sm font-bold text-[#14233B]">{c.title}</h4>
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                  isCancelled
                                    ? 'bg-rose-50 text-rose-700'
                                    : c.status === 'COMPLETED'
                                    ? 'bg-slate-100 text-slate-700'
                                    : c.status === 'LIVE'
                                    ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                                    : 'bg-[#EFF6FF] text-[#2563EB]'
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>

                            <p className="text-xs text-[#667085] line-clamp-2">
                              {c.description || 'Interactive live session with faculty mentor.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                              <span>📅 {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                              <span>•</span>
                              <span>⏰ {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({c.duration || 60}m) [{c.timezone || 'IST'}]</span>
                              {c.meetingProvider && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700">{c.meetingProvider.replace('_', ' ')}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#EAF7F0] text-[#16845B] font-bold text-[10px]">
                                👥 {c.registrations?.length ?? c._count?.registrations ?? 0} Paid / Enrolled
                              </span>
                            </div>

                            {/* Registered students preview */}
                            {c.registrations && c.registrations.length > 0 && (
                              <div className="pt-2 text-[11px] text-[#475569] space-y-1">
                                <span className="font-bold text-[#14233B] block">Eligible Paid Students:</span>
                                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                  {c.registrations.slice(0, 5).map((r: any) => (
                                    <span key={r.id} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-medium">
                                      {r.student?.name || r.student?.email}
                                    </span>
                                  ))}
                                  {c.registrations.length > 5 && (
                                    <span className="text-[10px] text-gray-400 font-semibold self-center">
                                      +{c.registrations.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-[#EDF0F4] flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                              {!isCancelled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingClass(c);
                                      setSchedTitle(c.title || '');
                                      setSchedCourseId(c.courseId || '');
                                      setSchedBatchId(c.batchId || '');
                                      setSchedDuration(String(c.duration || 60));
                                      setSchedDescription(c.description || '');
                                      setSchedAgenda('');
                                      setSchedMeetingUrl(c.meetingUrl || '');
                                      setSchedMeetingProvider(c.meetingProvider || 'GOOGLE_MEET');
                                      const d = new Date(c.startTime);
                                      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                      setSchedStartTime(localIso);
                                      const endD = new Date(d.getTime() + (c.duration || 60) * 60000);
                                      setSchedEndTime(new Date(endD.getTime() - endD.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                                      setIsScheduleModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-[#E4E9F0] text-[#667085] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors cursor-pointer"
                                    title="Edit / Reschedule Session"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = await confirm({
                                        title: 'Cancel Live Class',
                                        message: `Are you sure you want to cancel the live class "${c.title}"? Students will be notified and joining link deactivated.`,
                                        confirmText: 'Cancel Class',
                                        isDestructive: true,
                                      });
                                      if (confirmed) {
                                        cancelClassMutation.mutate(c.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-[#E4E9F0] text-[#C03945] hover:bg-[#FFF0F0] transition-colors cursor-pointer"
                                    title="Cancel Session"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>

                            {c.meetingUrl && !isCancelled && (
                              <a
                                href={c.meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Launch Session</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ========================================================
              TAB 7: ATTENDANCE REGISTER
          ======================================================== */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <h3 className="text-sm font-bold text-[#14233B] mb-4">Official Session Attendance Logs</h3>
                <div className="space-y-3">
                  {classesData?.map((session: any) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-xl border border-[#E4E9F0] flex justify-between items-center hover:bg-[#F6F8FB] transition-colors"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-[#14233B]">{session.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-[#667085] mt-0.5">
                          <span>{session.batch?.name || session.course?.title}</span>
                          <span>{new Date(session.startTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAttendanceClassId(session.id);
                          setIsAttendanceModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Open Register</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 8: LEARNING MATERIALS
          ======================================================== */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#14233B]">Shared Course & Batch Materials</h3>
                <button
                  onClick={() => setIsMaterialModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Resource</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materialsData?.map((mat: any) => (
                  <div key={mat.id} className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] rounded-md uppercase">
                          {mat.type}
                        </span>
                        <span className="text-[11px] text-[#667085]">{new Date(mat.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-[#14233B]">{mat.title}</h4>
                      {mat.description && <p className="text-[11px] text-[#667085] line-clamp-2">{mat.description}</p>}
                    </div>

                    <div className="pt-3 border-t border-[#EDF0F4] mt-4 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#14233B] truncate max-w-[180px]">
                        {mat.course?.title || (mat.internship ? `Internship: ${mat.internship.title}` : 'Resource')}
                      </span>
                      <a
                        href={mat.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-md transition-colors flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 9: ASSIGNMENTS & EVALUATION
          ======================================================== */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#14233B]">Assignments & Student Submissions</h3>
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Assignment</span>
                </button>
              </div>

              <div className="space-y-6">
                {assignmentsData?.map((asgn: any) => (
                  <div key={asgn.id} className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-[#EDF0F4] bg-[#F6F8FB] flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-[#14233B]">{asgn.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] text-[#667085]">
                          <span>Program: {asgn.course?.title || (asgn.internship ? `Internship: ${asgn.internship.title}` : 'Global')}</span>
                          <span>Max Marks: {asgn.totalPoints} pts</span>
                          {asgn.dueDate && <span>Due: {new Date(asgn.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#2563EB]">
                        {asgn.submissions?.length || 0} Submissions
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {asgn.submissions?.length === 0 ? (
                        <p className="text-xs text-[#667085] italic">No student submissions submitted yet.</p>
                      ) : (
                        asgn.submissions?.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="p-3 rounded-lg border border-[#E4E9F0] flex items-center justify-between hover:bg-[#F6F8FB] transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#14233B]">{sub.student.name}</span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    sub.status === 'GRADED'
                                      ? 'bg-[#EAF7F0] text-[#16845B]'
                                      : 'bg-[#FFF6E5] text-[#B7791F]'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#667085] line-clamp-1">{sub.content}</p>
                              {sub.feedback && (
                                <p className="text-[11px] text-[#16845B] font-medium">Feedback: {sub.feedback}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              {sub.grade !== null && (
                                <span className="text-xs font-bold text-[#16845B]">{sub.grade} / {asgn.totalPoints}</span>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedSubmission({ ...sub, maxPoints: asgn.totalPoints });
                                  setFeedbackGrade(sub.grade || 85);
                                  setFeedbackRemarks(sub.feedback || '');
                                  setIsGradingModalOpen(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors"
                              >
                                {sub.status === 'GRADED' ? 'Edit Marks' : 'Evaluate'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 10: TESTS & ASSESSMENTS
          ======================================================== */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#14233B]">Evaluations & Cohort Tests</h3>
                </div>

                <div className="space-y-4">
                  {assessmentsData?.map((asmt: any) => (
                    <div key={asmt.id} className="p-4 rounded-xl border border-[#E4E9F0] space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-[#14233B]">{asmt.title}</h4>
                          <span className="text-[11px] text-[#667085] block">{asmt.course?.title}</span>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] rounded-full">
                          Published
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#667085]">
                        <span>Duration: {asmt.durationMins} mins</span>
                        <span>Total Marks: {asmt.totalMarks}</span>
                        <span>Passing: {asmt.passingMarks}</span>
                        <span>Submissions: {asmt.submissions?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 11: STUDENT PROGRESS ANALYTICS
          ======================================================== */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <h3 className="text-sm font-bold text-[#14233B] mb-4">Cohort Completion Overview</h3>
                <div className="space-y-3">
                  {studentsData?.map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-lg border border-[#E4E9F0] flex items-center justify-between hover:bg-[#F6F8FB] transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#14233B] block">{st.name}</span>
                        <div className="flex items-center gap-3 text-[11px] text-[#667085]">
                          <span>Batch: {st.batchCode}</span>
                          <span>Attendance: {st.attendancePercentage}%</span>
                        </div>
                      </div>
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#2563EB]">
                          <span>Course Progress</span>
                          <span>{st.progress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#EDF0F4] overflow-hidden">
                          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${st.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 12: COMMUNICATION & ANNOUNCEMENTS
          ======================================================== */}
          {activeTab === 'communication' && (
            <div className="space-y-6">
              {/* Post Announcement */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#14233B]">Post Cohort Announcement</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!annTitle || !annMessage) return;
                    announcementMutation.mutate({ title: annTitle, message: annMessage, batchId: annBatchId || null });
                  }}
                  className="space-y-3"
                >
                  <input
                    type="text"
                    required
                    placeholder="Announcement Title (e.g., Code Review Scheduled for Wednesday)"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                  <textarea
                    required
                    rows={3}
                    placeholder="Write announcement details for your enrolled students..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                  <div className="flex justify-between items-center">
                    <select
                      value={annBatchId}
                      onChange={(e) => setAnnBatchId(e.target.value)}
                      className="text-xs px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">All My Assigned Batches</option>
                      {batchesData?.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={announcementMutation.isPending}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{announcementMutation.isPending ? 'Publishing...' : 'Publish Announcement'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Feed of Announcements */}
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#14233B]">Broadcast Feed</h3>
                <div className="space-y-3">
                  {announcementsData?.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-xl border border-[#E4E9F0] space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-[#14233B]">{item.title}</span>
                        <span className="text-[11px] text-[#667085]">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-[#667085] leading-relaxed">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 13: REPORTS & ANALYTICS
          ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#14233B]">Accredited Teaching Performance Reports</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-[#E4E9F0] space-y-2">
                    <span className="text-[#667085] block font-medium">Cohort Attendance Rate</span>
                    <span className="text-2xl font-bold text-[#16845B]">96.4%</span>
                    <p className="text-[11px] text-[#667085]">Calculated from confirmed attendance records.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E4E9F0] space-y-2">
                    <span className="text-[#667085] block font-medium">Assignment Review Turnaround</span>
                    <span className="text-2xl font-bold text-[#2563EB]">18 hrs</span>
                    <p className="text-[11px] text-[#667085]">Average time between submission and evaluation.</p>
                  </div>
                  <div className="p-4 rounded-xl border border-[#E4E9F0] space-y-2">
                    <span className="text-[#667085] block font-medium">Curriculum Completion</span>
                    <span className="text-2xl font-bold text-[#14233B]">84.2%</span>
                    <p className="text-[11px] text-[#667085]">Students successfully meeting lesson checkpoints.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: MENTOR COURSE FEEDBACK
          ======================================================== */}
          {activeTab === 'feedback' && <MentorFeedbackTab />}

          {/* ========================================================
              TAB 14: PROFILE & SETTINGS
          ======================================================== */}
          {activeTab === 'settings' && <ProfileEditTab portalType="MENTOR" />}
        </main>
      </div>

      {/* ========================================================
          MODAL: SCHEDULE LIVE CLASS
      ======================================================== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">
                {editingClass ? 'Edit / Reschedule Live Class' : 'Schedule Live Class Session'}
              </h3>
              <button
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  setEditingClass(null);
                }}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!schedStartTime) {
                  toast.error('Missing Start Time', 'Please select a session start time.');
                  return;
                }
                const start = new Date(schedStartTime);
                let duration = Number(schedDuration) || 60;

                if (schedEndTime) {
                  const end = new Date(schedEndTime);
                  if (end <= start) {
                    toast.error('Invalid Time Window', 'Class end time must be after start time.');
                    return;
                  }
                  duration = Math.round((end.getTime() - start.getTime()) / 60000);
                }

                if (!schedMeetingUrl.startsWith('https://')) {
                  toast.error('Secure Link Required', 'Meeting URL must begin with https:// (e.g. Google Meet or Zoom).');
                  return;
                }

                const fullDescription = [
                  schedDescription.trim(),
                  schedAgenda.trim() ? `\n\nAgenda / Instructions:\n${schedAgenda.trim()}` : '',
                ].filter(Boolean).join('');

                const payload = {
                  title: schedTitle,
                  startTime: start.toISOString(),
                  duration,
                  courseId: schedCourseId,
                  batchId: schedBatchId || null,
                  description: fullDescription,
                  meetingUrl: schedMeetingUrl,
                  meetingProvider: schedMeetingProvider,
                };
                if (editingClass) {
                  updateClassMutation.mutate({ id: editingClass.id, payload });
                } else {
                  scheduleMutation.mutate(payload);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Clean Architecture & Unit Testing Masterclass"
                  value={schedTitle}
                  onChange={(e) => setSchedTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Course *</label>
                  <select
                    required
                    value={schedCourseId}
                    onChange={(e) => setSchedCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    {coursesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Cohort Batch</label>
                  <select
                    value={schedBatchId}
                    onChange={(e) => setSchedBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="">Course-wide (All Enrolled Students)</option>
                    {batchesData?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start & End Times with IST Time Zone indicator */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#14233B]">Schedule Timing</span>
                  <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded">
                    Time Zone: Indian Standard Time (IST - UTC+05:30)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Start Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={schedStartTime}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSchedStartTime(val);
                        if (val && (!schedEndTime || new Date(schedEndTime) <= new Date(val))) {
                          const d = new Date(val);
                          const end = new Date(d.getTime() + (Number(schedDuration) || 60) * 60000);
                          setSchedEndTime(new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white focus:outline-hidden focus:border-[#2563EB] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={schedEndTime}
                      onChange={(e) => {
                        const endVal = e.target.value;
                        setSchedEndTime(endVal);
                        if (schedStartTime && endVal) {
                          const diffMin = Math.round((new Date(endVal).getTime() - new Date(schedStartTime).getTime()) / 60000);
                          if (diffMin > 0) setSchedDuration(String(diffMin));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white focus:outline-hidden focus:border-[#2563EB] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      min="10"
                      max="480"
                      required
                      value={schedDuration}
                      onChange={(e) => {
                        const dur = e.target.value;
                        setSchedDuration(dur);
                        if (schedStartTime && Number(dur) > 0) {
                          const start = new Date(schedStartTime);
                          const end = new Date(start.getTime() + Number(dur) * 60000);
                          setSchedEndTime(new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white focus:outline-hidden focus:border-[#2563EB] text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Meeting Provider *</label>
                  <select
                    value={schedMeetingProvider}
                    onChange={(e) => setSchedMeetingProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="ZOOM">Zoom</option>
                    <option value="MICROSOFT_TEAMS">Microsoft Teams</option>
                    <option value="OTHER">Other Supported Provider (HTTPS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Meeting URL (HTTPS) *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://meet.google.com/xyz or Zoom URL"
                    value={schedMeetingUrl}
                    onChange={(e) => setSchedMeetingUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Session Description</label>
                <textarea
                  rows={2}
                  value={schedDescription}
                  onChange={(e) => setSchedDescription(e.target.value)}
                  placeholder="Summary of what will be taught in this live class..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Agenda & Preparation Instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={schedAgenda}
                  onChange={(e) => setSchedAgenda(e.target.value)}
                  placeholder="e.g. Clone repo before class, install Docker, review Chapter 4..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    setEditingClass(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleMutation.isPending || updateClassMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] cursor-pointer"
                >
                  {scheduleMutation.isPending || updateClassMutation.isPending
                    ? 'Saving...'
                    : editingClass
                    ? 'Update & Reschedule'
                    : 'Schedule & Notify Enrolled Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ATTENDANCE REGISTER
      ======================================================== */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  Attendance Register: {classAttendanceData?.classSession?.title}
                </h3>
                <span className="text-[11px] text-[#667085]">
                  Enrolled students for {classAttendanceData?.classSession?.batch?.name || classAttendanceData?.classSession?.course?.title}
                </span>
              </div>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {classAttendanceData?.roster?.map((st: any) => {
                const current = attendanceRecords[st.studentId] || { status: 'PRESENT', remarks: '' };
                return (
                  <div
                    key={st.studentId}
                    className="p-3 rounded-lg border border-[#E4E9F0] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#14233B] block">{st.name}</span>
                      <span className="text-[11px] text-[#667085] block">{st.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={current.status}
                        onChange={(e) =>
                          setAttendanceRecords((prev) => ({
                            ...prev,
                            [st.studentId]: { ...current, status: e.target.value },
                          }))
                        }
                        className={`text-xs px-2.5 py-1 rounded-md font-bold ${
                          current.status === 'PRESENT'
                            ? 'bg-[#EAF7F0] text-[#16845B]'
                            : current.status === 'LATE'
                            ? 'bg-[#FFF6E5] text-[#B7791F]'
                            : 'bg-[#FFF0F0] text-[#C03945]'
                        }`}
                      >
                        <option value="PRESENT">PRESENT</option>
                        <option value="LATE">LATE</option>
                        <option value="ABSENT">ABSENT</option>
                        <option value="EXCUSED">EXCUSED</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Remarks..."
                        value={current.remarks}
                        onChange={(e) =>
                          setAttendanceRecords((prev) => ({
                            ...prev,
                            [st.studentId]: { ...current, remarks: e.target.value },
                          }))
                        }
                        className="px-2 py-1 text-xs rounded-md border border-[#E4E9F0] w-32 focus:outline-hidden focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#EDF0F4] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAttendanceModalOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
              >
                Close
              </button>
              <button
                onClick={() => attendanceMutation.mutate()}
                disabled={attendanceMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
              >
                {attendanceMutation.isPending ? 'Saving...' : 'Finalize Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: GRADE ASSIGNMENT SUBMISSION
      ======================================================== */}
      {isGradingModalOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Evaluate Submission</h3>
                <span className="text-[11px] text-[#667085]">Student: {selectedSubmission.student?.name}</span>
              </div>
              <button onClick={() => setIsGradingModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#F6F8FB] rounded-lg border border-[#EDF0F4] text-xs space-y-1">
              <span className="text-[#667085] font-semibold block">Submission Content / URL:</span>
              <p className="text-[#14233B] font-mono break-all">{selectedSubmission.content}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Evaluation Decision</label>
                  <select
                    value={feedbackStatus}
                    onChange={(e: any) => setFeedbackStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white font-semibold text-[#14233B]"
                  >
                    <option value="GRADED">Award Final Grade</option>
                    <option value="NEEDS_REVISION">Request Correction / Resubmission</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">
                    Marks Awarded (Max: {selectedSubmission.maxPoints} pts)
                  </label>
                  <input
                    type="number"
                    max={selectedSubmission.maxPoints}
                    min={0}
                    required
                    value={feedbackGrade}
                    onChange={(e) => setFeedbackGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Feedback & Recommendations</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide constructive code review, architectural remarks, and improvements..."
                  value={feedbackRemarks}
                  onChange={(e) => setFeedbackRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGradingModalOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => gradeMutation.mutate()}
                disabled={gradeMutation.isPending}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
              >
                {gradeMutation.isPending ? 'Awarding...' : 'Save Grade & Notify Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: STUDENT DEEP ACADEMIC RECORD
      ======================================================== */}
      {selectedStudentId && studentProfileData && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#EDF0F4] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-sm">
                  {studentProfileData.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#14233B]">{studentProfileData.name}</h3>
                  <span className="text-xs text-[#667085]">{studentProfileData.email}</span>
                </div>
              </div>
              <button onClick={() => setSelectedStudentId(null)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Batches and Progress */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-[#E4E9F0] bg-[#F6F8FB]">
                  <span className="text-[#667085] block font-medium">Enrolled Cohort</span>
                  <span className="text-sm font-bold text-[#14233B] mt-0.5 block">
                    {studentProfileData.batchEnrollments?.[0]?.batch?.name || 'General Course'}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-[#E4E9F0] bg-[#F6F8FB]">
                  <span className="text-[#667085] block font-medium">Curriculum Progress</span>
                  <span className="text-sm font-bold text-[#2563EB] mt-0.5 block">
                    {studentProfileData.enrollments?.[0]?.progress || 0}% Completed
                  </span>
                </div>
              </div>

              {/* Attendance History */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#14233B]">Attendance Log</h4>
                <div className="space-y-1.5">
                  {studentProfileData.sessionAttendances?.map((att: any) => (
                    <div key={att.id} className="p-2.5 rounded-lg border border-[#E4E9F0] flex justify-between items-center">
                      <span>{att.liveClass?.title}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          att.status === 'PRESENT'
                            ? 'bg-[#EAF7F0] text-[#16845B]'
                            : att.status === 'LATE'
                            ? 'bg-[#FFF6E5] text-[#B7791F]'
                            : 'bg-[#FFF0F0] text-[#C03945]'
                        }`}
                      >
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment Submissions */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#14233B]">Assignment Submissions</h4>
                <div className="space-y-1.5">
                  {studentProfileData.assignmentSubmissions?.map((sub: any) => (
                    <div key={sub.id} className="p-2.5 rounded-lg border border-[#E4E9F0] flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-[#14233B] block">{sub.assignment?.title}</span>
                        {sub.feedback && <span className="text-[11px] text-[#16845B]">"{sub.feedback}"</span>}
                      </div>
                      <span className="font-bold text-[#14233B]">
                        {sub.grade !== null ? `${sub.grade} pts` : 'Under Review'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDF0F4] flex justify-end">
              <button
                onClick={() => setSelectedStudentId(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B]"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: UPLOAD RESOURCE
      ======================================================== */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Publish Learning Material</h3>
              <button onClick={() => setIsMaterialModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                materialMutation.mutate({
                  title: matTitle,
                  description: matDescription,
                  fileUrl: matFileUrl,
                  type: matType,
                  courseId: matTargetType === 'COURSE' ? (matCourseId || coursesData?.[0]?.id) : null,
                  batchId: matTargetType === 'COURSE' ? (matBatchId || null) : null,
                  internshipId: matTargetType === 'INTERNSHIP' ? (matInternshipId || internshipsData?.[0]?.id) : null,
                  module: matModule || null,
                });
              }}
              className="space-y-3 text-xs"
            >
              {/* Program Selector Tabs */}
              <div className="flex rounded-lg border border-[#E4E9F0] p-1 bg-[#F8F9FA]">
                <button
                  type="button"
                  onClick={() => setMatTargetType('COURSE')}
                  className={`flex-1 py-1.5 font-bold rounded-md transition text-center ${
                    matTargetType === 'COURSE' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#667085]'
                  }`}
                >
                  Purchased Course
                </button>
                <button
                  type="button"
                  onClick={() => setMatTargetType('INTERNSHIP')}
                  className={`flex-1 py-1.5 font-bold rounded-md transition text-center ${
                    matTargetType === 'INTERNSHIP' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#667085]'
                  }`}
                >
                  Internship Cohort
                </button>
              </div>

              {matTargetType === 'COURSE' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Assigned Course *</label>
                    <select
                      value={matCourseId}
                      onChange={(e) => setMatCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      {coursesData?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Cohort Batch</label>
                    <select
                      value={matBatchId}
                      onChange={(e) => setMatBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">Course-wide (All Students)</option>
                      {batchesData?.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Assigned Internship *</label>
                    <select
                      value={matInternshipId}
                      onChange={(e) => setMatInternshipId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      {internshipsData?.map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Module / Week</label>
                    <input
                      type="text"
                      placeholder="e.g., Week 2: System Design"
                      value={matModule}
                      onChange={(e) => setMatModule(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Microservices Architecture Handout"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">File or Download URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={matFileUrl}
                  onChange={(e) => setMatFileUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Type</label>
                  <select
                    value={matType}
                    onChange={(e) => setMatType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CODE_FILE">Code File / Repo</option>
                    <option value="PRESENTATION">Presentation Slides</option>
                    <option value="EXTERNAL_LINK">External Resource</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Cohort Batch</label>
                  <select
                    value={matBatchId}
                    onChange={(e) => setMatBatchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="">All Batches</option>
                    {batchesData?.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={materialMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  {materialMutation.isPending ? 'Publishing...' : 'Publish Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE ASSIGNMENT
      ======================================================== */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Create Cohort Assignment</h3>
              <button onClick={() => setIsAssignmentModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                assignmentMutation.mutate({
                  title: asgnTitle,
                  description: asgnDescription,
                  instructions: asgnInstructions,
                  module: asgnModule || null,
                  dueDate: asgnDueDate ? new Date(asgnDueDate).toISOString() : null,
                  totalPoints: Number(asgnPoints),
                  courseId: asgnTargetType === 'COURSE' ? (asgnCourseId || coursesData?.[0]?.id) : null,
                  batchId: asgnTargetType === 'COURSE' ? (asgnBatchId || null) : null,
                  internshipId: asgnTargetType === 'INTERNSHIP' ? (asgnInternshipId || internshipsData?.[0]?.id) : null,
                });
              }}
              className="space-y-3 text-xs"
            >
              {/* Program Selector Tabs */}
              <div className="flex rounded-lg border border-[#E4E9F0] p-1 bg-[#F8F9FA]">
                <button
                  type="button"
                  onClick={() => setAsgnTargetType('COURSE')}
                  className={`flex-1 py-1.5 font-bold rounded-md transition text-center ${
                    asgnTargetType === 'COURSE' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#667085]'
                  }`}
                >
                  Course Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setAsgnTargetType('INTERNSHIP')}
                  className={`flex-1 py-1.5 font-bold rounded-md transition text-center ${
                    asgnTargetType === 'INTERNSHIP' ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#667085]'
                  }`}
                >
                  Internship Project Assignment
                </button>
              </div>

              {asgnTargetType === 'COURSE' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Course *</label>
                    <select
                      value={asgnCourseId}
                      onChange={(e) => setAsgnCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      {coursesData?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Cohort Batch</label>
                    <select
                      value={asgnBatchId}
                      onChange={(e) => setAsgnBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">Course-wide (All Students)</option>
                      {batchesData?.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Internship Program *</label>
                    <select
                      value={asgnInternshipId}
                      onChange={(e) => setAsgnInternshipId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      {internshipsData?.map((i: any) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Module / Milestone</label>
                    <input
                      type="text"
                      placeholder="e.g., Milestone 1: Frontend MVP"
                      value={asgnModule}
                      onChange={(e) => setAsgnModule(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Build Idempotent Payment Webhook"
                  value={asgnTitle}
                  onChange={(e) => setAsgnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Instructions & Problem Statement</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe required architecture, tests, and deliverables..."
                  value={asgnDescription}
                  onChange={(e) => setAsgnDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={asgnDueDate}
                    onChange={(e) => setAsgnDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Maximum Points</label>
                  <input
                    type="number"
                    required
                    value={asgnPoints}
                    onChange={(e) => setAsgnPoints(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignmentMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  {assignmentMutation.isPending ? 'Publishing...' : 'Release Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorDashboardPage;

