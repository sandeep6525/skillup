import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MessageSquareQuote,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  BookOpen,
  PlusCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const StudentMyFeedbackView: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editContentRating, setEditContentRating] = useState<number>(5);
  const [editMentorRating, setEditMentorRating] = useState<number>(5);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editComment, setEditComment] = useState<string>('');
  const [editSuggestions, setEditSuggestions] = useState<string>('');

  // Confirmation Modal State for Deletion
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; courseTitle: string } | null>(null);

  // 1. Fetch Student's Submitted Feedbacks
  const { data: myFeedbacks = [], isLoading: loadingFeedbacks } = useQuery({
    queryKey: ['my-student-feedbacks'],
    queryFn: async () => {
      const res = await api.get('/feedback/my');
      return res.data.data;
    },
  });

  // 2. Fetch Enrolled Courses to allow submitting new feedback for another eligible course
  const { data: enrollments = [] } = useQuery({
    queryKey: ['my-student-enrollments-feedback'],
    queryFn: async () => {
      const res = await api.get('/learning/my-learning');
      return res.data.data;
    },
  });

  // Check which enrolled courses haven't been reviewed yet
  const reviewedCourseIds = new Set(myFeedbacks.map((f: any) => f.courseId));
  const unreviewedCourses = enrollments.filter(
    (e: any) => e.course && !reviewedCourseIds.has(e.course.id)
  );

  // Update Feedback Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/feedback/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Feedback Updated', 'Your feedback was updated and resubmitted for admin review.');
      setIsEditing(null);
      queryClient.invalidateQueries({ queryKey: ['my-student-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['course-feedback-detail'] });
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.response?.data?.message || 'Failed to update feedback');
    },
  });

  // Delete Feedback Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/feedback/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Feedback Deleted', 'Your feedback has been deleted.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['my-student-feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['course-feedback-detail'] });
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.response?.data?.message || 'Failed to delete feedback');
    },
  });

  const handleStartEdit = (f: any) => {
    setIsEditing(f.id);
    setEditRating(f.rating);
    setEditContentRating(f.contentRating || 5);
    setEditMentorRating(f.mentorRating || 5);
    setEditTitle(f.title);
    setEditComment(f.comment);
    setEditSuggestions(f.suggestions || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    if (editComment.trim().length < 10) {
      toast.error('Validation Error', 'Feedback must be at least 10 characters long');
      return;
    }
    updateMutation.mutate({
      id: isEditing,
      data: {
        rating: editRating,
        contentRating: editContentRating,
        mentorRating: editMentorRating,
        title: editTitle,
        comment: editComment,
        suggestions: editSuggestions,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Moderation</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] text-[#2563EB] text-xs font-bold tracking-wide uppercase mb-2">
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Student Course Reviews</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#14233B]">My Course Feedback</h2>
          <p className="text-xs text-[#64748B] mt-1">
            Track moderation status, edit previous submissions, and review your learning reflections.
          </p>
        </div>

        {unreviewedCourses.length > 0 && (
          <Link
            to={`/courses/${unreviewedCourses[0].course.slug || unreviewedCourses[0].course.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Review Another Course ({unreviewedCourses.length} pending)</span>
          </Link>
        )}
      </div>

      {/* Main Feedback List */}
      {loadingFeedbacks ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : myFeedbacks.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#EAF5EA] flex items-center justify-center text-[#2563EB]">
            <MessageSquareQuote className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">No feedback submitted yet</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
            You haven't submitted reviews for any of your courses yet. Select an enrolled course below to share your experience.
          </p>
          <div className="mt-5">
            <Link
              to="/dashboard/learning"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Go to My Learning</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {myFeedbacks.map((f: any) => {
            const isItemEditing = isEditing === f.id;

            return (
              <div
                key={f.id}
                className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition"
              >
                {isItemEditing ? (
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h4 className="text-sm font-bold text-[#14233B]">
                        Editing Feedback: {f.courses?.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditing(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Overall Rating (1-5)
                        </label>
                        <select
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 border rounded-xl"
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
                          Content Quality (1-5)
                        </label>
                        <select
                          value={editContentRating}
                          onChange={(e) => setEditContentRating(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 border rounded-xl"
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
                          Mentor Teaching (1-5)
                        </label>
                        <select
                          value={editMentorRating}
                          onChange={(e) => setEditMentorRating(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 border rounded-xl"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">Review Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Written Feedback</label>
                      <textarea
                        rows={3}
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Suggestions for Improvement (Optional)
                      </label>
                      <input
                        type="text"
                        value={editSuggestions}
                        onChange={(e) => setEditSuggestions(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(null)}
                        className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="px-4 py-2 bg-[#2563EB] text-white rounded-xl text-xs font-bold hover:bg-[#1D4ED8]"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save & Resubmit'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Top Row: Course info, Status, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <Link
                          to={`/courses/${f.courses?.slug || f.courseId}`}
                          className="text-xs font-extrabold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 uppercase tracking-tight"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{f.courses?.title || 'Enrolled Course'}</span>
                        </Link>
                        <h4 className="text-base font-bold text-[#14233B] mt-0.5">{f.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {getStatusBadge(f.status)}

                        {f.status === 'APPROVED' && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              f.isPublished
                                ? 'bg-[#EAF5EA] text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                            title={
                              f.isPublished
                                ? 'Visible on SkillUp homepage'
                                : 'Approved for course page, not featured on homepage'
                            }
                          >
                            {f.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{f.isPublished ? 'Live on Homepage' : 'Course Page Only'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ratings Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block">Overall Rating</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-black text-slate-800 ml-1">{f.rating}/5</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block">Course Content</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                          {f.contentRating || f.rating} of 5 Stars
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 block">Mentor Teaching</span>
                        <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                          {f.mentorRating || f.rating} of 5 Stars
                        </span>
                      </div>
                    </div>

                    {/* Written Comment */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                      "{f.comment}"
                    </p>

                    {/* Suggestions if any */}
                    {f.suggestions && (
                      <div className="text-xs text-slate-600 bg-[#EAF5EA]/50 p-3 rounded-xl border border-blue-100">
                        <strong className="text-blue-900 block mb-0.5">Your Improvement Suggestion:</strong>
                        {f.suggestions}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>Submitted on {new Date(f.createdAt).toLocaleDateString()}</span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(f)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#55B957]" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: f.id, courseTitle: f.courses?.title || 'course' })}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Eligible Unreviewed Courses Card */}
      {unreviewedCourses.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#14233B] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Courses Awaiting Your Feedback</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unreviewedCourses.map((e: any) => (
              <div
                key={e.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#2563EB] transition flex items-center justify-between gap-3 bg-slate-50/50"
              >
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{e.course.title}</h4>
                  <span className="text-[11px] text-slate-500">Progress: {e.progress || 0}%</span>
                </div>
                <Link
                  to={`/courses/${e.course.slug || e.course.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[11px] font-bold hover:bg-[#1D4ED8] transition shrink-0"
                >
                  Write Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Delete Feedback?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure you want to permanently delete your feedback for{' '}
                <strong className="text-slate-900">{deleteTarget.courseTitle}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
