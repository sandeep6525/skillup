import { useToast } from '../context/ToastContext';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { YouTubePlayer } from '../components/YouTubePlayer';
import {
  PlayCircle,
  CheckCircle,
  Download,
  ArrowLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const ClassroomPlayerPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['classroom', slug],
    queryFn: async () => {
      const res = await api.get(`/courses/${slug}`);
      return res.data.data;
    },
  });

  // Flat list of lessons across all modules / days
  const allLessons: any[] = course?.modules?.flatMap((m: any) =>
    (m.lessons || []).map((l: any) => ({
      ...l,
      displayTitle: (language === 'ta' && l.titleTa) ? l.titleTa : l.title,
      moduleTitle: (language === 'ta' && m.titleTa) ? m.titleTa : m.title,
    }))
  ) || [];

  const currentLessonId = selectedLessonId || (allLessons.length > 0 ? allLessons[0].id : null);
  const currentLessonIndex = allLessons.findIndex((l: any) => l.id === currentLessonId);

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
    ? allLessons[currentLessonIndex + 1]
    : null;

  const { data: lessonData } = useQuery({
    queryKey: ['lesson-stream', currentLessonId],
    enabled: !!currentLessonId,
    queryFn: async () => {
      const res = await api.get(`/learning/lessons/${currentLessonId}`);
      return res.data.data;
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/learning/lessons/${currentLessonId}/progress`, {
        isCompleted: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-stream', currentLessonId] });
      queryClient.invalidateQueries({ queryKey: ['classroom', slug] });
      queryClient.invalidateQueries({ queryKey: ['my-courses'] });
    },
  });

  const claimCertificateMutation = useMutation({
    mutationFn: async () => {
      return api.post('/certificates/claim', { courseId: course.id });
    },
    onSuccess: () => {
      toast.success('Certificate Earned', '🎉 Congratulations! Certificate earned. Access it under your Certificates tab.');
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Could not claim certificate');
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate course completion progress
  const totalLessonsCount = allLessons.length;
  const activeFallbackLesson = allLessons.find((l) => l.id === currentLessonId);
  const activeLesson = {
    ...activeFallbackLesson,
    ...(lessonData?.lesson || {}),
    displayTitle: lessonData?.lesson?.title || activeFallbackLesson?.displayTitle || activeFallbackLesson?.title,
    moduleTitle: activeFallbackLesson?.moduleTitle || lessonData?.lesson?.module?.title || 'Current Day / Module',
    duration: lessonData?.lesson?.duration ?? activeFallbackLesson?.duration ?? 0,
    videoUrl: lessonData?.lesson?.videoUrl || activeFallbackLesson?.videoUrl,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            to="/dashboard"
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
            title="Return to Student Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
              {language === 'ta' && course?.titleTa ? course.titleTa : course?.title}
            </h1>
            <span className="text-[11px] text-[#4779C7] truncate block">
              {activeLesson?.displayTitle || activeLesson?.title || 'Interactive Lesson Viewer'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => claimCertificateMutation.mutate()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/40 hover:bg-[#2563EB]/40 transition-colors flex items-center gap-1.5"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Claim Certificate</span>
          </button>
        </div>
      </header>

      {/* Main Learning Hub */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Video Player & Controls & Resources */}
        <div className="flex-1 flex flex-col bg-black overflow-y-auto">
          {/* Embedded YouTube / Video Player */}
          <div className="relative aspect-video max-h-[60vh] w-full bg-slate-900 flex items-center justify-center">
            {activeLesson?.videoUrl ? (
              <YouTubePlayer
                url={activeLesson.videoUrl}
                title={activeLesson.displayTitle || activeLesson.title}
                watermarkText={user ? `${user.name || 'Student'} • ${user.email}` : undefined}
                enableAntiDownload={true}
              />
            ) : (
              <div className="text-center p-8 space-y-2">
                <PlayCircle className="w-14 h-14 text-slate-600 mx-auto" />
                <p className="text-slate-300 text-sm font-semibold">No Video Stream Assigned</p>
                <p className="text-slate-500 text-xs">Instructor has attached reading resources for this lesson.</p>
              </div>
            )}
          </div>

          {/* Navigation Controls & Completion Button */}
          <div className="p-4 sm:p-6 bg-slate-900/90 border-t border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#2563EB] bg-[#EFF6FF]/10 px-2.5 py-0.5 rounded border border-[#2563EB]/30">
                  {activeLesson?.moduleTitle || 'Current Day / Module'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">
                  {activeLesson?.displayTitle || activeLesson?.title}
                </h2>
                {activeLesson?.duration > 0 && (
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Duration: {activeLesson.duration} minutes</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => markCompleteMutation.mutate()}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                    lessonData?.progress?.isCompleted
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#2563EB] hover:bg-blue-600 text-white shadow-md'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{lessonData?.progress?.isCompleted ? 'Completed' : 'Mark as Complete'}</span>
                </button>
              </div>
            </div>

            {/* Previous & Next Lesson Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <button
                disabled={!prevLesson}
                onClick={() => prevLesson && setSelectedLessonId(prevLesson.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  prevLesson
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Lesson</span>
              </button>

              <button
                disabled={!nextLesson}
                onClick={() => nextLesson && setSelectedLessonId(nextLesson.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                  nextLesson
                    ? 'text-white bg-[#173B73] hover:bg-[#14233B]'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <span>Next Lesson</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Description & Learning Objectives */}
            {activeLesson?.description && (
              <div className="pt-2 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Lesson Overview & Notes</span>
                </h4>
                <p className="whitespace-pre-line">{activeLesson.description}</p>
              </div>
            )}

            {/* Lesson Resources / Attached PDFs */}
            {activeLesson?.resources && activeLesson.resources.length > 0 && (
              <div className="pt-2 space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Downloadable Supporting Notes & Materials</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeLesson.resources.map((res: any) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate">{res.title}</span>
                        <span className="text-[10px] text-slate-400 block uppercase">{res.fileType || 'PDF / Notes'}</span>
                      </div>

                      <a
                        href={res.fileUrl.startsWith('http') ? res.fileUrl : `${api.defaults.baseURL || ''}/learning/resources/${res.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white transition shrink-0"
                        title="Download Note"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Course Curriculum Days & Modules Sidebar */}
        <div className="w-full lg:w-96 border-l border-slate-800 bg-slate-900 overflow-y-auto max-h-[85vh] flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
              Course Syllabus ({totalLessonsCount} Lessons)
            </h3>
          </div>

          <div className="divide-y divide-slate-800 flex-1 overflow-y-auto">
            {course?.modules?.map((mod: any, mIdx: number) => (
              <div key={mod.id} className="py-2">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-950/60 flex items-center justify-between">
                  <span>Day {mIdx + 1}: {(language === 'ta' && mod.titleTa) ? mod.titleTa : mod.title}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{mod.lessons?.length || 0} items</span>
                </div>

                <div className="divide-y divide-slate-800/40">
                  {mod.lessons?.map((l: any, lIdx: number) => {
                    const isSelected = l.id === currentLessonId;
                    const itemTitle = (language === 'ta' && l.titleTa) ? l.titleTa : l.title;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setSelectedLessonId(l.id)}
                        className={`w-full text-left p-3.5 px-4 text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-[#1E293B] text-[#93C5FD] font-bold border-l-4 border-[#2563EB]'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <PlayCircle className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#38BDF8]' : 'text-slate-500'}`} />
                          <span className="truncate">{lIdx + 1}. {itemTitle}</span>
                        </div>
                        {l.duration > 0 && (
                          <span className="text-[10px] text-slate-500 shrink-0">{Math.round(l.duration / 60)}m</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
