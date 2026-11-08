import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageSquareQuote,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Award,
  Send,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

interface CourseFeedbackSectionProps {
  courseId: string;
  courseTitle: string;
  isEnrolled: boolean;
  currentUser: any;
}

export const CourseFeedbackSection: React.FC<CourseFeedbackSectionProps> = ({
  courseId,
  courseTitle,
  isEnrolled,
  currentUser,
}) => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeReviewTab, setActiveReviewTab] = useState<'ALL' | 'STUDENT' | 'MENTOR'>('ALL');

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [contentRating, setContentRating] = useState<number>(5);
  const [mentorRating, setMentorRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [suggestions, setSuggestions] = useState('');

  // Fetch Course-Specific Feedback & Real Database Metrics
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['course-feedback-detail', courseId],
    queryFn: async () => {
      const res = await api.get(`/feedback/course/${courseId}`);
      return res.data.data;
    },
    enabled: Boolean(courseId),
  });

  const stats = feedbackData?.stats || {
    totalReviews: 0,
    studentReviewsCount: 0,
    mentorReviewsCount: 0,
    avgStudentRating: 0,
    avgMentorRating: 0,
  };

  const studentReviews = feedbackData?.studentReviews || [];
  const mentorReviews = feedbackData?.mentorReviews || [];
  const myFeedback = feedbackData?.myFeedback;

  // Filter list by selected tab
  const displayedReviews =
    activeReviewTab === 'STUDENT'
      ? studentReviews
      : activeReviewTab === 'MENTOR'
      ? mentorReviews
      : [...studentReviews, ...mentorReviews];

  // Submit Feedback Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/feedback', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Feedback Submitted', 'Your feedback was submitted successfully and is pending administrator review.');
      setShowSubmitModal(false);
      setTitle('');
      setComment('');
      setSuggestions('');
      queryClient.invalidateQueries({ queryKey: ['course-feedback-detail', courseId] });
      queryClient.invalidateQueries({ queryKey: ['my-student-feedbacks'] });
    },
    onError: (err: any) => {
      toast.error('Submission Failed', err.response?.data?.message || 'Failed to submit feedback');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Authentication Required', 'Please log in to submit feedback');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Validation Error', 'Feedback must be at least 10 characters long');
      return;
    }

    submitMutation.mutate({
      courseId,
      rating,
      contentRating,
      mentorRating,
      title,
      comment,
      suggestions,
    });
  };

  return (
    <div id="course-feedback-reviews-section" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
      {/* Header & Submit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] text-[#2563EB] text-xs font-bold tracking-wide uppercase mb-1.5">
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Course Reviews & Ratings</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-[#14233B]">
            Student & Faculty Feedback
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Verified course ratings and genuine learning reviews from enrolled students and assigned mentors.
          </p>
        </div>

        {/* Action Button: Enrolled student can submit feedback or view status */}
        {currentUser && isEnrolled ? (
          myFeedback ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  myFeedback.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : myFeedback.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {myFeedback.status === 'APPROVED' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : myFeedback.status === 'REJECTED' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>Your Review: {myFeedback.status}</span>
              </span>

              <Link
                to="/dashboard/feedback"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Manage
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Course Feedback</span>
            </button>
          )
        ) : !currentUser ? (
          <Link
            to="/login"
            className="text-xs font-bold text-[#2563EB] bg-[#EAF5EA] hover:bg-blue-100 px-3.5 py-2 rounded-xl transition"
          >
            Log in to submit feedback
          </Link>
        ) : null}
      </div>

      {/* Ratings Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Student Rating Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Student Rating</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {stats.avgStudentRating > 0 ? stats.avgStudentRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(stats.avgStudentRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {stats.studentReviewsCount} verified review{stats.studentReviewsCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/60 flex items-center justify-center text-[#2563EB]">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Mentor Rating Card */}
        <div className="bg-[#EAF5EA]/50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#46a548] uppercase block">Mentor Rating</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">
                {stats.avgMentorRating > 0 ? stats.avgMentorRating.toFixed(1) : '0.0'}
              </span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(stats.avgMentorRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="text-[11px] text-[#55B957] mt-0.5 block">
              {stats.mentorReviewsCount} faculty review{stats.mentorReviewsCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF5EA]/70 flex items-center justify-center text-[#46a548]">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Total Approved Feedback Card */}
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase block">Approved Reviews</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stats.totalReviews}
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">
              100% verified platform data
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        {(['ALL', 'STUDENT', 'MENTOR'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveReviewTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
              activeReviewTab === tab
                ? 'bg-[#173B73] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL'
              ? `All Feedback (${stats.totalReviews})`
              : tab === 'STUDENT'
              ? `Student Reviews (${stats.studentReviewsCount})`
              : `Faculty Reviews (${stats.mentorReviewsCount})`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4 py-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-slate-200 bg-white animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-10 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : displayedReviews.length === 0 ? (
        <div className="text-center py-12 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <MessageSquareQuote className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-700">
            Feedback from our learners and mentors will appear here.
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isEnrolled
              ? 'Be the first enrolled student to submit your review for this course!'
              : 'Enroll in this course to start learning and share your feedback.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReviews.map((f: any) => {
            const isMentor = f.feedbackType === 'MENTOR';
            const reviewerName = f.users?.name || (isMentor ? 'Assigned Mentor' : 'Student');
            const reviewerAvatar = f.users?.avatarUrl;

            return (
              <div
                key={f.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    {reviewerAvatar ? (
                      <img
                        src={reviewerAvatar}
                        alt={reviewerName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#173B73] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                        {reviewerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{reviewerName}</h4>
                      <span className="text-[10px] text-slate-500">
                        {isMentor ? 'Assigned Faculty Mentor' : 'Verified Enrolled Student'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isMentor
                          ? 'bg-[#EAF5EA] text-[#46a548] border border-[#55B957]/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isMentor ? 'Mentor' : 'Student'}
                    </span>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < f.rating ? 'fill-amber-400' : 'text-slate-200'}`}
                        />
                      ))}
                      <span className="text-xs font-black text-slate-800 ml-1">{f.rating}.0</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-900">{f.title}</h5>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed italic">
                    "{f.comment}"
                  </p>
                </div>

                {f.suggestions && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="text-slate-800 block mb-0.5">Suggestion:</strong>
                    {f.suggestions}
                  </div>
                )}

                <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center">
                  <span>Submitted on {new Date(f.createdAt).toLocaleDateString()}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Review
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Submit Course Feedback</h3>
                <p className="text-xs text-slate-500">{courseTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Overall (1-5)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Content (1-5)</label>
                  <select
                    value={contentRating}
                    onChange={(e) => setContentRating(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teaching (1-5)</label>
                  <select
                    value={mentorRating}
                    onChange={(e) => setMentorRating(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-slate-50 font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Star{r > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. In-depth, practical, and highly engaging"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Written Feedback</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your learning experience, video clarity, exercises, and outcomes..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Suggestions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Include additional real-time project examples"
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="px-5 py-2 bg-[#2563EB] text-white rounded-xl font-bold hover:bg-[#1D4ED8] flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitMutation.isPending ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


