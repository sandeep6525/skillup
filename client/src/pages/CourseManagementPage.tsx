import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { YouTubePlayer } from '../components/YouTubePlayer';
import {
  PlusCircle,
  Layers,
  BookOpen,
  Trash2,
  Edit,
  Video,
  FileText,
  Eye,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  UploadCloud,
  FileUp,
  Upload,
} from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';

interface LessonResource {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  fileSize?: number | null;
}

interface Lesson {
  id: string;
  title: string;
  titleTa?: string | null;
  description?: string | null;
  descriptionTa?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
  order: number;
  isFree: boolean;
  resources?: LessonResource[];
}

interface Module {
  id: string;
  title: string;
  titleTa?: string | null;
  description?: string | null;
  order: number;
  lessons: Lesson[];
}

export const CourseManagementPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const targetCourseId = searchParams.get('courseId');

  // Create Course Form States
  const [title, setTitle] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionTa, setDescriptionTa] = useState('');
  const [price, setPrice] = useState('1999');
  const [level, setLevel] = useState('All Levels');
  const [categoryId, setCategoryId] = useState('');
  const [allowInstallments, setAllowInstallments] = useState(false);
  const [minInstallmentAmount, setMinInstallmentAmount] = useState('500');
  const [installmentPolicy, setInstallmentPolicy] = useState('RESTRICTED');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Curriculum Builder Selected Course
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  // Module Modal / Form States
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleTitleTa, setModuleTitleTa] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleOrder, setModuleOrder] = useState('1');

  // Lesson Modal / Form States
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTitleTa, setLessonTitleTa] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonDescriptionTa, setLessonDescriptionTa] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [isUploadingLessonVideo, setIsUploadingLessonVideo] = useState(false);
  const [lessonDuration, setLessonDuration] = useState('15');
  const [lessonOrder, setLessonOrder] = useState('1');
  const [lessonIsFree, setLessonIsFree] = useState(false);

  // Resource Attachment States
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [targetLessonId, setTargetLessonId] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFileUrl, setResourceFileUrl] = useState('');
  const [resourceType, setResourceType] = useState('PDF');
  const [isUploadingResource, setIsUploadingResource] = useState(false);

  // Video Preview Modal State
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string>('');

  if (!user || (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  // 1. Fetch instructor's / mentor's courses
  const { data: coursesData, refetch: refetchCourses } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: async () => {
      // Use /mentor/courses for mentors and /courses for admins
      if (user.role === 'INSTRUCTOR') {
        const res = await api.get('/mentor/courses');
        return res.data.data;
      }
      const res = await api.get('/courses', { params: { limit: 50 } });
      return res.data.data;
    },
  });

  // Auto-select course if specified in URL query parameters
  React.useEffect(() => {
    if (targetCourseId && coursesData && coursesData.length > 0) {
      const matched = coursesData.find((c: any) => c.id === targetCourseId);
      if (matched) {
        setSelectedCourse(matched);
      }
    }
  }, [targetCourseId, coursesData]);

  // 2. Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/courses/categories');
      return res.data.data;
    },
  });

  // 3. Fetch modules & lessons for selected course
  const { data: modules = [], refetch: refetchModules, isLoading: loadingModules } = useQuery<Module[]>({
    queryKey: ['course-modules', selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse?.id) return [];
      const res = await api.get(`/courses/${selectedCourse.id}/modules`);
      return res.data.data;
    },
    enabled: !!selectedCourse?.id,
  });

  // Handle Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);

    try {
      const res = await api.post('/courses', {
        title,
        titleTa: titleTa.trim() || undefined,
        description,
        descriptionTa: descriptionTa.trim() || undefined,
        price: parseFloat(price),
        level,
        categoryId: categoryId || (categories && categories.length > 0 ? categories[0].id : undefined),
        thumbnailUrl: thumbnailUrl || null,
        allowInstallments,
        minInstallmentAmount: allowInstallments ? parseFloat(minInstallmentAmount) : undefined,
        installmentPolicy,
      });
      toast.success('Course Created', 'Course created successfully! Select it below to build curriculum days and video lessons.');
      setTitle('');
      setTitleTa('');
      setDescription('');
      setDescriptionTa('');
      setThumbnailUrl(null);
      setAllowInstallments(false);
      refetchCourses();
      if (res.data?.data) {
        setSelectedCourse(res.data.data);
      }
    } catch (err: any) {
      toast.apiError(err, 'Course creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to save or update module and return its ID
  const saveOrUpdateModule = async (): Promise<string | null> => {
    if (!selectedCourse) return null;
    const finalTitle = moduleTitle.trim() || `Day ${modules.length + 1}`;
    try {
      if (editingModuleId) {
        await api.patch(`/courses/modules/${editingModuleId}`, {
          title: finalTitle,
          titleTa: moduleTitleTa.trim() || undefined,
          order: parseInt(moduleOrder) || 1,
        });
        await refetchModules();
        return editingModuleId;
      } else {
        const res = await api.post(`/courses/${selectedCourse.id}/modules`, {
          title: finalTitle,
          titleTa: moduleTitleTa.trim() || undefined,
          order: parseInt(moduleOrder) || (modules.length + 1),
        });
        const createdId = res.data?.data?.id;
        await refetchModules();
        return createdId || null;
      }
    } catch (err: any) {
      toast.apiError(err, 'Failed to save module');
      return null;
    }
  };

  // Handle Save Module (Create or Edit)
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !moduleTitle) return;

    const savedId = await saveOrUpdateModule();
    if (savedId) {
      toast.success(editingModuleId ? 'Module Updated' : 'Module Created', 'Curriculum day / module saved successfully.');
      setIsModuleModalOpen(false);
      setEditingModuleId(null);
      setModuleTitle('');
      setModuleTitleTa('');
    }
  };

  // Handle Delete Module
  const handleDeleteModule = async (moduleId: string) => {
    const confirmed = await confirm({
      title: 'Delete Module',
      message: 'Are you sure you want to delete this module and all its lessons?',
      confirmText: 'Delete Module',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/courses/modules/${moduleId}`);
      toast.success('Module Deleted', 'The curriculum module and lessons have been removed.');
      refetchModules();
    } catch (err: any) {
      toast.apiError(err, 'Failed to delete module');
    }
  };

  // Handle Save Lesson (Create or Edit)
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetModuleId || !lessonTitle) return;

    try {
      if (editingLessonId) {
        await api.patch(`/courses/lessons/${editingLessonId}`, {
          title: lessonTitle,
          titleTa: lessonTitleTa.trim() || undefined,
          description: lessonDescription,
          descriptionTa: lessonDescriptionTa.trim() || undefined,
          videoUrl: lessonVideoUrl,
          duration: parseInt(lessonDuration) || 0,
          order: parseInt(lessonOrder) || 1,
          isFree: lessonIsFree,
        });
      } else {
        await api.post(`/courses/modules/${targetModuleId}/lessons`, {
          title: lessonTitle,
          titleTa: lessonTitleTa.trim() || undefined,
          description: lessonDescription,
          descriptionTa: lessonDescriptionTa.trim() || undefined,
          videoUrl: lessonVideoUrl,
          duration: parseInt(lessonDuration) || 0,
          order: parseInt(lessonOrder) || 1,
          isFree: lessonIsFree,
        });
      }
      setIsLessonModalOpen(false);
      setEditingLessonId(null);
      setLessonTitle('');
      setLessonTitleTa('');
      setLessonDescription('');
      setLessonDescriptionTa('');
      setLessonVideoUrl('');
      refetchModules();
    } catch (err: any) {
      toast.apiError(err, 'Failed to save lesson');
    }
  };

  // Handle Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    const confirmed = await confirm({
      title: 'Delete Lesson',
      message: 'Are you sure you want to delete this lesson?',
      confirmText: 'Delete Lesson',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/courses/lessons/${lessonId}`);
      toast.success('Lesson Deleted', 'The lesson has been removed.');
      refetchModules();
    } catch (err: any) {
      toast.apiError(err, 'Failed to delete lesson');
    }
  };

  // Handle Uploading a PDF / file for a Lesson Resource
  const handleResourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingResource(true);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResourceFileUrl(res.data.data.fileUrl);
      if (!resourceTitle) {
        setResourceTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      toast.apiError(err, 'Failed to upload resource file');
    } finally {
      setIsUploadingResource(false);
    }
  };

  // Handle Save Resource Attachment
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonId || !resourceTitle || !resourceFileUrl) {
      toast.warning('Missing Information', 'Please provide resource title and file');
      return;
    }

    try {
      await api.post(`/courses/lessons/${targetLessonId}/resources`, {
        title: resourceTitle,
        fileUrl: resourceFileUrl,
        type: resourceType,
      });

      // Also register as course-included LearningMaterial if not already present
      if (selectedCourse?.id) {
        try {
          await api.post('/mentor/materials', {
            title: resourceTitle,
            description: `Course material for ${selectedCourse.title}`,
            fileUrl: resourceFileUrl,
            type: resourceType === 'CODE' ? 'CODE' : resourceType === 'ASSIGNMENT' ? 'PDF' : 'PDF',
            courseId: selectedCourse.id,
            isFree: true,
            isPublished: true,
          });
        } catch {
          // Non-blocking: lesson resource is saved
        }
      }

      setIsResourceModalOpen(false);
      setTargetLessonId(null);
      setResourceTitle('');
      setResourceFileUrl('');
      refetchModules();
    } catch (err: any) {
      toast.apiError(err, 'Failed to attach resource');
    }
  };

  // Handle Delete Resource Attachment
  const handleDeleteResource = async (resourceId: string) => {
    const confirmed = await confirm({
      title: 'Delete Resource Attachment',
      message: 'Are you sure you want to delete this resource attachment?',
      confirmText: 'Delete Resource',
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/courses/lessons/resources/${resourceId}`);
      toast.success('Resource Deleted', 'Resource attachment has been removed.');
      refetchModules();
    } catch (err: any) {
      toast.apiError(err, 'Failed to delete resource');
    }
  };

  // Handle Uploading a Video File directly
  const handleLessonVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingLessonVideo(true);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLessonVideoUrl(res.data.data.fileUrl);
      if (!lessonTitle) {
        setLessonTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      toast.apiError(err, 'Failed to upload video file');
    } finally {
      setIsUploadingLessonVideo(false);
    }
  };

  const myCourses = user.role === 'INSTRUCTOR' ? (coursesData || []) : (coursesData || []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#E4E9F0] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-md border border-[#2563EB]/20">
            Course Studio & Video Management
          </span>
          <h1 className="text-3xl font-extrabold text-[#14233B] mt-2">Course Curriculum & Video Builder</h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Author courses, organize curriculum by Day or Module, configure YouTube video lessons, and attach study resources.
          </p>
        </div>

        {selectedCourse && (
          <button
            onClick={() => setSelectedCourse(null)}
            className="text-xs font-bold text-[#667085] hover:text-[#14233B] bg-white border border-[#E4E9F0] px-3.5 py-2 rounded-xl transition"
          >
            ← View All Courses
          </button>
        )}
      </div>

      {!selectedCourse ? (
        /* COURSE LISTING & CREATION VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Draft Course Form */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E4E9F0] shadow-2xs space-y-5">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-base font-bold text-[#14233B]">Draft New Course</h3>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <ImageUpload
                label="Course Thumbnail / Cover Image"
                value={thumbnailUrl}
                onChange={(url) => setThumbnailUrl(url)}
                helperText="JPG, JPEG, PNG, or WEBP (Max 5MB). Displays on course cards & student dashboard."
                aspectRatio="16/9"
              />

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Course Title (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Programming & Interview Preparation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  பாடத்தின் தலைப்பு (Course Title in Tamil - Optional)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. பைதான் நிரலாக்கம் மற்றும் நேர்காணல் தயாரிப்பு"
                  value={titleTa}
                  onChange={(e) => setTitleTa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Difficulty Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="All Levels">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Domain Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B] focus:outline-none focus:border-[#2563EB]"
                >
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Price (INR)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Installment Options Configuration */}
              <div className="p-3 bg-[#EAF5EA]/50 rounded-xl border border-blue-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#14233B]">Enable Custom / Installment Payment</label>
                  <input
                    type="checkbox"
                    checked={allowInstallments}
                    onChange={(e) => setAllowInstallments(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded cursor-pointer"
                  />
                </div>
                {allowInstallments && (
                  <div className="space-y-2 pt-1 border-t border-blue-200/40">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Minimum Permitted Amount (₹)</label>
                      <input
                        type="number"
                        min="100"
                        value={minInstallmentAmount}
                        onChange={(e) => setMinInstallmentAmount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Access Policy</label>
                      <select
                        value={installmentPolicy}
                        onChange={(e) => setInstallmentPolicy(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="RESTRICTED">Restricted Access (Unlock full content after balance cleared)</option>
                        <option value="FULL_ACCESS">Immediate Full Access</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Course Description (English)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe key syllabus outcomes, target audience, and prerequisites..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  பாட விளக்கம் (Course Description in Tamil - Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="பாடத்தின் முக்கிய குறிக்கோள்கள் மற்றும் பலன்கள்..."
                  value={descriptionTa}
                  onChange={(e) => setDescriptionTa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl shadow-2xs transition-colors"
              >
                {isSubmitting ? 'Creating Course...' : 'Create Course'}
              </button>
            </form>
          </div>

          {/* Existing Courses List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#14233B]">
                Your Managed Courses ({myCourses.length})
              </h3>
              <span className="text-xs text-[#667085]">Click any course to manage its video lessons</span>
            </div>

            <div className="space-y-3">
              {myCourses.map((c: any) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-white border border-[#E4E9F0] shadow-2xs hover:border-[#2563EB]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                        {c.level}
                      </span>
                      <span className="text-xs font-bold text-[#16845B]">₹{c.price}</span>
                      <span className="text-xs text-[#667085]">• {c.status}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#14233B]">{c.title}</h4>
                    <p className="text-xs text-[#667085] line-clamp-1">{c.description}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedCourse(c)}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Manage Curriculum & Videos</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* INTERACTIVE CURRICULUM & VIDEO LESSON BUILDER */
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Active Course Banner */}
          <div className="bg-[#173B73] text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                Editing Course Curriculum
              </span>
              <h2 className="text-xl font-bold">{selectedCourse.title}</h2>
              <p className="text-xs text-blue-100 max-w-xl">{selectedCourse.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingModuleId(null);
                  setModuleTitle(`Day ${modules.length + 1}: Module Title`);
                  setModuleOrder(String(modules.length + 1));
                  setIsModuleModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-white text-[#173B73] hover:bg-[#EAF5EA] text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Add Day / Module</span>
              </button>
            </div>
          </div>

          {/* Curriculum Modules & Lessons */}
          {loadingModules ? (
            <div className="py-20 text-center text-xs font-semibold text-[#667085]">
              Loading course curriculum modules...
            </div>
          ) : modules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E4E9F0] p-12 text-center space-y-4">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#14233B]">No modules or days created yet</h3>
              <p className="text-xs text-[#667085] max-w-md mx-auto">
                Begin structuring your course by adding Days or Modules (e.g. "Day 1: Python Introduction"), then attach YouTube video lessons and PDFs.
              </p>
              <button
                onClick={() => {
                  setEditingModuleId(null);
                  setModuleTitle('Day 1: Introduction');
                  setModuleOrder('1');
                  setIsModuleModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition"
              >
                Add First Module / Day
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {modules.map((mod, modIdx) => (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-[#E4E9F0] shadow-2xs overflow-hidden"
                >
                  {/* Module Header */}
                  <div className="p-4 sm:p-5 bg-[#F6F8FB] border-b border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] font-bold text-xs flex items-center justify-center border border-[#2563EB]/20">
                        {modIdx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#14233B]">{mod.title}</h3>
                        <span className="text-[11px] text-[#667085]">
                          {mod.lessons?.length || 0} Lessons in this module
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setTargetModuleId(mod.id);
                          setEditingLessonId(null);
                          setLessonTitle(`Video ${ (mod.lessons?.length || 0) + 1 }: `);
                          setLessonDescription('');
                          setLessonVideoUrl('');
                          setLessonDuration('15');
                          setLessonOrder(String((mod.lessons?.length || 0) + 1));
                          setLessonIsFree(false);
                          setIsLessonModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition flex items-center gap-1 shadow-2xs"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Video Lesson</span>
                      </button>

                      <button
                        onClick={() => {
                          if (!mod.lessons || mod.lessons.length === 0) {
                            toast.info('Lesson Required', 'Please add a lesson to this module first before attaching study materials.');
                            return;
                          }
                          setTargetLessonId(mod.lessons[0].id);
                          setResourceTitle(`${mod.title} Notes`);
                          setResourceFileUrl('');
                          setResourceType('PDF');
                          setIsResourceModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-bold text-[#16845B] bg-[#EAF7F0] hover:bg-[#D4EEDB] rounded-lg transition flex items-center gap-1 shadow-2xs"
                        title="Attach Study Material (PDF, Notes, Code)"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Attach Study Material</span>
                      </button>

                      {mod.lessons && mod.lessons.length > 0 && (
                        <button
                          onClick={() => {
                            const firstVideo = mod.lessons.find((l: any) => l.videoUrl);
                            if (firstVideo) {
                              setPreviewVideoUrl(firstVideo.videoUrl || null);
                              setPreviewVideoTitle(firstVideo.title);
                            } else {
                              toast.info('No Video Available', 'No video lessons in this module have a video URL configured yet.');
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition flex items-center gap-1 shadow-2xs"
                          title="Preview First Lesson Video"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Lessons</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingModuleId(mod.id);
                          setModuleTitle(mod.title);
                          setModuleOrder(String(mod.order));
                          setIsModuleModalOpen(true);
                        }}
                        className="p-1.5 text-[#667085] hover:text-[#14233B] bg-white border border-[#E4E9F0] rounded-lg"
                        title="Edit Module"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        className="p-1.5 text-[#C03945] hover:text-red-700 bg-white border border-[#E4E9F0] rounded-lg"
                        title="Delete Module"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lessons List inside Module */}
                  <div className="p-4 sm:p-5 space-y-3">
                    {!mod.lessons || mod.lessons.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#98A2B3] italic border border-dashed border-[#E4E9F0] rounded-xl">
                        No video lessons added to this module yet. Click "Add Video Lesson" above.
                      </div>
                    ) : (
                      mod.lessons.map((lesson, lIdx) => (
                        <div
                          key={lesson.id}
                          className="p-4 rounded-xl border border-[#E4E9F0] bg-white hover:border-[#2563EB]/30 transition space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB] shrink-0 mt-0.5">
                                <Video className="w-4 h-4" />
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs sm:text-sm font-bold text-[#14233B]">
                                    {lesson.title}
                                  </h4>
                                  {lesson.isFree ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF7F0] text-[#16845B]">
                                      Free Preview
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                                      Paid Only
                                    </span>
                                  )}
                                  {lesson.duration ? (
                                    <span className="text-[10px] text-[#667085] font-semibold">
                                      {lesson.duration} mins
                                    </span>
                                  ) : null}
                                </div>
                                {lesson.description && (
                                  <p className="text-xs text-[#667085] line-clamp-1 mt-0.5">
                                    {lesson.description}
                                  </p>
                                )}
                                {lesson.videoUrl && (
                                  <p className="text-[11px] text-[#2563EB] font-mono truncate max-w-sm sm:max-w-md mt-0.5">
                                    {lesson.videoUrl}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {lesson.videoUrl && (
                                <button
                                  onClick={() => {
                                    setPreviewVideoUrl(lesson.videoUrl || null);
                                    setPreviewVideoTitle(lesson.title);
                                  }}
                                  className="px-2.5 py-1 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setTargetLessonId(lesson.id);
                                  setResourceTitle('');
                                  setResourceFileUrl('');
                                  setResourceType('PDF');
                                  setIsResourceModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-[#16845B] bg-[#EAF7F0] hover:bg-[#D4EEDB] rounded-lg transition flex items-center gap-1"
                              >
                                <FileUp className="w-3.5 h-3.5" />
                                <span>Attach PDF/Notes</span>
                              </button>

                              <button
                                onClick={() => {
                                  setTargetModuleId(mod.id);
                                  setEditingLessonId(lesson.id);
                                  setLessonTitle(lesson.title);
                                  setLessonDescription(lesson.description || '');
                                  setLessonVideoUrl(lesson.videoUrl || '');
                                  setLessonDuration(String(lesson.duration || 15));
                                  setLessonOrder(String(lesson.order));
                                  setLessonIsFree(Boolean(lesson.isFree));
                                  setIsLessonModalOpen(true);
                                }}
                                className="p-1.5 text-[#667085] hover:text-[#14233B] bg-white border border-[#E4E9F0] rounded-lg"
                                title="Edit Lesson"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1.5 text-[#C03945] hover:text-red-700 bg-white border border-[#E4E9F0] rounded-lg"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Attached Resources */}
                          {lesson.resources && lesson.resources.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] font-bold text-[#667085] uppercase">
                                Attached Materials:
                              </span>
                              {lesson.resources.map((res) => (
                                <div
                                  key={res.id}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F6F8FB] border border-[#E4E9F0] text-[11px] font-semibold text-[#14233B]"
                                >
                                  <FileText className="w-3 h-3 text-[#2563EB]" />
                                  <a
                                    href={res.fileUrl.startsWith('http') ? res.fileUrl : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${res.fileUrl.startsWith('/') ? '' : '/'}${res.fileUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline text-[#2563EB]"
                                    title="View / Download Material"
                                  >
                                    {res.title}
                                  </a>
                                  <span className="text-[10px] text-[#98A2B3]">({res.type})</span>
                                  <button
                                    onClick={() => handleDeleteResource(res.id)}
                                    className="ml-1 text-slate-400 hover:text-red-500"
                                    title="Remove attachment"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT MODULE
      ======================================================== */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">
                {editingModuleId ? 'Edit Day / Module' : 'Add New Day / Module'}
              </h3>
              <button
                onClick={() => setIsModuleModalOpen(false)}
                className="text-[#667085] hover:text-[#14233B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#14233B] mb-1">Day / Module Title (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Day 1: Python Introduction"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  தொகுதி தலைப்பு (Module Title in Tamil - Optional)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. நாள் 1: பைதான் அறிமுகம்"
                  value={moduleTitleTa}
                  onChange={(e) => setModuleTitleTa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Sequence Order</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={moduleOrder}
                  onChange={(e) => setModuleOrder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Description / Learning Objectives</label>
                <textarea
                  rows={2}
                  placeholder="Key concepts, goals, and outcomes for this day..."
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Quick Action Buttons inside Day / Module Form */}
              <div className="pt-2 border-t border-[#EDF0F4] flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      let activeModId = editingModuleId;
                      if (!activeModId) {
                        if (!moduleTitle.trim()) {
                          toast.error('Title Required', 'Please enter a title for this Day / Module before adding a video lesson.');
                          return;
                        }
                        activeModId = await saveOrUpdateModule();
                        if (!activeModId) return;
                        toast.success('Module Created', 'Day / Module saved! Now configure your video lesson.');
                      }
                      setTargetModuleId(activeModId);
                      setEditingLessonId(null);
                      setLessonTitle('Video 1: ');
                      setLessonDescription('');
                      setLessonVideoUrl('');
                      setLessonDuration('15');
                      setLessonOrder('1');
                      setLessonIsFree(false);
                      setIsModuleModalOpen(false);
                      setIsLessonModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#2563EB]/20 transition flex items-center justify-center gap-1.5"
                    title="Save & Add Video Lesson to this Day"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Save & Add Video Lesson</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      let activeModId = editingModuleId;
                      if (!activeModId) {
                        if (!moduleTitle.trim()) {
                          toast.error('Title Required', 'Please enter a title for this Day / Module first.');
                          return;
                        }
                        activeModId = await saveOrUpdateModule();
                        if (!activeModId) return;
                      }
                      const currentMod = modules.find((m) => m.id === activeModId);
                      if (!currentMod || !currentMod.lessons || currentMod.lessons.length === 0) {
                        toast.info('Add Video First', 'Please add at least one video lesson to this Day before attaching study resources.');
                        return;
                      }
                      setTargetLessonId(currentMod.lessons[0].id);
                      setResourceTitle(`${currentMod.title} Notes`);
                      setResourceFileUrl('');
                      setResourceType('PDF');
                      setIsModuleModalOpen(false);
                      setIsResourceModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold text-[#16845B] bg-[#EAF7F0] hover:bg-[#D4EEDB] border border-[#16845B]/20 transition flex items-center justify-center gap-1.5"
                    title="Attach Study Material to this Day"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Add Study Material</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModuleModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F6F8FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] shadow-2xs"
                  >
                    Save Module
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT LESSON (YOUTUBE INTEGRATION)
      ======================================================== */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">
                {editingLessonId ? 'Edit Lesson' : 'Add Video Lesson'}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="text-[#667085] hover:text-[#14233B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#14233B] mb-1">Lesson Title (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Video 1: Introduction to Python"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  பாடம் தலைப்பு (Lesson Title in Tamil - Optional)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. காணொளி 1: பைதான் அறிமுகம்"
                  value={lessonTitleTa}
                  onChange={(e) => setLessonTitleTa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Video Source Options */}
              <div className="space-y-3 p-3.5 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0]">
                <label className="block font-bold text-[#14233B]">
                  Recorded Lesson Video Source
                </label>

                {/* Option A: Direct Video Upload */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#667085] block">
                    Option 1: Upload Video File (MP4, WebM)
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 text-xs font-semibold bg-white border border-[#E4E9F0] text-[#14233B] hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{isUploadingLessonVideo ? 'Uploading Video...' : 'Choose Video File'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/*"
                        className="hidden"
                        onChange={handleLessonVideoUpload}
                        disabled={isUploadingLessonVideo}
                      />
                    </label>
                    {lessonVideoUrl && lessonVideoUrl.includes('/uploads/') && (
                      <span className="text-[11px] font-mono text-[#16845B] truncate max-w-xs">
                        Uploaded: {lessonVideoUrl.split('/').pop()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] uppercase font-bold text-[#98A2B3]">OR</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Option B: Video Link */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#667085] block">
                    Option 2: Video URL (YouTube, Vimeo, or Hosted MP4)
                  </span>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/... or https://domain.com/video.mp4"
                    value={lessonVideoUrl}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] bg-white font-mono text-xs focus:outline-none focus:border-[#2563EB]"
                  />
                  <span className="text-[10px] text-[#667085] block mt-0.5">
                    Supports YouTube, Vimeo, direct MP4/WebM URLs, and server uploads.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#14233B] mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#14233B] mb-1">Sequence Order</label>
                  <input
                    type="number"
                    min="1"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  Lesson Description / Learning Objectives (English)
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of topics covered, code highlights, or key takeaways..."
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">
                  பாடம் விளக்கம் (Lesson Description in Tamil - Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="பாடம் குறித்த முக்கிய விவரங்கள்..."
                  value={lessonDescriptionTa}
                  onChange={(e) => setLessonDescriptionTa(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#F6F8FB] rounded-xl border border-[#E4E9F0]">
                <input
                  type="checkbox"
                  id="lessonIsFree"
                  checked={lessonIsFree}
                  onChange={(e) => setLessonIsFree(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="lessonIsFree" className="text-xs font-semibold text-[#14233B] cursor-pointer">
                  Mark as Free Preview (Allow unpurchased visitors to sample this video)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ATTACH PDF / NOTES TO LESSON
      ======================================================== */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B]">Attach Learning Material / PDF</h3>
              <button
                onClick={() => setIsResourceModalOpen(false)}
                className="text-[#667085] hover:text-[#14233B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#14233B] mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Day 1 Python Cheat Sheet & Exercises"
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Resource Category / Type</label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E9F0] bg-white text-[#14233B] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="PDF">PDF Document / Notes</option>
                  <option value="CODE">Source Code / ZIP</option>
                  <option value="ASSIGNMENT">Assignment / Problem Set</option>
                  <option value="LINK">External Documentation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#14233B] mb-1">Upload File</label>
                <input
                  type="file"
                  onChange={handleResourceFileUpload}
                  className="w-full text-xs text-[#667085] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EFF6FF] file:text-[#2563EB] hover:file:bg-[#DBEAFE] cursor-pointer"
                />
                {isUploadingResource && (
                  <span className="text-[11px] text-[#2563EB] font-semibold block mt-1">
                    Uploading document...
                  </span>
                )}
                {resourceFileUrl && (
                  <span className="text-[11px] text-[#16845B] font-semibold block mt-1">
                    File uploaded: {resourceFileUrl}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F6F8FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingResource || !resourceFileUrl}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#16845B] hover:bg-[#146e4c] disabled:opacity-50"
                >
                  Attach Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: VIDEO PREVIEW
      ======================================================== */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-[#E4E9F0]">
            <div className="flex justify-between items-center border-b border-[#EDF0F4] pb-3">
              <h3 className="text-sm font-bold text-[#14233B] truncate pr-4">
                Video Preview: {previewVideoTitle}
              </h3>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="text-[#667085] hover:text-[#14233B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl bg-black">
              <YouTubePlayer url={previewVideoUrl} title={previewVideoTitle} />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagementPage;
