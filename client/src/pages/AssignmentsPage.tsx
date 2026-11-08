import { useToast } from '../context/ToastContext';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { FileText, Calendar, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const toast = useToast();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments-page'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.data;
    },
  });

  const handleSubmitAssignment = async (assignmentId: string) => {
    const content = window.prompt('Enter your solution description, GitHub URL, or deployment link:');
    if (!content) return;

    try {
      await api.post(`/assignments/${assignmentId}/submit`, {
        content,
        fileUrl: content.startsWith('http') ? content : undefined,
      });
      toast.success('Assignment Submitted', 'Assignment submitted successfully for mentor review!');
      window.location.reload();
    } catch (err: any) {
      toast.apiError(err, 'Submission failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#55B957]">Practical Assessments</span>
        <h1 className="text-3xl font-extrabold text-indigo-950 mt-1">Assignments & Capstone Projects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete hands-on engineering challenges to reinforce learning and earn accreditation.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-[#55B957] mx-auto flex items-center justify-center">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-indigo-950">No assignments active right now</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once enrolled in courses, your instructors and mentors will issue course assignments here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {assignments.map((item: any) => {
            const submission = item.submissions && item.submissions.length > 0 ? item.submissions[0] : null;

            return (
              <div
                key={item.id}
                className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold bg-[#EAF5EA] text-[#46a548] rounded-md">
                      {item.course?.title}
                    </span>
                    <span className="text-xs font-bold text-indigo-950">{item.totalPoints} Points</span>
                  </div>

                  <h3 className="text-xl font-bold text-indigo-950">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{item.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#55B957]" />
                      <span>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Self-paced'}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  {submission ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-right space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submitted ({submission.status})</span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        On: {new Date(submission.submittedAt).toLocaleDateString()}
                      </span>
                      {submission.grade && (
                        <span className="text-xs font-bold text-indigo-950 block">Score: {submission.grade}/{item.totalPoints}</span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubmitAssignment(item.id)}
                      className="px-6 py-3 text-xs font-bold text-white bg-gradient-to-r bg-[#55B957] hover:bg-[#46a548]  rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Submit Solution</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

