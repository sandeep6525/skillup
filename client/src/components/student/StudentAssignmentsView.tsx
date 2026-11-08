import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Upload,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X,
  Send,
  Loader2,
} from 'lucide-react';

interface AssignmentSubmissionModalProps {
  assignment: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  assignment,
  onClose,
  onSuccess,
}) => {
  const [solutionLink, setSolutionLink] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionLink.trim()) {
      setErrorMessage('Please provide a repository link, project URL, or solution notes.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await api.post(`/assignments/${assignment.id}/submit`, {
        content: notes.trim() ? `${solutionLink.trim()}\n\nNotes:\n${notes.trim()}` : solutionLink.trim(),
        fileUrl: solutionLink.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Submission failed. Please check your network and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-2xl w-full max-w-lg p-6 sm:p-7 relative space-y-5">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold">
            <span>{assignment.course?.title || 'Course Module'}</span>
          </div>
          <h3 className="text-lg font-bold text-[#14233B]">{assignment.title}</h3>
          <p className="text-xs text-[#667085]">
            Submit your solution link (e.g. GitHub repo, Vercel/Netlify demo, or PR) for review.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Solution Link / Repository URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={solutionLink}
              onChange={(e) => setSolutionLink(e.target.value)}
              placeholder="https://github.com/your-username/project-repo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Optional Notes / Architectural Summary
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief summary of your implementation, test coverage, or highlights..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !solutionLink.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#173B73] transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Solution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import { useToast } from '../../context/ToastContext';

export const StudentAssignmentsView: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [submittingAssignment, setSubmittingAssignment] = useState<any | null>(null);

  const {
    data: assignments = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['student-portal-assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.data;
    },
  });

  const handleSubmissionSuccess = () => {
    setSubmittingAssignment(null);
    toast.success(
      'Assignment Submitted',
      'Your assignment has been submitted successfully. You can track its status from your dashboard.'
    );
    queryClient.invalidateQueries({ queryKey: ['student-portal-assignments'] });
    queryClient.invalidateQueries({ queryKey: ['my-assignments-overview'] });
    queryClient.invalidateQueries({ queryKey: ['student-dashboard-overview-summary'] });
  };

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Practical Engineering Tasks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            Assignments
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Complete practical lab challenges and capstones to test your real-world development mastery.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error state */}
      {isError ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Failed to load assignments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {(error as any)?.response?.data?.message || 'Could not fetch your enrolled course assignments.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2563EB] hover:bg-[#173B73] transition"
          >
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-36 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-36 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
        </div>
      ) : assignments.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">No assignments active right now</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            When your enrolled course instructors release assignments and capstones, they will appear here.
          </p>
        </div>
      ) : (
        /* Assignment list */
        <div className="space-y-4">
          {assignments.map((item: any) => {
            const isSubmitted = item.submissions && item.submissions.length > 0;
            const submission = isSubmitted ? item.submissions[0] : null;

            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                      {item.course?.title || 'Course Module'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Points: {item.totalPoints} pts
                    </span>
                    <span className="text-xs text-[#667085] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Self-paced'}
                      </span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#14233B]">{item.title}</h3>

                  <p className="text-xs text-[#667085] line-clamp-2">{item.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isSubmitted ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Submitted {submission?.grade ? `(${submission.grade} pts)` : ''}</span>
                      </span>
                      {submission?.feedback && (
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Feedback: {submission.feedback}
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSubmittingAssignment(item)}
                      className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Submit Solution</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {submittingAssignment && (
        <AssignmentSubmissionModal
          assignment={submittingAssignment}
          onClose={() => setSubmittingAssignment(null)}
          onSuccess={handleSubmissionSuccess}
        />
      )}
    </div>
  );
};
export default StudentAssignmentsView;
