import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  Users,
  Award,
  Layers,
  Video,
  DollarSign,
  TrendingUp,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  X,
  ChevronRight,
  Filter,
  RefreshCw,
  UserCheck,
  Briefcase,
  Trophy,
  ArrowUpDown,
  GraduationCap,
  Calendar,
  CheckCircle,
} from 'lucide-react';

export const CourseAnalyticsDashboard: React.FC = () => {
  const toast = useToast();

  // Tab / Selected View State
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'students' | 'analytics'>('students');

  // Search & Filter State for Course Catalog
  const [courseSearch, setCourseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [courseStatusFilter, setCourseStatusFilter] = useState('ALL');

  // Search & Filter State for Students Directory
  const [studentSearch, setStudentSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('ALL');
  const [certFilter, setCertFilter] = useState('ALL');
  const [studentPage, setStudentPage] = useState(1);
  const [sortBy, setSortBy] = useState('enrolledAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Detailed Student Modal State
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // 1. Fetch Comprehensive Overview Statistics
  const { data: overviewData, isLoading: isLoadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-comprehensive-overview'],
    queryFn: async () => {
      const res = await api.get('/admin/course-analytics/overview');
      return res.data.data;
    },
  });

  // 2. Fetch Course Analytics List
  const { data: coursesList = [], isLoading: isLoadingCourses, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-course-analytics-list', courseSearch, categoryFilter, courseStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseSearch) params.set('search', courseSearch);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (courseStatusFilter !== 'ALL') params.set('status', courseStatusFilter);
      const res = await api.get(`/admin/course-analytics/courses?${params.toString()}`);
      return res.data.data || [];
    },
  });

  // 3. Fetch Single Course In-Depth Analytics (when course selected and tab is analytics)
  const { data: singleCourseAnalytics, isLoading: isLoadingSingleCourse } = useQuery({
    queryKey: ['admin-single-course-analytics', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      const res = await api.get(`/admin/courses/${selectedCourseId}/analytics`);
      return res.data.data;
    },
    enabled: !!selectedCourseId && activeCourseTab === 'analytics',
  });

  // 4. Fetch Course Students Directory (when course selected and tab is students)
  const { data: studentsResponse, isLoading: isLoadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: [
      'admin-course-students-dir',
      selectedCourseId,
      studentSearch,
      batchFilter,
      paymentFilter,
      enrollmentStatusFilter,
      certFilter,
      studentPage,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      if (!selectedCourseId) return { students: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 1 } };
      const params = new URLSearchParams({
        page: String(studentPage),
        limit: '15',
        sortBy,
        sortOrder,
      });
      if (studentSearch) params.set('search', studentSearch);
      if (batchFilter !== 'ALL') params.set('batchId', batchFilter);
      if (paymentFilter !== 'ALL') params.set('paymentStatus', paymentFilter);
      if (enrollmentStatusFilter !== 'ALL') params.set('enrollmentStatus', enrollmentStatusFilter);
      if (certFilter !== 'ALL') params.set('certificateStatus', certFilter);

      const res = await api.get(`/admin/courses/${selectedCourseId}/students?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!selectedCourseId && activeCourseTab === 'students',
  });

  // 5. Fetch 360-degree Student Profile
  const { data: studentDetailData, isLoading: isLoadingStudentDetail } = useQuery({
    queryKey: ['admin-student-profile-360', selectedCourseId, inspectStudentId],
    queryFn: async () => {
      if (!selectedCourseId || !inspectStudentId) return null;
      const res = await api.get(`/admin/courses/${selectedCourseId}/students/${inspectStudentId}`);
      return res.data.data;
    },
    enabled: !!selectedCourseId && !!inspectStudentId,
  });

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!selectedCourseId) return;
    const params = new URLSearchParams();
    if (studentSearch) params.set('search', studentSearch);
    if (batchFilter !== 'ALL') params.set('batchId', batchFilter);
    if (paymentFilter !== 'ALL') params.set('paymentStatus', paymentFilter);
    if (enrollmentStatusFilter !== 'ALL') params.set('enrollmentStatus', enrollmentStatusFilter);
    if (certFilter !== 'ALL') params.set('certificateStatus', certFilter);

    const token = localStorage.getItem('token');
    const url = `${api.defaults.baseURL || 'http://localhost:5000/api'}/admin/courses/${selectedCourseId}/export?token=${token}&${params.toString()}`;
    window.open(url, '_blank');
    toast.success('Export Dispatched', 'Generating course student CSV report...');
  };

  const selectedCourse = coursesList.find((c: any) => c.id === selectedCourseId);
  const platform = overviewData?.platform || {};
  const enrollments = overviewData?.enrollments || {};
  const payments = overviewData?.payments || {};
  const learning = overviewData?.learning || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ========================================================
          1. HEADER & GLOBAL REFRESH
      ======================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#14233B]">Course Analytics & Student Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
              Live Verified DB
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Real-time enrollment tracking, student learning telemetry, course-wise financial verification, and batch mentor allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCourseId && (
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setStudentSearch('');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Back to All Courses</span>
            </button>
          )}
          <button
            onClick={() => {
              refetchOverview();
              refetchCourses();
              if (selectedCourseId) {
                refetchStudents();
              }
              toast.success('Analytics Refreshed', 'Telemetry synced with current database records.');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#2563EB]/20 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. PLATFORM & REVENUE KPI METRICS SUITE
      ======================================================== */}
      {!selectedCourseId && (
        <div className="space-y-6">
          {/* Platform Vital Metrics */}
          <div>
            <h3 className="text-xs font-bold text-[#667085] uppercase tracking-wider mb-3">Platform Operations & Registries</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div className="flex items-center justify-between text-[#667085]">
                  <span className="text-[11px] font-semibold">Registered Students</span>
                  <Users className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="text-2xl font-bold text-[#14233B] mt-2">{platform.totalStudents ?? 0}</div>
                <div className="text-[11px] text-[#16845B] font-medium mt-0.5">{platform.activeStudents ?? 0} Verified Active</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div className="flex items-center justify-between text-[#667085]">
                  <span className="text-[11px] font-semibold">Mentors & Staff</span>
                  <UserCheck className="w-4 h-4 text-[#16845B]" />
                </div>
                <div className="text-2xl font-bold text-[#14233B] mt-2">{platform.totalMentors ?? 0}</div>
                <div className="text-[11px] text-[#667085] font-medium mt-0.5">Faculty instructors</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div className="flex items-center justify-between text-[#667085]">
                  <span className="text-[11px] font-semibold">Total Courses</span>
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="text-2xl font-bold text-[#14233B] mt-2">{platform.totalCourses ?? 0}</div>
                <div className="text-[11px] text-[#16845B] font-medium mt-0.5">{platform.publishedCourses ?? 0} Published</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div className="flex items-center justify-between text-[#667085]">
                  <span className="text-[11px] font-semibold">Cohorts & Batches</span>
                  <Layers className="w-4 h-4 text-[#B7791F]" />
                </div>
                <div className="text-2xl font-bold text-[#14233B] mt-2">{platform.totalBatches ?? 0}</div>
                <div className="text-[11px] text-[#667085] font-medium mt-0.5">Assigned groups</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div className="flex items-center justify-between text-[#667085]">
                  <span className="text-[11px] font-semibold">Certificates Issued</span>
                  <Award className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="text-2xl font-bold text-[#14233B] mt-2">{platform.totalCertificates ?? 0}</div>
                <div className="text-[11px] text-[#16845B] font-medium mt-0.5">Accredited grads</div>
              </div>
            </div>
          </div>

          {/* Enrollment & Financial Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Enrollment telemetry */}
            <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF0F4] pb-3">
                <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                  <span>Enrollment Statistics</span>
                </h4>
                <span className="text-xs font-bold text-[#2563EB]">Total: {enrollments.totalEnrollments ?? 0}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E4E9F0]">
                  <span className="text-[11px] text-[#667085] block font-medium">Active Learners</span>
                  <span className="text-lg font-bold text-[#14233B] mt-1 block">{enrollments.activeEnrollments ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#EAF7F0] border border-[#16845B]/20">
                  <span className="text-[11px] text-[#16845B] block font-medium">Graduated</span>
                  <span className="text-lg font-bold text-[#16845B] mt-1 block">{enrollments.completedEnrollments ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#2563EB]/20">
                  <span className="text-[11px] text-[#2563EB] block font-medium">Enrolled This Month</span>
                  <span className="text-lg font-bold text-[#2563EB] mt-1 block">{enrollments.enrolledThisMonth ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Financial telemetry */}
            <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF0F4] pb-3">
                <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#16845B]" />
                  <span>Payment & Financial Settlements</span>
                </h4>
                <span className="text-xs font-bold text-[#16845B]">
                  Net Collected: ₹{Number(payments.netCollectedRevenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#EAF7F0] border border-[#16845B]/20">
                  <span className="text-[11px] text-[#16845B] block font-medium">Verified Orders</span>
                  <span className="text-lg font-bold text-[#16845B] mt-1 block">{payments.verifiedPaymentsCount ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#FFF6E5] border border-[#B7791F]/20">
                  <span className="text-[11px] text-[#B7791F] block font-medium">Pending Orders</span>
                  <span className="text-lg font-bold text-[#B7791F] mt-1 block">{payments.pendingPaymentsCount ?? 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F6F8FB] border border-[#E4E9F0]">
                  <span className="text-[11px] text-[#667085] block font-medium">Discounts Granted</span>
                  <span className="text-lg font-bold text-[#14233B] mt-1 block">
                    ₹{Number(payments.totalDiscounts || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. COURSE CATALOG SELECTION TABLE / CARDS
      ======================================================== */}
      {!selectedCourseId && (
        <div className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#14233B]">Select Course to Inspect Enrolled Students</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Browse catalog curricula, view verified revenue, and click "View Students" for comprehensive roster inspection.
              </p>
            </div>

            {/* Course Filters */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search course title..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E4E9F0] bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <select
                value={courseStatusFilter}
                onChange={(e) => setCourseStatusFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Courses Grid / Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8F9FA] border-b border-[#EDF0F4] text-[#667085] font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Category & Level</th>
                  <th className="py-3 px-4">Mentor Assigned</th>
                  <th className="py-3 px-4">Batches</th>
                  <th className="py-3 px-4 text-center">Enrolled Students</th>
                  <th className="py-3 px-4 text-right">Verified Revenue</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F4]">
                {isLoadingCourses ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#667085]">
                      Loading courses registry...
                    </td>
                  </tr>
                ) : coursesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-[#667085]">
                      No courses found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  coursesList.map((c: any) => (
                    <tr key={c.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-[#E4E9F0]">
                            <img
                              src={c.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                              alt={c.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                              }}
                            />
                          </div>
                          <div>
                            <span className="font-bold text-[#14233B] block max-w-xs truncate">{c.title}</span>
                            <span className="text-[11px] text-[#667085]">
                              Price: {Number(c.price) === 0 ? 'Free' : `₹${Number(c.price).toLocaleString('en-IN')}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#14233B] block">{c.category}</span>
                        <span className="text-[10px] text-[#667085] uppercase">{c.level}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {c.primaryMentor ? (
                          <div>
                            <span className="font-semibold text-[#16845B] block">{c.primaryMentor.name}</span>
                            <span className="text-[10px] text-[#667085]">{c.primaryMentor.email}</span>
                          </div>
                        ) : (
                          <span className="text-[#B7791F] italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#14233B]">
                        {c.batches && c.batches.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#F6F8FB] border border-[#E4E9F0] text-[10px] font-bold">
                            {c.batches.length} Cohort(s)
                          </span>
                        ) : (
                          <span className="text-[#667085] italic text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-[#14233B] text-sm">{c.totalEnrolled}</span>
                        <span className="text-[10px] text-[#16845B] block font-medium">
                          {c.completedStudents} Completed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#16845B]">
                        ₹{Number(c.verifiedRevenue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'PUBLISHED'
                              ? 'bg-[#EAF7F0] text-[#16845B]'
                              : c.status === 'ARCHIVED'
                              ? 'bg-[#FFF0F0] text-[#C03945]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseId(c.id);
                            setActiveCourseTab('students');
                            setStudentPage(1);
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>View Students</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          4. SELECTED COURSE: TOP NAVIGATION & TAB TOGGLE
      ======================================================== */}
      {selectedCourseId && selectedCourse && (
        <div className="space-y-6">
          {/* Selected Course Banner */}
          <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-[#E4E9F0]">
                <img
                  src={selectedCourse.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                  alt={selectedCourse.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#14233B]">{selectedCourse.title}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                    {selectedCourse.status}
                  </span>
                </div>
                <div className="text-xs text-[#667085] flex flex-wrap items-center gap-3 mt-1">
                  <span>Category: <strong className="text-[#14233B]">{selectedCourse.category}</strong></span>
                  <span>Level: <strong className="text-[#14233B]">{selectedCourse.level}</strong></span>
                  <span>Mentor: <strong className="text-[#16845B]">{selectedCourse.primaryMentor?.name || 'Unassigned'}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPI badges */}
            <div className="flex items-center gap-3">
              <div className="text-right px-3 py-1.5 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] uppercase block font-semibold">Total Students</span>
                <span className="text-base font-bold text-[#14233B]">{selectedCourse.totalEnrolled}</span>
              </div>
              <div className="text-right px-3 py-1.5 bg-[#EAF7F0] rounded-xl border border-[#16845B]/20">
                <span className="text-[10px] text-[#16845B] uppercase block font-semibold">Verified Revenue</span>
                <span className="text-base font-bold text-[#16845B]">
                  ₹{Number(selectedCourse.verifiedRevenue || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Export filtered student records to CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex border-b border-[#E4E9F0] gap-6">
            <button
              onClick={() => setActiveCourseTab('students')}
              className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeCourseTab === 'students'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#667085] hover:text-[#14233B]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Enrolled Students Directory</span>
            </button>
            <button
              onClick={() => setActiveCourseTab('analytics')}
              className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeCourseTab === 'analytics'
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#667085] hover:text-[#14233B]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>In-Depth Course Analytics</span>
            </button>
          </div>

          {/* ========================================================
              TAB A: ENROLLED STUDENTS DIRECTORY
          ======================================================== */}
          {activeCourseTab === 'students' && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {/* Search */}
                  <div className="relative md:col-span-2">
                    <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student by name, email, phone..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E4E9F0] bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  {/* Payment Filter */}
                  <div>
                    <select
                      value={paymentFilter}
                      onChange={(e) => {
                        setPaymentFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B]"
                    >
                      <option value="ALL">All Payment Statuses</option>
                      <option value="PAID">PAID (Verified)</option>
                      <option value="PARTIAL">PARTIAL</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>

                  {/* Enrollment Status */}
                  <div>
                    <select
                      value={enrollmentStatusFilter}
                      onChange={(e) => {
                        setEnrollmentStatusFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B]"
                    >
                      <option value="ALL">All Enrollment Status</option>
                      <option value="ACTIVE">Active Learners</option>
                      <option value="COMPLETED">Graduated (Completed)</option>
                    </select>
                  </div>

                  {/* Certificate Status */}
                  <div>
                    <select
                      value={certFilter}
                      onChange={(e) => {
                        setCertFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="w-full text-xs px-3 py-1.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B]"
                    >
                      <option value="ALL">All Certificates</option>
                      <option value="ISSUED">Certificate Issued</option>
                      <option value="NOT_ISSUED">Not Issued</option>
                    </select>
                  </div>
                </div>

                {/* Reset Filters */}
                {(studentSearch || paymentFilter !== 'ALL' || enrollmentStatusFilter !== 'ALL' || certFilter !== 'ALL') && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#EDF0F4] text-xs">
                    <span className="text-[#667085]">Active filters applied</span>
                    <button
                      onClick={() => {
                        setStudentSearch('');
                        setPaymentFilter('ALL');
                        setEnrollmentStatusFilter('ALL');
                        setCertFilter('ALL');
                        setStudentPage(1);
                      }}
                      className="text-[#2563EB] hover:underline font-semibold"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Students Directory Table */}
              <div className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8F9FA] border-b border-[#EDF0F4] text-[#667085] font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Enrolled On</th>
                        <th className="py-3 px-4">Batch & Mentor</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-center">Learning Progress</th>
                        <th className="py-3 px-4 text-center">Attendance</th>
                        <th className="py-3 px-4 text-center">Assignments</th>
                        <th className="py-3 px-4 text-center">Certificate</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {isLoadingStudents ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-[#667085]">
                            Loading student directory...
                          </td>
                        </tr>
                      ) : !studentsResponse?.students || studentsResponse.students.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-[#667085]">
                            No students found enrolled in this course matching the filter criteria.
                          </td>
                        </tr>
                      ) : (
                        studentsResponse.students.map((st: any) => (
                          <tr key={st.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {st.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                  <span className="font-bold text-[#14233B] block">{st.name}</span>
                                  <span className="text-[11px] text-[#667085] block">{st.email}</span>
                                  <span className="text-[10px] text-[#667085] block">{st.phone}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                              {new Date(st.enrolledAt).toLocaleDateString()}
                              <span className="block text-[10px] font-semibold text-[#16845B]">
                                {st.enrollmentStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {st.batch ? (
                                <span className="font-semibold text-[#14233B] block">{st.batch.name}</span>
                              ) : (
                                <span className="text-[#667085] italic block">Universal / Unassigned</span>
                              )}
                              <span className="text-[10px] text-[#16845B] block">
                                Mentor: {st.mentor?.name || 'Course Instructor'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.paymentStatus === 'PAID'
                                    ? 'bg-[#EAF7F0] text-[#16845B]'
                                    : st.paymentStatus === 'PARTIAL'
                                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                                    : st.paymentStatus === 'REFUNDED'
                                    ? 'bg-[#FFF0F0] text-[#C03945]'
                                    : 'bg-[#FFF6E5] text-[#B7791F]'
                                }`}
                              >
                                {st.paymentStatus}
                              </span>
                              <span className="block text-[11px] font-bold text-[#14233B] mt-0.5">
                                ₹{Number(st.amountPaid || 0).toLocaleString('en-IN')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="w-24 mx-auto space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-[#14233B]">
                                  <span>{st.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#2563EB] rounded-full transition-all"
                                    style={{ width: `${Math.min(100, st.progress)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-bold text-[#14233B]">{st.attendancePct}%</span>
                              <span className="text-[10px] text-[#667085] block">
                                {st.attendedClasses}/{st.totalClasses} Sessions
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-bold text-[#14233B]">
                                {st.submittedAssignments} / {st.totalAssignments}
                              </span>
                              <span className="text-[10px] text-[#667085] block">Submitted</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {st.certificate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Issued</span>
                                </span>
                              ) : (
                                <span className="text-[#667085] text-[10px] italic">Pending</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setInspectStudentId(st.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {studentsResponse?.pagination && studentsResponse.pagination.totalPages > 1 && (
                  <div className="p-4 border-t border-[#EDF0F4] flex justify-between items-center text-xs">
                    <span className="text-[#667085]">
                      Showing page {studentsResponse.pagination.page} of {studentsResponse.pagination.totalPages} ({studentsResponse.pagination.total} students)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={studentPage <= 1}
                        onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-50 cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        disabled={studentPage >= studentsResponse.pagination.totalPages}
                        onClick={() => setStudentPage((p) => p + 1)}
                        className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-50 cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB B: IN-DEPTH COURSE ANALYTICS
          ======================================================== */}
          {activeCourseTab === 'analytics' && singleCourseAnalytics && (
            <div className="space-y-6">
              {/* Financial & Revenue Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase block">Total Course Sales</span>
                  <span className="text-xl font-bold text-[#14233B] mt-1 block">
                    ₹{Number(singleCourseAnalytics.revenueStats.totalCourseSales || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#667085] mt-0.5 block">Gross catalog orders</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#16845B] uppercase block">Net Verified Revenue</span>
                  <span className="text-xl font-bold text-[#16845B] mt-1 block">
                    ₹{Number(singleCourseAnalytics.revenueStats.verifiedRevenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#16845B] mt-0.5 block">
                    {singleCourseAnalytics.revenueStats.verifiedPayments} Settled Payments
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#B7791F] uppercase block">Pending Orders</span>
                  <span className="text-xl font-bold text-[#B7791F] mt-1 block">
                    ₹{Number(singleCourseAnalytics.revenueStats.pendingRevenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#B7791F] mt-0.5 block">
                    {singleCourseAnalytics.revenueStats.pendingPayments} Pending Webhooks
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-semibold text-[#C03945] uppercase block">Refunds</span>
                  <span className="text-xl font-bold text-[#C03945] mt-1 block">
                    ₹{Number(singleCourseAnalytics.revenueStats.refundedRevenue || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#C03945] mt-0.5 block">
                    {singleCourseAnalytics.revenueStats.refunds} Refund records
                  </span>
                </div>
              </div>

              {/* Progress & Academic Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Progress Distribution */}
                <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                    <span>Learning Progress Distribution</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-[#14233B] mb-1 font-semibold">
                        <span>Above 75% Progress</span>
                        <span>{singleCourseAnalytics.progressStats.above75} Students</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16845B] rounded-full"
                          style={{
                            width: `${
                              (singleCourseAnalytics.progressStats.above75 /
                                (singleCourseAnalytics.enrollmentStats.totalEnrolled || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#14233B] mb-1 font-semibold">
                        <span>25% - 75% Progress</span>
                        <span>{singleCourseAnalytics.progressStats.between25And75} Students</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full"
                          style={{
                            width: `${
                              (singleCourseAnalytics.progressStats.between25And75 /
                                (singleCourseAnalytics.enrollmentStats.totalEnrolled || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#14233B] mb-1 font-semibold">
                        <span>Below 25% Progress</span>
                        <span>{singleCourseAnalytics.progressStats.below25} Students</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B7791F] rounded-full"
                          style={{
                            width: `${
                              (singleCourseAnalytics.progressStats.below25 /
                                (singleCourseAnalytics.enrollmentStats.totalEnrolled || 1)) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Telemetry */}
                <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
                    <span>Assignment Submissions</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#EDF0F4]">
                      <span className="text-[#667085]">Total Assignments:</span>
                      <strong className="text-[#14233B]">{singleCourseAnalytics.assignmentStats.totalAssignments}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#EDF0F4]">
                      <span className="text-[#667085]">Total Submissions:</span>
                      <strong className="text-[#14233B]">{singleCourseAnalytics.assignmentStats.totalSubmissions}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#EDF0F4]">
                      <span className="text-[#667085]">Evaluated:</span>
                      <strong className="text-[#16845B]">{singleCourseAnalytics.assignmentStats.evaluatedSubmissions}</strong>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#667085]">Average Score:</span>
                      <strong className="text-[#2563EB]">{singleCourseAnalytics.assignmentStats.avgScore}%</strong>
                    </div>
                  </div>
                </div>

                {/* Live Class Attendance */}
                <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-[#2563EB]" />
                    <span>Live Class Attendance</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#EDF0F4]">
                      <span className="text-[#667085]">Scheduled Live Classes:</span>
                      <strong className="text-[#14233B]">{singleCourseAnalytics.attendanceStats.totalLiveClasses}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#EDF0F4]">
                      <span className="text-[#667085]">Total Session Attendees:</span>
                      <strong className="text-[#14233B]">{singleCourseAnalytics.attendanceStats.totalAttendances}</strong>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#667085]">Avg Attendees / Class:</span>
                      <strong className="text-[#16845B]">{singleCourseAnalytics.attendanceStats.avgAttendancePerClass}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          5. MODAL: 360-DEGREE STUDENT PROFILE INSPECTION
      ======================================================== */}
      {inspectStudentId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#14233B]">Student Course Telemetry & Audit Dossier</h3>
                <span className="text-xs text-[#667085]">Live record from Prisma ORM & PostgreSQL</span>
              </div>
              <button
                onClick={() => setInspectStudentId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingStudentDetail || !studentDetailData ? (
              <div className="py-12 text-center text-xs text-[#667085]">Loading detailed student telemetry...</div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Personal Information */}
                <div className="p-4 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {studentDetailData.student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#14233B]">{studentDetailData.student.name}</h4>
                      <p className="text-[#667085]">{studentDetailData.student.email}</p>
                      <p className="text-[11px] text-[#667085]">Phone: {studentDetailData.student.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#667085] block">Account Status</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                      {studentDetailData.student.isVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Course & Payment Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-[#E4E9F0] space-y-1">
                    <span className="text-[11px] font-semibold text-[#667085] block">Course Enrollment</span>
                    <span className="font-bold text-[#14233B] block">{studentDetailData.course.title}</span>
                    <span className="text-[11px] text-[#2563EB] block">
                      Batch: {studentDetailData.course.assignedBatch?.name || 'Unassigned'}
                    </span>
                    <span className="text-[11px] text-[#16845B] block">
                      Mentor: {studentDetailData.course.assignedMentor?.name || 'Assigned Instructor'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E4E9F0] space-y-1">
                    <span className="text-[11px] font-semibold text-[#667085] block">Financial Status</span>
                    <span className="font-bold text-[#16845B] block">
                      Paid: ₹{Number(studentDetailData.payment.amountPaid).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-[#667085] block">
                      Status: <strong>{studentDetailData.payment.status}</strong>
                    </span>
                    {studentDetailData.payment.paymentId && (
                      <span className="text-[10px] text-[#667085] font-mono block">
                        Ref: {studentDetailData.payment.paymentId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Learning Progress */}
                <div className="p-3.5 rounded-xl border border-[#E4E9F0] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#14233B]">Curriculum Completion Progress</span>
                    <span className="font-bold text-[#2563EB]">{studentDetailData.learning.progressPercentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all"
                      style={{ width: `${Math.min(100, studentDetailData.learning.progressPercentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#667085]">
                    <span>Completed: {studentDetailData.learning.completedLessons} Lessons</span>
                    <span>Remaining: {studentDetailData.learning.pendingLessons} Lessons</span>
                  </div>
                </div>

                {/* Attendance & Certificate */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-[#E4E9F0] space-y-1">
                    <span className="font-semibold text-[#667085] block">Live Class Attendance</span>
                    <span className="text-base font-bold text-[#14233B] block">
                      {studentDetailData.attendance.attendancePercentage}%
                    </span>
                    <span className="text-[11px] text-[#667085] block">
                      {studentDetailData.attendance.attendedClasses} of {studentDetailData.attendance.totalClasses} Sessions Attended
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#E4E9F0] space-y-1">
                    <span className="font-semibold text-[#667085] block">Graduation Certificate</span>
                    {studentDetailData.certificate ? (
                      <div>
                        <span className="font-bold text-[#16845B] block">Issued & Verified</span>
                        <span className="font-mono text-[10px] text-[#667085]">
                          No: {studentDetailData.certificate.certificateNo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#667085] italic">Not issued yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

