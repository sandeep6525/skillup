import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageSquareQuote,
  Filter,
  Search,
  BookOpen,
  User,
  Award,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export const AllFeedbackPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'STUDENT' | 'MENTOR'>('ALL');
  const [selectedRating, setSelectedRating] = useState<number | 0>(0);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 9;

  // 1. Fetch available published courses for filtering
  const { data: courses = [] } = useQuery({
    queryKey: ['feedback-courses-list'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data.data;
    },
  });

  // 2. Fetch approved feedbacks with filters and pagination
  const { data: feedbackResponse, isLoading } = useQuery({
    queryKey: ['all-feedback-page', selectedRole, selectedRating, selectedCourse, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedRating > 0) params.append('rating', String(selectedRating));
      if (selectedCourse) params.append('courseId', selectedCourse);

      const res = await api.get(`/feedback/public?${params.toString()}`);
      return res.data;
    },
  });

  const feedbacks = feedbackResponse?.data || [];
  const meta = feedbackResponse?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#173B73] via-[#1E4E96] to-[#2563EB] rounded-3xl p-8 sm:p-12 text-white shadow-lg relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-100 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>Learner & Mentor Registry</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Community Feedback & Ratings
            </h1>
            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Explore authentic reviews, transparent course ratings, and real learning journeys submitted by enrolled students and faculty mentors.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Filter Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {(['ALL', 'STUDENT', 'MENTOR'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer capitalize ${
                    selectedRole === role
                      ? 'bg-white text-[#2563EB] shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role === 'ALL' ? 'All Roles' : `${role.toLowerCase()}s`}
                </button>
              ))}
            </div>

            {/* Course Filter Dropdown */}
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            >
              <option value="">All Courses</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Rating Filter Dropdown */}
            <select
              value={selectedRating}
              onChange={(e) => {
                setSelectedRating(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            >
              <option value={0}>All Star Ratings</option>
              <option value={5}>★★★★★ (5 Stars)</option>
              <option value={4}>★★★★☆ (4 Stars)</option>
              <option value={3}>★★★☆☆ (3 Stars)</option>
              <option value={2}>★★☆☆☆ (2 Stars)</option>
              <option value={1}>★☆☆☆☆ (1 Star)</option>
            </select>
          </div>

          <div className="text-xs font-semibold text-[#64748B]">
            Showing <span className="font-bold text-[#14233B]">{feedbacks.length}</span> of{' '}
            <span className="font-bold text-[#14233B]">{meta.total}</span> approved reviews
          </div>
        </div>

        {/* Reviews Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="p-6 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-16 bg-slate-100 rounded"></div>
                <div className="h-10 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white rounded-3xl border border-[#E2E8F0] shadow-xs">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2563EB]">
              <MessageSquareQuote className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#14233B]">No feedback matching your filters</h3>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mt-1">
              Feedback from our learners and mentors will appear here as soon as approved by administrators.
            </p>
            {(selectedRole !== 'ALL' || selectedRating > 0 || selectedCourse) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('ALL');
                  setSelectedRating(0);
                  setSelectedCourse('');
                  setPage(1);
                }}
                className="mt-5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#14233B] rounded-xl transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedbacks.map((f: any) => {
              const isMentor = f.feedbackType === 'MENTOR';
              const courseTitle = f.courses?.title || 'SkillUp Course';
              const reviewerName = f.users?.name || (isMentor ? 'Assigned Mentor' : 'Enrolled Student');
              const reviewerAvatar = f.users?.avatarUrl;
              const subtitle = isMentor
                ? (f.users?.mentorProfile?.expertise || f.users?.title || 'Mentor / Instructor')
                : 'Verified Student';

              return (
                <div
                  key={f.id}
                  className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                          isMentor
                            ? 'bg-[#EAF5EA] text-[#4ea849] border border-[#5DBA58]/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isMentor ? <Award className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        <span>{isMentor ? 'Mentor Feedback' : 'Student Review'}</span>
                      </span>

                      <div className="flex items-center gap-0.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-black text-[#14233B] ml-1">
                          {Number(f.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Link
                        to={`/courses/${f.courses?.slug || f.courseId}`}
                        className="text-xs font-extrabold text-[#2563EB] hover:text-[#1D4ED8] tracking-tight uppercase flex items-center gap-1 line-clamp-1 group"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0 group-hover:scale-105 transition" />
                        <span className="truncate">{courseTitle}</span>
                      </Link>
                      <h3 className="text-sm font-bold text-[#14233B] mt-1.5 line-clamp-1">{f.title}</h3>
                    </div>

                    <p className="text-xs text-[#475467] leading-relaxed line-clamp-4 italic">
                      "{f.comment}"
                    </p>

                    {f.suggestions && (
                      <div className="pt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-0.5">Key Suggestion:</span>
                        {f.suggestions}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-4 mt-5 border-t border-[#EDF2F7]">
                    {reviewerAvatar ? (
                      <img
                        src={reviewerAvatar}
                        alt={reviewerName}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                        {reviewerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-[#14233B] truncate">{reviewerName}</h4>
                      <p className="text-[11px] text-[#64748B] font-medium truncate">{subtitle}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-bold text-slate-600 px-3">
              Page {page} of {meta.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


