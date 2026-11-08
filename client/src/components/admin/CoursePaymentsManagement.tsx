import { useToast } from '../../context/ToastContext';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { downloadProtectedFile } from '../../utils/downloadReport';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  ChevronRight,
  ArrowLeft,
  Calendar,
  User,
  BookOpen,
  Users,
  ShieldCheck,
  X,
  CreditCard,
  Layers,
  ChevronLeft,
  FileSpreadsheet,
  Send,
  Check,
  Ban,
  Receipt,
  Trash2,
  Archive,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

export const CoursePaymentsManagement: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const routeParams = useParams<{ courseId?: string }>();
  const navigate = useNavigate();

  // Navigation states: 'LIST' | 'COURSE_DETAILS' | 'STUDENT_PROFILE'
  const [currentView, setCurrentView] = useState<'LIST' | 'COURSE_DETAILS' | 'STUDENT_PROFILE'>(
    routeParams.courseId ? 'COURSE_DETAILS' : 'LIST'
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(routeParams.courseId || null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (routeParams.courseId && routeParams.courseId !== selectedCourseId) {
      setSelectedCourseId(routeParams.courseId);
      setCurrentView('COURSE_DETAILS');
    }
  }, [routeParams.courseId]);

  // Search & Filters for Course List
  const [courseSearch, setCourseSearch] = useState('');
  const [coursePage, setCoursePage] = useState(1);

  // Search & Filters for Course Student Table
  const [studentSearch, setStudentSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBalance, setFilterBalance] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [studentPage, setStudentPage] = useState(1);

  // Modals & Actions
  const [reconcilingPaymentId, setReconcilingPaymentId] = useState<string | null>(null);
  const [refundDialogPayment, setRefundDialogPayment] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [transactionDetailModal, setTransactionDetailModal] = useState<any | null>(null);
  const [reminderModalStudent, setReminderModalStudent] = useState<any | null>(null);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // 1. OVERALL PAYMENT DASHBOARD METRICS
  const { data: overviewData, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-payments-overview'],
    queryFn: async () => {
      const res = await api.get('/admin/payments/overview');
      return res.data.data;
    },
  });

  // 2. COURSE-WISE PAYMENTS LIST
  const { data: coursesResponse, isLoading: isCoursesLoading, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-payments-courses', courseSearch, coursePage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseSearch) params.set('search', courseSearch);
      params.set('page', String(coursePage));
      params.set('limit', '10');
      const res = await api.get(`/admin/payments/courses?${params.toString()}`);
      return res.data;
    },
  });

  // 3. COURSE-SPECIFIC DETAIL
  const { data: courseDetailResponse, isLoading: isCourseDetailLoading, refetch: refetchCourseDetail } = useQuery({
    queryKey: ['admin-course-payment-detail', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      const res = await api.get(`/admin/payments/courses/${selectedCourseId}`);
      return res.data.data;
    },
    enabled: !!selectedCourseId,
  });

  // 4. COURSE-SPECIFIC STUDENTS LIST
  const { data: courseStudentsResponse, isLoading: isCourseStudentsLoading, refetch: refetchCourseStudents } = useQuery({
    queryKey: [
      'admin-course-students',
      selectedCourseId,
      studentSearch,
      filterPlan,
      filterStatus,
      filterBalance,
      filterBatch,
      filterStartDate,
      filterEndDate,
      studentPage,
    ],
    queryFn: async () => {
      if (!selectedCourseId) return null;
      const params = new URLSearchParams();
      if (studentSearch) params.set('search', studentSearch);
      if (filterPlan) params.set('paymentPlan', filterPlan);
      if (filterStatus) params.set('paymentStatus', filterStatus);
      if (filterBalance) params.set('balanceStatus', filterBalance);
      if (filterBatch) params.set('batchId', filterBatch);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);
      params.set('page', String(studentPage));
      params.set('limit', '15');
      const res = await api.get(`/admin/payments/courses/${selectedCourseId}/students?${params.toString()}`);
      return res.data;
    },
    enabled: !!selectedCourseId && currentView === 'COURSE_DETAILS',
  });

  // 5. INDIVIDUAL STUDENT PAYMENT PROFILE
  const { data: studentProfileData, isLoading: isStudentProfileLoading, refetch: refetchStudentProfile } = useQuery({
    queryKey: ['admin-student-payment-profile', selectedStudentId, selectedCourseId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const url = selectedCourseId
        ? `/admin/payments/students/${selectedStudentId}?courseId=${selectedCourseId}`
        : `/admin/payments/students/${selectedStudentId}`;
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: !!selectedStudentId && currentView === 'STUDENT_PROFILE',
  });

  // MUTATIONS: REFUND & RECONCILIATION
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      return api.post('/admin/payments/refund', { paymentId, reason });
    },
    onSuccess: () => {
      toast.success('Refund Processed', 'Refund processed successfully. Access and financial records updated.');
      setRefundDialogPayment(null);
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ['admin-course-payment-detail', selectedCourseId] });
        queryClient.invalidateQueries({ queryKey: ['admin-course-students', selectedCourseId] });
      }
      if (selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['admin-student-payment-profile', selectedStudentId] });
      }
    },
    onError: (err: any) => {
      toast.apiError(err, 'Refund failed to execute');
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return api.post(`/admin/payments/reconcile/${paymentId}`);
    },
    onSuccess: (res) => {
      toast.success('Reconciled', res.data.message || 'Reconciliation completed.');
      setReconcilingPaymentId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ['admin-course-payment-detail', selectedCourseId] });
        queryClient.invalidateQueries({ queryKey: ['admin-course-students', selectedCourseId] });
      }
      if (selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['admin-student-payment-profile', selectedStudentId] });
      }
    },
    onError: (err: any) => {
      toast.apiError(err, 'Reconciliation failed');
      setReconcilingPaymentId(null);
    },
  });

  // Action Mutation (DELETE, CANCEL, ARCHIVE)
  const paymentActionMutation = useMutation({
    mutationFn: async ({
      paymentId,
      action,
      reason,
      deleteEnrollment,
      confirmedPermanent,
    }: {
      paymentId: string;
      action: 'DELETE' | 'CANCEL' | 'ARCHIVE';
      reason?: string;
      deleteEnrollment?: boolean;
      confirmedPermanent?: boolean;
    }) => {
      const res = await api.delete(`/admin/payments/${paymentId}`, {
        data: { action, reason, deleteEnrollment, confirmedPermanent },
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        data?.archived ? 'Record Archived' : data?.cancelled ? 'Order Cancelled' : 'Order Deleted',
        data?.message || 'Operation completed successfully.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-analytics-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ['admin-course-payment-detail', selectedCourseId] });
        queryClient.invalidateQueries({ queryKey: ['admin-course-students', selectedCourseId] });
      }
      if (selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['admin-student-payment-profile', selectedStudentId] });
      }
    },
    onError: (err: any) => {
      toast.apiError(err, 'Payment action failed');
    },
  });

  // Revoke Course Access Mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const res = await api.post(`/admin/payments/${paymentId}/revoke-access`, { reason });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success('Access Revoked', data?.message || 'Course access revoked successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-summary'] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ['admin-course-payment-detail', selectedCourseId] });
        queryClient.invalidateQueries({ queryKey: ['admin-course-students', selectedCourseId] });
      }
      if (selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['admin-student-payment-profile', selectedStudentId] });
      }
    },
    onError: (err: any) => {
      toast.apiError(err, 'Revoke access failed');
    },
  });

  const handleExportCSV = async () => {
    const params: Record<string, any> = {};
    if (selectedCourseId) params.courseId = selectedCourseId;
    if (filterPlan) params.paymentPlan = filterPlan;
    if (filterStartDate) params.startDate = filterStartDate;
    if (filterEndDate) params.endDate = filterEndDate;
    if (studentSearch) params.search = studentSearch;

    try {
      toast.info('Downloading Payment Report', 'Preparing CSV export with applied filters...');
      await downloadProtectedFile('/admin/payments/export', params, {
        fallbackFilename: `payments_report_${selectedCourseId || 'all'}_${Date.now()}.csv`,
      });
      toast.success('Export Complete', 'Payment CSV report downloaded successfully.');
    } catch (err: any) {
      if (err.response?.status === 401) {
        toast.error('Session Expired', 'Your admin session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('Access Denied', 'You do not have administrative permissions to export payments.');
      } else {
        toast.error('Export Failed', err.message || 'Unable to download payment report.');
      }
    }
  };

  const clearFilters = () => {
    setStudentSearch('');
    setFilterPlan('');
    setFilterStatus('');
    setFilterBalance('');
    setFilterBatch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setStudentPage(1);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* ========================================================
          BREADCRUMB & HEADER NAVIGATION
      ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-[#E4E9F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-[#667085] mb-1">
            <button
              onClick={() => {
                setCurrentView('LIST');
                setSelectedCourseId(null);
                setSelectedStudentId(null);
              }}
              className={`hover:text-[#2563EB] font-medium transition ${
                currentView === 'LIST' ? 'text-[#14233B] font-bold' : ''
              }`}
            >
              Course Payments
            </button>
            {selectedCourseId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => {
                    setCurrentView('COURSE_DETAILS');
                    setSelectedStudentId(null);
                  }}
                  className={`hover:text-[#2563EB] font-medium transition ${
                    currentView === 'COURSE_DETAILS' ? 'text-[#14233B] font-bold' : ''
                  }`}
                >
                  {courseDetailResponse?.course?.title || 'Course Details'}
                </button>
              </>
            )}
            {selectedStudentId && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[#2563EB] font-bold">
                  {studentProfileData?.student?.name || 'Student Profile'}
                </span>
              </>
            )}
          </nav>
          <h2 className="text-xl font-bold text-[#14233B]">
            {currentView === 'LIST' && 'Course-Wise Payment Management'}
            {currentView === 'COURSE_DETAILS' && (courseDetailResponse?.course?.title || 'Course Payment Dashboard')}
            {currentView === 'STUDENT_PROFILE' &&
              `Student Payment Profile: ${studentProfileData?.student?.name || 'Loading...'}`}
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Real-time financial telemetry, installment reconciliations, verified Razorpay records, and balance management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentView !== 'LIST' && (
            <button
              onClick={() => {
                if (currentView === 'STUDENT_PROFILE') {
                  setCurrentView('COURSE_DETAILS');
                  setSelectedStudentId(null);
                } else {
                  setCurrentView('LIST');
                  setSelectedCourseId(null);
                  if (routeParams.courseId) {
                    navigate('/admin/course-payments');
                  }
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-xl transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => {
              refetchOverview();
              refetchCourses();
              if (selectedCourseId) {
                refetchCourseDetail();
                refetchCourseStudents();
              }
              if (selectedStudentId) {
                refetchStudentProfile();
              }
            }}
            className="p-2 text-[#667085] hover:text-[#2563EB] bg-white border border-[#E4E9F0] hover:border-[#2563EB] rounded-xl transition"
            title="Refresh All Real Database Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================
          PHASE 1: DEDICATED 10 SUMMARY METRIC CARDS
      ======================================================== */}
      {isOverviewLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : overviewData ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Courses */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">1. Total Courses</span>
              <BookOpen className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="text-xl font-black text-[#14233B]">
              {overviewData.totalCourses ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Active curriculum offerings</span>
          </div>

          {/* Card 2: Total Enrolled Students */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">2. Enrolled Students</span>
              <Users className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="text-xl font-black text-[#14233B]">
              {overviewData.totalEnrolledStudents ?? overviewData.totalEnrollments ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Distinct student learners</span>
          </div>

          {/* Card 3: Total Course Revenue */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs hover:shadow-xs transition">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">3. Course Revenue</span>
              <DollarSign className="w-4 h-4 text-[#173B73]" />
            </div>
            <div className="text-xl font-black text-[#14233B]">
              ₹{Number(overviewData.totalCourseRevenue ?? overviewData.totalCourseSalesValue ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Total payable enrollment value</span>
          </div>

          {/* Card 4: Actual Amount Collected */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">4. Amount Collected</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700">
              ₹{Number(overviewData.actualAmountCollected ?? overviewData.successfullyCollectedRevenue ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Verified completed payments</span>
          </div>

          {/* Card 5: Outstanding Installment Balance */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-amber-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">5. Outstanding Balance</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700">
              ₹{Number(overviewData.outstandingInstallmentBalance ?? overviewData.outstandingStudentBalances ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-600 block mt-0.5">Pending student installments</span>
          </div>

          {/* Card 6: Students Who Paid in Full */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">6. Paid in Full</span>
              <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
            </div>
            <div className="text-xl font-black text-[#16845B]">
              {overviewData.studentsPaidInFull ?? overviewData.fullyPaidEnrollments ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Zero balance remaining</span>
          </div>

          {/* Card 7: Students Who Paid Partially */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">7. Paid Partially</span>
              <Clock className="w-4 h-4 text-[#B7791F]" />
            </div>
            <div className="text-xl font-black text-[#B7791F]">
              {overviewData.studentsPaidPartially ?? overviewData.partiallyPaidEnrollments ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Active installment plans</span>
          </div>

          {/* Card 8: Students With Pending Payments */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">8. Pending Payments</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600">
              {overviewData.studentsWithPendingPayments ?? overviewData.pendingTransactions ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Awaiting gateway verification</span>
          </div>

          {/* Card 9: Failed Transactions */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs">
            <div className="flex items-center justify-between text-[#667085] mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">9. Failed Payments</span>
              <Ban className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-black text-rose-600">
              {overviewData.failedTransactions ?? 0}
            </div>
            <span className="text-[10px] text-[#667085] block mt-0.5">Rejected by user or bank</span>
          </div>

          {/* Card 10: Refunded Amount */}
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-purple-800 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">10. Refunded Amount</span>
              <RotateCcw className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700">
              ₹{Number(overviewData.refundedAmount ?? overviewData.successfullyRefundedAmount ?? 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-purple-600 block mt-0.5">
              {overviewData.refundedTransactionsCount ?? 0} refunded orders
            </span>
          </div>
        </div>
      ) : null}

      {/* ========================================================
          VIEW 1: COURSE-WISE DASHBOARD (PHASE 2)
      ======================================================== */}
      {currentView === 'LIST' && (
        <div className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search course title or course ID..."
                value={courseSearch}
                onChange={(e) => {
                  setCourseSearch(e.target.value);
                  setCoursePage(1);
                }}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Transactions CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[10px] font-bold border-b border-[#E4E9F0]">
                <tr>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Fee Structure</th>
                  <th className="py-3 px-4">Installments</th>
                  <th className="py-3 px-4 text-center">Enrolled</th>
                  <th className="py-3 px-4 text-center">Paid (Full / Part)</th>
                  <th className="py-3 px-4">Total Collected</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4 text-center">Status Counts</th>
                  <th className="py-3 px-4">Latest Payment</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF0F4]">
                {isCoursesLoading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading course payment records...
                    </td>
                  </tr>
                ) : !coursesResponse?.data || coursesResponse.data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No courses found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  coursesResponse.data.map((course: any) => (
                    <tr key={course.courseId} className="hover:bg-[#F6F8FB]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#14233B] block truncate max-w-xs" title={course.courseTitle}>
                          {course.courseTitle}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">ID: {course.courseId}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-[#14233B]">₹{course.finalPayablePrice.toLocaleString()}</div>
                        {course.discountPrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{course.coursePrice.toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {course.allowInstallments ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-[#EAF5EA] text-[#2563EB] border border-blue-200">
                              Enabled (Min: ₹{course.minInstallmentAmount})
                            </span>
                            <span className="text-[9px] text-[#667085] block font-medium">
                              Policy: {course.installmentPolicy}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-500">
                            Full Only
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[#14233B]">
                        {course.enrolledStudentsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600">{course.fullyPaidStudentsCount}</span> /{' '}
                        <span className="font-bold text-amber-600">{course.partiallyPaidStudentsCount}</span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-emerald-600">
                        ₹{Number(course.totalCollectedAmount || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        {Number(course.totalOutstandingBalance) > 0 ? (
                          <span className="font-bold text-amber-600">
                            ₹{Number(course.totalOutstandingBalance).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[10px]">
                          {course.pendingTransactionsCount > 0 && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                              title="Pending transactions"
                            >
                              P:{course.pendingTransactionsCount}
                            </span>
                          )}
                          {course.failedTransactionsCount > 0 && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                              title="Failed transactions"
                            >
                              F:{course.failedTransactionsCount}
                            </span>
                          )}
                          {course.refundedTransactionsCount > 0 && (
                            <span
                              className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold"
                              title="Refunded transactions"
                            >
                              R:{course.refundedTransactionsCount}
                            </span>
                          )}
                          {!course.pendingTransactionsCount &&
                            !course.failedTransactionsCount &&
                            !course.refundedTransactionsCount && (
                              <span className="text-slate-400">&mdash;</span>
                            )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {course.latestPaymentDate
                          ? new Date(course.latestPaymentDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'No payments'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCourseId(course.courseId);
                            setCurrentView('COURSE_DETAILS');
                            setStudentPage(1);
                            navigate(`/admin/course-payments/${course.courseId}`);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#2563EB] hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {coursesResponse?.pagination && coursesResponse.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#EDF0F4] text-xs">
              <span className="text-[#667085]">
                Page {coursesResponse.pagination.page} of {coursesResponse.pagination.totalPages} ({coursesResponse.pagination.totalCourses} Courses)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={coursePage <= 1}
                  onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-40 hover:bg-[#F6F8FB]"
                >
                  Previous
                </button>
                <button
                  disabled={coursePage >= coursesResponse.pagination.totalPages}
                  onClick={() => setCoursePage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-40 hover:bg-[#F6F8FB]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          VIEW 2: COURSE-SPECIFIC PAYMENT DETAILS (PHASE 3)
      ======================================================== */}
      {currentView === 'COURSE_DETAILS' && selectedCourseId && (
        <div className="space-y-6">
          {/* A. Course Summary Cards */}
          {isCourseDetailLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : courseDetailResponse ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 bg-white rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] font-semibold block uppercase">Course Fee</span>
                <span className="text-base font-black text-[#14233B] mt-0.5 block">
                  ₹{courseDetailResponse.course.courseFee.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] font-semibold block uppercase">Enrolled</span>
                <span className="text-base font-black text-[#2563EB] mt-0.5 block">
                  {courseDetailResponse.metrics.enrolledStudents}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] font-semibold block uppercase">Fully Paid</span>
                <span className="text-base font-black text-emerald-600 mt-0.5 block">
                  {courseDetailResponse.metrics.fullyPaidStudents}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] font-semibold block uppercase">Partial Paid</span>
                <span className="text-base font-black text-amber-600 mt-0.5 block">
                  {courseDetailResponse.metrics.partiallyPaidStudents}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Total Collected</span>
                <span className="text-base font-black text-emerald-700 mt-0.5 block">
                  ₹{courseDetailResponse.metrics.totalCollected.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-semibold block uppercase">Outstanding</span>
                <span className="text-base font-black text-amber-700 mt-0.5 block">
                  ₹{courseDetailResponse.metrics.outstandingBalances.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E4E9F0]">
                <span className="text-[10px] text-[#667085] font-semibold block uppercase">Pending Tx</span>
                <span className="text-base font-black text-amber-600 mt-0.5 block">
                  {courseDetailResponse.metrics.pendingTransactions}
                </span>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                <span className="text-[10px] text-purple-800 font-semibold block uppercase">Refund Total</span>
                <span className="text-base font-black text-purple-700 mt-0.5 block">
                  ₹{courseDetailResponse.metrics.refundTotal.toLocaleString()}
                </span>
              </div>
            </div>
          ) : null}

          {/* C. Server-Side Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Student name, email, phone, ID..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              {/* Payment Plan */}
              <select
                value={filterPlan}
                onChange={(e) => {
                  setFilterPlan(e.target.value);
                  setStudentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg focus:bg-white text-[#14233B]"
              >
                <option value="">Plan: All</option>
                <option value="FULL">FULL</option>
                <option value="INSTALLMENT">INSTALLMENT</option>
              </select>

              {/* Payment Status */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setStudentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg focus:bg-white text-[#14233B]"
              >
                <option value="">Status: All</option>
                <option value="FULLY_PAID">Fully Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>

              {/* Balance Status */}
              <select
                value={filterBalance}
                onChange={(e) => {
                  setFilterBalance(e.target.value);
                  setStudentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg focus:bg-white text-[#14233B]"
              >
                <option value="">Balance: All</option>
                <option value="OUTSTANDING">Outstanding (&gt;0)</option>
                <option value="CLEARED">Cleared (₹0)</option>
              </select>

              {/* Batch Filter */}
              {courseDetailResponse?.batches && courseDetailResponse.batches.length > 0 && (
                <select
                  value={filterBatch}
                  onChange={(e) => {
                    setFilterBatch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg focus:bg-white text-[#14233B]"
                >
                  <option value="">Batch: All</option>
                  {courseDetailResponse.batches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.name})
                    </option>
                  ))}
                </select>
              )}

              {/* Date Range */}
              <div className="flex items-center gap-1.5 text-xs text-[#667085]">
                <Calendar className="w-3.5 h-3.5" />
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-2 py-1 bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg text-xs"
                  title="Enrolled From"
                />
                <span>to</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setStudentPage(1);
                  }}
                  className="px-2 py-1 bg-[#F6F8FB] border border-[#E4E9F0] rounded-lg text-xs"
                  title="Enrolled To"
                />
              </div>

              {/* Actions */}
              <button
                onClick={clearFilters}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Clear
              </button>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-lg transition ml-auto flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Filtered CSV</span>
              </button>
            </div>
          </div>

          {/* B. Student Payment Table */}
          <div className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#EDF0F4] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#14233B]">
                  Enrolled Students & Payment Ledgers ({courseStudentsResponse?.pagination?.totalRecords || 0})
                </h3>
                <p className="text-[11px] text-[#667085]">
                  Verified course receipts, installment status, and individual balances.
                </p>
              </div>
              <span className="text-[11px] font-medium text-[#2563EB] bg-[#EAF5EA] px-2.5 py-1 rounded-lg">
                14 Audit Columns Enabled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[1200px]">
                <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[10px] font-bold border-b border-[#E4E9F0]">
                  <tr>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Student Email</th>
                    <th className="py-3 px-3">Student Phone</th>
                    <th className="py-3 px-3">Course Price</th>
                    <th className="py-3 px-3">Min Initial Payment</th>
                    <th className="py-3 px-3">Total Paid</th>
                    <th className="py-3 px-3">Remaining Balance</th>
                    <th className="py-3 px-3">Payment Type</th>
                    <th className="py-3 px-3">Payment Status</th>
                    <th className="py-3 px-3 text-center">Installments Paid</th>
                    <th className="py-3 px-3">Last Payment Date</th>
                    <th className="py-3 px-3">Next Due Date</th>
                    <th className="py-3 px-3">Enrollment Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F4]">
                  {isCourseStudentsLoading ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Querying student payment ledgers...
                      </td>
                    </tr>
                  ) : !courseStudentsResponse?.data || courseStudentsResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        No student payment records found matching active filters.
                      </td>
                    </tr>
                  ) : (
                    courseStudentsResponse.data.map((student: any) => (
                      <tr key={student.studentId} className="hover:bg-[#F6F8FB]/80 transition-colors">
                        {/* 1. Student Name */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#14233B] block">{student.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {student.studentId.slice(0, 10)}...</span>
                        </td>

                        {/* 2. Student Email */}
                        <td className="py-3 px-3 text-[#14233B] font-medium">
                          {student.email}
                        </td>

                        {/* 3. Student Phone */}
                        <td className="py-3 px-3 text-[#667085]">
                          {student.phone || 'N/A'}
                        </td>

                        {/* 4. Course Price */}
                        <td className="py-3 px-3 font-bold text-[#14233B]">
                          ₹{(student.coursePrice ?? student.totalCourseFee ?? 0).toLocaleString()}
                        </td>

                        {/* 5. Minimum Initial Payment */}
                        <td className="py-3 px-3 text-[#667085] font-medium">
                          ₹{(student.minInitialPayment ?? student.coursePrice ?? student.totalCourseFee ?? 0).toLocaleString()}
                        </td>

                        {/* 6. Total Paid */}
                        <td className="py-3 px-3 font-black text-emerald-600">
                          ₹{(student.totalPaid ?? student.totalVerifiedPaid ?? 0).toLocaleString()}
                        </td>

                        {/* 7. Remaining Balance */}
                        <td className="py-3 px-3">
                          {student.remainingBalance > 0 ? (
                            <span className="font-bold text-amber-600">
                              ₹{student.remainingBalance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              ₹0.00
                            </span>
                          )}
                        </td>

                        {/* 8. Payment Type */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                              student.paymentPlan === 'INSTALLMENT' || student.paymentType === 'Installment'
                                ? 'bg-[#EAF5EA] text-[#2563EB] border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {student.paymentType || (student.paymentPlan === 'INSTALLMENT' ? 'Installment' : 'Full Payment')}
                          </span>
                        </td>

                        {/* 9. Payment Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                              student.rawPaymentStatus === 'FULLY_PAID' || student.paymentStatus === 'Paid in Full'
                                ? 'bg-[#EAF7F0] text-[#16845B]'
                                : student.rawPaymentStatus === 'PARTIAL' || student.paymentStatus === 'Partially Paid'
                                ? 'bg-[#FFF6E5] text-[#B7791F]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {student.paymentStatus}
                          </span>
                        </td>

                        {/* 10. Installments Paid */}
                        <td className="py-3 px-3 text-center font-bold text-[#14233B]">
                          {student.installmentsPaid ?? 0}
                        </td>

                        {/* 11. Last Payment Date */}
                        <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {student.lastPaymentDate || student.latestPaymentDate
                            ? new Date(student.lastPaymentDate || student.latestPaymentDate).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'None'}
                        </td>

                        {/* 12. Next Due Date */}
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {student.nextDueDate || (student.remainingBalance > 0 ? 'Flexible' : 'Completed')}
                        </td>

                        {/* 13. Enrollment Date */}
                        <td className="py-3 px-3 text-[#667085] text-[11px] whitespace-nowrap">
                          {new Date(student.enrollmentDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* 14. Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {student.remainingBalance > 0 && (
                              <button
                                onClick={() => {
                                  setReminderModalStudent(student);
                                  setReminderMessage('');
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                title="Send payment reminder to student"
                              >
                                <Send className="w-3 h-3" />
                                <span>Remind</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.studentId);
                                setCurrentView('STUDENT_PROFILE');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#2563EB] hover:text-white rounded-lg transition whitespace-nowrap cursor-pointer"
                            >
                              View Payment History
                            </button>
                            {student.latestPaymentId && (
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Delete Student Course Payment & Enrollment',
                                    message: `Permanently delete course payment record ${student.latestPaymentId} (Order: ${student.latestRazorpayOrderId || 'N/A'}, Status: ${student.latestPaymentStatus}, Paid: ₹${Number(student.totalPaid).toLocaleString()}) for "${student.name}" on this course?\n\nThis will remove the student's enrollment and all related course access from their dashboard in MySQL.`,
                                    confirmText: 'Delete Enrollment & Payment',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({
                                      paymentId: student.latestPaymentId,
                                      action: 'DELETE',
                                      deleteEnrollment: true,
                                      confirmedPermanent: true,
                                      reason: 'Admin deleted student payment and enrollment from Course Students Directory',
                                    });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Course Payment & Enrollment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Student Pagination */}
            {courseStudentsResponse?.pagination && courseStudentsResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#EDF0F4] text-xs">
                <span className="text-[#667085]">
                  Page {courseStudentsResponse.pagination.page} of {courseStudentsResponse.pagination.totalPages} ({courseStudentsResponse.pagination.totalRecords} Records)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-40 hover:bg-[#F6F8FB]"
                  >
                    Previous
                  </button>
                  <button
                    disabled={studentPage >= courseStudentsResponse.pagination.totalPages}
                    onClick={() => setStudentPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-[#E4E9F0] disabled:opacity-40 hover:bg-[#F6F8FB]"
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
          VIEW 3: INDIVIDUAL STUDENT PAYMENT PROFILE (PHASE 4 & 6)
      ======================================================== */}
      {currentView === 'STUDENT_PROFILE' && selectedStudentId && (
        <div className="space-y-6">
          {isStudentProfileLoading ? (
            <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ) : studentProfileData ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EDF0F4]">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#173B73] text-white flex items-center justify-center text-xl font-bold">
                      {studentProfileData.student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#14233B]">{studentProfileData.student.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085] mt-1">
                        <span>Email: <strong className="text-slate-800">{studentProfileData.student.email}</strong></span>
                        <span>&bull;</span>
                        <span>Phone: <strong className="text-slate-800">{studentProfileData.student.phone || 'N/A'}</strong></span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-400">ID: {studentProfileData.student.id}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      studentProfileData.paymentStatus === 'FULLY_PAID'
                        ? 'bg-[#EAF7F0] text-[#16845B]'
                        : studentProfileData.paymentStatus === 'PARTIAL'
                        ? 'bg-[#FFF6E5] text-[#B7791F]'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {studentProfileData.paymentStatus}
                  </span>
                </div>

                {/* Financial Summary Ledger */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F6F8FB]">
                    <span className="text-[10px] text-[#667085] uppercase font-bold block">Course Price</span>
                    <span className="text-sm font-black text-[#14233B] mt-0.5 block">
                      ₹{studentProfileData.originalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FB]">
                    <span className="text-[10px] text-[#667085] uppercase font-bold block">Payable Amount</span>
                    <span className="text-sm font-black text-[#14233B] mt-0.5 block">
                      ₹{studentProfileData.finalPayableAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Total Paid</span>
                    <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                      ₹{studentProfileData.totalSuccessfullyCollected.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] text-rose-800 uppercase font-bold block">Remaining Due</span>
                    <span className="text-sm font-black text-rose-700 mt-0.5 block">
                      ₹{studentProfileData.remainingAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FB]">
                    <span className="text-[10px] text-[#667085] uppercase font-bold block">Completion</span>
                    <span className="text-sm font-black text-[#2563EB] mt-0.5 block">
                      {studentProfileData.paymentCompletionPercentage}%
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FB]">
                    <span className="text-[10px] text-[#667085] uppercase font-bold block">Policy</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">
                      {studentProfileData.installmentPolicy}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Payment Completion Progress</span>
                    <span className="text-[#2563EB] font-bold">{studentProfileData.paymentCompletionPercentage}% Cleared</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                      style={{ width: `${studentProfileData.paymentCompletionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Full Transaction Timeline */}
              <div className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-2xs space-y-4 p-5">
                <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider">
                  Complete Transaction Timeline ({studentProfileData.transactionTimeline.length} Records)
                </h4>

                <div className="divide-y divide-[#EDF0F4]">
                  {studentProfileData.transactionTimeline.map((tx: any) => (
                    <div key={tx.paymentRecordId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              tx.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : tx.status === 'REFUNDED'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : tx.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {tx.status}
                          </span>
                          <span className="text-xs font-mono text-slate-500">Order: {tx.razorpayOrderId}</span>
                          {tx.razorpayPaymentId && (
                            <span className="text-xs font-mono text-[#2563EB]">Pay ID: {tx.razorpayPaymentId}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="font-bold text-[#14233B]">
                            {tx.courseTitle || 'Learning Product / Service'}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-500">{tx.paymentPlan} Plan</span>
                          {tx.couponCode && (
                            <span className="px-1.5 py-0.2 bg-[#EAF5EA] text-blue-700 text-[10px] font-bold rounded">
                              Coupon: {tx.couponCode} (-₹{tx.discountAmount})
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Created: {new Date(tx.createdAt).toLocaleString()}</span>
                          {tx.refundId && (
                            <span className="text-purple-600 font-medium">Refund Ref: {tx.refundId}</span>
                          )}
                        </div>
                      </div>

                      {/* Right Amount and Actions */}
                      <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                        <div className="text-right">
                          <span className="text-base font-black text-[#14233B]">
                            ₹{tx.amount.toLocaleString()} {tx.currency}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Rec ID: {tx.paymentRecordId.substring(0, 10)}...
                          </span>
                        </div>

                        {/* ACTION BUTTONS ACCORDING TO STATE & AUDIT SAFETY */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* View Full Raw Audit Detail */}
                          <button
                            onClick={() => setTransactionDetailModal(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Inspect Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Completed: View Details, Refund, Archive, and Permanent Delete */}
                          {tx.status === 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => {
                                  setRefundDialogPayment(tx);
                                  setRefundReason('');
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-[#C03945] hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
                              >
                                Refund
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Archive Completed Payment Record',
                                    message: `Archive completed payment of ₹${tx.amount.toLocaleString()} (Order: ${tx.razorpayOrderId})? This marks the record archived for compliance while preserving full legal audit history.`,
                                    confirmText: 'Archive Record',
                                    isDestructive: false,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'ARCHIVE', reason: 'Archived from student payment profile' });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Archive Completed Record"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              {tx.courseId && (
                                <button
                                  onClick={async () => {
                                    const confirmed = await toast.confirm({
                                      title: 'Revoke Student Course Access',
                                      message: `Revoke course enrollment for ${studentProfileData?.student?.name} in "${tx.courseTitle}"? The payment record of ₹${tx.amount.toLocaleString()} will remain safely preserved in the financial ledger.`,
                                      confirmText: 'Revoke Access',
                                      isDestructive: true,
                                    });
                                    if (confirmed) {
                                      revokeAccessMutation.mutate({ paymentId: tx.paymentRecordId, reason: 'Admin revoked student access from payment profile' });
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                  title="Revoke Course Access"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Permanently Delete Payment & Enrollment',
                                    message: `WARNING: You are about to permanently delete payment record ${tx.paymentRecordId} (Order: ${tx.razorpayOrderId}, Amount: ₹${tx.amount.toLocaleString()}) for student "${studentProfileData?.student?.name}" on course "${tx.courseTitle}".\n\nThis will remove the course from the Student's Dashboard and cancel their enrollment in MySQL database. This operation cannot be undone.\n\nNote: Deleting local database record does not reverse gateway funds.`,
                                    confirmText: 'Delete Permanently',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({
                                      paymentId: tx.paymentRecordId,
                                      action: 'DELETE',
                                      deleteEnrollment: true,
                                      confirmedPermanent: true,
                                      reason: 'Admin explicitly deleted completed payment and enrollment',
                                    });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Permanently Delete Payment & Enrollment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Pending: Reconcile, Cancel, or Delete */}
                          {tx.status === 'PENDING' && (
                            <>
                              <button
                                disabled={reconcilingPaymentId === tx.paymentRecordId}
                                onClick={() => {
                                  setReconcilingPaymentId(tx.paymentRecordId);
                                  reconcileMutation.mutate(tx.paymentRecordId);
                                }}
                                className="px-2 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                {reconcilingPaymentId === tx.paymentRecordId ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3" />
                                )}
                                <span>Reconcile</span>
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Cancel Pending Payment Order',
                                    message: `Cancel pending payment order ${tx.razorpayOrderId} for ₹${tx.amount.toLocaleString()}? Status will be marked as FAILED and reserved coupons released.`,
                                    confirmText: 'Cancel Order',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'CANCEL', reason: 'Admin cancelled pending order' });
                                  }
                                }}
                                className="px-2 py-1 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
                                title="Cancel Pending Order"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Delete Unpaid Payment Order',
                                    message: `Permanently delete unpaid pending payment order ${tx.razorpayOrderId} (₹${tx.amount.toLocaleString()}) for student ${studentProfileData?.student?.name}? This order was never funded.`,
                                    confirmText: 'Delete Order',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'DELETE' });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Unpaid Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Failed: Delete or Archive */}
                          {tx.status === 'FAILED' && (
                            <>
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Delete Failed Payment Record',
                                    message: `Delete failed order ${tx.razorpayOrderId} (₹${tx.amount.toLocaleString()})? No revenue or enrollment was created.`,
                                    confirmText: 'Delete Record',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'DELETE' });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Failed Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await toast.confirm({
                                    title: 'Archive Failed Transaction Record',
                                    message: `Archive failed transaction ${tx.razorpayOrderId} for audit trail?`,
                                    confirmText: 'Archive',
                                    isDestructive: false,
                                  });
                                  if (confirmed) {
                                    paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'ARCHIVE', reason: 'Archived failed transaction' });
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Archive Record"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Refunded: Archive */}
                          {tx.status === 'REFUNDED' && (
                            <button
                              onClick={async () => {
                                const confirmed = await toast.confirm({
                                  title: 'Archive Refunded Transaction',
                                  message: `Archive refunded record ${tx.razorpayOrderId} (Refund Ref: ${tx.refundId || 'N/A'})?`,
                                  confirmText: 'Archive',
                                  isDestructive: false,
                                });
                                if (confirmed) {
                                  paymentActionMutation.mutate({ paymentId: tx.paymentRecordId, action: 'ARCHIVE', reason: 'Archived refunded record' });
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Archive Refunded Record"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================
          CONFIRMATION DIALOG: ADMINISTRATIVE REFUND
      ======================================================== */}
      {refundDialogPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Confirm Payment Refund</h3>
              </div>
              <button
                onClick={() => setRefundDialogPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to issue an administrative refund of{' '}
              <strong className="text-slate-900">₹{refundDialogPayment.amount}</strong> for{' '}
              <strong>{refundDialogPayment.courseTitle || 'Course Purchase'}</strong> (Order:{' '}
              {refundDialogPayment.razorpayOrderId}).
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <strong>Impact of this action:</strong>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Payment status will transition to <strong>REFUNDED</strong>.</li>
                <li>Associated course and batch enrollments will be revoked.</li>
                <li>Redeemed coupon count quota will be restored.</li>
                <li>An immutable audit log entry will be created.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Refund Reason / Administrative Audit Note:
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Student requested cancellation within trial window"
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundDialogPayment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundMutation.isPending}
                onClick={() => {
                  refundMutation.mutate({
                    paymentId: refundDialogPayment.paymentRecordId,
                    reason: refundReason || 'Administrative Refund',
                  });
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {refundMutation.isPending ? 'Processing Refund...' : 'Confirm & Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TRANSACTION DETAIL INSPECTION MODAL
      ======================================================== */}
      {transactionDetailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-slate-900">Transaction Record Details</h3>
              <button
                onClick={() => setTransactionDetailModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Internal Record ID:</span>
                <span className="font-mono text-slate-800">{transactionDetailModal.paymentRecordId}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Razorpay Order ID:</span>
                <span className="font-mono font-bold text-slate-800">{transactionDetailModal.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Razorpay Payment ID:</span>
                <span className="font-mono text-slate-800">{transactionDetailModal.razorpayPaymentId || 'N/A (Pending/Failed)'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-black text-emerald-600">₹{transactionDetailModal.amount} {transactionDetailModal.currency}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Payment Plan:</span>
                <span className="font-bold text-slate-800">{transactionDetailModal.paymentPlan}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Transaction Status:</span>
                <span className="font-bold text-slate-800">{transactionDetailModal.status}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Payment Method:</span>
                <span className="text-slate-800">{transactionDetailModal.paymentMethod || 'RAZORPAY'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Created Date:</span>
                <span className="text-slate-800">{new Date(transactionDetailModal.createdAt).toLocaleString()}</span>
              </div>
              {transactionDetailModal.refundId && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Refund Reference:</span>
                  <span className="font-mono text-purple-700">{transactionDetailModal.refundId}</span>
                </div>
              )}
              {transactionDetailModal.refundReason && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Refund Reason:</span>
                  <span className="text-purple-700">{transactionDetailModal.refundReason}</span>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setTransactionDetailModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PAYMENT REMINDER CONFIRMATION MODAL (SECTION 7)
      ======================================================== */}
      {reminderModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Send className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Send Payment Reminder</h3>
              </div>
              <button
                onClick={() => setReminderModalStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <p className="text-amber-900 font-semibold">
                Student: <strong>{reminderModalStudent.name}</strong> ({reminderModalStudent.email})
              </p>
              <p className="text-amber-800">
                Outstanding Balance:{' '}
                <strong className="text-amber-950 font-bold">
                  ₹{Number(reminderModalStudent.remainingBalance || 0).toLocaleString()}
                </strong>
              </p>
              <p className="text-[11px] text-amber-700">
                Course: {courseDetailResponse?.course?.title || 'Selected Course'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Custom Reminder Note (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="Leave blank to send standard payment notification, or enter specific instructions..."
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReminderModalStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingReminder}
                onClick={async () => {
                  try {
                    setSendingReminder(true);
                    const res = await api.post('/admin/payment-reminders', {
                      studentId: reminderModalStudent.studentId,
                      courseId: selectedCourseId,
                      customMessage: reminderMessage || undefined,
                    });
                    toast.success('Reminder Sent', res.data.message || 'Payment reminder successfully dispatched.');
                    setReminderModalStudent(null);
                    setReminderMessage('');
                  } catch (err: any) {
                    toast.apiError(err, 'Failed to send reminder');
                  } finally {
                    setSendingReminder(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingReminder ? 'Sending...' : 'Send Reminder'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
