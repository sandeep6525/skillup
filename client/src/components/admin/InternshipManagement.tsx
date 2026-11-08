import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import {
  Briefcase,
  PlusCircle,
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  UserCheck,
  Building,
  Tag,
  ExternalLink,
  X,
  RefreshCw,
  Eye,
  GraduationCap,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { ImageUpload } from '../ImageUpload';

interface InternshipProgram {
  id: string;
  title: string;
  description: string;
  organization: string;
  mentorId: string | null;
  technologies: string;
  duration: string;
  deliveryMode: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  startDate: string | null;
  endDate: string | null;
  applicationDeadline: string | null;
  eligibility: string;
  price: string | number;
  discountPrice?: string | number | null;
  registrationFee?: string | number | null;
  allowInstallments?: boolean;
  minInstallmentAmount?: string | number | null;
  installmentCount?: number | null;
  installmentPolicy?: string | null;
  refundPolicy?: string | null;
  paymentRequiredBeforeAccess?: boolean;
  availableSeats: number;
  bannerUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  mentor?: { id: string; name: string; email: string; title: string } | null;
  _count?: { applications: number };
}

interface ApplicationRecord {
  id: string;
  internshipId: string;
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  notes: string | null;
  resumeUrl: string | null;
  paidAmount: number;
  paymentId: string | null;
  appliedAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    college: string | null;
    phone: string | null;
    avatarUrl: string | null;
  };
  internship: {
    id: string;
    title: string;
    organization: string;
    price: number | string;
    mentor?: { id: string; name: string; title: string } | null;
  };
}

export const InternshipManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [activeSection, setActiveSection] = useState<'programs' | 'applications'>('programs');

  // Search & Filters for Programs
  const [programSearch, setProgramSearch] = useState('');
  const [programStatusFilter, setProgramStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  // Search & Filters for Applications
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('ALL');
  const [appProgramFilter, setAppProgramFilter] = useState<string>('ALL');

  // Modals
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<InternshipProgram | null>(null);
  const [viewingApplication, setViewingApplication] = useState<ApplicationRecord | null>(null);

  // Form State: Create/Edit Internship
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrganization, setFormOrganization] = useState('SkillUp Partner Network');
  const [formMentorId, setFormMentorId] = useState('');
  const [formTechnologies, setFormTechnologies] = useState('');
  const [formDuration, setFormDuration] = useState('3 Months');
  const [formDeliveryMode, setFormDeliveryMode] = useState<'ONLINE' | 'OFFLINE' | 'HYBRID'>('HYBRID');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formEligibility, setFormEligibility] = useState('Engineering students & recent graduates');
  const [formPrice, setFormPrice] = useState('0');
  const [formDiscountPrice, setFormDiscountPrice] = useState('');
  const [formRegistrationFee, setFormRegistrationFee] = useState('0');
  const [formAllowInstallments, setFormAllowInstallments] = useState(false);
  const [formMinInstallmentAmount, setFormMinInstallmentAmount] = useState('500');
  const [formInstallmentCount, setFormInstallmentCount] = useState('2');
  const [formInstallmentPolicy, setFormInstallmentPolicy] = useState('RESTRICTED');
  const [formRefundPolicy, setFormRefundPolicy] = useState('Full refund before start date. No refund after cohort kick-off.');
  const [formPaymentRequired, setFormPaymentRequired] = useState(true);
  const [formSeats, setFormSeats] = useState('50');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formIsPublished, setFormIsPublished] = useState(true);

  // Form State: Direct Student Enrollment
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollInternshipId, setEnrollInternshipId] = useState('');
  const [enrollStatus, setEnrollStatus] = useState<'ACCEPTED' | 'PENDING'>('ACCEPTED');
  const [enrollNotes, setEnrollNotes] = useState('Directly allocated by administrator');

  // Queries
  const { data: programs = [], isLoading: isLoadingPrograms, refetch: refetchPrograms } = useQuery<InternshipProgram[]>({
    queryKey: ['admin-internships-all'],
    queryFn: async () => {
      const res = await api.get('/internships/admin/all');
      return res.data.data;
    },
  });

  const { data: applications = [], isLoading: isLoadingApps, refetch: refetchApps } = useQuery<ApplicationRecord[]>({
    queryKey: ['admin-internship-applications', appProgramFilter, appStatusFilter, appSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appProgramFilter !== 'ALL') params.set('internshipId', appProgramFilter);
      if (appStatusFilter !== 'ALL') params.set('status', appStatusFilter);
      if (appSearch) params.set('search', appSearch);
      const res = await api.get(`/internships/admin/applications?${params.toString()}`);
      return res.data.data;
    },
  });

  const { data: mentorsResponse } = useQuery({
    queryKey: ['admin-mentors-list'],
    queryFn: async () => {
      const res = await api.get('/admin/mentors');
      return res.data.data;
    },
  });
  const mentorsList: any[] = Array.isArray(mentorsResponse)
    ? mentorsResponse
    : mentorsResponse?.mentors || [];

  const { data: studentsResponse } = useQuery({
    queryKey: ['admin-users-students'],
    queryFn: async () => {
      const res = await api.get('/admin/users?role=STUDENT&limit=100');
      return res.data.data;
    },
  });
  const studentsList: any[] = studentsResponse?.users || [];

  // Mutations
  const saveProgramMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingProgram) {
        return api.patch(`/internships/${editingProgram.id}`, payload);
      }
      return api.post('/internships', payload);
    },
    onSuccess: () => {
      toast.success(
        editingProgram ? 'Internship Updated' : 'Internship Created',
        'Program details synchronized successfully.'
      );
      setIsProgramModalOpen(false);
      setEditingProgram(null);
      refetchPrograms();
      queryClient.invalidateQueries({ queryKey: ['internships'] });
    },
    onError: (err: any) => {
      toast.error('Operation Failed', err.response?.data?.error?.message || 'Could not save internship program.');
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/internships/${id}`);
    },
    onSuccess: () => {
      toast.success('Program Removed', 'Internship program deleted successfully.');
      refetchPrograms();
      queryClient.invalidateQueries({ queryKey: ['internships'] });
    },
    onError: (err: any) => {
      toast.error('Deletion Failed', err.response?.data?.error?.message || 'Failed to delete internship.');
    },
  });

  const updateAppStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      return api.patch(`/internships/applications/${id}/status`, { status, notes });
    },
    onSuccess: () => {
      toast.success('Status Updated', 'Student application status recorded and notification sent.');
      refetchApps();
      if (viewingApplication) setViewingApplication(null);
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.response?.data?.error?.message || 'Failed to update application status.');
    },
  });

  const directEnrollMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/internships/admin/enroll', payload);
    },
    onSuccess: () => {
      toast.success('Student Enrolled', 'Student successfully enrolled into the internship cohort.');
      setIsEnrollModalOpen(false);
      setEnrollStudentId('');
      setEnrollNotes('Directly allocated by administrator');
      refetchApps();
      refetchPrograms();
    },
    onError: (err: any) => {
      toast.error('Enrollment Failed', err.response?.data?.error?.message || 'Failed to enroll student.');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingProgram(null);
    setFormTitle('');
    setFormDescription('');
    setFormOrganization('SkillUp Partner Network');
    setFormMentorId('');
    setFormTechnologies('React, Node.js, TypeScript');
    setFormDuration('3 Months');
    setFormDeliveryMode('HYBRID');
    setFormStartDate('');
    setFormEndDate('');
    setFormDeadline('');
    setFormEligibility('Engineering students & recent graduates');
    setFormPrice('0');
    setFormDiscountPrice('');
    setFormRegistrationFee('0');
    setFormAllowInstallments(false);
    setFormMinInstallmentAmount('500');
    setFormInstallmentCount('2');
    setFormInstallmentPolicy('RESTRICTED');
    setFormRefundPolicy('Full refund before start date. No refund after cohort kick-off.');
    setFormPaymentRequired(true);
    setFormSeats('50');
    setFormBannerUrl('');
    setFormIsPublished(true);
    setIsProgramModalOpen(true);
  };

  const handleOpenEditModal = (p: InternshipProgram) => {
    setEditingProgram(p);
    setFormTitle(p.title);
    setFormDescription(p.description);
    setFormOrganization(p.organization || 'SkillUp Partner Network');
    setFormMentorId(p.mentorId || '');
    setFormTechnologies(p.technologies || '');
    setFormDuration(p.duration || '3 Months');
    setFormDeliveryMode(p.deliveryMode || 'HYBRID');
    setFormStartDate(p.startDate ? p.startDate.split('T')[0] : '');
    setFormEndDate(p.endDate ? p.endDate.split('T')[0] : '');
    setFormDeadline(p.applicationDeadline ? p.applicationDeadline.split('T')[0] : '');
    setFormEligibility(p.eligibility || 'Engineering students & recent graduates');
    setFormPrice(String(p.price || 0));
    setFormDiscountPrice(p.discountPrice ? String(p.discountPrice) : '');
    setFormRegistrationFee(p.registrationFee ? String(p.registrationFee) : '0');
    setFormAllowInstallments(Boolean(p.allowInstallments));
    setFormMinInstallmentAmount(p.minInstallmentAmount ? String(p.minInstallmentAmount) : '500');
    setFormInstallmentCount(p.installmentCount ? String(p.installmentCount) : '2');
    setFormInstallmentPolicy(p.installmentPolicy || 'RESTRICTED');
    setFormRefundPolicy(p.refundPolicy || 'Full refund before start date. No refund after cohort kick-off.');
    setFormPaymentRequired(p.paymentRequiredBeforeAccess !== undefined ? p.paymentRequiredBeforeAccess : true);
    setFormSeats(String(p.availableSeats || 50));
    setFormBannerUrl(p.bannerUrl || '');
    setFormIsPublished(p.isPublished);
    setIsProgramModalOpen(true);
  };

  // Filtered Programs
  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      !programSearch ||
      p.title.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.technologies.toLowerCase().includes(programSearch.toLowerCase()) ||
      p.organization.toLowerCase().includes(programSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (programStatusFilter === 'PUBLISHED') return p.isPublished;
    if (programStatusFilter === 'DRAFT') return !p.isPublished;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Industry Program Governance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#14233B]">
            Internship & Cohort Placement Management
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
            Create industry programs, assign mentors, manage student admissions, and track cohort completion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (programs.length > 0) setEnrollInternshipId(programs[0].id);
              if (studentsList.length > 0) setEnrollStudentId(studentsList[0].id);
              setIsEnrollModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] border border-[#2563EB]/20 hover:bg-[#DBEAFE] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Direct Student Placement</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Internship</span>
          </button>

          <button
            onClick={() => {
              refetchPrograms();
              refetchApps();
            }}
            title="Refresh Data"
            className="p-2 text-[#667085] hover:text-[#173B73] bg-white border border-[#E4E9F0] rounded-xl hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-[#E4E9F0] gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSection('programs')}
          className={`pb-3 px-1.5 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSection === 'programs'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#667085] hover:text-[#14233B]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Internship Programs</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-[#EFF6FF] text-[#2563EB]">
            {programs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('applications')}
          className={`pb-3 px-1.5 transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeSection === 'applications'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#667085] hover:text-[#14233B]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Applications</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-[#F8F9FA] text-[#475467] border border-[#E4E9F0]">
            {applications.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          SECTION 1: INTERNSHIP PROGRAMS DIRECTORY
      ======================================================== */}
      {activeSection === 'programs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProgramStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  programStatusFilter === 'ALL'
                    ? 'bg-[#173B73] text-white'
                    : 'bg-[#F8F9FA] text-[#667085] hover:bg-[#EDF0F4]'
                }`}
              >
                All Programs ({programs.length})
              </button>
              <button
                onClick={() => setProgramStatusFilter('PUBLISHED')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  programStatusFilter === 'PUBLISHED'
                    ? 'bg-[#16845B] text-white'
                    : 'bg-[#F8F9FA] text-[#667085] hover:bg-[#EDF0F4]'
                }`}
              >
                Active / Published ({programs.filter((p) => p.isPublished).length})
              </button>
              <button
                onClick={() => setProgramStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                  programStatusFilter === 'DRAFT'
                    ? 'bg-[#B7791F] text-white'
                    : 'bg-[#F8F9FA] text-[#667085] hover:bg-[#EDF0F4]'
                }`}
              >
                Drafts ({programs.filter((p) => !p.isPublished).length})
              </button>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search programs, tech, company..."
                value={programSearch}
                onChange={(e) => setProgramSearch(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-[#F8F9FA]/50"
              />
              {programSearch && (
                <button
                  onClick={() => setProgramSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#14233B]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Programs Grid / Cards */}
          {isLoadingPrograms ? (
            <div className="p-12 text-center text-xs text-[#667085]">Loading internship programs...</div>
          ) : filteredPrograms.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#CBD5E1] space-y-2">
              <Briefcase className="w-8 h-8 text-[#98A2B3] mx-auto" />
              <p className="font-bold text-sm text-[#14233B]">No internship programs found</p>
              <p className="text-xs text-[#667085]">Create a new internship program to start admitting students.</p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg cursor-pointer"
              >
                + Create Program
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((prog) => {
                const enrolledCount = prog._count?.applications || 0;
                const isPaid = Number(prog.price || 0) > 0;

                return (
                  <div
                    key={prog.id}
                    className="rounded-2xl bg-white border border-[#E4E9F0] hover:border-[#2563EB]/40 transition-all shadow-2xs flex flex-col justify-between overflow-hidden"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-[#EDF0F4]">
                      <img
                        src={prog.bannerUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'}
                        alt={prog.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80';
                        }}
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/95 text-[#14233B] shadow-xs">
                        {prog.deliveryMode}
                      </span>
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-xs ${
                          prog.isPublished ? 'bg-[#EAF7F0] text-[#16845B]' : 'bg-[#FFF6E5] text-[#B7791F]'
                        }`}
                      >
                        {prog.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    <div className="p-5 space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1">
                          <Building className="w-3 h-3 text-[#2563EB]" />
                          <span>{prog.organization}</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#14233B] line-clamp-1">{prog.title}</h3>
                      <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">{prog.description}</p>

                      <div className="pt-2 border-t border-[#EDF0F4] space-y-1.5 text-[11px] text-[#667085]">
                        <div className="flex items-center justify-between">
                          <span>Tech Stack:</span>
                          <span className="font-semibold text-[#14233B] truncate max-w-[180px]">{prog.technologies}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Duration & Capacity:</span>
                          <span className="font-semibold text-[#14233B]">
                            {prog.duration} • {enrolledCount}/{prog.availableSeats} Seats
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Tuition Fee:</span>
                          <span className="font-bold text-[#16845B]">
                            {isPaid ? `₹${Number(prog.price).toLocaleString()}` : 'Free Placement'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Assigned Mentor:</span>
                          <span className="font-semibold text-[#2563EB] truncate max-w-[180px]">
                            {prog.mentor?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EDF0F4] flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setAppProgramFilter(prog.id);
                          setActiveSection('applications');
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-[#2563EB]" />
                        <span>Applicants ({enrolledCount})</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(prog)}
                          title="Edit Program"
                          className="p-1.5 text-[#667085] hover:text-[#2563EB] hover:bg-[#F8F9FA] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: 'Delete Internship Program',
                              message: `Are you sure you want to delete "${prog.title}"? Associated records will be permanently removed.`,
                              confirmText: 'Delete Program',
                              isDestructive: true,
                            });
                            if (confirmed) {
                              deleteProgramMutation.mutate(prog.id);
                            }
                          }}
                          title="Delete Program"
                          className="p-1.5 text-[#98A2B3] hover:text-[#C03945] hover:bg-[#FFF0F0] rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SECTION 2: STUDENT APPLICATIONS WORKFLOW
      ======================================================== */}
      {activeSection === 'applications' && (
        <div className="space-y-4">
          {/* Application Filters */}
          <div className="p-4 bg-white rounded-xl border border-[#E4E9F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={appProgramFilter}
                onChange={(e) => setAppProgramFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] font-semibold"
              >
                <option value="ALL">All Internship Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              <select
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] font-semibold"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="ACCEPTED">Accepted / Enrolled</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student name or email..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB] bg-[#F8F9FA]/50"
              />
              {appSearch && (
                <button
                  onClick={() => setAppSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#14233B]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-xl border border-[#E4E9F0] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#EDF0F4] bg-[#F8F9FA]/40 flex justify-between items-center text-xs">
              <h3 className="font-bold text-[#14233B]">
                Student Application Records ({applications.length})
              </h3>
              <span className="text-[#667085]">Filter, review candidate credentials, and update enrollment decisions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EDF0F4] bg-[#F8F9FA] text-[#667085] font-semibold">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Internship Program</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF0F4]">
                  {isLoadingApps ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#667085]">
                        Loading student applications...
                      </td>
                    </tr>
                  ) : applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#667085] space-y-1">
                        <Users className="w-6 h-6 text-[#98A2B3] mx-auto mb-1" />
                        <p className="font-semibold text-xs text-[#14233B]">No student applications match the query.</p>
                        <p className="text-[11px]">Adjust your filter options to view other records.</p>
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#F8F9FA]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {app.user?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <span className="font-bold text-[#14233B] block">{app.user?.name}</span>
                              <span className="text-[11px] text-[#667085] block">{app.user?.email}</span>
                              {app.user?.college && (
                                <span className="text-[10px] text-[#98A2B3] block">{app.user.college}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#14233B] block">{app.internship?.title}</span>
                          <span className="text-[10px] text-[#667085] block">{app.internship?.organization}</span>
                        </td>

                        <td className="py-3.5 px-4 text-[#667085] whitespace-nowrap">
                          {new Date(app.appliedAt).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              app.status === 'ACCEPTED'
                                ? 'bg-[#EAF7F0] text-[#16845B]'
                                : app.status === 'COMPLETED'
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : app.status === 'PENDING'
                                ? 'bg-[#FFF6E5] text-[#B7791F]'
                                : 'bg-[#FFF0F0] text-[#C03945]'
                            }`}
                          >
                            {app.status === 'ACCEPTED'
                              ? 'Approved / Enrolled'
                              : app.status === 'COMPLETED'
                              ? 'Completed'
                              : app.status === 'PENDING'
                              ? 'Pending'
                              : 'Rejected'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {app.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() =>
                                    updateAppStatusMutation.mutate({
                                      id: app.id,
                                      status: 'ACCEPTED',
                                      notes: 'Approved by administrator',
                                    })
                                  }
                                  title="Approve Application"
                                  className="px-2 py-1 text-[11px] font-bold text-[#16845B] bg-[#EAF7F0] hover:bg-[#D4EFE0] rounded-md transition cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    updateAppStatusMutation.mutate({
                                      id: app.id,
                                      status: 'REJECTED',
                                      notes: 'Application does not meet current criteria',
                                    })
                                  }
                                  title="Reject Application"
                                  className="px-2 py-1 text-[11px] font-bold text-[#C03945] bg-[#FFF0F0] hover:bg-[#FFE0E0] rounded-md transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {app.status === 'ACCEPTED' && (
                              <button
                                onClick={() =>
                                  updateAppStatusMutation.mutate({
                                    id: app.id,
                                    status: 'COMPLETED',
                                    notes: 'Completed internship program successfully',
                                  })
                                }
                                title="Mark as Completed"
                                className="px-2 py-1 text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-md transition cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            )}

                            <button
                              onClick={() => setViewingApplication(app)}
                              title="View Application Details"
                              className="p-1.5 text-[#667085] hover:text-[#173B73] hover:bg-[#F8F9FA] rounded-md transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
          MODAL: CREATE / EDIT INTERNSHIP PROGRAM
      ======================================================== */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3 shrink-0">
              <h3 className="text-sm font-bold text-[#14233B]">
                {editingProgram ? 'Edit Internship Program' : 'Create New Internship Program'}
              </h3>
              <button
                onClick={() => setIsProgramModalOpen(false)}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProgramMutation.mutate({
                  title: formTitle,
                  description: formDescription,
                  organization: formOrganization,
                  mentorId: formMentorId || null,
                  technologies: formTechnologies,
                  duration: formDuration,
                  deliveryMode: formDeliveryMode,
                  startDate: formStartDate || null,
                  endDate: formEndDate || null,
                  applicationDeadline: formDeadline || null,
                  eligibility: formEligibility,
                  price: formPrice,
                  discountPrice: formDiscountPrice || null,
                  registrationFee: formRegistrationFee || '0',
                  allowInstallments: formAllowInstallments,
                  minInstallmentAmount: formAllowInstallments ? formMinInstallmentAmount : null,
                  installmentCount: formAllowInstallments ? parseInt(formInstallmentCount) : 1,
                  installmentPolicy: formInstallmentPolicy,
                  refundPolicy: formRefundPolicy,
                  paymentRequiredBeforeAccess: formPaymentRequired,
                  availableSeats: formSeats,
                  bannerUrl: formBannerUrl || null,
                  isPublished: formIsPublished,
                });
              }}
              className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1"
            >
              <ImageUpload
                label="Internship Cover / Banner Image"
                value={formBannerUrl}
                onChange={(url) => setFormBannerUrl(url || '')}
                helperText="JPG, JPEG, PNG, or WEBP (Max 5MB). Displays on public internship cards, details & dashboard."
                aspectRatio="16/9"
              />

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Internship Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Web Engineering Internship"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SkillUp Partner Network or Tech Partner Ltd"
                  value={formOrganization}
                  onChange={(e) => setFormOrganization(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#667085] font-semibold">Technologies Stack *</label>
                    <span className="text-[10px] text-[#94A3B8]">Comma-separated</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React, Node.js, TypeScript, Python"
                    value={formTechnologies}
                    onChange={(e) => setFormTechnologies(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#14233B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                  />
                  {formTechnologies && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {formTechnologies
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tech, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[10px] font-semibold border border-blue-200"
                          >
                            <span>{tech}</span>
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Delivery Mode</label>
                  <select
                    value={formDeliveryMode}
                    onChange={(e) => setFormDeliveryMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="ONLINE">Online Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="OFFLINE">On-Premise / In-Person</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 3 Months"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Available Seats</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="50"
                    value={formSeats}
                    onChange={(e) => setFormSeats(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                  />
                </div>
              </div>

              {/* DEDICATED FEE & PAYMENT CONFIGURATION SECTION */}
              <div className="p-3.5 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0] space-y-3">
                <div className="flex items-center justify-between border-b border-[#EDF0F4] pb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#2563EB]" />
                    <span className="font-bold text-[#14233B] text-xs">Fee & Payment Configuration</span>
                  </div>
                  <span className="text-[10px] text-[#667085]">Free (₹0) or Paid Placement</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Total Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 for Free"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E4E9F0] bg-white font-semibold text-[#14233B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Discounted Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Optional discount"
                      value={formDiscountPrice}
                      onChange={(e) => setFormDiscountPrice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E4E9F0] bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[#667085] font-semibold mb-1">Registration Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 500"
                      value={formRegistrationFee}
                      onChange={(e) => setFormRegistrationFee(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E4E9F0] bg-white"
                    />
                  </div>
                </div>

                {/* Installment Options Toggle */}
                {Number(formPrice) > 0 && (
                  <div className="pt-2 border-t border-[#EDF0F4] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-[#14233B] flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Permit Installment Payments</span>
                      </label>
                      <input
                        type="checkbox"
                        checked={formAllowInstallments}
                        onChange={(e) => setFormAllowInstallments(e.target.checked)}
                        className="w-4 h-4 text-[#2563EB] rounded cursor-pointer"
                      />
                    </div>

                    {formAllowInstallments && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5">
                        <div>
                          <label className="block text-[#667085] text-[11px] mb-1">Minimum Initial Payment (₹)</label>
                          <input
                            type="number"
                            min="100"
                            value={formMinInstallmentAmount}
                            onChange={(e) => setFormMinInstallmentAmount(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#667085] text-[11px] mb-1">Max Installments</label>
                          <input
                            type="number"
                            min="2"
                            max="6"
                            value={formInstallmentCount}
                            onChange={(e) => setFormInstallmentCount(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[#667085] text-[11px] mb-1">Access Policy</label>
                          <select
                            value={formInstallmentPolicy}
                            onChange={(e) => setFormInstallmentPolicy(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                          >
                            <option value="RESTRICTED">Restricted (Lock certificates/projects until cleared)</option>
                            <option value="FULL_ACCESS">Immediate Full Participation</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <label className="block text-[#667085] text-[11px] mb-1">Refund Policy Notice</label>
                      <input
                        type="text"
                        placeholder="e.g. 100% refund up to 7 days before commencement"
                        value={formRefundPolicy}
                        onChange={(e) => setFormRefundPolicy(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#E4E9F0] bg-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                  />
                </div>

                <div>
                  <label className="block text-[#667085] font-semibold mb-1">Apply Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Assigned Supervising Mentor</label>
                <select
                  value={formMentorId}
                  onChange={(e) => setFormMentorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  <option value="">No Mentor Assigned (Assign Later)</option>
                  {mentorsList.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Candidate Eligibility Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd & 3rd Year B.Tech, MCA, or BCA graduates"
                  value={formEligibility}
                  onChange={(e) => setFormEligibility(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Program Curriculum & Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe program goals, sprint structure, live project tasks, and completion standards..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsPublished"
                  checked={formIsPublished}
                  onChange={(e) => setFormIsPublished(e.target.checked)}
                  className="rounded border-[#E4E9F0] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="formIsPublished" className="text-xs font-semibold text-[#14233B] cursor-pointer">
                  Publish immediately (Visible on Public /internship catalog)
                </label>
              </div>

              <div className="pt-3 border-t border-[#EDF0F4] flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProgramModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveProgramMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] cursor-pointer"
                >
                  {saveProgramMutation.isPending
                    ? 'Saving...'
                    : editingProgram
                    ? 'Save Changes'
                    : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DIRECT STUDENT PLACEMENT & ASSIGNMENT
      ======================================================== */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Direct Student Internship Placement</h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                directEnrollMutation.mutate({
                  internshipId: enrollInternshipId,
                  userId: enrollStudentId,
                  status: enrollStatus,
                  notes: enrollNotes,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">Select Student *</label>
                <select
                  required
                  value={enrollStudentId}
                  onChange={(e) => setEnrollStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  {studentsList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Select Internship Program *</label>
                <select
                  required
                  value={enrollInternshipId}
                  onChange={(e) => setEnrollInternshipId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.organization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Enrollment Status</label>
                <select
                  value={enrollStatus}
                  onChange={(e) => setEnrollStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] bg-white text-[#172033]"
                >
                  <option value="ACCEPTED">Accepted / Enrolled Directly</option>
                  <option value="PENDING">Pending Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">Administrative Notes</label>
                <input
                  type="text"
                  value={enrollNotes}
                  onChange={(e) => setEnrollNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0]"
                />
              </div>

              <div className="pt-3 border-t border-[#EDF0F4] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directEnrollMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#173B73] hover:bg-[#14233B] cursor-pointer"
                >
                  {directEnrollMutation.isPending ? 'Allocating...' : 'Assign & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIEW APPLICATION DETAILS
      ======================================================== */}
      {viewingApplication && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] text-xs">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Application Details</h3>
              <button
                onClick={() => setViewingApplication(null)}
                className="text-[#667085] hover:text-[#172033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E4E9F0] space-y-1">
                <span className="font-bold text-[#14233B] text-sm block">
                  {viewingApplication.user?.name}
                </span>
                <span className="text-[#667085] block">{viewingApplication.user?.email}</span>
                {viewingApplication.user?.college && (
                  <span className="text-[#667085] block">College: {viewingApplication.user.college}</span>
                )}
                {viewingApplication.user?.phone && (
                  <span className="text-[#667085] block">Phone: {viewingApplication.user.phone}</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#667085]">Program:</span>
                <p className="font-bold text-[#14233B]">{viewingApplication.internship?.title}</p>
                <span className="text-[11px] text-[#667085]">
                  Organization: {viewingApplication.internship?.organization}
                </span>
              </div>

              {viewingApplication.notes && (
                <div className="space-y-1">
                  <span className="font-semibold text-[#667085]">Applicant Notes / Statement:</span>
                  <p className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#E4E9F0] text-[#14233B]">
                    {viewingApplication.notes}
                  </p>
                </div>
              )}

              {viewingApplication.resumeUrl && (
                <div className="space-y-1">
                  <span className="font-semibold text-[#667085]">Portfolio / Resume URL:</span>
                  <a
                    href={viewingApplication.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>{viewingApplication.resumeUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#EDF0F4]">
                <span className="font-semibold text-[#667085]">Current Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    viewingApplication.status === 'ACCEPTED'
                      ? 'bg-[#EAF7F0] text-[#16845B]'
                      : viewingApplication.status === 'COMPLETED'
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : viewingApplication.status === 'PENDING'
                      ? 'bg-[#FFF6E5] text-[#B7791F]'
                      : 'bg-[#FFF0F0] text-[#C03945]'
                  }`}
                >
                  {viewingApplication.status}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EDF0F4] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingApplication(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#14233B] bg-[#F8F9FA] hover:bg-[#EDF0F4]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
