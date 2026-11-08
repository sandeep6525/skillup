import { useToast, useConfirm } from '../context/ToastContext';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Briefcase,
  Calendar,
  Clock,
  Video,
  FileText,
  Users,
  ExternalLink,
  Download,
  AlertCircle,
  PlayCircle,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  FolderDown,
  UploadCloud,
  CheckSquare,
  Sparkles,
  TrendingUp,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  Play,
  Film,
} from 'lucide-react';

export const InternshipLearningPage: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  // Tabs: overview | students | materials | videos | assignments | classes
  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'materials' | 'videos' | 'assignments' | 'classes'
  >('overview');

  // Video Player Modal State
  const [activePlayingVideo, setActivePlayingVideo] = useState<{
    title: string;
    description?: string;
    videoUrl: string;
    moduleName?: string;
  } | null>(null);
  const [videoPlayerLoading, setVideoPlayerLoading] = useState(true);
  const [videoPlayerError, setVideoPlayerError] = useState(false);

  // Mentor Video Lesson Create / Edit Modal State
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideoLesson, setEditingVideoLesson] = useState<any | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');
  const [videoModule, setVideoModule] = useState('Module 1: Foundations');
  const [videoLessonOrder, setVideoLessonOrder] = useState('1');
  const [videoDuration, setVideoDuration] = useState('45');
  const [videoStatus, setVideoStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [isUploadingVideoFile, setIsUploadingVideoFile] = useState(false);
  const [isUploadingThumbnailFile, setIsUploadingThumbnailFile] = useState(false);

  // Student assignment submission dialog state
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');

  const { data: learningData, isLoading, error } = useQuery({
    queryKey: ['internship-learning', id],
    queryFn: async () => {
      const res = await api.get(`/internships/${id}/learning`);
      return res.data.data;
    },
    enabled: !!id,
  });

  // Video Lesson Mutation: Create / Update
  const saveVideoLessonMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingVideoLesson) {
        return api.patch(`/internships/videos/${editingVideoLesson.id}`, payload);
      }
      return api.post(`/internships/${id}/videos`, payload);
    },
    onSuccess: () => {
      toast.success(
        editingVideoLesson ? 'Lesson Updated' : 'Lesson Created',
        editingVideoLesson
          ? 'Recorded video lesson updated successfully.'
          : 'New recorded video lesson added and available to eligible learners.'
      );
      setIsVideoModalOpen(false);
      setEditingVideoLesson(null);
      resetVideoForm();
      queryClient.invalidateQueries({ queryKey: ['internship-learning', id] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to save recorded video lesson');
    },
  });

  // Video Lesson Mutation: Delete
  const deleteVideoLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return api.delete(`/internships/videos/${lessonId}`);
    },
    onSuccess: () => {
      toast.success('Lesson Deleted', 'Recorded video lesson has been removed.');
      queryClient.invalidateQueries({ queryKey: ['internship-learning', id] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete recorded video lesson');
    },
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async ({ asgnId, content, fileUrl }: { asgnId: string; content: string; fileUrl?: string }) => {
      return api.post(`/assignments/${asgnId}/submit`, { content, fileUrl });
    },
    onSuccess: () => {
      toast.success('Assignment Submitted', 'Your assignment deliverable has been submitted for review.');
      setSubmittingAssignmentId(null);
      setSubmissionContent('');
      setSubmissionFileUrl('');
      queryClient.invalidateQueries({ queryKey: ['internship-learning', id] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to submit assignment');
    },
  });

  const resetVideoForm = () => {
    setVideoTitle('');
    setVideoDescription('');
    setVideoUrl('');
    setVideoThumbnailUrl('');
    setVideoModule('Module 1: Foundations');
    setVideoLessonOrder('1');
    setVideoDuration('45');
    setVideoStatus('PUBLISHED');
  };

  const handleOpenCreateVideoModal = () => {
    setEditingVideoLesson(null);
    resetVideoForm();
    const currentVideosCount = learningData?.recordedVideos?.length || 0;
    setVideoLessonOrder(String(currentVideosCount + 1));
    setIsVideoModalOpen(true);
  };

  const handleOpenEditVideoModal = (lesson: any) => {
    setEditingVideoLesson(lesson);
    setVideoTitle(lesson.title || '');
    setVideoDescription(lesson.description || '');
    setVideoUrl(lesson.videoUrl || '');
    setVideoThumbnailUrl(lesson.thumbnailUrl || '');
    setVideoModule(lesson.moduleName || lesson.module || 'Module 1: Foundations');
    setVideoLessonOrder(String(lesson.lessonOrder || 1));
    setVideoDuration(String(lesson.duration || 45));
    setVideoStatus(lesson.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED');
    setIsVideoModalOpen(true);
  };

  const handleDeleteVideo = async (lesson: any) => {
    const isConfirmed = await confirm({
      title: 'Delete Recorded Video Lesson?',
      message: `Are you sure you want to permanently delete "${lesson.title}"? Enrolled students will no longer be able to watch this lesson.`,
      confirmText: 'Delete Lesson',
      cancelText: 'Cancel',
      isDestructive: true,
    });
    if (isConfirmed) {
      deleteVideoLessonMutation.mutate(lesson.id);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingVideoFile(true);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrlResult = res.data.data.fileUrl;
      setVideoUrl(fileUrlResult);
      toast.success('Video File Uploaded', 'Video file uploaded successfully.');
    } catch (err: any) {
      toast.apiError(err, 'Failed to upload video file. Max limit 25MB or provide external video URL.');
    } finally {
      setIsUploadingVideoFile(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingThumbnailFile(true);

    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const thumbUrl = res.data.data.fileUrl;
      setVideoThumbnailUrl(thumbUrl);
      toast.success('Thumbnail Uploaded', 'Video thumbnail preview image saved.');
    } catch (err: any) {
      toast.apiError(err, 'Failed to upload image. Must be JPG/PNG/WEBP under 5MB.');
    } finally {
      setIsUploadingThumbnailFile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#667085]">Loading Internship Learning Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !learningData) {
    const errMessage = (error as any)?.response?.data?.error?.message || (error as any)?.response?.data?.message || 'Access restricted';
    return (
      <div className="min-h-screen bg-[#F6F8FB] p-6 sm:p-12 flex items-center justify-center font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E4E9F0] p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[#14233B]">Learning Portal Access Restricted</h2>
          <p className="text-xs text-[#667085] leading-relaxed">
            {errMessage}. Please verify your internship application enrollment status under My Internships.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/dashboard/internships"
              className="px-4 py-2 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition"
            >
              My Internships
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#F0F4FA] text-[#14233B] text-xs font-bold transition hover:bg-slate-200"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    internship,
    enrollmentStatus,
    learningMaterials = [],
    recordedVideos = [],
    liveClasses = [],
    assignments = [],
    enrolledStudents = [],
    stats = {},
  } = learningData;

  const isPrivileged = enrollmentStatus === 'INSTRUCTOR_ACCESS';

  const handleDownload = async (materialId: string, title: string) => {
    try {
      const res = await api.get(`/materials/${materialId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.apiError(err, 'Unable to download learning resource. Please verify your enrollment.');
    }
  };

  const getEmbeddableVideoUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    // YouTube convert
    if (rawUrl.includes('youtube.com/watch') || rawUrl.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = rawUrl.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
      }
    }
    // Vimeo convert
    if (rawUrl.includes('vimeo.com/')) {
      const vimeoId = rawUrl.split('vimeo.com/')[1]?.split('?')[0]?.split('#')[0];
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
      }
    }
    // Direct file / local upload
    return rawUrl;
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] font-sans pb-16">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-[#E4E9F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={isPrivileged ? '/mentor-dashboard' : '/dashboard/internships'}
              className="p-2 rounded-xl text-[#667085] hover:text-[#14233B] hover:bg-slate-100 transition"
              title="Return"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                {internship.organization} &bull; Internship Learning Management
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-[#14233B] truncate max-w-lg">
                {internship.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                isPrivileged
                  ? 'bg-[#EAF5EA] text-[#46a548] border-[#55B957]/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isPrivileged ? 'Supervising Mentor Access' : 'Active Cohort Member'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Cohort Header Hero Card */}
        <div className="bg-white rounded-3xl border border-[#E4E9F0] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Supervised Industry Placement</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#14233B]">
                {internship.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                {internship.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085] pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
                  Tech: {internship.technologies}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
                  Duration: {internship.duration}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
                  Mode: {internship.deliveryMode}
                </span>
              </div>
            </div>

            {/* Mentor Profile Card */}
            {internship.mentor ? (
              <div className="p-4 rounded-2xl bg-[#F8F9FC] border border-[#E4E9F0] min-w-[260px] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                  Assigned Supervising Mentor
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#173B73] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {internship.mentor.name?.charAt(0) || 'M'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#14233B] truncate">
                      {internship.mentor.name}
                    </h4>
                    <span className="text-[11px] text-[#667085] block truncate">
                      {internship.mentor.title || 'Technical Lead'}
                    </span>
                    <span className="text-[10px] text-[#2563EB] block truncate">
                      {internship.mentor.email}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <span className="font-bold block mb-1">Mentor Assignment Pending</span>
                An industry supervisor will be appointed by administrators shortly.
              </div>
            )}
          </div>

          {/* Tab Navigation: Overview | Enrolled Students (Mentor) | Materials | Recorded Videos | Assignments | Live Classes */}
          <div className="flex items-center gap-2 border-t border-[#EDF0F4] mt-6 pt-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#173B73] text-white shadow-xs'
                  : 'bg-transparent text-[#667085] hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            {isPrivileged && (
              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'students'
                    ? 'bg-[#173B73] text-white shadow-xs'
                    : 'bg-transparent text-[#667085] hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enrolled Students ({stats.totalStudents || enrolledStudents.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'materials'
                  ? 'bg-[#173B73] text-white shadow-xs'
                  : 'bg-transparent text-[#667085] hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Learning Materials ({learningMaterials.length})</span>
            </button>

            {/* RECORDED VIDEOS TAB */}
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'videos'
                  ? 'bg-[#173B73] text-white shadow-xs'
                  : 'bg-transparent text-[#667085] hover:bg-slate-100'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Recorded Videos ({recordedVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'assignments'
                  ? 'bg-[#173B73] text-white shadow-xs'
                  : 'bg-transparent text-[#667085] hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Assignments ({assignments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'classes'
                  ? 'bg-[#173B73] text-white shadow-xs'
                  : 'bg-transparent text-[#667085] hover:bg-slate-100'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Live Classes ({liveClasses.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <span className="text-xs text-[#667085] font-semibold">Learning Materials</span>
              <div className="text-2xl font-black text-[#14233B]">
                {learningMaterials.length}
              </div>
              <p className="text-[11px] text-[#667085]">
                Guides, architecture specs, repositories, and documentation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <span className="text-xs text-[#667085] font-semibold">Recorded Video Lessons</span>
              <div className="text-2xl font-black text-[#2563EB]">{recordedVideos.length}</div>
              <p className="text-[11px] text-[#667085]">
                On-demand recorded sessions, walkthroughs, and code breakdowns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <span className="text-xs text-[#667085] font-semibold">Milestone Deliverables</span>
              <div className="text-2xl font-black text-[#14233B]">{assignments.length}</div>
              <p className="text-[11px] text-[#667085]">
                Real-world project deliverables evaluated with mentor feedback.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-2">
              <span className="text-xs text-[#667085] font-semibold">Live Interactive Sessions</span>
              <div className="text-2xl font-black text-[#14233B]">{liveClasses.length}</div>
              <p className="text-[11px] text-[#667085]">
                Scheduled doubt clearing and engineering architecture syncs.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Enrolled Students Roster (Mentor / Admin Only) */}
        {activeTab === 'students' && isPrivileged && (
          <div className="bg-white rounded-3xl border border-[#E4E9F0] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EDF0F4] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#14233B]">Enrolled Cohort Roster</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Verified candidates with active admission to this internship practicum.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                {enrolledStudents.length} Students Active
              </span>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="text-center py-12 text-[#667085] text-xs">
                No students currently enrolled in this internship.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledStudents.map((st: any) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-[#F8F9FC] border border-[#E4E9F0] flex items-center gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {st.name?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#14233B] truncate">{st.name}</h4>
                      <span className="text-[11px] text-[#667085] block truncate">{st.email}</span>
                      {st.college && (
                        <span className="text-[10px] text-[#2563EB] block truncate mt-0.5">
                          {st.college}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Learning Materials */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Cohort Learning Materials & Notes</h3>
                <p className="text-xs text-[#667085] mt-0.5">Curriculum specs, project blueprints, and reference documents</p>
              </div>
              {isPrivileged && (
                <Link
                  to="/mentor-dashboard"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Resource in Hub</span>
                </Link>
              )}
            </div>

            {learningMaterials.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
                  <FolderDown className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#14233B]">No materials published yet</h3>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Your supervising mentor will publish curriculum guides, project notes, and references here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {learningMaterials.map((mat: any) => (
                  <div
                    key={mat.id}
                    className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {mat.type}
                        </span>
                        {mat.module && (
                          <span className="text-[10px] text-[#2563EB] font-bold">{mat.module}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#14233B]">{mat.title}</h4>
                      {mat.description && (
                        <p className="text-xs text-[#667085] mt-1 line-clamp-2">
                          {mat.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload(mat.id, mat.title)}
                      className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Resource</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: RECORDED VIDEOS (Dedicated Management & Student Access) */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Recorded Internship Video Lessons</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Structured video lectures and code walkthroughs for this internship program
                </p>
              </div>
              {isPrivileged && (
                <button
                  type="button"
                  onClick={handleOpenCreateVideoModal}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Recorded Video Lesson</span>
                </button>
              )}
            </div>

            {recordedVideos.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
                  <Film className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#14233B]">No recorded video lessons available yet</h3>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  {isPrivileged
                    ? 'Click "Add Recorded Video Lesson" above to upload video lectures, architectural walkthroughs, and tutorials for your enrolled students.'
                    : 'Your supervising mentor has not published recorded lessons for this cohort yet. Check back soon!'}
                </p>
                {isPrivileged && (
                  <button
                    type="button"
                    onClick={handleOpenCreateVideoModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#1D4ED8] transition mt-2 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Upload First Video Lesson</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recordedVideos.map((vid: any) => {
                  const isDraft = vid.status === 'DRAFT';
                  return (
                    <div
                      key={vid.id}
                      className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#2563EB]/40 transition group"
                    >
                      <div>
                        {/* Video Thumbnail with Play Overlay */}
                        <div
                          onClick={() => {
                            setVideoPlayerLoading(true);
                            setVideoPlayerError(false);
                            setActivePlayingVideo(vid);
                          }}
                          className="aspect-16/9 bg-slate-900 relative overflow-hidden cursor-pointer group/thumb"
                        >
                          <img
                            src={
                              vid.thumbnailUrl ||
                              'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'
                            }
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300 opacity-90 group-hover/thumb:opacity-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35 group-hover/thumb:bg-black/20 transition flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white/95 text-[#2563EB] flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition">
                              <Play className="w-5 h-5 ml-0.5 fill-[#2563EB]" />
                            </div>
                          </div>

                          {/* Duration Badge */}
                          {vid.duration ? (
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{vid.duration}m</span>
                            </div>
                          ) : null}

                          {/* Status Badge */}
                          <div className="absolute top-2.5 right-2.5">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs ${
                                isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isDraft ? 'Draft' : 'Published'}
                            </span>
                          </div>

                          {/* Lesson Order */}
                          <div className="absolute top-2.5 left-2.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#14233B]/80 text-white rounded-md">
                              Lesson #{vid.lessonOrder || 1}
                            </span>
                          </div>
                        </div>

                        {/* Video Details */}
                        <div className="p-5 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#2563EB]">
                              {vid.moduleName || vid.module || 'General Module'}
                            </span>
                            {isPrivileged && (
                              <span className="text-[10px] text-[#667085]">
                                {stats.totalStudents || enrolledStudents.length} Students Access
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-[#14233B] line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                            {vid.title}
                          </h4>

                          {vid.description && (
                            <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                              {vid.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-4 pt-0 border-t border-[#EDF0F4] mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoPlayerLoading(true);
                            setVideoPlayerError(false);
                            setActivePlayingVideo(vid);
                          }}
                          className="flex-1 py-2 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5 text-blue-300" />
                          <span>Watch Video</span>
                        </button>

                        {isPrivileged && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditVideoModal(vid)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#14233B] transition cursor-pointer"
                              title="Edit Lesson Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(vid)}
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Delete Video Lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Assignments */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Internship Project Milestones & Deliverables</h3>
                <p className="text-xs text-[#667085] mt-0.5">Practical project checkpoints reviewed and scored by your mentor</p>
              </div>
              {isPrivileged && (
                <Link
                  to="/mentor-dashboard"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create Milestone Assignment</span>
                </Link>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
                  <CheckSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#14233B]">No assignments released yet</h3>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Your mentor has not released project milestones for this internship cohort yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((asgn: any) => {
                  const mySubmission = asgn.submissions?.[0];
                  const isSubmitted = !!mySubmission;
                  const isNeedsRevision = mySubmission?.status === 'NEEDS_REVISION';
                  const isGraded = mySubmission?.status === 'GRADED';

                  return (
                    <div
                      key={asgn.id}
                      className="p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDF0F4] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#14233B]">{asgn.title}</h4>
                            {asgn.module && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EAF5EA] text-[#2563EB] font-bold">
                                {asgn.module}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#667085]">
                            Due:{' '}
                            {asgn.dueDate
                              ? new Date(asgn.dueDate).toLocaleDateString()
                              : 'No deadline specified'}{' '}
                            &bull; Max Marks: {asgn.totalPoints || 100}
                          </span>
                        </div>

                        <div>
                          {isSubmitted ? (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isGraded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isNeedsRevision
                                  ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                  : 'bg-[#EAF5EA] text-[#2563EB] border border-blue-200'
                              }`}
                            >
                              {isGraded
                                ? `Graded: ${mySubmission.grade}/${asgn.totalPoints || 100}`
                                : isNeedsRevision
                                ? 'Revision Requested'
                                : 'Submitted for Review'}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                              Pending Submission
                            </span>
                          )}
                        </div>
                      </div>

                      {asgn.description && (
                        <p className="text-xs text-[#667085] leading-relaxed">
                          {asgn.description}
                        </p>
                      )}

                      {asgn.instructions && (
                        <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#EDF0F4] text-xs space-y-1">
                          <span className="font-bold text-[#14233B] block">Instructions:</span>
                          <p className="text-[#667085] whitespace-pre-line">{asgn.instructions}</p>
                        </div>
                      )}

                      {/* Submission Feedback Display */}
                      {mySubmission?.feedback && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                            isNeedsRevision
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <span className="font-bold block">Mentor Feedback:</span>
                          <p className="whitespace-pre-line">{mySubmission.feedback}</p>
                        </div>
                      )}

                      {/* Student Submission Action */}
                      {!isPrivileged && (
                        <div className="pt-2 flex justify-end">
                          {!isSubmitted ? (
                            <button
                              onClick={() => {
                                setSubmittingAssignmentId(asgn.id);
                                setSubmissionContent('');
                                setSubmissionFileUrl('');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Submit Deliverable</span>
                            </button>
                          ) : isNeedsRevision ? (
                            <button
                              onClick={() => {
                                setSubmittingAssignmentId(asgn.id);
                                setSubmissionContent(mySubmission.content || '');
                                setSubmissionFileUrl(mySubmission.fileUrl || '');
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Resubmit Corrected Deliverable</span>
                            </button>
                          ) : (
                            <div className="text-xs text-[#667085] flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Deliverable submitted on {new Date(mySubmission.submittedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Live Classes */}
        {activeTab === 'classes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">Scheduled Interactive Syncs</h3>
                <p className="text-xs text-[#667085] mt-0.5">Live mentoring, code reviews, and industry office hours</p>
              </div>
              {isPrivileged && (
                <Link
                  to="/mentor-dashboard"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Live Session</span>
                </Link>
              )}
            </div>

            {liveClasses.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
                  <Video className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#14233B]">No live classes scheduled</h3>
                <p className="text-xs text-[#667085] max-w-sm mx-auto">
                  Live cohort classes will appear here with instant join links prior to start time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveClasses.map((cls: any) => (
                  <div
                    key={cls.id}
                    className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EAF5EA] text-[#2563EB]">
                          {cls.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(cls.startTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#14233B]">{cls.title}</h4>
                      {cls.description && (
                        <p className="text-xs text-[#667085] line-clamp-1">{cls.description}</p>
                      )}
                      <div className="text-[11px] text-[#667085]">
                        Duration: {cls.duration} mins &bull; Instructor: {cls.instructor?.name || 'Assigned Mentor'}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {cls.canJoin && cls.meetingUrl ? (
                        <a
                          href={cls.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Live Class</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
                        >
                          Meeting link unlocks 5m prior
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          VIDEO PLAYER MODAL (Student & Mentor Immersive Player)
      ======================================================== */}
      {activePlayingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-[#0B132B] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#14233B] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <Play className="w-3.5 h-3.5 fill-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activePlayingVideo.title}
                  </h3>
                  <span className="text-[11px] text-blue-300 block truncate">
                    {activePlayingVideo.moduleName || 'Internship Video Lesson'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePlayingVideo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Frame Area */}
            <div className="relative aspect-16/9 w-full bg-black flex items-center justify-center overflow-hidden">
              {/* Embed / HTML5 Video */}
              {activePlayingVideo.videoUrl.includes('youtube.com') ||
              activePlayingVideo.videoUrl.includes('youtu.be') ||
              activePlayingVideo.videoUrl.includes('vimeo.com') ? (
                <iframe
                  src={getEmbeddableVideoUrl(activePlayingVideo.videoUrl)}
                  title={activePlayingVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => setVideoPlayerLoading(false)}
                />
              ) : (
                <video
                  src={activePlayingVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  onLoadedData={() => setVideoPlayerLoading(false)}
                  onError={() => {
                    setVideoPlayerLoading(false);
                    setVideoPlayerError(true);
                  }}
                >
                  Your browser does not support HTML5 video playback.
                </video>
              )}

              {/* Loading State Overlay */}
              {videoPlayerLoading && !videoPlayerError && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-white text-xs">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading video stream...</span>
                </div>
              )}

              {/* Error State */}
              {videoPlayerError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <p className="text-xs font-bold text-rose-400">Failed to stream video resource</p>
                  <p className="text-[11px] text-slate-300 max-w-sm">
                    The video format or server path could not be loaded. Please verify the URL or contact your mentor.
                  </p>
                  <a
                    href={activePlayingVideo.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition mt-2"
                  >
                    Open in External Browser
                  </a>
                </div>
              )}
            </div>

            {/* Video Footer Metadata */}
            <div className="p-5 bg-[#0F172A] text-white space-y-2 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#2563EB]">
                  {internship.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  Supervised by {internship.mentor?.name || 'Mentor'}
                </span>
              </div>
              {activePlayingVideo.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activePlayingVideo.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MENTOR VIDEO LESSON CREATE / EDIT MODAL
      ======================================================== */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#14233B]">
                  {editingVideoLesson ? 'Edit Recorded Video Lesson' : 'Add New Recorded Video Lesson'}
                </h3>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Program: <span className="font-semibold text-[#2563EB]">{internship.title}</span>
                </p>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-[#667085] hover:text-[#172033] p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!videoTitle.trim() || !videoUrl.trim()) {
                  toast.warning('Required', 'Please enter lesson title and video URL / file.');
                  return;
                }
                saveVideoLessonMutation.mutate({
                  title: videoTitle.trim(),
                  description: videoDescription.trim(),
                  videoUrl: videoUrl.trim(),
                  thumbnailUrl: videoThumbnailUrl.trim() || undefined,
                  moduleName: videoModule.trim(),
                  lessonOrder: Number(videoLessonOrder) || 1,
                  duration: Number(videoDuration) || 0,
                  status: videoStatus,
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Title */}
              <div>
                <label className="block text-[#14233B] font-bold mb-1">
                  Video Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Tracing with Jaeger and OpenTelemetry"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              {/* Module and Lesson Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#14233B] font-bold mb-1">
                    Module / Milestone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Module 1: Architecture"
                    value={videoModule}
                    onChange={(e) => setVideoModule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#14233B] font-bold mb-1">
                    Lesson Order #
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={videoLessonOrder}
                    onChange={(e) => setVideoLessonOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Video URL or File Upload */}
              <div className="space-y-2">
                <label className="block text-[#14233B] font-bold">
                  Video Source (Direct URL, YouTube, Vimeo, or Upload MP4) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
                <div className="flex items-center gap-2 pt-1">
                  <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#14233B] text-[11px] font-semibold cursor-pointer transition flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{isUploadingVideoFile ? 'Uploading Video...' : 'Upload Video File (MP4)'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                      disabled={isUploadingVideoFile}
                    />
                  </label>
                  {videoUrl && (
                    <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-xs">
                      Source configured
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail URL or Upload */}
              <div className="space-y-2">
                <label className="block text-[#14233B] font-bold">
                  Video Thumbnail Preview Image (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/thumbnail.jpg"
                  value={videoThumbnailUrl}
                  onChange={(e) => setVideoThumbnailUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#14233B] text-[11px] font-semibold cursor-pointer transition flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{isUploadingThumbnailFile ? 'Uploading Image...' : 'Upload Thumbnail Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={isUploadingThumbnailFile}
                    />
                  </label>
                </div>
              </div>

              {/* Duration & Publication Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#14233B] font-bold mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#14233B] font-bold mb-1">
                    Publication Status
                  </label>
                  <select
                    value={videoStatus}
                    onChange={(e) => setVideoStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                  >
                    <option value="PUBLISHED">Published (Learners Can Watch)</option>
                    <option value="DRAFT">Draft (Hidden From Learners)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#14233B] font-bold mb-1">
                  Lesson Summary & Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what topics, code patterns, and practical tasks are covered in this session..."
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-3 border-t border-[#EDF0F4] flex items-center justify-between">
                <span className="text-[11px] text-[#667085]">
                  Enrolled Students: <span className="font-bold text-[#14233B]">{stats.totalStudents || enrolledStudents.length}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveVideoLessonMutation.isPending || isUploadingVideoFile}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition shadow-xs"
                  >
                    {saveVideoLessonMutation.isPending ? 'Saving...' : editingVideoLesson ? 'Update Lesson' : 'Publish Video Lesson'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          STUDENT ASSIGNMENT SUBMISSION MODAL
      ======================================================== */}
      {submittingAssignmentId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Submit Internship Deliverable</h3>
              <button
                onClick={() => setSubmittingAssignmentId(null)}
                className="text-[#667085] hover:text-[#172033]"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!submissionContent && !submissionFileUrl) {
                  toast.warning('Required', 'Please enter your solution notes, GitHub URL, or deployment link.');
                  return;
                }
                submitAssignmentMutation.mutate({
                  asgnId: submittingAssignmentId,
                  content: submissionContent,
                  fileUrl: submissionFileUrl || undefined,
                });
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[#667085] font-semibold mb-1">
                  Repository URL / Deployment Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/your-username/project-repo"
                  value={submissionFileUrl}
                  onChange={(e) => setSubmissionFileUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[#667085] font-semibold mb-1">
                  Deliverable Summary / Solution Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail your architecture, test results, features implemented, and notes for the supervising mentor..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E9F0] focus:outline-hidden focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignmentId(null)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitAssignmentMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  {submitAssignmentMutation.isPending ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternshipLearningPage;

