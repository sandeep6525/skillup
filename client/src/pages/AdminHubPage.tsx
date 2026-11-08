import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { Navigate, Link } from 'react-router-dom';
import {
  Users,
  User,
  BookOpen,
  DollarSign,
  TrendingUp,
  LayoutDashboard,
  Video,
  CreditCard,
  Tag,
  Award,
  FileBarChart,
  LifeBuoy,
  Settings,
  Clock,
  CheckCircle,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Mail,
  RefreshCw,
  Edit2,
  PlusCircle,
  UserCheck,
  X,
  ExternalLink,
  Layers,
  FileText,
  UserPlus,
  RotateCcw,
  History,
  CheckCircle2,
  LogOut,
  FolderOpen,
  Download,
  Trophy,
  FolderDown,
  Newspaper,
  Trash2,
  Handshake,
  Receipt,
  Menu,
  Eye,
  Briefcase,
  MessageSquareQuote,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import { CoursePaymentsManagement } from '../components/admin/CoursePaymentsManagement';
import { PartnerManagement } from '../components/admin/PartnerManagement';
import { EmailManagement } from '../components/admin/EmailManagement';
import { InternshipManagement } from '../components/admin/InternshipManagement';
import { ImageUpload } from '../components/ImageUpload';
import { AdminFeedbackManagement } from './AdminFeedbackManagement';
import { CourseAnalyticsDashboard } from '../components/admin/CourseAnalyticsDashboard';
import { ProfileEditTab } from '../components/common/ProfileEditTab';
import { GalleryManagement } from '../components/admin/GalleryManagement';
import { AchievementManagement } from '../components/admin/AchievementManagement';
import { getMediaUrl } from '../utils/mediaUrl';

type AdminTab =
  | 'overview'
  | 'users'
  | 'courses'
  | 'gallery'
  | 'achievements'
  | 'feedback'
  | 'internships'
  | 'materials'
  | 'hackathons'
  | 'partners'
  | 'mentors'
  | 'students'
  | 'batches'
  | 'assignments'
  | 'classes'
  | 'certificates'
  | 'orders'
  | 'payouts'
  | 'coupons'
  | 'emails'
  | 'cms'
  | 'reports'
  | 'tickets'
  | 'profile'
  | 'settings'
  | 'audit';

export const AdminHubPage: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddMentorModalOpen, setIsAddMentorModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isHackathonModalOpen, setIsHackathonModalOpen] = useState(false);
  const [viewAssignmentsMentor, setViewAssignmentsMentor] = useState<any | null>(null);

  // Form States: Create / Edit Course
  const [courseTitle, setCourseTitle] = useState('');
  const [courseTitleTa, setCourseTitleTa] = useState('');
  const [courseSubtitle, setCourseSubtitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseDescriptionTa, setCourseDescriptionTa] = useState('');
  const [courseCategory, setCourseCategory] = useState('Full-Stack Web Development');
  const [courseCategoryId, setCourseCategoryId] = useState('');
  const [courseLevel, setCourseLevel] = useState('All Levels');
  const [courseLanguage, setCourseLanguage] = useState('English');
  const [coursePrice, setCoursePrice] = useState('0');
  const [courseDiscountPrice, setCourseDiscountPrice] = useState('');
  const [courseAllowInstallments, setCourseAllowInstallments] = useState(false);
  const [courseMinInstallmentAmount, setCourseMinInstallmentAmount] = useState('');
  const [courseInstallmentCount, setCourseInstallmentCount] = useState('2');
  const [courseInstallmentPolicy, setCourseInstallmentPolicy] = useState('RESTRICTED');
  const [courseInstructorId, setCourseInstructorId] = useState('');
  const [courseThumbnailUrl, setCourseThumbnailUrl] = useState<string | null>(null);
  const [coursePreviewVideoUrl, setCoursePreviewVideoUrl] = useState('');
  const [courseStatus, setCourseStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Form States: Create / Edit Hackathon
  const [hackTitle, setHackTitle] = useState('');
  const [hackTheme, setHackTheme] = useState('');
  const [hackDescription, setHackDescription] = useState('');
  const [hackOrganizer, setHackOrganizer] = useState('SkillUp Global');
  const [hackStartDate, setHackStartDate] = useState('');
  const [hackEndDate, setHackEndDate] = useState('');
  const [hackDeadline, setHackDeadline] = useState('');
  const [hackMode, setHackMode] = useState('ONLINE');
  const [hackLocation, setHackLocation] = useState('');
  const [hackFee, setHackFee] = useState('0');
  const [hackMinTeam, setHackMinTeam] = useState('1');
  const [hackMaxTeam, setHackMaxTeam] = useState('4');
  const [hackEligibility, setHackEligibility] = useState('Open to all students & developers');
  const [hackPrizes, setHackPrizes] = useState('₹50,000 Cash Pool + Internship Offers');
  const [hackRules, setHackRules] = useState('Original code only. Teams of 1-4 members.');
  const [hackBannerUrl, setHackBannerUrl] = useState<string | null>(null);
  const [editingHackathon, setEditingHackathon] = useState<any | null>(null);
  const [isCreatingHackathon, setIsCreatingHackathon] = useState(false);

  // Mentor Filters & Search
  const [mentorFilter, setMentorFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'PENDING' | 'DEACTIVATED'>('ALL');
  const [mentorSearch, setMentorSearch] = useState('');

  // Form States: Add / Onboard Mentor
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [newMentorTitle, setNewMentorTitle] = useState('Senior Full-Stack Mentor');
  const [newMentorCourseId, setNewMentorCourseId] = useState('');
  const [newMentorBatchId, setNewMentorBatchId] = useState('');
  const [invitedMentorResult, setInvitedMentorResult] = useState<{
    activationUrl?: string;
    emailDelivered: boolean;
    email: string;
    name: string;
  } | null>(null);

  // Form States: Upload / Edit Material
  const [matTitle, setMatTitle] = useState('');
  const [matDescription, setMatDescription] = useState('');
  const [matType, setMatType] = useState('PDF');
  const [matCategory, setMatCategory] = useState('Development');
  const [matPrice, setMatPrice] = useState('0');
  const [matIsFree, setMatIsFree] = useState(true);
  const [matCourseId, setMatCourseId] = useState('');
  const [matInternshipId, setMatInternshipId] = useState('');
  const [matFileUrl, setMatFileUrl] = useState('');
  const [matFileSize, setMatFileSize] = useState<number | null>(null);
  const [matThumbnailUrl, setMatThumbnailUrl] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [isUploadingMat, setIsUploadingMat] = useState(false);

  // Form States: Assign Mentor
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assignCourseId, setAssignCourseId] = useState('');
  const [assignBatchId, setAssignBatchId] = useState('');
  const [assignScope, setAssignScope] = useState<'SPECIFIC_BATCH' | 'COURSE_WIDE'>('SPECIFIC_BATCH');

  // Form States: Create Batch
  const [batchName, setBatchName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [batchCourseId, setBatchCourseId] = useState('');
  const [batchStartDate, setBatchStartDate] = useState('');
  const [batchCapacity, setBatchCapacity] = useState('50');

  // Form States: Create / Edit Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponName, setCouponName] = useState('');
  const [couponDescription, setCouponDescription] = useState('');
  const [couponCollege, setCouponCollege] = useState('');
  const [couponCourseId, setCouponCourseId] = useState('');
  const [couponDiscountVal, setCouponDiscountVal] = useState('30');
  const [couponType, setCouponType] = useState('PERCENTAGE');
  const [couponTargetType, setCouponTargetType] = useState<'ALL' | 'COURSE' | 'INTERNSHIP' | 'MATERIAL' | 'HACKATHON'>('ALL');
  const [couponInternshipId, setCouponInternshipId] = useState('');
  const [couponMaterialId, setCouponMaterialId] = useState('');
  const [couponHackathonId, setCouponHackathonId] = useState('');
  const [couponMinSpend, setCouponMinSpend] = useState('');
  const [couponMaxDiscount, setCouponMaxDiscount] = useState('');
  const [couponValidUntil, setCouponValidUntil] = useState('');
  const [couponUsageLimit, setCouponUsageLimit] = useState('100');
  const [couponPerStudentLimit, setCouponPerStudentLimit] = useState('1');
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Coupon Sub-Tabs and Filters
  const [couponSubTab, setCouponSubTab] = useState<'coupons' | 'redemptions'>('coupons');
  const [couponSearch, setCouponSearch] = useState('');
  const [couponCollegeFilter, setCouponCollegeFilter] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState('');
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState('');

  // Form States: Mentor Payout
  const [payoutMentorId, setPayoutMentorId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('15000');
  const [payoutNotes, setPayoutNotes] = useState('Verified Monthly Teaching Settlement');

  // Search & Filtering
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [selectedRange, setSelectedRange] = useState<string>('30');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // 1. Fetch Admin Overview Stats
  const { data: overviewData } = useQuery({
    queryKey: ['admin-overview-data', selectedRange],
    queryFn: async () => {
      const res = await api.get(`/admin/overview?days=${selectedRange}`);
      return res.data.data;
    },
  });

  // 2. Fetch Users
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users-list', userSearch, roleFilter, userPage],
    queryFn: async () => {
      const res = await api.get(`/admin/users?search=${userSearch}&role=${roleFilter}&page=${userPage}&limit=10`);
      return res.data.data;
    },
    enabled: activeTab === 'users' || activeTab === 'students',
  });

  // 3. Fetch Mentors & Scope Assignments
  const { data: mentorsResponse, refetch: refetchMentors } = useQuery({
    queryKey: ['admin-mentors-list'],
    queryFn: async () => {
      const res = await api.get('/admin/mentors');
      return res.data.data;
    },
    enabled: activeTab === 'mentors' || activeTab === 'overview' || activeTab === 'courses' || isAssignModalOpen,
  });

  const mentorsData: any[] = Array.isArray(mentorsResponse)
    ? mentorsResponse
    : mentorsResponse?.mentors || [];
  const pendingInvitations: any[] = mentorsResponse?.pendingInvitations || [];

  // 4. Fetch Batches
  const { data: batchesData, refetch: refetchBatches } = useQuery({
    queryKey: ['admin-batches-list'],
    queryFn: async () => {
      const res = await api.get('/admin/batches');
      return res.data.data;
    },
  });

  // 5. Fetch Courses
  const { data: coursesData, refetch: refetchCourses } = useQuery({
    queryKey: ['admin-courses-list'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data.data;
    },
  });

  // 5a. Fetch Course Categories
  const { data: courseCategoriesData = [] } = useQuery({
    queryKey: ['admin-course-categories'],
    queryFn: async () => {
      const res = await api.get('/courses/categories');
      return res.data.data || [];
    },
  });

  // 5b. Fetch Internships for dropdowns
  const { data: internshipsData = [] } = useQuery({
    queryKey: ['admin-internships-dropdown'],
    queryFn: async () => {
      const res = await api.get('/internships/admin/all');
      return res.data.data || [];
    },
  });

  // 5c. Fetch Materials for dropdowns
  const { data: materialsData = [] } = useQuery({
    queryKey: ['admin-materials-dropdown'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data.data || [];
    },
  });

  // 5d. Fetch Hackathons for dropdowns
  const { data: hackathonsData = [] } = useQuery({
    queryKey: ['admin-hackathons-dropdown'],
    queryFn: async () => {
      const res = await api.get('/hackathons');
      return res.data.data || [];
    },
  });

  // Orders Search & Filter States
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderProductTypeFilter, setOrderProductTypeFilter] = useState('ALL');
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<any | null>(null);

  // Form State: Offline Payment Modal
  const [isOfflinePaymentModalOpen, setIsOfflinePaymentModalOpen] = useState(false);
  const [offlineStudentId, setOfflineStudentId] = useState('');
  const [offlineProductType, setOfflineProductType] = useState<'COURSE' | 'INTERNSHIP' | 'MATERIAL'>('COURSE');
  const [offlineCourseId, setOfflineCourseId] = useState('');
  const [offlineInternshipId, setOfflineInternshipId] = useState('');
  const [offlineMaterialId, setOfflineMaterialId] = useState('');
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineMethod, setOfflineMethod] = useState('MANUAL_BANK_TRANSFER');
  const [offlineReceiptNo, setOfflineReceiptNo] = useState('');
  const [offlineBankRef, setOfflineBankRef] = useState('');
  const [offlineNotes, setOfflineNotes] = useState('');
  const [offlineIsPartial, setOfflineIsPartial] = useState(false);

  // 6. Fetch Orders & Payments with Server Filters
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-orders-list', orderSearch, orderStatusFilter, orderProductTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orderSearch) params.set('search', orderSearch);
      if (orderStatusFilter && orderStatusFilter !== 'ALL') params.set('status', orderStatusFilter);
      if (orderProductTypeFilter && orderProductTypeFilter !== 'ALL') params.set('productType', orderProductTypeFilter);
      const res = await api.get(`/admin/orders?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab === 'orders' || activeTab === 'reports',
  });

  // 7. Fetch Coupons with Analytics
  const { data: couponsResponse, refetch: refetchCoupons } = useQuery({
    queryKey: ['admin-coupons-list', couponSearch, couponCollegeFilter, couponStatusFilter],
    queryFn: async () => {
      const res = await api.get(
        `/admin/coupons?search=${encodeURIComponent(couponSearch)}&college=${encodeURIComponent(
          couponCollegeFilter
        )}&status=${encodeURIComponent(couponStatusFilter)}`
      );
      return res.data;
    },
    enabled: activeTab === 'coupons',
  });
  const couponsData = couponsResponse?.data || [];
  const couponsAnalytics = couponsResponse?.analytics || {
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptionsCount: 0,
    totalOriginalValue: 0,
    totalDiscountsGranted: 0,
    totalRevenueCollected: 0,
  };

  // 7b. Fetch Coupon Redemptions
  const { data: redemptionsData, refetch: refetchRedemptions } = useQuery({
    queryKey: ['admin-coupons-redemptions', redemptionSearch, redemptionStatusFilter],
    queryFn: async () => {
      const res = await api.get(
        `/admin/coupons/redemptions?search=${encodeURIComponent(
          redemptionSearch
        )}&status=${encodeURIComponent(redemptionStatusFilter)}`
      );
      return res.data.data;
    },
    enabled: activeTab === 'coupons' && couponSubTab === 'redemptions',
  });

  // 8. Fetch Payouts
  const { data: payoutsData, refetch: refetchPayouts } = useQuery({
    queryKey: ['admin-payouts-list'],
    queryFn: async () => {
      const res = await api.get('/admin/payouts');
      return res.data.data;
    },
    enabled: activeTab === 'payouts',
  });

  // 9. Fetch Audit Logs
  const { data: auditLogsData } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data.data;
    },
    enabled: activeTab === 'audit',
  });

  // 10. Fetch Tickets
  const { data: ticketsData, refetch: refetchTickets } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const res = await api.get('/admin/tickets');
      return res.data.data;
    },
    enabled: activeTab === 'tickets',
  });

  // 11. Fetch Certificates
  const { data: certsData, refetch: refetchCerts } = useQuery({
    queryKey: ['admin-certificates-list'],
    queryFn: async () => {
      const res = await api.get('/admin/certificates');
      return res.data.data;
    },
    enabled: activeTab === 'certificates',
  });

  // 12. Fetch Live Classes (Admin View)
  const { data: adminLiveClassesData, refetch: refetchLiveClasses } = useQuery({
    queryKey: ['admin-live-classes-list'],
    queryFn: async () => {
      const res = await api.get('/admin/live-classes');
      return res.data.data;
    },
    enabled: activeTab === 'classes',
  });

  // 13. Fetch Materials for Admin
  const { data: adminMaterialsData = [], refetch: refetchAdminMaterials } = useQuery({
    queryKey: ['admin-materials-list'],
    queryFn: async () => {
      const res = await api.get('/materials');
      return res.data.data;
    },
    enabled: activeTab === 'materials',
  });

  // 14. Fetch Hackathons for Admin
  const { data: adminHackathonsData = [], refetch: refetchAdminHackathons } = useQuery({
    queryKey: ['admin-hackathons-list'],
    queryFn: async () => {
      const res = await api.get('/hackathons');
      return res.data.data;
    },
    enabled: activeTab === 'hackathons',
  });

  // Role Update Mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      refetchUsers();
      toast.success('Role Updated', 'User role updated successfully.');
    },
    onError: (err: any) => {
      toast.error('Role Update Failed', err.response?.data?.error?.message || 'Failed to update user role.');
    },
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/admin/users/${userId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
      toast.success(
        data?.archived ? 'Account Archived' : 'User Deleted',
        data?.message || 'User record processed successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete user');
    },
  });

  // Delete Course Mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await api.delete(`/courses/${courseId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchCourses();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-analytics-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-course-students-dir'] });
      toast.success(
        data?.archived ? 'Course Archived' : 'Course Deleted',
        data?.message || 'Course updated successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete course');
    },
  });

  // Delete Batch Mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await api.delete(`/admin/batches/${batchId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchBatches();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
      toast.success(
        data?.archived ? 'Batch Archived' : 'Batch Deleted',
        data?.message || 'Batch removed successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete batch');
    },
  });

  // Delete Hackathon Mutation
  const deleteHackathonMutation = useMutation({
    mutationFn: async (hackathonId: string) => {
      const res = await api.delete(`/hackathons/${hackathonId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchAdminHackathons();
      toast.success(
        data?.archived ? 'Hackathon Closed' : 'Hackathon Deleted',
        data?.message || 'Hackathon updated successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete hackathon');
    },
  });

  // Delete Coupon Mutation
  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      const res = await api.delete(`/admin/coupons/${couponId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchCoupons();
      toast.success(
        data?.archived ? 'Coupon Deactivated' : 'Coupon Deleted',
        data?.message || 'Coupon processed successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete coupon');
    },
  });

  // Revoke/Delete Certificate Mutation
  const deleteCertificateMutation = useMutation({
    mutationFn: async (certId: string) => {
      const res = await api.delete(`/admin/certificates/${certId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchCerts();
      toast.success('Certificate Revoked', data?.message || 'Certificate revoked successfully.');
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to revoke certificate');
    },
  });

  // Delete Ticket Mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await api.delete(`/admin/tickets/${ticketId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      refetchTickets();
      toast.success(
        data?.archived ? 'Ticket Closed' : 'Ticket Deleted',
        data?.message || 'Support ticket processed successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete ticket');
    },
  });

  // Delete / Archive / Cancel Payment Order Mutation
  const deleteOrderMutation = useMutation({
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
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
      queryClient.invalidateQueries({ queryKey: ['payments-history'] });
      toast.success(
        data?.archived ? 'Record Archived' : data?.cancelled ? 'Order Cancelled' : 'Order Deleted',
        data?.message || 'Payment record updated successfully.'
      );
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to process payment order action');
    },
  });

  // Add & Invite Mentor Mutation
  const inviteMentorMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/admin/mentors/invite', payload);
    },
    onSuccess: (res) => {
      const resultData = res.data.data;
      setInvitedMentorResult({
        activationUrl: resultData.activationUrl,
        emailDelivered: resultData.emailDelivered,
        email: resultData.email,
        name: resultData.name,
      });
      toast.success(
        'Mentor Account Created',
        resultData.emailDelivered
          ? `Invitation sent to ${resultData.email}.`
          : 'Mentor account created. Secure activation link ready.'
      );
      refetchMentors();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
    },
    onError: (err: any) => {
      toast.error('Failed to Add Mentor', err.response?.data?.error?.message || 'Could not onboard mentor.');
    },
  });

  // Assign Mentor to Scope Mutation (CRITICAL AUTO STUDENT WORKFLOW)
  const assignMentorMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/admin/mentors/assign', payload);
    },
    onSuccess: () => {
      toast.success(
        'Mentor Assigned',
        'The mentor has been assigned successfully, and the relevant student records have been updated.'
      );
      setIsAssignModalOpen(false);
      refetchMentors();
      refetchBatches();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
    },
    onError: (err: any) => {
      toast.error('Assignment Failed', err.response?.data?.error?.message || 'Failed to assign mentor.');
    },
  });

  // Deactivate Mentor Mutation
  const deactivateMentorMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return api.post(`/admin/mentors/${id}/deactivate`, { reason });
    },
    onSuccess: () => {
      toast.success('Mentor Deactivated', 'Mentor access and sessions have been revoked.');
      refetchMentors();
    },
    onError: (err: any) => {
      toast.error('Deactivation Failed', err.response?.data?.error?.message || 'Failed to deactivate mentor.');
    },
  });

  // Reactivate Mentor Mutation
  const reactivateMentorMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/admin/mentors/${id}/reactivate`);
    },
    onSuccess: () => {
      toast.success('Mentor Reactivated', 'Mentor access has been restored.');
      refetchMentors();
    },
    onError: (err: any) => {
      toast.error('Reactivation Failed', err.response?.data?.error?.message || 'Failed to reactivate mentor.');
    },
  });

  // Resend Activation Invitation Mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/admin/mentors/${id}/resend-invitation`);
    },
    onSuccess: (res) => {
      const resultData = res.data.data;
      if (resultData?.activationUrl) {
        navigator.clipboard?.writeText(resultData.activationUrl);
        toast.success('Activation Link Refreshed', 'Fresh 48-hour activation link copied to clipboard.');
      } else {
        toast.success('Invitation Resent', 'Fresh activation email dispatched.');
      }
      refetchMentors();
    },
    onError: (err: any) => {
      toast.error('Resend Failed', err.response?.data?.error?.message || 'Failed to resend invitation.');
    },
  });

  // Remove Mentor Mutation (Safe Soft Archive)
  const removeMentorMutation = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      return api.delete(`/admin/mentors/${id}`, { data: { force } });
    },
    onSuccess: () => {
      toast.success('Mentor Removed', 'Mentor assignments revoked and account safely archived.');
      refetchMentors();
    },
    onError: (err: any) => {
      toast.error('Removal Failed', err.response?.data?.error?.message || 'Failed to remove mentor.');
    },
  });

  // Remove Course Assignment Mutation
  const removeCourseAssignMutation = useMutation({
    mutationFn: async ({ mentorId, courseId }: { mentorId: string; courseId: string }) => {
      return api.delete(`/admin/mentors/${mentorId}/assignments/courses/${courseId}`);
    },
    onSuccess: () => {
      toast.success('Assignment Removed', 'Course assignment removed from mentor.');
      refetchMentors();
    },
    onError: (err: any) => {
      toast.error('Action Failed', err.response?.data?.error?.message || 'Failed to remove assignment.');
    },
  });

  // Remove Batch Assignment Mutation
  const removeBatchAssignMutation = useMutation({
    mutationFn: async ({ mentorId, batchId }: { mentorId: string; batchId: string }) => {
      return api.delete(`/admin/mentors/${mentorId}/assignments/batches/${batchId}`);
    },
    onSuccess: () => {
      toast.success('Batch Assignment Removed', 'Batch assignment removed from mentor.');
      refetchMentors();
      refetchBatches();
    },
    onError: (err: any) => {
      toast.error('Action Failed', err.response?.data?.error?.message || 'Failed to remove batch assignment.');
    },
  });

  // Create Batch Mutation
  const createBatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/admin/batches', payload);
    },
    onSuccess: () => {
      toast.success('Batch Created', 'New cohort batch created successfully.');
      setIsBatchModalOpen(false);
      setBatchName('');
      setBatchCode('');
      refetchBatches();
    },
    onError: (err: any) => {
      toast.error('Batch Creation Failed', err.response?.data?.error?.message || 'Failed to create batch.');
    },
  });

  // Refund Order Mutation
  const refundMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      return api.post(`/admin/orders/${paymentId}/refund`, { reason });
    },
    onSuccess: () => {
      toast.success('Order Refunded', 'Order refunded successfully and course access revoked.');
      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Refund failed');
    },
  });

  // Create or Update Coupon Mutation
  const saveCouponMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingCouponId) {
        return api.patch(`/admin/coupons/${editingCouponId}`, payload);
      }
      return api.post('/admin/coupons', payload);
    },
    onSuccess: () => {
      toast.success(editingCouponId ? 'Coupon Updated' : 'Coupon Created', editingCouponId ? 'Coupon updated successfully!' : 'Discount coupon created and ready for checkout!');
      setIsCouponModalOpen(false);
      setEditingCouponId(null);
      setCouponCode('');
      setCouponName('');
      setCouponDescription('');
      setCouponCollege('');
      setCouponCourseId('');
      setCouponInternshipId('');
      setCouponMaterialId('');
      setCouponHackathonId('');
      setCouponTargetType('ALL');
      setCouponDiscountVal('30');
      setCouponType('PERCENTAGE');
      setCouponMinSpend('');
      setCouponMaxDiscount('');
      setCouponValidUntil('');
      setCouponUsageLimit('100');
      setCouponPerStudentLimit('1');
      refetchCoupons();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to save coupon');
    },
  });

  // Toggle Coupon Status Mutation
  const toggleCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/coupons/${id}/toggle`);
    },
    onSuccess: () => {
      refetchCoupons();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to toggle coupon status');
    },
  });

  // Create Payout Mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/admin/payouts', payload);
    },
    onSuccess: () => {
      toast.success('Payout Settled', 'Mentor commission payout settled and recorded in audit log!');
      setIsPayoutModalOpen(false);
      refetchPayouts();
    },
    onError: (err: any) => {
      toast.apiError(err, 'Payout failed');
    },
  });

  // Test SMTP
  const handleTestSMTP = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await api.get('/admin/smtp/test');
      setSmtpTestResult(res.data);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.response?.data?.error?.message || 'SMTP diagnostic request failed',
      });
    } finally {
      setSmtpTesting(false);
    }
  };

  const metrics = overviewData?.metrics || {
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalBatches: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    refundRequests: 0,
    upcomingClasses: 0,
    pendingTickets: 0,
  };

  // 17 Comprehensive SaaS Navigation Links
  const sidebarLinks: { label: string; icon: any; tab: AdminTab }[] = [
    { label: 'Dashboard', icon: LayoutDashboard, tab: 'overview' },
    { label: 'User Management', icon: Users, tab: 'users' },
    { label: 'Course Management', icon: BookOpen, tab: 'courses' },
    { label: 'Homepage Gallery', icon: ImageIcon, tab: 'gallery' },
    { label: 'Achievements', icon: Trophy, tab: 'achievements' },
    { label: 'Feedback Management', icon: MessageSquareQuote, tab: 'feedback' },
    { label: 'Internship Management', icon: Briefcase, tab: 'internships' },
    { label: 'Materials Marketplace', icon: FolderDown, tab: 'materials' },
    { label: 'Hackathons', icon: Trophy, tab: 'hackathons' },
    { label: 'Partner Management', icon: Handshake, tab: 'partners' },
    { label: 'Mentor Management', icon: UserCheck, tab: 'mentors' },
    { label: 'Student Management', icon: Users, tab: 'students' },
    { label: 'Batches & Cohorts', icon: Layers, tab: 'batches' },
    { label: 'Live Classes', icon: Video, tab: 'classes' },
    { label: 'Certificates', icon: Award, tab: 'certificates' },
    { label: 'Orders & Payments', icon: CreditCard, tab: 'orders' },
    { label: 'Mentor Payouts', icon: DollarSign, tab: 'payouts' },
    { label: 'Coupons & Discounts', icon: Tag, tab: 'coupons' },
    { label: 'Email Automation', icon: Mail, tab: 'emails' },
    { label: 'Course Analytics & Students', icon: FileBarChart, tab: 'reports' },
    { label: 'Support Tickets', icon: LifeBuoy, tab: 'tickets' },
    { label: 'Edit Profile', icon: User, tab: 'profile' },
    { label: 'Platform Settings', icon: Settings, tab: 'settings' },
    { label: 'Audit Logs', icon: History, tab: 'audit' },
  ];

  return (
    <div className="h-full bg-[#F6F8FB] flex flex-col md:flex-row font-sans text-[#172033] overflow-hidden relative">
      {/* ========================================================
          MOBILE BACKDROP
      ======================================================== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ========================================================
          LEFT ADMIN SIDEBAR (Responsive drawer on mobile, persistent on desktop)
      ======================================================== */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-[#E4E9F0] flex flex-col justify-between shrink-0 shadow-xl md:shadow-xs h-full overflow-hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Logo Header */}
          <div className="p-4 sm:p-5 border-b border-[#EDF0F4] flex items-center justify-between shrink-0">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="SkillUp Logo" className="h-8 w-auto object-contain" />
              <div>
                <span className="text-lg font-bold text-[#14233B] tracking-tight block leading-none">
                  Skill<span className="text-[#5DBA58]">Up</span>
                </span>
                <span className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wider block mt-1">
                  Admin Hub
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
            {sidebarLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab(item.tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-l-3 border-[#2563EB]'
                      : 'text-[#667085] hover:bg-[#F6F8FB] hover:text-[#172033]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#4779C7]'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.tab === 'tickets' && metrics.pendingTickets > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FFF0F0] text-[#C03945] rounded-full">
                      {metrics.pendingTickets}
                    </span>
                  )}
                  {item.tab === 'orders' && metrics.refundRequests > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FFF6E5] text-[#B7791F] rounded-full">
                      {metrics.refundRequests}
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
            onClick={() => setActiveTab('profile')}
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
          MAIN WORKSPACE AREA
      ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#E4E9F0] px-4 sm:px-8 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#14233B] capitalize">
                {activeTab.replace('-', ' ')}
              </h1>
              <p className="hidden sm:block text-xs text-[#667085]">
                Central administration, role orchestration, and telemetry across the platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {['mentors', 'batches', 'courses'].includes(activeTab) && (
              <button
                onClick={() => {
                  if (coursesData && coursesData.length > 0) setAssignCourseId(coursesData[0].id);
                  if (mentorsData && mentorsData.length > 0) setAssignMentorId(mentorsData[0].id);
                  setIsAssignModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign Mentor</span>
              </button>
            )}
            {['batches', 'courses'].includes(activeTab) && (
              <button
                onClick={() => {
                  if (coursesData && coursesData.length > 0) setBatchCourseId(coursesData[0].id);
                  setIsBatchModalOpen(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Batch</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* ========================================================
              TAB 1: DATA-DRIVEN ADMIN DASHBOARD
          ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Total Students</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.totalStudents}</span>
                  <span className="text-[11px] text-[#16845B] font-medium mt-1 block">Active learners</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Total Mentors</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.totalInstructors}</span>
                  <span className="text-[11px] text-[#2563EB] font-medium mt-1 block">Instructors & Staff</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Total Courses</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.totalCourses}</span>
                  <span className="text-[11px] text-[#4779C7] font-medium mt-1 block">Curriculum items</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Active Cohort Batches</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.totalBatches}</span>
                  <span className="text-[11px] text-[#4779C7] font-medium mt-1 block">Scheduled groups</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Total Revenue</span>
                  <span className="text-2xl font-bold text-[#16845B] mt-1 block">₹{metrics.totalRevenue.toLocaleString()}</span>
                  <span className="text-[11px] text-[#16845B] font-medium mt-1 block">Razorpay Settled</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Pending Orders</span>
                  <span className="text-2xl font-bold text-[#B7791F] mt-1 block">{metrics.pendingPayments}</span>
                  <span className="text-[11px] text-[#B7791F] font-medium mt-1 block">Awaiting webhook</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Refund Requests</span>
                  <span className="text-2xl font-bold text-[#C03945] mt-1 block">{metrics.refundRequests}</span>
                  <span className="text-[11px] text-[#C03945] font-medium mt-1 block">Requires review</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-[#E4E9F0] shadow-2xs">
                  <span className="text-[11px] font-medium text-[#667085] block">Support Tickets</span>
                  <span className="text-2xl font-bold text-[#14233B] mt-1 block">{metrics.pendingTickets}</span>
                  <span className="text-[11px] text-[#667085] font-medium mt-1 block">Open inquiries</span>
                </div>
              </div>

              {/* Revenue Trends & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2 Cols: Monthly Revenue Performance */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold text-[#14233B]">Annual Platform Revenue Trajectory</h2>
                      <span className="text-[11px] text-[#667085]">Verified course sales & enrollment payments</span>
                    </div>
                    {metrics.totalRevenue > 0 && (
                      <span className="px-2.5 py-1 text-xs font-bold bg-[#EAF7F0] text-[#16845B] rounded-lg">
                        ₹{metrics.totalRevenue.toLocaleString()} Total Verified
                      </span>
                    )}
                  </div>

                  {(() => {
                    const monthly = overviewData?.monthlyRevenue || [];
                    const max = Math.max(...monthly, 0);
                    const totalMonthRevenue = monthly.reduce((a: number, b: number) => a + b, 0);

                    if (totalMonthRevenue === 0) {
                      return (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="text-xs font-semibold text-slate-600">No verified transactions available yet.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Revenue chart updates automatically as student payments are completed.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="h-48 flex items-end justify-between gap-2 pt-8">
                        {monthly.map((val: number, idx: number) => {
                          const heightPct = max > 0 ? Math.max(val > 0 ? 8 : 2, Math.round((val / max) * 100)) : 0;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="text-[9px] font-semibold text-[#667085]">
                                {val > 0 ? `₹${(val / 1000).toFixed(val >= 1000 ? 1 : 0)}k` : '₹0'}
                              </span>
                              <div
                                className={`w-full rounded-t-md transition-all duration-300 ${val > 0 ? 'bg-[#173B73] hover:bg-[#2563EB]' : 'bg-slate-100'}`}
                                style={{ height: `${heightPct}%` }}
                                title={`Month ${idx + 1}: ₹${val.toLocaleString()}`}
                              />
                              <span className="text-[10px] text-[#98A2B3]">M{idx + 1}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 1 Col: Recent Audit Log Feed */}
                <div className="bg-white rounded-xl border border-[#E4E9F0] p-5 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-[#14233B]">Recent Platform Audit</h2>
                    <button onClick={() => setActiveTab('audit')} className="text-xs font-semibold text-[#2563EB] hover:underline">
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {overviewData?.recentAudits?.map((log: any) => (
                      <div key={log.id} className="text-xs space-y-0.5 pb-2.5 border-b border-[#EDF0F4] last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#14233B]">{log.action}</span>
                          <span className="text-[10px] text-[#98A2B3]">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-[11px] text-[#667085] block">{log.resource}</span>
                        {log.details && <span className="text-[10px] text-[#4779C7] block">{log.details}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: USER MANAGEMENT (ROLES & STATUS)
          ======================================================== */}
          {(activeTab === 'users' || activeTab === 'students') && (
            <div className="space-y-6">
              {/* Search & Filter Controls */}
              <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="text-xs px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="">All Roles</option>
                    <option value="STUDENT">STUDENT</option>
                    <option value="INSTRUCTOR">INSTRUCTOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#EDF0F4] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#14233B]">Registered Accounts ({usersData?.total || 0})</h3>
                  <span className="text-[11px] text-[#667085]">Page {userPage} of {usersData?.totalPages || 1}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Enrollments</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4 text-center">Change Role</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {usersData?.users?.map((u: any) => (
                        <tr key={u.id} className="hover:bg-[#F6F8FB] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-[#14233B] block">{u.name}</span>
                                <span className="text-[11px] text-[#667085] block">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                u.role === 'ADMIN'
                                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                                  : u.role === 'INSTRUCTOR'
                                  ? 'bg-[#EAF7F0] text-[#16845B]'
                                  : 'bg-slate-100 text-[#667085]'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.isVerified ? (
                              <span className="text-[#16845B] font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="text-[#B7791F] font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#14233B]">{u._count?.enrollments || 0}</td>
                          <td className="py-3 px-4 text-[#667085]">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center">
                            <select
                              value={u.role}
                              onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                              className="text-xs px-2 py-1 rounded-md border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="STUDENT">STUDENT</option>
                              <option value="INSTRUCTOR">INSTRUCTOR</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const isSelf = u.id === user?.id;
                                if (isSelf) {
                                  toast.error('Action Blocked', 'You cannot delete your own logged-in admin account.');
                                  return;
                                }
                                const confirmed = await confirm({
                                  title: `Delete ${u.role === 'ADMIN' ? 'Admin' : u.role === 'INSTRUCTOR' ? 'Mentor' : 'Student'} Account`,
                                  message: `Are you sure you want to delete or archive "${u.name}" (${u.email})? If they have completed financial or learning records, the account will be safely archived to preserve audit history.`,
                                  confirmText: 'Delete Account',
                                  isDestructive: true,
                                });
                                if (confirmed) {
                                  deleteUserMutation.mutate(u.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete or Archive Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
              TAB 3: COURSE MANAGEMENT
          ======================================================== */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#14233B]">Platform Curricula</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseTitle('');
                      setCourseTitleTa('');
                      setCourseSubtitle('');
                      setCourseDescription('');
                      setCourseDescriptionTa('');
                      setCourseCategory('Full-Stack Web Development');
                      setCourseCategoryId('');
                      setCourseLevel('All Levels');
                      setCourseLanguage('English');
                      setCoursePrice('0');
                      setCourseDiscountPrice('');
                      setCourseAllowInstallments(false);
                      setCourseMinInstallmentAmount('');
                      setCourseInstallmentCount('2');
                      setCourseInstallmentPolicy('RESTRICTED');
                      setCourseInstructorId('');
                      setCourseThumbnailUrl(null);
                      setCoursePreviewVideoUrl('');
                      setCourseStatus('PUBLISHED');
                      setIsCourseModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Course</span>
                  </button>
                  <Link
                    to="/course-management"
                    className="px-3 py-1.5 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Curriculum Builder</span>
                  </Link>
                  <button
                    onClick={() => refetchCourses()}
                    className="p-1.5 text-[#667085] hover:text-[#2563EB] bg-white border border-[#E4E9F0] rounded-lg"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursesData?.map((c: any) => (
                  <div key={c.id} className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4]">
                        <img
                          src={c.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'}
                          alt={c.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                          }}
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] rounded-full shadow-xs">
                          {c.status}
                        </span>
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-white/90 text-[#14233B] rounded-md shadow-xs">
                          {c.level}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-[#14233B] line-clamp-1">{c.title}</h4>
                          <p className="text-xs text-[#667085] line-clamp-2 mt-1">{c.description}</p>
                        </div>

                        {/* Assigned Mentors Section */}
                        <div className="pt-2 border-t border-[#EDF0F4] space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#14233B] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
                              <span>Assigned Mentors</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAssignCourseId(c.id);
                                setAssignBatchId('');
                                setAssignScope('COURSE_WIDE');
                                setAssignMentorId(mentorsData?.[0]?.id || '');
                                setIsAssignModalOpen(true);
                              }}
                              className="text-[10px] font-bold text-[#2563EB] hover:text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded cursor-pointer"
                            >
                              + Assign Mentor
                            </button>
                          </div>

                          {/* List of currently assigned mentors */}
                          {c.mentorAssignments && c.mentorAssignments.length > 0 ? (
                            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                              {c.mentorAssignments.map((a: any) => (
                                <div
                                  key={a.id || a.mentorId}
                                  className="flex items-center justify-between p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                                      {a.mentor?.name?.charAt(0) || 'M'}
                                    </div>
                                    <div className="min-w-0 truncate">
                                      <span className="font-semibold text-[#14233B] truncate block">
                                        {a.mentor?.name || 'Mentor'}
                                      </span>
                                      <span className="text-[9px] text-[#64748B]">
                                        {a.scope === 'SPECIFIC_BATCH' && a.batch ? `Batch: ${a.batch.code || a.batch.name}` : 'Course-Wide'}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const confirmed = await confirm({
                                        title: 'Remove Mentor Assignment',
                                        message: `Remove ${a.mentor?.name || 'mentor'} from course "${c.title}"?`,
                                        confirmText: 'Remove Mentor',
                                        isDestructive: true,
                                      });
                                      if (confirmed) {
                                        removeCourseAssignMutation.mutate({
                                          mentorId: a.mentorId,
                                          courseId: c.id,
                                        }, {
                                          onSuccess: () => refetchCourses(),
                                        });
                                      }
                                    }}
                                    className="text-[#EF4444] hover:text-[#B91C1C] p-1 rounded hover:bg-rose-50 cursor-pointer"
                                    title="Remove Mentor Assignment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 flex items-center justify-between">
                              <span className="italic">No mentor assigned</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignCourseId(c.id);
                                  setAssignBatchId('');
                                  setAssignScope('COURSE_WIDE');
                                  setAssignMentorId(mentorsData?.[0]?.id || '');
                                  setIsAssignModalOpen(true);
                                }}
                                className="font-bold text-[#2563EB] hover:underline"
                              >
                                Assign Now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 pt-2 border-t border-[#EDF0F4] flex justify-between items-center text-xs">
                      <span className="font-bold text-[#16845B]">₹{Number(c.price).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourse(c);
                            setCourseTitle(c.title || '');
                            setCourseTitleTa(c.titleTa || '');
                            setCourseSubtitle(c.subtitle || '');
                            setCourseDescription(c.description || '');
                            setCourseDescriptionTa(c.descriptionTa || '');
                            setCourseCategory(c.category?.name || 'Full-Stack Web Development');
                            setCourseCategoryId(c.categoryId || '');
                            setCourseLevel(c.level || 'All Levels');
                            setCourseLanguage(c.language || 'English');
                            setCoursePrice(String(c.price || 0));
                            setCourseDiscountPrice(c.discountPrice ? String(c.discountPrice) : '');
                            setCourseAllowInstallments(Boolean(c.allowInstallments));
                            setCourseMinInstallmentAmount(c.minInstallmentAmount ? String(c.minInstallmentAmount) : '');
                            setCourseInstallmentCount(String(c.installmentCount || 2));
                            setCourseInstallmentPolicy(c.installmentPolicy || 'RESTRICTED');
                            setCourseInstructorId(c.instructorId || '');
                            setCourseThumbnailUrl(c.thumbnailUrl || null);
                            setCoursePreviewVideoUrl(c.previewVideoUrl || '');
                            setCourseStatus(c.status || 'PUBLISHED');
                            setIsCourseModalOpen(true);
                          }}
                          className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <Link to={`/courses/${c.slug}`} className="text-[#667085] hover:text-[#14233B] font-semibold">
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: 'Delete Course',
                              message: `Are you sure you want to delete "${c.title}"? If students are enrolled or payment records exist, the curriculum will be safely archived instead of destroyed.`,
                              confirmText: 'Delete Course',
                              isDestructive: true,
                            });
                            if (confirmed) {
                              deleteCourseMutation.mutate(c.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer ml-1"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: INTERNSHIP MANAGEMENT & COHORT PLACEMENTS
          ======================================================== */}
          {activeTab === 'internships' && (
            <div className="space-y-6">
              <InternshipManagement />
            </div>
          )}

          {/* ========================================================
              TAB 3B: MATERIALS MARKETPLACE MANAGEMENT
          ======================================================== */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#14233B]">Downloadable Learning Materials Marketplace</h3>
                  <p className="text-xs text-[#667085]">Upload PDFs, ZIP code files, interview kits, and set pricing / course associations</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingMaterial(null);
                      setMatTitle('');
                      setMatDescription('');
                      setMatType('PDF');
                      setMatCategory('Development');
                      setMatPrice('0');
                      setMatIsFree(true);
                      setMatCourseId('');
                      setMatInternshipId('');
                      setMatFileUrl('');
                      setMatFileSize(null);
                      setMatThumbnailUrl(null);
                      setIsMaterialModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Upload Material</span>
                  </button>
                  <Link
                    to="/materials"
                    className="px-3 py-1.5 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Public Store</span>
                  </Link>
                  <button
                    onClick={() => refetchAdminMaterials()}
                    className="p-1.5 text-[#667085] hover:text-[#2563EB] bg-white border border-[#E4E9F0] rounded-lg"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">Title & Description</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Associated Course</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Purchases</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {adminMaterialsData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#98A2B3]">
                            No learning materials uploaded yet.
                          </td>
                        </tr>
                      ) : (
                        adminMaterialsData.map((mat: any) => (
                          <tr key={mat.id} className="hover:bg-[#F6F8FB] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-[#E4E9F0] flex items-center justify-center">
                                  {mat.thumbnailUrl ? (
                                    <img
                                      src={mat.thumbnailUrl}
                                      alt={mat.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src =
                                          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80';
                                      }}
                                    />
                                  ) : (
                                    <FileText className="w-5 h-5 text-[#2563EB]" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-[#14233B] block">{mat.title}</span>
                                  <span className="text-[11px] text-[#667085] line-clamp-1">{mat.description || 'No description provided'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#EFF6FF] text-[#2563EB] uppercase">
                                {mat.type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#172033]">
                              {mat.course?.title || <span className="text-[#98A2B3] italic">Standalone Material</span>}
                            </td>
                            <td className="py-3 px-4">
                              {mat.isFree || Number(mat.price) === 0 ? (
                                <span className="font-bold text-[#16845B]">FREE</span>
                              ) : (
                                <span className="font-bold text-[#14233B]">₹{Number(mat.price).toLocaleString()}</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] rounded-full">
                                Published
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#14233B]">
                              {mat._count?.purchases || 0}
                            </td>
                            <td className="py-3 px-4 text-right flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMaterial(mat);
                                  setMatTitle(mat.title || '');
                                  setMatDescription(mat.description || '');
                                  setMatType(mat.type || 'PDF');
                                  setMatCategory(mat.category || 'Development');
                                  setMatPrice(String(mat.price || 0));
                                  setMatIsFree(Boolean(mat.isFree || Number(mat.price) === 0));
                                  setMatCourseId(mat.courseId || '');
                                  setMatInternshipId(mat.internshipId || '');
                                  setMatFileUrl(mat.fileUrl || '');
                                  setMatFileSize(mat.fileSize || null);
                                  setMatThumbnailUrl(mat.thumbnailUrl || null);
                                  setIsMaterialModalOpen(true);
                                }}
                                className="p-1 text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                                title="Edit Material"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={`${api.defaults.baseURL || 'http://localhost:5000/api'}/materials/${mat.id}/download?token=${localStorage.getItem('token')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                              >
                                Download
                              </a>
                              <button
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: 'Delete Material',
                                    message: `Delete material "${mat.title}"?`,
                                    confirmText: 'Delete Material',
                                    isDestructive: true,
                                  });
                                  if (!confirmed) return;
                                  try {
                                    await api.delete(`/materials/${mat.id}`);
                                    toast.success('Material Deleted', 'The material was removed successfully.');
                                    refetchAdminMaterials();
                                  } catch (err: any) {
                                    toast.apiError(err, 'Failed to delete material');
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                                title="Delete Material"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3C: HACKATHON MANAGEMENT
          ======================================================== */}
          {activeTab === 'hackathons' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#14233B]">Hackathon & Coding Sprint Hub</h3>
                  <p className="text-xs text-[#667085]">Manage upcoming sprints, deadlines, registrations, and fees</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingHackathon(null);
                      setHackTitle('');
                      setHackTheme('');
                      setHackDescription('');
                      setHackOrganizer('SkillUp Global');
                      setHackStartDate('');
                      setHackEndDate('');
                      setHackDeadline('');
                      setHackMode('ONLINE');
                      setHackLocation('');
                      setHackFee('0');
                      setHackMinTeam('1');
                      setHackMaxTeam('4');
                      setHackEligibility('Open to all students & developers');
                      setHackPrizes('₹50,000 Cash Pool + Internship Offers');
                      setHackRules('Original code only. Teams of 1-4 members.');
                      setHackBannerUrl(null);
                      setIsHackathonModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create Hackathon</span>
                  </button>
                  <Link
                    to="/hackathons"
                    className="px-3 py-1.5 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Public Page</span>
                  </Link>
                  <button
                    onClick={() => refetchAdminHackathons()}
                    className="p-1.5 text-[#667085] hover:text-[#2563EB] bg-white border border-[#E4E9F0] rounded-lg"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">Hackathon</th>
                        <th className="py-3 px-4">Theme</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">Registration Fee</th>
                        <th className="py-3 px-4">Participants</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {adminHackathonsData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#98A2B3]">
                            No hackathons created yet.
                          </td>
                        </tr>
                      ) : (
                        adminHackathonsData.map((h: any) => (
                          <tr key={h.id} className="hover:bg-[#F6F8FB] transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-8 rounded-md bg-slate-100 overflow-hidden shrink-0 border border-[#E4E9F0]">
                                  <img
                                    src={h.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80'}
                                    alt={h.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80';
                                    }}
                                  />
                                </div>
                                <div>
                                  <span className="font-bold text-[#14233B] block">{h.title}</span>
                                  <span className="text-[11px] text-[#667085]">{h.organizer}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#2563EB]">{h.theme}</td>
                            <td className="py-3 px-4 text-[#667085]">
                              {new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#14233B]">
                                {h.mode}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-[#16845B]">
                              {Number(h.registrationFee) === 0 ? 'FREE' : `₹${Number(h.registrationFee).toLocaleString()}`}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[#14233B]">
                              {h._count?.registrations || 0}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingHackathon(h);
                                    setHackTitle(h.title || '');
                                    setHackTheme(h.theme || '');
                                    setHackDescription(h.description || '');
                                    setHackOrganizer(h.organizer || 'SkillUp Global');
                                    setHackStartDate(h.startDate ? h.startDate.split('T')[0] : '');
                                    setHackEndDate(h.endDate ? h.endDate.split('T')[0] : '');
                                    setHackDeadline(h.registrationDeadline ? h.registrationDeadline.split('T')[0] : '');
                                    setHackMode(h.mode || 'ONLINE');
                                    setHackLocation(h.location || '');
                                    setHackFee(String(h.registrationFee || 0));
                                    setHackMinTeam(String(h.minTeamSize || 1));
                                    setHackMaxTeam(String(h.maxTeamSize || 4));
                                    setHackEligibility(h.eligibility || 'Open to all students & developers');
                                    setHackPrizes(h.prizes || '');
                                    setHackRules(h.rules || '');
                                    setHackBannerUrl(h.bannerUrl || null);
                                    setIsHackathonModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: 'Delete Hackathon',
                                      message: `Are you sure you want to delete or close hackathon "${h.title}"? If students have registered, it will be unlisted/archived to preserve participation data.`,
                                      confirmText: 'Delete Hackathon',
                                      isDestructive: true,
                                    });
                                    if (confirmed) {
                                      deleteHackathonMutation.mutate(h.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Delete or Archive Hackathon"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              PARTNER MANAGEMENT (PARTNER LOGOS & CAROUSEL)
          ======================================================== */}
          {activeTab === 'partners' && (
            <div className="space-y-6">
              <PartnerManagement />
            </div>
          )}

          {/* ========================================================
              TAB 4: MENTOR MANAGEMENT & SCOPE ASSIGNMENTS
          ======================================================== */}
          {activeTab === 'mentors' && (() => {
            // Apply Search & Filter Logic
            const filteredMentors = mentorsData?.filter((m: any) => {
              const matchesSearch =
                !mentorSearch ||
                m.name?.toLowerCase().includes(mentorSearch.toLowerCase()) ||
                m.email?.toLowerCase().includes(mentorSearch.toLowerCase());

              if (!matchesSearch) return false;

              if (mentorFilter === 'ASSIGNED') {
                return (m.assignedCoursesCount > 0 || m.assignedBatchesCount > 0 || m.mentorAssignments?.length > 0);
              }
              if (mentorFilter === 'UNASSIGNED') {
                return (!m.assignedCoursesCount && !m.assignedBatchesCount && (!m.mentorAssignments || m.mentorAssignments.length === 0));
              }
              if (mentorFilter === 'DEACTIVATED') {
                return !m.isVerified;
              }
              return true; // 'ALL' or 'PENDING' handled with tabs/cards
            });

            const assignedCount = mentorsData?.filter((m: any) => (m.assignedCoursesCount > 0 || m.assignedBatchesCount > 0 || m.mentorAssignments?.length > 0)).length || 0;
            const unassignedCount = mentorsData?.filter((m: any) => (!m.assignedCoursesCount && !m.assignedBatchesCount && (!m.mentorAssignments || m.mentorAssignments.length === 0))).length || 0;
            const deactivatedCount = mentorsData?.filter((m: any) => !m.isVerified).length || 0;
            const pendingCount = pendingInvitations?.length || 0;

            return (
              <div className="space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[#14233B]">Mentor Account & Cohort Assignment Directory</h2>
                    <p className="text-xs text-[#667085]">
                      Review mentor course allocations, active cohort ownership, and student counts loaded directly from verified database records.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setInvitedMentorResult(null);
                        setNewMentorName('');
                        setNewMentorEmail('');
                        setNewMentorTitle('Senior Full-Stack Mentor');
                        if (coursesData && coursesData.length > 0) setNewMentorCourseId(coursesData[0].id);
                        setIsAddMentorModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Add Mentor</span>
                    </button>
                    <button
                      onClick={() => {
                        if (mentorsData && mentorsData.length > 0) setAssignMentorId(mentorsData[0].id);
                        if (coursesData && coursesData.length > 0) setAssignCourseId(coursesData[0].id);
                        setIsAssignModalOpen(true);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign to Cohort</span>
                    </button>
                    <button
                      onClick={() => refetchMentors()}
                      title="Refresh Database Records"
                      className="p-2 text-[#667085] hover:text-[#173B73] bg-white border border-[#E4E9F0] rounded-xl hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Filter & Metric Tabs */}
                <div className="bg-white p-4 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
                      <button
                        onClick={() => setMentorFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          mentorFilter === 'ALL'
                            ? 'bg-[#173B73] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#667085] hover:text-[#14233B] hover:bg-[#EDF0F4]'
                        }`}
                      >
                        <span>All Mentors</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mentorFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-[#E4E9F0] text-[#475467]'}`}>
                          {mentorsData?.length || 0}
                        </span>
                      </button>

                      <button
                        onClick={() => setMentorFilter('ASSIGNED')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          mentorFilter === 'ASSIGNED'
                            ? 'bg-[#2563EB] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#667085] hover:text-[#14233B] hover:bg-[#EDF0F4]'
                        }`}
                      >
                        <span>Assigned Mentors</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mentorFilter === 'ASSIGNED' ? 'bg-white/20 text-white' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
                          {assignedCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setMentorFilter('UNASSIGNED')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          mentorFilter === 'UNASSIGNED'
                            ? 'bg-[#B7791F] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#667085] hover:text-[#14233B] hover:bg-[#EDF0F4]'
                        }`}
                      >
                        <span>Unassigned Mentors</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mentorFilter === 'UNASSIGNED' ? 'bg-white/20 text-white' : 'bg-[#FFF6E5] text-[#B7791F]'}`}>
                          {unassignedCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setMentorFilter('PENDING')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          mentorFilter === 'PENDING'
                            ? 'bg-[#4779C7] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#667085] hover:text-[#14233B] hover:bg-[#EDF0F4]'
                        }`}
                      >
                        <span>Pending Invitations</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mentorFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-[#EFF6FF] text-[#4779C7]'}`}>
                          {pendingCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setMentorFilter('DEACTIVATED')}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                          mentorFilter === 'DEACTIVATED'
                            ? 'bg-[#C03945] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#667085] hover:text-[#14233B] hover:bg-[#EDF0F4]'
                        }`}
                      >
                        <span>Deactivated Mentors</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mentorFilter === 'DEACTIVATED' ? 'bg-white/20 text-white' : 'bg-[#FFF0F0] text-[#C03945]'}`}>
                          {deactivatedCount}
                        </span>
                      </button>
                    </div>

                    {/* Search Field */}
                    <div className="relative min-w-[240px]">
                      <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search mentor name or email..."
                        value={mentorSearch}
                        onChange={(e) => setMentorSearch(e.target.value)}
                        className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-[#F8F9FA]/50"
                      />
                      {mentorSearch && (
                        <button
                          onClick={() => setMentorSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#14233B]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show Pending Invitations if filter is PENDING or ALL */}
                {(mentorFilter === 'PENDING' || (mentorFilter === 'ALL' && pendingInvitations.length > 0)) && (
                  <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-[#EDF0F4] bg-[#F8F9FA]/40 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#B7791F]" />
                        <h3 className="text-xs font-bold text-[#14233B]">
                          Pending Mentor Invitations ({pendingInvitations.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-[#667085]">Awaiting mentor account activation & password setup</span>
                    </div>

                    <div className="divide-y divide-[#EDF0F4]">
                      {pendingInvitations.map((inv: any) => (
                        <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#14233B]">{inv.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6E5] text-[#B7791F]">
                                INVITATION PENDING
                              </span>
                            </div>
                            <span className="text-[11px] text-[#667085] block mt-0.5">{inv.email}</span>
                            <span className="text-[10px] text-[#98A2B3] block mt-0.5">
                              Invited on {new Date(inv.createdAt).toLocaleDateString()} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(inv.email);
                                toast.info('Copied', 'Mentor email copied');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                            >
                              Copy Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Mentors Table & Cards (Hidden if filter is strictly PENDING) */}
                {mentorFilter !== 'PENDING' && (
                  <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-[#EDF0F4] flex justify-between items-center bg-[#F8F9FA]/40">
                      <h3 className="text-xs font-bold text-[#14233B]">
                        Active & Registered Mentors ({filteredMentors?.length || 0})
                      </h3>
                      <span className="text-[11px] text-[#667085]">
                        Real-time course & cohort enrollments count from database
                      </span>
                    </div>

                    <div className="divide-y divide-[#EDF0F4]">
                      {filteredMentors?.length === 0 ? (
                        <div className="p-12 text-center text-xs text-[#667085] space-y-2">
                          <Users className="w-8 h-8 text-[#98A2B3] mx-auto" />
                          <p className="font-semibold text-sm text-[#14233B]">No mentors match the selected criteria.</p>
                          <p className="text-[11px]">Try adjusting your search query or reset the filter.</p>
                        </div>
                      ) : (
                        filteredMentors.map((mentor: any) => {
                          const hasAssignments =
                            mentor.assignedCoursesCount > 0 ||
                            mentor.assignedBatchesCount > 0 ||
                            mentor.mentorAssignments?.length > 0;

                          return (
                            <div
                              key={mentor.id}
                              className="p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F8F9FA]/60 transition-colors"
                            >
                              {/* Column 1: Mentor Profile Info */}
                              <div className="flex items-start gap-3 min-w-[280px]">
                                <div className="w-10 h-10 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                  {mentor.name.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#14233B]">{mentor.name}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        mentor.isVerified
                                          ? 'bg-[#EAF7F0] text-[#16845B]'
                                          : 'bg-[#FFF0F0] text-[#C03945]'
                                      }`}
                                    >
                                      {mentor.isVerified ? 'Active' : 'Deactivated'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-[#667085]">{mentor.email}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard?.writeText(mentor.email);
                                        toast.info('Copied', 'Email copied to clipboard');
                                      }}
                                      title="Copy Email"
                                      className="text-[#2563EB] hover:text-[#1D4ED8] text-[10px] font-semibold cursor-pointer"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <span className="text-[11px] text-[#4779C7] font-medium block">
                                    {mentor.title || 'Senior Technical Mentor'}
                                  </span>
                                </div>
                              </div>

                              {/* Column 2: Assignment Metrics & Cohort Badges */}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3 text-xs">
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FA] border border-[#E4E9F0] rounded-lg">
                                    <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                                    <span className="text-[#667085]">Courses:</span>
                                    <strong className="text-[#14233B]">{mentor.assignedCoursesCount ?? mentor.assignedCourses?.length ?? 0}</strong>
                                  </div>
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FA] border border-[#E4E9F0] rounded-lg">
                                    <Layers className="w-3.5 h-3.5 text-[#173B73]" />
                                    <span className="text-[#667085]">Batches:</span>
                                    <strong className="text-[#14233B]">{mentor.assignedBatchesCount ?? mentor.assignedBatches?.length ?? 0}</strong>
                                  </div>
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FA] border border-[#E4E9F0] rounded-lg">
                                    <Users className="w-3.5 h-3.5 text-[#16845B]" />
                                    <span className="text-[#667085]">Students in Cohorts:</span>
                                    <strong className="text-[#16845B]">{mentor.totalStudentsUnderCohorts ?? 0}</strong>
                                  </div>
                                </div>

                                {/* Assigned Badges Preview */}
                                {!hasAssignments ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#98A2B3] italic font-medium">No courses or batches assigned</span>
                                    <button
                                      onClick={() => {
                                        setAssignMentorId(mentor.id);
                                        if (coursesData && coursesData.length > 0) setAssignCourseId(coursesData[0].id);
                                        setIsAssignModalOpen(true);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#2563EB]/20 transition-colors cursor-pointer"
                                    >
                                      + Assign Now
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {mentor.mentorAssignments?.slice(0, 4).map((a: any) => (
                                      <span
                                        key={a.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] rounded-md border border-[#2563EB]/20 shadow-2xs"
                                      >
                                        <span>
                                          {a.course?.title} {a.batch ? `(${a.batch.code})` : '(All Batches)'}
                                        </span>
                                        <button
                                          onClick={async () => {
                                            const confirmed = await confirm({
                                              title: 'Remove Mentor Assignment',
                                              message: `Are you sure you want to remove the assignment for "${a.course?.title}" from mentor ${mentor.name}?\n\nNote: This will NOT delete any courses, student progress, lessons, payments, or certificates.`,
                                              confirmText: 'Remove Assignment',
                                              isDestructive: true,
                                            });
                                            if (confirmed) {
                                              if (a.batchId) {
                                                removeBatchAssignMutation.mutate({ mentorId: mentor.id, batchId: a.batchId });
                                              } else {
                                                removeCourseAssignMutation.mutate({ mentorId: mentor.id, courseId: a.courseId });
                                              }
                                            }
                                          }}
                                          title="Remove assignment"
                                          className="text-red-400 hover:text-red-600 cursor-pointer font-bold ml-0.5"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                    {mentor.mentorAssignments?.length > 4 && (
                                      <span className="text-[10px] text-[#667085] font-semibold">
                                        +{mentor.mentorAssignments.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Column 3: Action Buttons */}
                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                {/* View Assignments Button */}
                                <button
                                  onClick={() => setViewAssignmentsMentor(mentor)}
                                  className="px-3 py-1.5 text-xs font-semibold text-[#14233B] bg-white border border-[#E4E9F0] hover:bg-[#F8F9FA] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                                  <span>View Assignments</span>
                                </button>

                                <button
                                  onClick={() => resendInviteMutation.mutate(mentor.id)}
                                  disabled={resendInviteMutation.isPending}
                                  title="Resend Activation or Password Setup Link"
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 hover:bg-[#DBEAFE] rounded-lg transition-colors cursor-pointer"
                                >
                                  Resend Access
                                </button>

                                {mentor.isVerified ? (
                                  <button
                                    onClick={async () => {
                                      const confirmed = await confirm({
                                        title: 'Deactivate Mentor',
                                        message: `Deactivate mentor ${mentor.name}?\nThey will immediately be blocked from logging in or scheduling new live classes.`,
                                        confirmText: 'Deactivate Mentor',
                                        isDestructive: true,
                                      });
                                      if (confirmed) {
                                        deactivateMentorMutation.mutate({ id: mentor.id });
                                      }
                                    }}
                                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#C03945] bg-[#FFF0F0] border border-[#C03945]/20 hover:bg-[#FFE0E0] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => reactivateMentorMutation.mutate(mentor.id)}
                                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#16845B] bg-[#EAF7F0] border border-[#16845B]/20 hover:bg-[#D4EFE0] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Reactivate
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: 'Archive Mentor',
                                      message: `Safely archive mentor ${mentor.name}?\nActive assignments will be unlinked, while historical student progress, attendance records, and certificates remain intact.`,
                                      confirmText: 'Archive Mentor',
                                      isDestructive: true,
                                    });
                                    if (confirmed) {
                                      removeMentorMutation.mutate({ id: mentor.id, force: true });
                                    }
                                  }}
                                  title="Safely remove mentor"
                                  className="p-1.5 text-[#98A2B3] hover:text-[#C03945] transition-colors cursor-pointer rounded-lg hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ========================================================
              TAB 5: BATCHES & COHORTS
          ======================================================== */}
          {activeTab === 'batches' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#EDF0F4] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#14233B]">Active Student Cohorts ({batchesData?.length || 0})</h3>
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors"
                  >
                    Create New Batch
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Cohort Name</th>
                        <th className="py-3 px-4">Course</th>
                        <th className="py-3 px-4">Assigned Mentor</th>
                        <th className="py-3 px-4">Capacity</th>
                        <th className="py-3 px-4">Start Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {batchesData?.map((b: any) => (
                        <tr key={b.id} className="hover:bg-[#F6F8FB] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#2563EB]">{b.code}</td>
                          <td className="py-3 px-4 font-semibold text-[#14233B]">{b.name}</td>
                          <td className="py-3 px-4 text-[#667085]">{b.course?.title}</td>
                          <td className="py-3 px-4">
                            {b.mentorAssignments?.[0]?.mentor ? (
                              <span className="font-semibold text-[#16845B]">
                                {b.mentorAssignments[0].mentor.name}
                              </span>
                            ) : (
                              <span className="text-[#B7791F] italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-[#14233B]">
                              {b._count?.enrollments || 0} / {b.maxStudents}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#667085]">{new Date(b.startDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: 'Delete Cohort Batch',
                                  message: `Are you sure you want to delete batch "${b.name}" (${b.code})? If students are enrolled, it will be marked completed to preserve records.`,
                                  confirmText: 'Delete Batch',
                                  isDestructive: true,
                                });
                                if (confirmed) {
                                  deleteBatchMutation.mutate(b.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
              TAB 6: ORDERS, PAYMENTS & REFUNDS
          ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-8">
              {/* Modern Course-Wise Payment Management Suite */}
              <CoursePaymentsManagement />

              {/* General Orders & Invoices Ledger */}
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs space-y-4 p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#14233B]">Orders & Payment Transactions</h3>
                    <p className="text-[11px] text-[#667085]">Verified transaction records across courses, learning materials, hackathons, and internships.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student, order ID..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E9F0] bg-white focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <select
                      value={orderProductTypeFilter}
                      onChange={(e) => setOrderProductTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E4E9F0] bg-white text-slate-700 font-medium"
                    >
                      <option value="ALL">All Products</option>
                      <option value="COURSE">Courses</option>
                      <option value="LIVE_CLASS">Live Classes</option>
                      <option value="INTERNSHIP">Internships</option>
                      <option value="MATERIAL">Materials</option>
                      <option value="HACKATHON">Hackathons</option>
                    </select>
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E4E9F0] bg-white text-slate-700 font-medium"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="PENDING">Pending</option>
                      <option value="FAILED">Failed</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                    <button
                      onClick={async () => {
                        try {
                          const params = new URLSearchParams();
                          if (orderSearch) params.set('search', orderSearch);
                          if (orderStatusFilter && orderStatusFilter !== 'ALL') params.set('status', orderStatusFilter);
                          if (orderProductTypeFilter && orderProductTypeFilter !== 'ALL') params.set('productType', orderProductTypeFilter);
                          const res = await api.get(`/admin/payments/export?${params.toString()}`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `payments_report_${Date.now()}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          toast.success('Export Ready', 'Unified payment report downloaded.');
                        } catch {
                          toast.error('Export Failed', 'Unable to generate CSV report.');
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg hover:bg-[#DBEAFE] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Export CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                    <button
                      onClick={() => setIsOfflinePaymentModalOpen(true)}
                      className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#173B73] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'RESET ALL PAYMENTS & ENROLLMENTS',
                          message: 'DANGER: You are about to delete ALL payments (completed, pending, failed) and student enrollments to start completely from scratch with a clean ledger.\n\nAre you absolutely sure you want to reset all payment records?',
                          confirmText: 'Reset Everything Fresh',
                          isDestructive: true,
                        });
                        if (confirmed) {
                          try {
                            const res = await api.post('/admin/payments/reset-all', { confirmText: 'RESET_ALL_PAYMENTS' });
                            toast.success('Ledger Reset', res.data.message || 'All payments deleted successfully.');
                            refetchOrders();
                            queryClient.invalidateQueries({ queryKey: ['admin-overview-data'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
                            queryClient.invalidateQueries({ queryKey: ['payments-history'] });
                            queryClient.invalidateQueries({ queryKey: ['my-courses'] });
                          } catch (err: any) {
                            toast.apiError(err, 'Failed to reset payments');
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Delete all payments to start fresh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset All Payments</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#EDF0F4] rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[10px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-2.5 px-3">Order / Gateway ID</th>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Item / Product</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {(() => {
                        const filtered = (ordersData || []).filter((ord: any) => {
                          if (orderProductTypeFilter === 'COURSE') return !!ord.courseId;
                          if (orderProductTypeFilter === 'LIVE_CLASS') return !!ord.liveClassId;
                          if (orderProductTypeFilter === 'INTERNSHIP') return !!ord.internshipId;
                          if (orderProductTypeFilter === 'MATERIAL') return !!ord.materialId;
                          if (orderProductTypeFilter === 'HACKATHON') return !!ord.hackathonId;
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                                No orders matching the specified filter criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((ord: any) => {
                          const itemTitle = ord.liveClass?.title || ord.course?.title || ord.material?.title || ord.internship?.title || ord.hackathon?.title || '1:1 Mentorship';
                          const itemType = ord.liveClassId
                            ? 'Live Class'
                            : ord.courseId
                            ? 'Course'
                            : ord.materialId
                            ? 'Material'
                            : ord.internshipId
                            ? 'Internship'
                            : ord.hackathonId
                            ? 'Hackathon'
                            : 'Mentorship';

                          return (
                            <tr key={ord.id} className="hover:bg-[#F6F8FB] transition-colors">
                              <td className="py-3 px-3 font-mono font-medium text-[#14233B]">
                                <span className="block truncate max-w-[140px]" title={ord.razorpayOrderId || ord.id}>
                                  {ord.razorpayPaymentId || ord.razorpayOrderId || ord.id}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-semibold text-[#14233B] block">{ord.user?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-slate-400 block">{ord.user?.email}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    itemType === 'Live Class'
                                      ? 'bg-rose-50 text-rose-700'
                                      : itemType === 'Material'
                                      ? 'bg-amber-50 text-amber-700'
                                      : itemType === 'Course'
                                      ? 'bg-blue-50 text-blue-700'
                                      : itemType === 'Hackathon'
                                      ? 'bg-[#EAF5EA] text-[#4ea849]'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {itemType}
                                  </span>
                                  <span className="text-slate-800 font-medium truncate max-w-[160px]" title={itemTitle}>
                                    {itemTitle}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-bold text-[#16845B]">
                                ₹{Number(ord.amount).toLocaleString()} {ord.currency}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                    ord.status === 'COMPLETED'
                                      ? 'bg-[#EAF7F0] text-[#16845B]'
                                      : ord.status === 'REFUNDED'
                                      ? 'bg-[#FFF0F0] text-[#C03945]'
                                      : ord.status === 'FAILED'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-[#FFF6E5] text-[#B7791F]'
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[#667085] whitespace-nowrap">
                                {new Date(ord.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedTransactionDetail(ord)}
                                    className="px-2 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded-md transition cursor-pointer"
                                    title="View Details"
                                  >
                                    Details
                                  </button>
                                  {ord.status === 'COMPLETED' && (
                                    <>
                                      <button
                                        onClick={async () => {
                                          const reason = prompt('Enter reason for administrative refund:');
                                          if (reason) refundMutation.mutate({ paymentId: ord.id, reason });
                                        }}
                                        className="px-2 py-1 text-[11px] font-semibold text-[#C03945] hover:bg-[#FFF0F0] rounded-md transition cursor-pointer"
                                        title="Refund Transaction"
                                      >
                                        Refund
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = await confirm({
                                            title: 'Archive Completed Payment',
                                            message: `Archive completed payment of ₹${Number(ord.amount).toLocaleString()} (Order: ${ord.razorpayOrderId})? This preserves the financial ledger.`,
                                            confirmText: 'Archive Record',
                                            isDestructive: false,
                                          });
                                          if (confirmed) {
                                            deleteOrderMutation.mutate({ paymentId: ord.id, action: 'ARCHIVE', reason: 'Admin archived completed order' });
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                        title="Archive Record"
                                      >
                                        <Archive className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = await confirm({
                                            title: 'Permanently Delete Completed Payment & Enrollment',
                                            message: `Permanently delete completed payment of ₹${Number(ord.amount).toLocaleString()} (Order: ${ord.razorpayOrderId}) for "${ord.user?.name || 'student'}"?\n\nThis will remove the student's enrollment from MySQL database and clear it from their dashboard.`,
                                            confirmText: 'Delete Permanently',
                                            isDestructive: true,
                                          });
                                          if (confirmed) {
                                            deleteOrderMutation.mutate({
                                              paymentId: ord.id,
                                              action: 'DELETE',
                                              confirmedPermanent: true,
                                              deleteEnrollment: true,
                                            });
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                        title="Delete Completed Payment"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {(ord.status === 'PENDING' || ord.status === 'FAILED') && (
                                    <>
                                      {ord.status === 'PENDING' && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const confirmed = await confirm({
                                              title: 'Cancel Pending Payment Order',
                                              message: `Cancel pending payment order ${ord.razorpayOrderId} (₹${Number(ord.amount).toLocaleString()})?`,
                                              confirmText: 'Cancel Order',
                                              isDestructive: true,
                                            });
                                            if (confirmed) {
                                              deleteOrderMutation.mutate({ paymentId: ord.id, action: 'CANCEL' });
                                            }
                                          }}
                                          className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                          title="Cancel Order"
                                        >
                                          Cancel
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const confirmed = await confirm({
                                            title: `Delete ${ord.status} Order`,
                                            message: `Permanently delete unpaid ${ord.status.toLowerCase()} order ${ord.razorpayOrderId} (₹${Number(ord.amount).toLocaleString()}) for ${ord.user?.name || 'student'}? No funds were collected.`,
                                            confirmText: 'Delete Order',
                                            isDestructive: true,
                                          });
                                          if (confirmed) {
                                            deleteOrderMutation.mutate({ paymentId: ord.id, action: 'DELETE' });
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                        title="Delete Order"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  {ord.status === 'REFUNDED' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const confirmed = await confirm({
                                          title: 'Archive Refunded Transaction',
                                          message: `Archive refunded record ${ord.razorpayOrderId}?`,
                                          confirmText: 'Archive',
                                          isDestructive: false,
                                        });
                                        if (confirmed) {
                                          deleteOrderMutation.mutate({ paymentId: ord.id, action: 'ARCHIVE', reason: 'Admin archived refunded transaction' });
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                      title="Archive Record"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Transaction Detail Modal */}
                {selectedTransactionDetail && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E4E9F0] shadow-xl p-6 space-y-4 animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-[#2563EB]" />
                          <h3 className="text-sm font-bold text-[#14233B]">Transaction Details</h3>
                        </div>
                        <button
                          onClick={() => setSelectedTransactionDetail(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Order / Payment ID</span>
                          <span className="font-mono font-bold text-[#14233B]">{selectedTransactionDetail.id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Razorpay Order ID</span>
                          <span className="font-mono text-slate-700">{selectedTransactionDetail.razorpayOrderId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Gateway Payment ID</span>
                          <span className="font-mono text-slate-700">{selectedTransactionDetail.razorpayPaymentId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Student</span>
                          <span className="font-semibold text-[#14233B]">
                            {selectedTransactionDetail.user?.name} ({selectedTransactionDetail.user?.email})
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Product / Item</span>
                          <span className="font-bold text-[#2563EB]">
                            {selectedTransactionDetail.course?.title ||
                              selectedTransactionDetail.material?.title ||
                              selectedTransactionDetail.internship?.title ||
                              selectedTransactionDetail.hackathon?.title ||
                              'Mentorship Session'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Amount Paid</span>
                          <span className="font-black text-[#16845B]">
                            ₹{Number(selectedTransactionDetail.amount).toLocaleString()} {selectedTransactionDetail.currency}
                          </span>
                        </div>
                        {selectedTransactionDetail.couponCode && (
                          <div className="flex justify-between py-1 border-b border-slate-100 bg-amber-50/60 px-1.5 rounded">
                            <span className="text-amber-700 font-medium">Coupon Applied</span>
                            <span className="font-bold text-amber-800">
                              {selectedTransactionDetail.couponCode} (-₹{Number(selectedTransactionDetail.discountAmount || 0).toLocaleString()})
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Payment Status</span>
                          <span className="font-bold">{selectedTransactionDetail.status}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500 font-medium">Payment Date</span>
                          <span>{new Date(selectedTransactionDetail.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setSelectedTransactionDetail(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Record Offline Payment Modal */}
                {isOfflinePaymentModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E4E9F0] shadow-xl p-6 space-y-4 animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-5 h-5 text-[#2563EB]" />
                          <h3 className="text-sm font-bold text-[#14233B]">Record Authorized Offline Payment</h3>
                        </div>
                        <button
                          onClick={() => setIsOfflinePaymentModalOpen(false)}
                          className="text-[#667085] hover:text-[#172033]"
                        >
                          ✕
                        </button>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!offlineStudentId || !offlineAmount) {
                            toast.error('Validation Error', 'Student and Amount are required.');
                            return;
                          }
                          try {
                            await api.post('/admin/payments/offline', {
                              studentId: offlineStudentId,
                              courseId: offlineProductType === 'COURSE' ? offlineCourseId : undefined,
                              internshipId: offlineProductType === 'INTERNSHIP' ? offlineInternshipId : undefined,
                              materialId: offlineProductType === 'MATERIAL' ? offlineMaterialId : undefined,
                              amount: Number(offlineAmount),
                              paymentMethod: offlineMethod,
                              receiptNumber: offlineReceiptNo || undefined,
                              bankReference: offlineBankRef || undefined,
                              adminNotes: offlineNotes || undefined,
                              isPartial: offlineIsPartial,
                            });
                            toast.success('Payment Recorded', `Offline fee payment of ₹${offlineAmount} successfully saved.`);
                            setIsOfflinePaymentModalOpen(false);
                            setOfflineStudentId('');
                            setOfflineAmount('');
                            setOfflineReceiptNo('');
                            setOfflineBankRef('');
                            setOfflineNotes('');
                            refetchOrders();
                            queryClient.invalidateQueries({ queryKey: ['admin-payments-overview'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-payments-courses'] });
                          } catch (err: any) {
                            toast.error('Failed', err.response?.data?.error?.message || 'Could not record offline payment');
                          }
                        }}
                        className="space-y-3.5 text-xs"
                      >
                        <div>
                          <label className="block text-[#667085] font-semibold mb-1">Select Student *</label>
                          <input
                            type="text"
                            required
                            placeholder="Paste student User ID (CUID)..."
                            value={offlineStudentId}
                            onChange={(e) => setOfflineStudentId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Product Type *</label>
                            <select
                              value={offlineProductType}
                              onChange={(e) => setOfflineProductType(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="COURSE">Course Enrollment</option>
                              <option value="INTERNSHIP">Internship Placement</option>
                              <option value="MATERIAL">Learning Material</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Payment Method</label>
                            <select
                              value={offlineMethod}
                              onChange={(e) => setOfflineMethod(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="MANUAL_BANK_TRANSFER">Bank NEFT / IMPS / Wire</option>
                              <option value="CASH_RECEIPT">Cash Counter Receipt</option>
                              <option value="UPI_OFFLINE">Direct UPI / QR Transfer</option>
                              <option value="SCHOLARSHIP_WAIVER">Scholarship / Fee Waiver</option>
                            </select>
                          </div>
                        </div>

                        {offlineProductType === 'COURSE' && (
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Associated Course</label>
                            <select
                              value={offlineCourseId}
                              onChange={(e) => setOfflineCourseId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="">Select Course...</option>
                              {coursesData?.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.title} (₹{c.discountPrice || c.price})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {offlineProductType === 'INTERNSHIP' && (
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Associated Internship</label>
                            <select
                              value={offlineInternshipId}
                              onChange={(e) => setOfflineInternshipId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="">Select Internship...</option>
                              {internshipsData?.map((intern: any) => (
                                <option key={intern.id} value={intern.id}>
                                  {intern.title} (₹{intern.discountPrice || intern.price})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {offlineProductType === 'MATERIAL' && (
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Associated Material</label>
                            <select
                              value={offlineMaterialId}
                              onChange={(e) => setOfflineMaterialId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                            >
                              <option value="">Select Material...</option>
                              {materialsData?.map((m: any) => (
                                <option key={m.id} value={m.id}>
                                  {m.title} (₹{m.discountPrice || m.price})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Amount Paid (₹) *</label>
                            <input
                              type="number"
                              min="0"
                              required
                              placeholder="e.g. 5000"
                              value={offlineAmount}
                              onChange={(e) => setOfflineAmount(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] font-bold text-[#14233B]"
                            />
                          </div>

                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Receipt / Voucher #</label>
                            <input
                              type="text"
                              placeholder="e.g. RCP-2026-0042"
                              value={offlineReceiptNo}
                              onChange={(e) => setOfflineReceiptNo(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#667085] font-semibold mb-1">Bank Reference / UTR</label>
                            <input
                              type="text"
                              placeholder="UTR / Transaction Ref..."
                              value={offlineBankRef}
                              onChange={(e) => setOfflineBankRef(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                            />
                          </div>

                          <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={offlineIsPartial}
                                onChange={(e) => setOfflineIsPartial(e.target.checked)}
                                className="w-4 h-4 text-[#2563EB] rounded"
                              />
                              <span className="font-semibold text-[#14233B]">Partial / Milestone Payment</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[#667085] font-semibold mb-1">Admin Audit Notes</label>
                          <input
                            type="text"
                            placeholder="Verification details, approved waiver, or ledger note..."
                            value={offlineNotes}
                            onChange={(e) => setOfflineNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                          />
                        </div>

                        <div className="pt-3 border-t border-[#EDF0F4] flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsOfflinePaymentModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-[#667085] hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#173B73] rounded-lg shadow-2xs cursor-pointer"
                          >
                            Save Offline Payment
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 7: MENTOR PAYOUTS
          ======================================================== */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#14233B]">Mentor Teaching Settlements & Commissions</h3>
                <button
                  onClick={() => setIsPayoutModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#16845B] hover:bg-[#146e4c] rounded-lg transition-colors flex items-center gap-1"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Process Payout</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                      <tr>
                        <th className="py-3 px-4">Payout ID</th>
                        <th className="py-3 px-4">Mentor ID</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {payoutsData?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-[#F6F8FB] transition-colors">
                          <td className="py-3 px-4 font-mono text-[#2563EB]">{p.id}</td>
                          <td className="py-3 px-4 font-semibold text-[#14233B]">{p.mentorId}</td>
                          <td className="py-3 px-4 font-bold text-[#16845B]">₹{Number(p.amount).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] rounded-full">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#667085]">
                            {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-[#667085]">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 8: COLLEGE COUPONS & DISCOUNT MANAGEMENT
          ======================================================== */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              {/* Header with Title and Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-[#E4E9F0] shadow-2xs">
                <div>
                  <h3 className="text-base font-bold text-[#14233B] flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#2563EB]" />
                    College Coupons & Institutional Partnerships
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Configure college-restricted discount codes, enforce per-student limits, track redemptions, and view revenue analytics.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('token');
                      window.open(
                        `${api.defaults.baseURL || 'http://localhost:5000/api'}/admin/coupons/export-csv?token=${token}`,
                        '_blank'
                      );
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-[#14233B] bg-[#F6F8FB] hover:bg-[#EDF0F4] border border-[#E4E9F0] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Export Redemptions CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingCouponId(null);
                      setCouponCode('');
                      setCouponName('');
                      setCouponDescription('');
                      setCouponCollege('');
                      setCouponCourseId('');
                      setCouponInternshipId('');
                      setCouponMaterialId('');
                      setCouponHackathonId('');
                      setCouponTargetType('ALL');
                      setCouponDiscountVal('30');
                      setCouponType('PERCENTAGE');
                      setCouponMinSpend('');
                      setCouponMaxDiscount('');
                      setCouponValidUntil('');
                      setCouponUsageLimit('100');
                      setCouponPerStudentLimit('1');
                      setIsCouponModalOpen(true);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create College Coupon</span>
                  </button>
                </div>
              </div>

              {/* Analytics Summary Cards (Section 8 Reporting & Analytics) */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Total Coupons</span>
                  <span className="text-xl font-black text-[#14233B] block">{couponsAnalytics.totalCoupons}</span>
                  <span className="text-[10px] text-[#2563EB] font-medium">All Configured</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Active Coupons</span>
                  <span className="text-xl font-black text-[#16845B] block">{couponsAnalytics.activeCoupons}</span>
                  <span className="text-[10px] text-[#16845B] font-medium">Valid & Ready</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Redemptions</span>
                  <span className="text-xl font-black text-[#2563EB] block">
                    {couponsAnalytics.totalRedemptionsCount}
                  </span>
                  <span className="text-[10px] text-[#4779C7] font-medium">Successful Uses</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Original Value</span>
                  <span className="text-xl font-black text-[#14233B] block">
                    ₹{Number(couponsAnalytics.totalOriginalValue).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#667085] font-medium">Catalog Worth</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Discounts Given</span>
                  <span className="text-xl font-black text-[#B7791F] block">
                    ₹{Number(couponsAnalytics.totalDiscountsGranted).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#B7791F] font-medium">Total Waived</span>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block uppercase">Net Collected</span>
                  <span className="text-xl font-black text-[#16845B] block">
                    ₹{Number(couponsAnalytics.totalRevenueCollected).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#16845B] font-medium">Verified Paid</span>
                </div>
              </div>

              {/* Sub-Tab Navigation: Coupons vs Redemptions History */}
              <div className="flex border-b border-[#E4E9F0] gap-4">
                <button
                  onClick={() => setCouponSubTab('coupons')}
                  className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    couponSubTab === 'coupons'
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : 'border-transparent text-[#667085] hover:text-[#14233B]'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Coupons Directory ({couponsData.length})</span>
                </button>
                <button
                  onClick={() => setCouponSubTab('redemptions')}
                  className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    couponSubTab === 'redemptions'
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : 'border-transparent text-[#667085] hover:text-[#14233B]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Redemption Audit History</span>
                </button>
              </div>

              {/* SUBTAB 1: COUPONS TABLE & DIRECTORY */}
              {couponSubTab === 'coupons' && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-[#E4E9F0] shadow-2xs">
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search code, college, or name..."
                          value={couponSearch}
                          onChange={(e) => setCouponSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Filter by college..."
                        value={couponCollegeFilter}
                        onChange={(e) => setCouponCollegeFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] w-48 hidden md:block"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <select
                        value={couponStatusFilter}
                        onChange={(e) => setCouponStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">Active Only</option>
                        <option value="INACTIVE">Inactive Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Coupons Table */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                          <tr>
                            <th className="py-3 px-4">Coupon Code & Details</th>
                            <th className="py-3 px-4">College Affiliate</th>
                            <th className="py-3 px-4">Course Restriction</th>
                            <th className="py-3 px-4">Discount</th>
                            <th className="py-3 px-4">Usage Limit</th>
                            <th className="py-3 px-4">Validity</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF0F4]">
                          {couponsData.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-[#98A2B3]">
                                No coupons found matching search criteria. Click "Create College Coupon" to add one.
                              </td>
                            </tr>
                          ) : (
                            couponsData.map((cp: any) => {
                              const isExpired = cp.validUntil && new Date(cp.validUntil) < new Date();
                              return (
                                <tr key={cp.id} className="hover:bg-[#F6F8FB] transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="space-y-0.5">
                                      <span className="font-mono font-bold text-xs text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#2563EB]/20">
                                        {cp.code}
                                      </span>
                                      {cp.name && (
                                        <span className="block font-semibold text-[#14233B] text-xs pt-1">
                                          {cp.name}
                                        </span>
                                      )}
                                      {cp.description && (
                                        <span className="block text-[11px] text-[#667085] max-w-xs truncate">
                                          {cp.description}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {cp.college ? (
                                      <span className="inline-flex items-center gap-1 font-semibold text-[#14233B] bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                        🎓 {cp.college}
                                      </span>
                                    ) : (
                                      <span className="text-[#98A2B3] italic">Universal (All Colleges)</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    {cp.course ? (
                                      <span className="font-medium text-[#14233B] block max-w-xs truncate">
                                        {cp.course.title}
                                      </span>
                                    ) : (
                                      <span className="text-[#667085]">All Courses</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="font-bold text-[#16845B]">
                                      {cp.discountType === 'PERCENTAGE' ? `${cp.discountVal}% OFF` : `₹${cp.discountVal} OFF`}
                                    </span>
                                    {cp.maxDiscount && (
                                      <span className="block text-[10px] text-[#667085]">
                                        Cap: ₹{Number(cp.maxDiscount)}
                                      </span>
                                    )}
                                    {cp.minSpend && (
                                      <span className="block text-[10px] text-[#667085]">
                                        Min: ₹{Number(cp.minSpend)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-[#14233B]">
                                        {cp.usedCount} / {cp.usageLimit}
                                      </span>
                                      <span className="block text-[10px] text-[#667085]">
                                        Limit: {cp.perStudentLimit} / student
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-[#667085]">
                                    {cp.validUntil ? (
                                      <span className={isExpired ? 'text-[#C03945] font-semibold' : ''}>
                                        {new Date(cp.validUntil).toLocaleDateString()}
                                        {isExpired && ' (Expired)'}
                                      </span>
                                    ) : (
                                      <span className="text-[#16845B]">No Expiry</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => toggleCouponMutation.mutate(cp.id)}
                                      title="Click to toggle active/inactive"
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full cursor-pointer transition-opacity hover:opacity-80 ${
                                        cp.isActive && !isExpired
                                          ? 'bg-[#EAF7F0] text-[#16845B] border border-[#16845B]/20'
                                          : 'bg-[#FFF0F0] text-[#C03945] border border-[#C03945]/20'
                                      }`}
                                    >
                                      {cp.isActive && !isExpired ? 'Active' : 'Inactive'}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingCouponId(cp.id);
                                        setCouponCode(cp.code);
                                        setCouponName(cp.name || '');
                                        setCouponDescription(cp.description || '');
                                        setCouponCollege(cp.college || '');
                                        setCouponCourseId(cp.courseId || '');
                                        setCouponInternshipId(cp.internshipId || '');
                                        setCouponMaterialId(cp.materialId || '');
                                        setCouponHackathonId(cp.hackathonId || '');
                                        if (cp.courseId) setCouponTargetType('COURSE');
                                        else if (cp.internshipId) setCouponTargetType('INTERNSHIP');
                                        else if (cp.materialId) setCouponTargetType('MATERIAL');
                                        else if (cp.hackathonId) setCouponTargetType('HACKATHON');
                                        else setCouponTargetType('ALL');
                                        setCouponDiscountVal(String(cp.discountVal));
                                        setCouponType(cp.discountType);
                                        setCouponMinSpend(cp.minSpend ? String(cp.minSpend) : '');
                                        setCouponMaxDiscount(cp.maxDiscount ? String(cp.maxDiscount) : '');
                                        setCouponValidUntil(
                                          cp.validUntil ? new Date(cp.validUntil).toISOString().split('T')[0] : ''
                                        );
                                        setCouponUsageLimit(String(cp.usageLimit));
                                        setCouponPerStudentLimit(String(cp.perStudentLimit));
                                        setIsCouponModalOpen(true);
                                      }}
                                      className="p-1.5 text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors inline-flex items-center gap-1"
                                      title="Edit Coupon Settings"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span className="text-[11px] font-semibold">Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const confirmed = await confirm({
                                          title: 'Delete / Deactivate Coupon',
                                          message: `Are you sure you want to delete coupon code "${cp.code}"? If redemptions exist, it will be deactivated to preserve historical payment records.`,
                                          confirmText: 'Delete Coupon',
                                          isDestructive: true,
                                        });
                                        if (confirmed) {
                                          deleteCouponMutation.mutate(cp.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      title="Delete or Deactivate Coupon"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span className="text-[11px] font-semibold">Delete</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: REDEMPTION AUDIT HISTORY */}
              {couponSubTab === 'redemptions' && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-[#E4E9F0] shadow-2xs">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student, coupon, course, college..."
                        value={redemptionSearch}
                        onChange={(e) => setRedemptionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
                      <select
                        value={redemptionStatusFilter}
                        onChange={(e) => setRedemptionStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="RESERVED">Reserved</option>
                        <option value="REFUNDED">Refunded</option>
                      </select>
                    </div>
                  </div>

                  {/* Redemptions Table */}
                  <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F6F8FB] text-[#667085] uppercase text-[11px] font-semibold border-b border-[#E4E9F0]">
                          <tr>
                            <th className="py-3 px-4">Coupon Code</th>
                            <th className="py-3 px-4">College Partnership</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Course Enrolled</th>
                            <th className="py-3 px-4">Original Price</th>
                            <th className="py-3 px-4">Discount</th>
                            <th className="py-3 px-4">Amount Paid</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Redemption Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDF0F4]">
                          {!redemptionsData || redemptionsData.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-[#98A2B3]">
                                No redemption records found matching query.
                              </td>
                            </tr>
                          ) : (
                            redemptionsData.map((rd: any) => (
                              <tr key={rd.id} className="hover:bg-[#F6F8FB] transition-colors">
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-xs text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#2563EB]/20">
                                    {rd.coupon?.code}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-[#14233B]">
                                    {rd.coupon?.college || 'Universal'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="space-y-0.5">
                                    <span className="font-semibold text-[#14233B] block">{rd.user?.name}</span>
                                    <span className="text-[11px] text-[#667085] block">{rd.user?.email}</span>
                                    {rd.user?.college && (
                                      <span className="text-[10px] text-[#2563EB] block">
                                        🎓 {rd.user.college}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-[#14233B]">
                                  {rd.course?.title}
                                </td>
                                <td className="py-3 px-4 text-[#667085]">
                                  ₹{Number(rd.originalAmount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#16845B]">
                                  -₹{Number(rd.discountAmount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#14233B]">
                                  ₹{Number(rd.finalAmount).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                      rd.status === 'COMPLETED'
                                        ? 'bg-[#EAF7F0] text-[#16845B]'
                                        : rd.status === 'RESERVED'
                                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                                        : 'bg-[#FFF0F0] text-[#C03945]'
                                    }`}
                                  >
                                    {rd.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[#667085]">
                                  {new Date(rd.redeemedAt).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              LIVE CLASSES SECTION (ADMIN VIEW)
          ======================================================== */}
          {activeTab === 'classes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-[#14233B]">Scheduled Live Classes & Masterclasses</h2>
                  <p className="text-xs text-[#667085]">Monitor all real-time video lectures, WebRTC rooms, and cohort sessions across courses</p>
                </div>
                <button
                  onClick={() => refetchLiveClasses()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg hover:bg-[#DBEAFE] transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#EDF0F4] text-[#667085] font-semibold">
                        <th className="py-3 px-4">Class Title</th>
                        <th className="py-3 px-4">Course</th>
                        <th className="py-3 px-4">Instructor / Host</th>
                        <th className="py-3 px-4">Fee (INR)</th>
                        <th className="py-3 px-4">Registrations</th>
                        <th className="py-3 px-4">Revenue</th>
                        <th className="py-3 px-4">Start Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {!adminLiveClassesData || adminLiveClassesData.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-[#667085]">
                            <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <span>No live classes currently scheduled in the platform</span>
                          </td>
                        </tr>
                      ) : (
                        adminLiveClassesData.map((cls: any) => (
                          <tr key={cls.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#14233B] block">{cls.title}</span>
                              {cls.description && (
                                <span className="text-[11px] text-[#667085] line-clamp-1">{cls.description}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[#172033] font-medium">
                              {cls.course?.title || 'Universal Masterclass'}
                            </td>
                            <td className="py-3.5 px-4 text-[#172033]">
                              <span className="font-medium block">{cls.instructor?.name || 'Assigned Instructor'}</span>
                              <span className="text-[10px] text-[#667085]">{cls.instructor?.email}</span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#173B73]">
                              {Number(cls.price) === 0 ? 'Free' : `₹${Number(cls.price).toLocaleString()}`}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold text-[10px]">
                                {cls.paidRegistrations ?? 0} Paid {cls.maxCapacity ? `/ ${cls.maxCapacity} Max` : ''}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#16845B]">
                              ₹{(cls.collectedRevenue ?? 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                              {new Date(cls.startTime).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  cls.status === 'LIVE'
                                    ? 'bg-[#EAF7F0] text-[#16845B] animate-pulse'
                                    : cls.status === 'ENDED' || cls.status === 'COMPLETED'
                                    ? 'bg-slate-100 text-slate-600'
                                    : cls.status === 'CANCELLED'
                                    ? 'bg-rose-50 text-rose-600'
                                    : 'bg-[#EFF6FF] text-[#2563EB]'
                                }`}
                              >
                                {cls.status || 'SCHEDULED'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {cls.meetingUrl && cls.status !== 'CANCELLED' && (
                                  <a
                                    href={cls.meetingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open Meeting URL"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition-colors"
                                  >
                                    <span>Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {cls.status !== 'CANCELLED' && cls.status !== 'COMPLETED' && (
                                  <button
                                    onClick={async () => {
                                      const confirmed = await confirm({
                                        title: 'Cancel Live Class',
                                        message: `Cancel class "${cls.title}"? Private meeting link will be deactivated and attendance preserved.`,
                                        confirmText: 'Cancel Class',
                                        isDestructive: true,
                                      });
                                      if (confirmed) {
                                        try {
                                          await api.delete(`/admin/live-classes/${cls.id}`);
                                          toast.success('Class Cancelled', 'The live class has been cancelled.');
                                          refetchLiveClasses();
                                        } catch (err: any) {
                                          toast.apiError(err, 'Could not cancel class');
                                        }
                                      }
                                    }}
                                    title="Cancel Class"
                                    className="p-1 text-[#98A2B3] hover:text-[#C03945] transition-colors cursor-pointer"
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
              </div>
            </div>
          )}

          {/* ========================================================
              CERTIFICATES SECTION (ADMIN VIEW)
          ======================================================== */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-[#14233B]">Accredited Certificates Registry</h2>
                  <p className="text-xs text-[#667085]">Issued graduation credentials, verification hashes, and course accreditations</p>
                </div>
                <button
                  onClick={() => refetchCerts()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg hover:bg-[#DBEAFE] transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#EDF0F4] text-[#667085] font-semibold">
                        <th className="py-3 px-4">Certificate ID</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Student Email</th>
                        <th className="py-3 px-4">Completed Course</th>
                        <th className="py-3 px-4">Issued At</th>
                        <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {!certsData || certsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-[#667085]">
                            <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <span>No certificates issued yet</span>
                          </td>
                        </tr>
                      ) : (
                        certsData.map((cert: any) => (
                          <tr key={cert.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB]">
                              {cert.certificateNo || cert.id.slice(0, 12)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#14233B]">
                              {cert.user?.name || 'Student'}
                            </td>
                            <td className="py-3.5 px-4 text-[#667085]">
                              {cert.user?.email}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#172033]">
                              {cert.course?.title}
                            </td>
                            <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                              {new Date(cert.issuedAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                                VERIFIED
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: 'Revoke Certificate',
                                    message: `Revoke certificate ${cert.certificateNo || cert.id.slice(0, 8)} issued to ${cert.user?.name || 'student'}?`,
                                    confirmText: 'Revoke Certificate',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    deleteCertificateMutation.mutate(cert.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Revoke Certificate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}



          {/* ========================================================
              REPORTS & ANALYTICS SECTION (ADMIN VIEW)
          ======================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <CourseAnalyticsDashboard />
            </div>
          )}

          {/* ========================================================
              SUPPORT TICKETS SECTION (ADMIN VIEW)
          ======================================================== */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-base font-bold text-[#14233B]">Student Support Helpdesk & Inquiries</h2>
                  <p className="text-xs text-[#667085]">Manage incoming student requests, issue resolutions, and queries</p>
                </div>
                <button
                  onClick={() => refetchTickets()}
                  className="px-3 py-1.5 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg hover:bg-[#DBEAFE] transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#EDF0F4] text-[#667085] font-semibold">
                        <th className="py-3 px-4">Subject & Details</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF0F4]">
                      {!ticketsData || ticketsData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-[#667085]">
                            <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <span>No support tickets currently filed</span>
                          </td>
                        </tr>
                      ) : (
                        ticketsData.map((ticket: any) => (
                          <tr key={ticket.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                            <td className="py-3.5 px-4 max-w-xs">
                              <span className="font-bold text-[#14233B] block">{ticket.subject}</span>
                              <span className="text-[11px] text-[#667085] line-clamp-1">{ticket.message}</span>
                            </td>
                            <td className="py-3.5 px-4 text-[#172033]">
                              <span className="font-medium block">{ticket.user?.name || 'Student'}</span>
                              <span className="text-[10px] text-[#667085]">{ticket.user?.email}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ticket.priority === 'HIGH'
                                    ? 'bg-[#FFF0F0] text-[#C03945]'
                                    : ticket.priority === 'LOW'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-[#FFF6E5] text-[#B7791F]'
                                }`}
                              >
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                                    ? 'bg-[#EAF7F0] text-[#16845B]'
                                    : ticket.status === 'IN_PROGRESS'
                                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                                    : 'bg-[#FFF6E5] text-[#B7791F]'
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                              {new Date(ticket.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                              {ticket.status !== 'RESOLVED' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.patch(`/admin/tickets/${ticket.id}/status`, { status: 'RESOLVED' });
                                      refetchTickets();
                                    } catch (err: any) {
                                      toast.apiError(err, 'Failed to update ticket');
                                    }
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#16845B] bg-[#EAF7F0] hover:bg-[#D4EEDB] rounded-md transition-colors"
                                >
                                  Mark Resolved
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: 'Delete Support Ticket',
                                    message: `Are you sure you want to delete or close ticket #${ticket.id.slice(0, 8)}?`,
                                    confirmText: 'Delete Ticket',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    deleteTicketMutation.mutate(ticket.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete or Close Ticket"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 9: AUDIT LOGS
          ======================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#EDF0F4] flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#14233B]">Immutable Platform Audit Trail</h3>
                </div>

                <div className="divide-y divide-[#EDF0F4]">
                  {auditLogsData?.map((log: any) => (
                    <div key={log.id} className="p-4 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#14233B] block">{log.action}</span>
                        <span className="text-[11px] text-[#667085] block">{log.resource}</span>
                        {log.details && <span className="text-[11px] text-[#2563EB] block">{log.details}</span>}
                      </div>
                      <span className="text-[11px] text-[#98A2B3]">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 10: SETTINGS & SMTP
          ======================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-[#E4E9F0] shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-[#14233B]">Platform Infrastructure & SMTP Diagnostics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#667085] block font-semibold mb-1">Payment Gateway</span>
                    <span className="text-xs font-mono font-bold text-[#16845B] bg-[#EAF7F0] px-2 py-1 rounded-md block">
                      Razorpay Webhook & Order Engine Verified
                    </span>
                  </div>
                  <div>
                    <span className="text-[#667085] block font-semibold mb-1">WebRTC Live Classes</span>
                    <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-1 rounded-md block">
                      LiveKit Cloud & Jitsi Integration Active
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EDF0F4] space-y-3">
                  <span className="text-xs font-bold text-[#14233B] block">SMTP & Mail Server Connection</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTestSMTP}
                      disabled={smtpTesting}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${smtpTesting ? 'animate-spin' : ''}`} />
                      <span>{smtpTesting ? 'Testing connection...' : 'Test SMTP Connection'}</span>
                    </button>
                  </div>

                  {smtpTestResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        smtpTestResult.success
                          ? 'bg-[#EAF7F0] text-[#16845B] border border-[#16845B]/20'
                          : 'bg-[#FFF0F0] text-[#C03945] border border-[#C03945]/20'
                      }`}
                    >
                      {smtpTestResult.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB: ADMIN PROFILE EDIT
          ======================================================== */}
          {activeTab === 'profile' && <ProfileEditTab portalType="ADMIN" />}

          {/* ========================================================
              TAB: PARTNER LOGO MANAGEMENT
          ======================================================== */}
          {activeTab === 'partners' && <PartnerManagement />}

          {/* ========================================================
              TAB: EMAIL AUTOMATION & NOTIFICATION SYSTEM
          ======================================================== */}
          {activeTab === 'emails' && <EmailManagement />}

          {/* ========================================================
              TAB: HOMEPAGE ACCORDION GALLERY MANAGEMENT
          ======================================================== */}
          {activeTab === 'gallery' && <GalleryManagement />}

          {/* ========================================================
              TAB: ACHIEVEMENTS & MILESTONES MANAGEMENT
          ======================================================== */}
          {activeTab === 'achievements' && <AchievementManagement />}

          {/* ========================================================
              TAB: FEEDBACK & REVIEW MANAGEMENT
          ======================================================== */}
          {activeTab === 'feedback' && <AdminFeedbackManagement />}
        </main>
      </div>

      {/* ========================================================
          MODAL: ADD & ONBOARD MENTOR (ADMIN CONTROLLED)
      ======================================================== */}
      {isAddMentorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Onboard New Mentor</h3>
                <span className="text-[11px] text-[#667085]">
                  Issue an invitation with a secure account activation link
                </span>
              </div>
              <button
                onClick={() => {
                  setIsAddMentorModalOpen(false);
                  setInvitedMentorResult(null);
                }}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If mentor invitation created successfully */}
            {invitedMentorResult ? (
              <div className="space-y-4 animate-in fade-in text-xs">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm">Mentor Account Created!</span>
                  </div>
                  <p className="text-emerald-800">
                    Invitation recorded for <strong>{invitedMentorResult.name}</strong> ({invitedMentorResult.email}).
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {invitedMentorResult.emailDelivered
                      ? 'An invitation email containing the activation link has been delivered to the mentor.'
                      : 'Email delivery simulated in development. The mentor sets their own password via the link below.'}
                  </p>
                </div>

                {invitedMentorResult.activationUrl && (
                  <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Secure Account Activation Link (Dev / Preview):
                    </span>
                    <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-[#2563EB] break-all select-all">
                      {invitedMentorResult.activationUrl}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (invitedMentorResult.activationUrl) {
                            navigator.clipboard.writeText(invitedMentorResult.activationUrl);
                            toast.success('Copied', 'Activation link copied to clipboard.');
                          }
                        }}
                        className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                      >
                        Copy Activation Link
                      </button>
                      <a
                        href={invitedMentorResult.activationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#173B73] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Activation Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMentorModalOpen(false);
                      setInvitedMentorResult(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMentorMutation.mutate({
                    name: newMentorName,
                    email: newMentorEmail,
                    title: newMentorTitle,
                    courseId: newMentorCourseId || null,
                    batchId: newMentorBatchId || null,
                  });
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Mentor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    value={newMentorName}
                    onChange={(e) => setNewMentorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Mentor Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="mentor@example.com"
                    value={newMentorEmail}
                    onChange={(e) => setNewMentorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Professional Title / Expertise</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Cloud Architect, React Specialist"
                    value={newMentorTitle}
                    onChange={(e) => setNewMentorTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Initial Course Assignment</label>
                    <select
                      value={newMentorCourseId}
                      onChange={(e) => setNewMentorCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">No Course (Assign Later)</option>
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
                      value={newMentorBatchId}
                      onChange={(e) => setNewMentorBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">All Batches (Course-wide)</option>
                      {batchesData
                        ?.filter((b: any) => !newMentorCourseId || b.courseId === newMentorCourseId)
                        .map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.code} - {b.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-[#2563EB] space-y-1">
                  <span className="font-bold block">Security & Invitation Policy:</span>
                  <p className="text-slate-600">
                    Mentors are not given default passwords. A secure, single-use activation token valid for 48 hours is generated, allowing the mentor to set their own password securely.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddMentorModalOpen(false)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteMentorMutation.isPending}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] cursor-pointer"
                  >
                    {inviteMentorMutation.isPending ? 'Onboarding...' : 'Create & Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ASSIGN MENTOR TO SCOPE (AUTOMATIC STUDENT SYNC)
      ======================================================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Assign Mentor to Cohort</h3>
                <span className="text-[11px] text-[#667085]">Automatically links all cohort students</span>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const isCourseWide = !assignBatchId;
                assignMentorMutation.mutate({
                  mentorId: assignMentorId,
                  courseId: assignCourseId,
                  batchId: isCourseWide ? null : assignBatchId,
                  scope: isCourseWide ? 'COURSE_WIDE' : 'SPECIFIC_BATCH',
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Select Mentor</label>
                <select
                  required
                  value={assignMentorId}
                  onChange={(e) => setAssignMentorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  {mentorsData?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Select Course</label>
                <select
                  required
                  value={assignCourseId}
                  onChange={(e) => {
                    setAssignCourseId(e.target.value);
                    setAssignBatchId(''); // Reset batch when course changes
                  }}
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
                  value={assignBatchId}
                  onChange={(e) => {
                    setAssignBatchId(e.target.value);
                    setAssignScope(e.target.value ? 'SPECIFIC_BATCH' : 'COURSE_WIDE');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  <option value="">Course-wide (All Current & Future Batches)</option>
                  {batchesData
                    ?.filter((b: any) => !assignCourseId || b.courseId === assignCourseId)
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {!assignBatchId
                    ? '✓ Mentor will receive all current and future students enrolled in this course.'
                    : '✓ Mentor will be assigned strictly to the selected cohort batch.'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMentorMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B]"
                >
                  {assignMentorMutation.isPending ? 'Assigning...' : 'Assign & Synchronize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIEW MENTOR ASSIGNMENTS & ENROLLED STUDENTS
      ======================================================== */}
      {viewAssignmentsMentor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#EDF0F4] pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {viewAssignmentsMentor.name?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#14233B]">{viewAssignmentsMentor.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewAssignmentsMentor.isVerified
                          ? 'bg-[#EAF7F0] text-[#16845B]'
                          : 'bg-[#FFF0F0] text-[#C03945]'
                      }`}
                    >
                      {viewAssignmentsMentor.isVerified ? 'Active Mentor' : 'Deactivated'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#667085]">{viewAssignmentsMentor.email}</span>
                </div>
              </div>
              <button
                onClick={() => setViewAssignmentsMentor(null)}
                className="text-[#667085] hover:text-[#172033] p-1 rounded-lg hover:bg-[#F8F9FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Assignment Breakdown */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#2563EB]/20 text-center">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">Assigned Courses</span>
                  <span className="text-xl font-bold text-[#173B73] mt-0.5 block">
                    {viewAssignmentsMentor.assignedCoursesCount ?? viewAssignmentsMentor.assignedCourses?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-[#EFF6FF] rounded-xl border border-[#2563EB]/20 text-center">
                  <span className="text-[10px] font-bold text-[#173B73] uppercase tracking-wider block">Assigned Batches</span>
                  <span className="text-xl font-bold text-[#173B73] mt-0.5 block">
                    {viewAssignmentsMentor.assignedBatchesCount ?? viewAssignmentsMentor.assignedBatches?.length ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-[#EAF7F0] rounded-xl border border-[#16845B]/20 text-center">
                  <span className="text-[10px] font-bold text-[#16845B] uppercase tracking-wider block">Students in Cohorts</span>
                  <span className="text-xl font-bold text-[#16845B] mt-0.5 block">
                    {viewAssignmentsMentor.totalStudentsUnderCohorts ?? 0}
                  </span>
                </div>
              </div>

              {/* Assignment Records List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#14233B] uppercase tracking-wider">
                    Detailed Course & Batch Allocations
                  </h4>
                  <button
                    onClick={() => {
                      setAssignMentorId(viewAssignmentsMentor.id);
                      if (coursesData && coursesData.length > 0) setAssignCourseId(coursesData[0].id);
                      setIsAssignModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors border border-[#2563EB]/20 cursor-pointer"
                  >
                    + Assign New Cohort
                  </button>
                </div>

                {(!viewAssignmentsMentor.mentorAssignments || viewAssignmentsMentor.mentorAssignments.length === 0) ? (
                  <div className="p-8 text-center bg-[#F8F9FA] rounded-xl border border-dashed border-[#E4E9F0] text-[#667085] space-y-2">
                    <BookOpen className="w-6 h-6 text-[#98A2B3] mx-auto" />
                    <p className="font-semibold text-xs text-[#14233B]">No courses or batches assigned</p>
                    <p className="text-[11px]">This mentor has not been assigned to any course or student cohort yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {viewAssignmentsMentor.mentorAssignments.map((a: any) => (
                      <div
                        key={a.id}
                        className="p-4 bg-white rounded-xl border border-[#E4E9F0] hover:border-[#2563EB]/40 transition-colors shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDF0F4] pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#14233B]">{a.course?.title}</span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  a.batch ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#EAF7F0] text-[#16845B]'
                                }`}
                              >
                                {a.batch ? `Batch: ${a.batch.code}` : 'Course-Wide (All Batches)'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#667085] block mt-0.5">
                              Assigned on {new Date(a.assignedAt || a.createdAt || Date.now()).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Confirmation Removal Action */}
                            <button
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: 'Remove Assignment',
                                  message: `Remove this assignment (${a.course?.title}${a.batch ? ` - Batch ${a.batch.code}` : ''}) from ${viewAssignmentsMentor.name}?\n\nThis will NOT delete the course, student records, payments, or attendance.`,
                                  confirmText: 'Remove Assignment',
                                  isDestructive: true,
                                });
                                if (confirmed) {
                                  if (a.batchId) {
                                    removeBatchAssignMutation.mutate(
                                      { mentorId: viewAssignmentsMentor.id, batchId: a.batchId },
                                      {
                                        onSuccess: () => {
                                          setViewAssignmentsMentor(null);
                                        },
                                      }
                                    );
                                  } else {
                                    removeCourseAssignMutation.mutate(
                                      { mentorId: viewAssignmentsMentor.id, courseId: a.courseId },
                                      {
                                        onSuccess: () => {
                                          setViewAssignmentsMentor(null);
                                        },
                                      }
                                    );
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#C03945] bg-[#FFF0F0] hover:bg-[#FFE0E0] border border-[#C03945]/20 rounded-lg transition-colors cursor-pointer"
                            >
                              Remove Assignment
                            </button>
                          </div>
                        </div>

                        {/* Cohort Batch Students Details */}
                        {a.batch ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#667085]">
                                Cohort Name: <strong className="text-[#14233B]">{a.batch.name}</strong>
                              </span>
                              <span className="font-semibold text-[#16845B]">
                                Active Students: {a.batch.enrollments?.length || 0}
                              </span>
                            </div>

                            {a.batch.enrollments && a.batch.enrollments.length > 0 ? (
                              <div className="bg-[#F8F9FA] rounded-lg p-2.5 border border-[#EDF0F4] max-h-36 overflow-y-auto space-y-1.5">
                                {a.batch.enrollments.map((enr: any) => (
                                  <div
                                    key={enr.id}
                                    className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-[#E4E9F0]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-[#E4E9F0] text-[#14233B] flex items-center justify-center font-bold text-[9px]">
                                        {enr.student?.name?.charAt(0) || 'S'}
                                      </div>
                                      <span className="font-bold text-[#14233B]">{enr.student?.name}</span>
                                      <span className="text-[#667085] text-[10px]">{enr.student?.email}</span>
                                    </div>
                                    <span className="text-[10px] text-[#98A2B3]">
                                      Enrolled {new Date(enr.enrolledAt || Date.now()).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#98A2B3] italic">
                                No students currently enrolled in this specific cohort batch.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#667085]">
                                Scope: <strong className="text-[#14233B]">Course-wide (All Current & Future Learners)</strong>
                              </span>
                              <span className="font-semibold text-[#16845B]">
                                Active Students: {a.course?.enrollments?.length || 0}
                              </span>
                            </div>

                            {a.course?.enrollments && a.course.enrollments.length > 0 ? (
                              <div className="bg-[#F8F9FA] rounded-lg p-2.5 border border-[#EDF0F4] max-h-36 overflow-y-auto space-y-1.5">
                                {a.course.enrollments.map((enr: any) => (
                                  <div
                                    key={enr.id}
                                    className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-[#E4E9F0]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-[#E4E9F0] text-[#14233B] flex items-center justify-center font-bold text-[9px]">
                                        {enr.user?.name?.charAt(0) || 'S'}
                                      </div>
                                      <span className="font-bold text-[#14233B]">{enr.user?.name}</span>
                                      <span className="text-[#667085] text-[10px]">{enr.user?.email}</span>
                                    </div>
                                    <span className="text-[10px] text-[#98A2B3]">
                                      Enrolled {new Date(enr.enrolledAt || Date.now()).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#98A2B3] italic">
                                No students currently enrolled in this course.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#EDF0F4] pt-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewAssignmentsMentor(null)}
                className="px-4 py-2 text-xs font-semibold text-[#14233B] bg-[#F8F9FA] hover:bg-[#EDF0F4] rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE BATCH
      ======================================================== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Create Student Cohort Batch</h3>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createBatchMutation.mutate({
                  name: batchName,
                  code: batchCode,
                  courseId: batchCourseId,
                  startDate: new Date(batchStartDate).toISOString(),
                  maxStudents: Number(batchCapacity),
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Python AI Spring 2026 Batch A"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., PY-2026-A"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] font-mono focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={batchCapacity}
                    onChange={(e) => setBatchCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Course</label>
                <select
                  required
                  value={batchCourseId}
                  onChange={(e) => setBatchCourseId(e.target.value)}
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
                <label className="block text-[#667085] font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={batchStartDate}
                  onChange={(e) => setBatchStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  {createBatchMutation.isPending ? 'Creating...' : 'Create Cohort Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE / EDIT COLLEGE COUPON
      ======================================================== */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  {editingCouponId ? 'Edit College Coupon' : 'Create College-Specific Coupon'}
                </h3>
                <p className="text-[11px] text-[#667085]">
                  Configure discount rules, college affiliation, usage caps, and validity.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCouponModalOpen(false);
                  setEditingCouponId(null);
                }}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCouponMutation.mutate({
                  code: couponCode,
                  name: couponName || null,
                  description: couponDescription || null,
                  college: couponCollege || null,
                  courseId: couponCourseId || null,
                  internshipId: couponInternshipId || null,
                  materialId: couponMaterialId || null,
                  hackathonId: couponHackathonId || null,
                  discountType: couponType,
                  discountVal: Number(couponDiscountVal),
                  minSpend: couponMinSpend ? Number(couponMinSpend) : null,
                  maxDiscount: couponMaxDiscount ? Number(couponMaxDiscount) : null,
                  validUntil: couponValidUntil ? new Date(couponValidUntil).toISOString() : null,
                  usageLimit: couponUsageLimit ? Number(couponUsageLimit) : 100,
                  perStudentLimit: couponPerStudentLimit ? Number(couponPerStudentLimit) : 1,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Code with Auto-Generator */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[#667085] font-semibold">Coupon Code *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = couponCollege ? couponCollege.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'SKILL';
                      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                      const generated = `${prefix || 'SKILL'}_${couponDiscountVal || 30}_${randomSuffix}`;
                      setCouponCode(generated);
                    }}
                    className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                  >
                    ⚡ Auto-Generate Unique Code
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g., ABC_SQL30"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] font-mono tracking-wider focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Coupon Title / Campaign Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC College SQL Mastery Program"
                    value={couponName}
                    onChange={(e) => setCouponName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">College Affiliate (Restricted)</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC College (Leave blank for all)"
                    value={couponCollege}
                    onChange={(e) => setCouponCollege(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 30% discount for BCA & B.Tech 2026 Batch students"
                  value={couponDescription}
                  onChange={(e) => setCouponDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Product Target Category & Specific Item */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Eligible Product Type</label>
                  <select
                    value={couponTargetType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setCouponTargetType(val);
                      if (val !== 'COURSE') setCouponCourseId('');
                      if (val !== 'INTERNSHIP') setCouponInternshipId('');
                      if (val !== 'MATERIAL') setCouponMaterialId('');
                      if (val !== 'HACKATHON') setCouponHackathonId('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="ALL">Universal (All Product Categories)</option>
                    <option value="COURSE">Course Only</option>
                    <option value="INTERNSHIP">Internship Only</option>
                    <option value="MATERIAL">Learning Material Only</option>
                    <option value="HACKATHON">Hackathon Only</option>
                  </select>
                </div>

                <div>
                  {couponTargetType === 'COURSE' && (
                    <>
                      <label className="block text-[#667085] font-semibold mb-1">Select Course</label>
                      <select
                        value={couponCourseId}
                        onChange={(e) => setCouponCourseId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Courses</option>
                        {coursesData?.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.title} (₹{c.price})
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {couponTargetType === 'INTERNSHIP' && (
                    <>
                      <label className="block text-[#667085] font-semibold mb-1">Select Internship</label>
                      <select
                        value={couponInternshipId}
                        onChange={(e) => setCouponInternshipId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Internships</option>
                        {internshipsData?.map((i: any) => (
                          <option key={i.id} value={i.id}>
                            {i.title} (₹{i.price})
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {couponTargetType === 'MATERIAL' && (
                    <>
                      <label className="block text-[#667085] font-semibold mb-1">Select Material</label>
                      <select
                        value={couponMaterialId}
                        onChange={(e) => setCouponMaterialId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Materials</option>
                        {materialsData?.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.title} (₹{m.price})
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {couponTargetType === 'HACKATHON' && (
                    <>
                      <label className="block text-[#667085] font-semibold mb-1">Select Hackathon</label>
                      <select
                        value={couponHackathonId}
                        onChange={(e) => setCouponHackathonId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="">All Hackathons</option>
                        {hackathonsData?.map((h: any) => (
                          <option key={h.id} value={h.id}>
                            {h.title} (₹{h.registrationFee})
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {couponTargetType === 'ALL' && (
                    <div className="pt-6">
                      <p className="text-[11px] text-[#667085] italic">Valid across all courses, internships, hackathons, and materials.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Discount Value & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={couponType === 'PERCENTAGE' ? '30 (%)' : '500 (₹)'}
                    value={couponDiscountVal}
                    onChange={(e) => setCouponDiscountVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Discount Type</label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              {/* Min Spend & Max Discount Cap */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Min Purchase Spend (₹)</label>
                  <input
                    type="number"
                    placeholder="Optional, e.g. 999"
                    value={couponMinSpend}
                    onChange={(e) => setCouponMinSpend(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    placeholder="Optional, e.g. 1500"
                    value={couponMaxDiscount}
                    onChange={(e) => setCouponMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Usage Limit & Per-Student Limit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Max Redemptions *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100"
                    value={couponUsageLimit}
                    onChange={(e) => setCouponUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Per Student Limit *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1"
                    value={couponPerStudentLimit}
                    onChange={(e) => setCouponPerStudentLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={couponValidUntil}
                    onChange={(e) => setCouponValidUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#EDF0F4]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCouponModalOpen(false);
                    setEditingCouponId(null);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveCouponMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-xs"
                >
                  {saveCouponMutation.isPending ? 'Saving...' : editingCouponId ? 'Update Coupon' : 'Activate College Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PROCESS MENTOR PAYOUT
      ======================================================== */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Process Mentor Teaching Payout</h3>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPayoutMutation.mutate({
                  mentorId: payoutMentorId || mentorsData?.[0]?.id,
                  amount: Number(payoutAmount),
                  notes: payoutNotes,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Mentor</label>
                <select
                  required
                  value={payoutMentorId}
                  onChange={(e) => setPayoutMentorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  {mentorsData?.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Payout Settlement Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Disbursement Remarks</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPayoutMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#16845B] hover:bg-[#146e4c]"
                >
                  {createPayoutMutation.isPending ? 'Processing...' : 'Settle & Log Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: UPLOAD NEW MATERIAL & SET PRICING
      ======================================================== */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  {editingMaterial ? 'Edit Learning Material' : 'Publish Learning Material'}
                </h3>
                <span className="text-[11px] text-[#667085]">
                  {editingMaterial ? 'Update material details, cover thumbnail, and pricing' : 'Upload PDFs, source codes, and configure access pricing'}
                </span>
              </div>
              <button onClick={() => setIsMaterialModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!matTitle || !matFileUrl) {
                  toast.warning('Missing Required Fields', 'Please provide a title and upload the material file');
                  return;
                }
                try {
                  const payload = {
                    title: matTitle,
                    description: matDescription,
                    type: matType,
                    category: matCategory,
                    price: matIsFree ? 0 : Number(matPrice),
                    isFree: matIsFree,
                    courseId: matCourseId || null,
                    internshipId: matInternshipId || null,
                    fileUrl: matFileUrl,
                    fileSize: matFileSize,
                    thumbnailUrl: matThumbnailUrl || null,
                  };

                  if (editingMaterial) {
                    await api.patch(`/materials/${editingMaterial.id}`, payload);
                    toast.success('Material Updated', 'Learning Material updated successfully! Thumbnail and details saved.');
                  } else {
                    await api.post('/materials', payload);
                    toast.success('Material Published', 'Learning Material published to Marketplace successfully!');
                  }

                  setIsMaterialModalOpen(false);
                  setEditingMaterial(null);
                  refetchAdminMaterials();
                } catch (err: any) {
                  toast.apiError(err, 'Failed to save material');
                }
              }}
              className="space-y-4 text-xs"
            >
              <ImageUpload
                label="Material Cover / Thumbnail (Optional)"
                value={matThumbnailUrl}
                onChange={(url) => setMatThumbnailUrl(url)}
                helperText="JPG, JPEG, PNG, or WEBP (Max 5MB). Displays on material card."
                aspectRatio="16/9"
              />

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Microservices Architecture & Handouts"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Summary Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what students will get in this package..."
                  value={matDescription}
                  onChange={(e) => setMatDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Material Type</label>
                  <select
                    value={matType}
                    onChange={(e) => setMatType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="CODE_FILE">Source Code / ZIP</option>
                    <option value="DOCUMENT">Document / Notes</option>
                    <option value="PRESENTATION">Presentation / Slides</option>
                    <option value="VIDEO_RECORDING">Recorded Video Lesson</option>
                    <option value="EXTERNAL_LINK">External Resource Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Category</label>
                  <select
                    value={matCategory}
                    onChange={(e) => setMatCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="Development">Development</option>
                    <option value="System Design">System Design</option>
                    <option value="Databases">Databases</option>
                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Associate with Course (Optional)</label>
                  <select
                    value={matCourseId}
                    onChange={(e) => {
                      setMatCourseId(e.target.value);
                      if (e.target.value) setMatInternshipId('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="">-- None / Standalone --</option>
                    {coursesData?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Associate with Internship (Optional)</label>
                  <select
                    value={matInternshipId}
                    onChange={(e) => {
                      setMatInternshipId(e.target.value);
                      if (e.target.value) setMatCourseId('');
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="">-- None / Standalone --</option>
                    {internshipsData?.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.title} ({i.organization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="text-[10px] text-[#667085] block">
                If associated, students actively enrolled in that course or internship cohort automatically unlock access for free.
              </span>

              {/* Pricing Rules */}
              <div className="p-3 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0] space-y-3">
                <span className="text-xs font-bold text-[#14233B] block">Pricing & Access Rules</span>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="matIsFreeCheckbox"
                    checked={matIsFree}
                    onChange={(e) => {
                      setMatIsFree(e.target.checked);
                      if (e.target.checked) setMatPrice('0');
                    }}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="matIsFreeCheckbox" className="font-semibold text-[#14233B] cursor-pointer">
                    Free Material (Publicly accessible to logged-in students)
                  </label>
                </div>

                {!matIsFree && (
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Price (INR)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 299"
                      value={matPrice}
                      onChange={(e) => setMatPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white focus:outline-hidden focus:border-[#2563EB]"
                    />
                    <span className="text-[10px] text-amber-700 block mt-1">
                      Students must complete verified payment through Razorpay before downloading this file.
                    </span>
                  </div>
                )}
              </div>

              {/* File Upload Control (Separate from Thumbnail) */}
              <div>
                <label className="block text-[#667085] font-semibold mb-1">
                  Downloadable Resource File * (PDF, ZIP, DOCX, MP4)
                </label>
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    setIsUploadingMat(true);
                    try {
                      const res = await api.post('/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setMatFileUrl(res.data.data.fileUrl);
                      setMatFileSize(res.data.data.size);
                      if (!matTitle) {
                        setMatTitle(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    } catch (err: any) {
                      toast.apiError(err, 'File upload failed');
                    } finally {
                      setIsUploadingMat(false);
                    }
                  }}
                  className="w-full text-xs text-[#667085] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFF6FF] file:text-[#2563EB] hover:file:bg-[#DBEAFE] cursor-pointer"
                />
                {isUploadingMat && (
                  <span className="text-[11px] text-[#2563EB] font-semibold block mt-1">Uploading material resource file...</span>
                )}
                {matFileUrl && (
                  <span className="text-[11px] text-[#16845B] font-semibold block mt-1 truncate">
                    Attached File: {matFileUrl} ({matFileSize ? `${(matFileSize / 1024).toFixed(1)} KB` : ''})
                  </span>
                )}
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
                  disabled={isUploadingMat || !matFileUrl}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {editingMaterial ? 'Save Changes' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / CREATE / EDIT COURSE (ALL 17 INPUTS)
      ======================================================== */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  {editingCourse ? 'Edit Course Curriculum & Settings' : 'Add New Course Curriculum'}
                </h3>
                <span className="text-[11px] text-[#667085]">
                  {editingCourse
                    ? 'Update bilingual titles, descriptions, pricing, installment policies, media, and mentor allocation'
                    : 'Configure and publish a full-featured curriculum directly to MySQL platform database'}
                </span>
              </div>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-[#667085] hover:text-[#172033] p-1 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!courseTitle.trim()) {
                  toast.warning('Course Title Required', 'Please enter a course title');
                  return;
                }
                setIsCreatingCourse(true);
                try {
                  const payload: any = {
                    title: courseTitle.trim(),
                    description: courseDescription,
                    category: courseCategory,
                    level: courseLevel,
                    language: courseLanguage,
                    price: Number(coursePrice) || 0,
                    status: courseStatus || 'PUBLISHED',
                  };

                  if (courseTitleTa.trim()) payload.titleTa = courseTitleTa.trim();
                  if (courseSubtitle.trim()) payload.subtitle = courseSubtitle.trim();
                  if (courseDescriptionTa.trim()) payload.descriptionTa = courseDescriptionTa.trim();
                  if (courseCategoryId) payload.categoryId = courseCategoryId;
                  if (courseDiscountPrice !== '' && courseDiscountPrice !== null) {
                    payload.discountPrice = Number(courseDiscountPrice);
                  }
                  if (courseAllowInstallments) {
                    payload.allowInstallments = true;
                    if (courseMinInstallmentAmount) {
                      payload.minInstallmentAmount = Number(courseMinInstallmentAmount);
                    }
                    payload.installmentCount = Number(courseInstallmentCount) || 1;
                    payload.installmentPolicy = courseInstallmentPolicy || 'RESTRICTED';
                  } else {
                    payload.allowInstallments = false;
                  }
                  if (courseInstructorId) payload.instructorId = courseInstructorId;
                  if (courseThumbnailUrl) payload.thumbnailUrl = courseThumbnailUrl;
                  if (coursePreviewVideoUrl.trim()) payload.previewVideoUrl = coursePreviewVideoUrl.trim();

                  if (editingCourse) {
                    await api.patch(`/courses/${editingCourse.id}`, payload);
                    toast.success('Course Updated', 'Course updated successfully with all curriculum settings!');
                  } else {
                    await api.post('/courses', payload);
                    toast.success('Course Published', 'Course published successfully! Visible across student catalog.');
                  }

                  setIsCourseModalOpen(false);
                  setEditingCourse(null);
                  refetchCourses();
                } catch (err: any) {
                  toast.apiError(err, 'Failed to save course');
                } finally {
                  setIsCreatingCourse(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* Media Section: Thumbnail & Preview Video */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-[#14233B] text-xs flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Media & Visual Assets</span>
                </h4>
                
                <ImageUpload
                  label="Course Thumbnail / Cover Image"
                  value={courseThumbnailUrl}
                  onChange={(url) => setCourseThumbnailUrl(url)}
                  helperText="JPG, JPEG, PNG, or WEBP (Max 5MB). Displays in cards, details, and enrollment carts."
                  aspectRatio="16/9"
                />

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Preview / Demo Video URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://www.youtube.com/watch?v=... or direct MP4/HLS link"
                    value={coursePreviewVideoUrl}
                    onChange={(e) => setCoursePreviewVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Public teaser trailer shown before purchase on the course detail landing page.
                  </span>
                </div>
              </div>

              {/* Basic Information (Bilingual English & Tamil) */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-[#14233B] text-xs flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Course Information & Translations</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Course Title (English) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Full-Stack Modern React & Cloud Architecture"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Course Title (Tamil / தமிழ்) (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. நவீன முழு-அடுக்கு வலை உருவாக்கம்"
                      value={courseTitleTa}
                      onChange={(e) => setCourseTitleTa(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white font-medium font-tamil"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Subtitle / Tagline (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Master React, Node.js, PostgreSQL, Docker and AWS from zero to production lead."
                    value={courseSubtitle}
                    onChange={(e) => setCourseSubtitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Course Description (English) *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Detailed curriculum overview, student prerequisites, learning outcomes, and career roadmap..."
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Course Description (Tamil / தமிழ்) (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="பாடத்திட்டத்தின் விரிவான விளக்கம், கற்பதற்கான பயன்கள் மற்றும் தொழில் வழிகாட்டல்..."
                    value={courseDescriptionTa}
                    onChange={(e) => setCourseDescriptionTa(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white font-tamil"
                  />
                </div>
              </div>

              {/* Categorization, Levels, Status & Primary Instructor */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-[#14233B] text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Curriculum Attributes & Mentor Allocation</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Category</label>
                    {courseCategoriesData && courseCategoriesData.length > 0 ? (
                      <select
                        value={courseCategoryId || courseCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = courseCategoriesData.find((cat: any) => cat.id === val || cat.name === val);
                          if (found) {
                            setCourseCategoryId(found.id);
                            setCourseCategory(found.name);
                          } else {
                            setCourseCategory(val);
                            setCourseCategoryId('');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                        {courseCategoriesData.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={courseCategory}
                        onChange={(e) => setCourseCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                      >
                        <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                        <option value="Backend Engineering">Backend Engineering</option>
                        <option value="Frontend Development">Frontend Development</option>
                        <option value="Cloud Architecture">Cloud Architecture</option>
                        <option value="AI & Machine Learning">AI & Machine Learning</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Difficulty Level</label>
                    <select
                      value={courseLevel}
                      onChange={(e) => setCourseLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Instruction Language</label>
                    <select
                      value={courseLanguage}
                      onChange={(e) => setCourseLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="Tamil">Tamil (தமிழ்)</option>
                      <option value="English">English</option>
                      <option value="Tamil & English">Tamil & English (Bilingual)</option>
                      <option value="Hindi">Hindi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Publishing Status</label>
                    <select
                      value={courseStatus}
                      onChange={(e) => setCourseStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] font-semibold"
                    >
                      <option value="PUBLISHED">Published (Active in Catalog)</option>
                      <option value="DRAFT">Draft (Hidden from Students)</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Assigned Primary Instructor</label>
                    <select
                      value={courseInstructorId}
                      onChange={(e) => setCourseInstructorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                    >
                      <option value="">-- Platform Instructor --</option>
                      {mentorsData?.map((m: any) => (
                        <option key={m.id} value={m.userId || m.id}>
                          {m.name || m.user?.name} ({m.title || 'Mentor'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing, Discounts & Flexible Installments */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="font-bold text-[#14233B] text-xs flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#16845B]" />
                  <span>Pricing, Discounts & Installments</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Regular Catalog Price (₹ - 0 for Free) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 4999"
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white font-bold text-[#14233B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Special Discount Price (₹ - Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 2999"
                      value={courseDiscountPrice}
                      onChange={(e) => setCourseDiscountPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-white font-bold text-[#16845B]"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      When provided, students see the regular price struck-out.
                    </span>
                  </div>
                </div>

                {/* Installment Toggle & Options */}
                <div className="pt-2 border-t border-slate-200/60 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courseAllowInstallments}
                      onChange={(e) => setCourseAllowInstallments(e.target.checked)}
                      className="w-4 h-4 text-[#2563EB] rounded cursor-pointer"
                    />
                    <span className="font-bold text-[#14233B]">
                      Enable Student Installment / Split Payment Option
                    </span>
                  </label>

                  {courseAllowInstallments && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-slate-200 animate-in fade-in">
                      <div>
                        <label className="block text-[#667085] font-semibold mb-1">Minimum 1st Installment (₹)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="e.g. 1000"
                          value={courseMinInstallmentAmount}
                          onChange={(e) => setCourseMinInstallmentAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] font-bold text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[#667085] font-semibold mb-1">Total Installments Allowed</label>
                        <select
                          value={courseInstallmentCount}
                          onChange={(e) => setCourseInstallmentCount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                        >
                          <option value="2">2 Split Payments</option>
                          <option value="3">3 Split Payments</option>
                          <option value="4">4 Split Payments</option>
                          <option value="5">5 Split Payments</option>
                          <option value="6">6 Split Payments</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#667085] font-semibold mb-1">Installment Policy</label>
                        <select
                          value={courseInstallmentPolicy}
                          onChange={(e) => setCourseInstallmentPolicy(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                        >
                          <option value="RESTRICTED">Restricted (Unlocks proportional modules)</option>
                          <option value="FLEXIBLE">Flexible (Full access during payment window)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-[#EDF0F4]">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourse}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isCreatingCourse ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREATE HACKATHON
      ======================================================== */}
      {isHackathonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  {editingHackathon ? 'Edit Innovation Hackathon' : 'Create Innovation Hackathon'}
                </h3>
                <span className="text-[11px] text-[#667085]">
                  {editingHackathon ? 'Update dates, banner image, registration fee, and rules' : 'Configure dates, sprint themes, registration fee, and rules'}
                </span>
              </div>
              <button onClick={() => setIsHackathonModalOpen(false)} className="text-[#667085] hover:text-[#172033]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!hackTitle.trim() || !hackTheme.trim() || !hackStartDate || !hackEndDate || !hackDeadline) {
                  toast.warning('Required Fields', 'Please fill all required hackathon fields');
                  return;
                }
                setIsCreatingHackathon(true);
                try {
                  const payload = {
                    title: hackTitle,
                    theme: hackTheme,
                    description: hackDescription,
                    organizer: hackOrganizer,
                    startDate: hackStartDate,
                    endDate: hackEndDate,
                    registrationDeadline: hackDeadline,
                    mode: hackMode,
                    location: hackLocation || undefined,
                    registrationFee: Number(hackFee) || 0,
                    minTeamSize: Number(hackMinTeam) || 1,
                    maxTeamSize: Number(hackMaxTeam) || 4,
                    eligibility: hackEligibility,
                    prizes: hackPrizes,
                    rules: hackRules,
                    bannerUrl: hackBannerUrl || null,
                    isPublished: true,
                  };

                  if (editingHackathon) {
                    await api.patch(`/hackathons/${editingHackathon.id}`, payload);
                    toast.success('Hackathon Updated', 'Hackathon sprint updated successfully! Image and details saved.');
                  } else {
                    await api.post('/hackathons', payload);
                    toast.success('Hackathon Published', 'Hackathon sprint published successfully! Students can now register.');
                  }

                  setIsHackathonModalOpen(false);
                  setEditingHackathon(null);
                  refetchAdminHackathons();
                } catch (err: any) {
                  toast.apiError(err, 'Failed to save hackathon');
                } finally {
                  setIsCreatingHackathon(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <ImageUpload
                label="Hackathon Cover / Banner Image"
                value={hackBannerUrl}
                onChange={(url) => setHackBannerUrl(url)}
                helperText="JPG, JPEG, PNG, or WEBP (Max 5MB). Displays on public challenge cards & dashboard."
                aspectRatio="16/9"
              />

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Hackathon Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Web3 & AI Sprint 2026"
                  value={hackTitle}
                  onChange={(e) => setHackTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Theme / Track</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Decentralized Applications & Generative AI"
                    value={hackTheme}
                    onChange={(e) => setHackTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Organizer</label>
                  <input
                    type="text"
                    required
                    placeholder="SkillUp Global"
                    value={hackOrganizer}
                    onChange={(e) => setHackOrganizer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Summary Description</label>
                <textarea
                  rows={2}
                  placeholder="Build innovative real-world software solutions over 48 hours..."
                  value={hackDescription}
                  onChange={(e) => setHackDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={hackStartDate}
                    onChange={(e) => setHackStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={hackEndDate}
                    onChange={(e) => setHackEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={hackDeadline}
                    onChange={(e) => setHackDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Mode</label>
                  <select
                    value={hackMode}
                    onChange={(e) => setHackMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Fee (INR - 0 for Free)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={hackFee}
                    onChange={(e) => setHackFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Venue / Link</label>
                  <input
                    type="text"
                    placeholder="Discord / Bangalore Campus"
                    value={hackLocation}
                    onChange={(e) => setHackLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Min Team Size</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={hackMinTeam}
                    onChange={(e) => setHackMinTeam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Max Team Size</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={hackMaxTeam}
                    onChange={(e) => setHackMaxTeam(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Prizes</label>
                <input
                  type="text"
                  value={hackPrizes}
                  onChange={(e) => setHackPrizes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsHackathonModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingHackathon}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  {isCreatingHackathon ? 'Saving...' : editingHackathon ? 'Save Changes' : 'Publish Hackathon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHubPage;

