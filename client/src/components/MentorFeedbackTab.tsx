import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquareQuote,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  BookOpen,
  Send,
  Sparkles,
  AlertCircle,
  Users,
  Award,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export const MentorFeedbackTab: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [engagementRating, setEngagementRating] = useState<number>(5);
  const [contentRating, setContentRating] = useState<number>(5);
  const [mentorRating, setMentorRating] = useState<number>(5); // Live class experience
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');

  // 1. Fetch assigned courses
  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['mentor-feedback-courses'],
    queryFn: async () => {
      const res = await api.get('/mentor/courses');
      return res.data.data;
    },
  });

  // Automatically select first course if none selected
  React.useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // 2. Fetch mentor's previous feedback submissions
  const { data: myFeedbacks = [], isLoading: loadingFeedbacks } = useQuery({
    queryKey: ['my-mentor-feedbacks'],
    queryFn: async () => {
      const res = await api.get('/feedback/mentor/my');
      return res.data.data;
    },
  });

  // Check if current selected course has already been reviewed
  const existingFeedbackForSelected = myFeedbacks.find((f: any) => f.courseId === selectedCourseId);

  // Submit Feedback Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/feedback/mentor', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Feedback Submitted', 'Mentor feedback submitted successfully for administrator moderation.');
      setTitle('');
      setComment('');
      setSuggestions('');
      queryClient.invalidateQueries({ queryKey: ['my-mentor-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['course-feedback-detail'] });
    },
    onError: (err: any) => {
      toast.error('Submission Failed', err.response?.data?.message || 'Failed to submit mentor feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Validation Error', 'Please select an assigned course');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Validation Error', 'Feedback must be at least 10 characters long');
      return;
    }

    submitMutation.mutate({
      courseId: selectedCourseId,
      rating,
      engagementRating,
      contentRating,
      mentorRating,
      title,
      comment,
      suggestions,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] text-[#46a548] text-xs font-bold tracking-wide uppercase mb-2">
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Faculty Academic Evaluation</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#14233B]">Mentor Course Feedback</h2>
          <p className="text-xs text-[#64748B] mt-1">
            Provide comprehensive assessments of curriculum structure, live class engagement, and cohort learning outcomes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form to submit feedback */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-[#14233B] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#55B957]" />
              <span>Submit Course Feedback</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Only courses assigned to you by administrators are eligible for your mentor review.
            </p>
          </div>

          {loadingCourses ? (
            <div className="py-10 text-center text-xs text-slate-500 animate-pulse">Loading assigned courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">No courses currently assigned to you</p>
              <p className="text-[11px] text-slate-500">Contact platform administrators to assign courses to your faculty account.</p>
            </div>
          ) : existingFeedbackForSelected ? (
            <div className="p-6 bg-[#EAF5EA]/60 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#55B957]" />
                <span>You have already submitted feedback for this course</span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Your submission for <strong>{existingFeedbackForSelected.courses?.title}</strong> is currently on record with status:{' '}
                <strong className="uppercase">{existingFeedbackForSelected.status}</strong>.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Select another assigned course:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border rounded-xl bg-white"
                >
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Assigned Course */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assigned Course <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                >
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2-5. Ratings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Overall Course Rating (1-5)
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''} {r === 5 ? '(Exceptional)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Engagement Rating (1-5)
                  </label>
                  <select
                    value={engagementRating}
                    onChange={(e) => setEngagementRating(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Course Curriculum Rating (1-5)
                  </label>
                  <select
                    value={contentRating}
                    onChange={(e) => setContentRating(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Live Class Experience Rating (1-5)
                  </label>
                  <select
                    value={mentorRating}
                    onChange={(e) => setMentorRating(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border rounded-xl bg-slate-50"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Feedback Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Feedback Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strong cohort attendance and solid homework completion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              {/* 7. Written Feedback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Written Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide your professional observation on student participation, curriculum pacing, and cohort milestones..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              {/* 8. Suggestions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Suggestions for Improvement (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Expand module 3 with 2 additional live debugging sessions"
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="w-full py-3 bg-[#173B73] hover:bg-[#122A52] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitMutation.isPending ? 'Submitting Feedback...' : 'Submit Faculty Feedback'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Previous Submissions List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#14233B] flex items-center justify-between border-b pb-3">
              <span>My Previous Submissions</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">
                {myFeedbacks.length}
              </span>
            </h3>

            {loadingFeedbacks ? (
              <div className="text-center py-8 text-xs text-slate-400 animate-pulse">Loading previous reviews...</div>
            ) : myFeedbacks.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-700">No submissions on record</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Your submitted faculty feedback will be archived here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myFeedbacks.map((f: any) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#2563EB] uppercase truncate max-w-[180px]">
                        {f.courses?.title}
                      </span>
                      {getStatusBadge(f.status)}
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < f.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-800 ml-1">{f.rating}/5</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{f.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 italic">"{f.comment}"</p>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex items-center justify-between">
                      <span>Submitted on {new Date(f.createdAt).toLocaleDateString()}</span>
                      {f.isPublished && (
                        <span className="text-[#55B957] font-bold flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Live
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


