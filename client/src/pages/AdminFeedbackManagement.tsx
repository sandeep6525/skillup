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
  Trash2,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  User,
  Award,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export const AdminFeedbackManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'MENTOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Detail Modal & Delete Confirmation Modal State
  const [activeDetail, setActiveDetail] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; reviewer: string } | null>(null);

  // 1. Fetch Real Database Analytics Metrics
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['admin-feedback-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/feedback/analytics');
      return res.data.data;
    },
  });

  // 2. Fetch Feedback List with Filters & Pagination
  const { data: feedbackData, isLoading: loadingList } = useQuery({
    queryKey: ['admin-feedbacks-list', search, roleFilter, statusFilter, ratingFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (ratingFilter > 0) params.append('rating', String(ratingFilter));

      const res = await api.get(`/admin/feedback?${params.toString()}`);
      return res.data;
    },
  });

  const feedbacks = feedbackData?.data || [];
  const meta = feedbackData?.meta || { total: 0, totalPages: 1 };

  // Status Update Mutation (Approve / Reject)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, isPublished }: { id: string; status: string; isPublished?: boolean }) => {
      const res = await api.patch(`/admin/feedback/${id}/status`, { status, isPublished });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Status Updated', data.message || 'Status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['public-feedback-homepage'] });
      if (activeDetail && activeDetail.id === data.data.id) {
        setActiveDetail(data.data);
      }
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.response?.data?.message || 'Failed to update status');
    },
  });

  // Toggle Homepage Visibility Mutation
  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await api.patch(`/admin/feedback/${id}/publish`, { isPublished });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Visibility Updated', data.message || 'Homepage visibility toggled');
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['public-feedback-homepage'] });
      if (activeDetail && activeDetail.id === data.data.id) {
        setActiveDetail(data.data);
      }
    },
    onError: (err: any) => {
      toast.error('Toggle Failed', err.response?.data?.message || 'Failed to toggle homepage visibility');
    },
  });

  // Delete Feedback Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/feedback/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Feedback Deleted', 'Feedback permanently deleted and action recorded in audit log.');
      setDeleteTarget(null);
      if (activeDetail && activeDetail.id === deleteTarget?.id) {
        setActiveDetail(null);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['public-feedback-homepage'] });
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.response?.data?.message || 'Failed to delete feedback');
    },
  });

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
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 8 Telemetry Cards: Direct DB Aggregation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Submissions</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {loadingAnalytics ? '...' : analytics?.totalFeedback ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {loadingAnalytics ? '...' : analytics?.pendingFeedback ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Approved</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {loadingAnalytics ? '...' : analytics?.approvedFeedback ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Rejected</span>
          <span className="text-xl font-black text-rose-600 mt-1 block">
            {loadingAnalytics ? '...' : analytics?.rejectedFeedback ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Students</span>
          <span className="text-xl font-black text-[#55B957] mt-1 block">
            {loadingAnalytics ? '...' : analytics?.studentFeedbackCount ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#55B957]/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#46a548] uppercase tracking-wider block">Mentors</span>
          <span className="text-xl font-black text-[#55B957] mt-1 block">
            {loadingAnalytics ? '...' : analytics?.mentorFeedbackCount ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Avg Student ★</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {loadingAnalytics ? '...' : (analytics?.avgStudentRating ? `${analytics.avgStudentRating}★` : '0.0★')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Avg Mentor ★</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {loadingAnalytics ? '...' : (analytics?.avgMentorRating ? `${analytics.avgMentorRating}★` : '0.0★')}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by reviewer, email, title, course..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as any);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="MENTOR">Mentors</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Moderation</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value={0}>All Ratings</option>
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-900">{feedbacks.length}</span> of{' '}
          <span className="font-bold text-slate-900">{meta.total}</span> entries
        </div>
      </div>

      {/* Admin Feedback Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[#475467] font-bold">
                <th className="py-3 px-4">Feedback ID</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Title & Comment</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Homepage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading database feedbacks...
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center">
                    <MessageSquareQuote className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No feedback submissions found</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Submissions from students and faculty will appear here for review and moderation.
                    </p>
                  </td>
                </tr>
              ) : (
                feedbacks.map((f: any) => {
                  const isMentor = f.feedbackType === 'MENTOR';
                  const reviewerName = f.users?.name || 'Anonymous';
                  const reviewerEmail = f.users?.email || 'N/A';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-medium">
                        {f.id.length > 12 ? `${f.id.substring(0, 10)}...` : f.id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[140px]">{reviewerName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{reviewerEmail}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isMentor
                              ? 'bg-[#EAF5EA] text-[#46a548] border border-[#55B957]/30'
                              : 'bg-[#EAF5EA] text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isMentor ? 'Mentor' : 'Student'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-[150px] truncate" title={f.courses?.title}>
                        {f.courses?.title || 'Unknown Course'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{f.rating}.0</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate">{f.title}</div>
                        <div className="text-[11px] text-slate-500 truncate italic">"{f.comment}"</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(f.status)}</td>

                      <td className="py-3.5 px-4">
                        {f.status === 'APPROVED' ? (
                          <button
                            type="button"
                            onClick={() =>
                              publishMutation.mutate({
                                id: f.id,
                                isPublished: !f.isPublished,
                              })
                            }
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                              f.isPublished
                                ? 'bg-[#EAF5EA] text-blue-700 hover:bg-blue-100 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={f.isPublished ? 'Click to hide from homepage' : 'Click to feature on homepage'}
                          >
                            {f.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{f.isPublished ? 'Published' : 'Hidden'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not Approved</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setActiveDetail(f)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="View Full Feedback"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Approve button if not already approved */}
                          {f.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: f.id, status: 'APPROVED', isPublished: true })}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                              title="Approve & Publish"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Reject button if not already rejected */}
                          {f.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: f.id, status: 'REJECTED' })}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                              title="Reject Feedback"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Feedback */}
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                id: f.id,
                                title: f.title,
                                reviewer: reviewerName,
                              })
                            }
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                            title="Delete Feedback Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 text-xs">
            <span className="font-semibold text-slate-500">
              Page {page} of {meta.totalPages} ({meta.total} records)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    activeDetail.feedbackType === 'MENTOR'
                      ? 'bg-[#EAF5EA] text-[#46a548] border border-[#55B957]/30'
                      : 'bg-[#EAF5EA] text-blue-700 border border-blue-200'
                  }`}
                >
                  {activeDetail.feedbackType === 'MENTOR' ? 'Mentor Feedback' : 'Student Feedback'}
                </span>
                {getStatusBadge(activeDetail.status)}
              </div>
              <button
                type="button"
                onClick={() => setActiveDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block font-semibold">Course:</span>
                <span className="text-sm font-bold text-slate-900">{activeDetail.courses?.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Reviewer Name:</span>
                  <span className="font-bold text-slate-900">{activeDetail.users?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reviewer Email:</span>
                  <span className="font-bold text-slate-900">{activeDetail.users?.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-slate-500 block">Overall Rating</span>
                  <span className="text-sm font-black text-amber-500">{activeDetail.rating} / 5</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Course Content</span>
                  <span className="text-sm font-black text-slate-800">{activeDetail.contentRating || 5} / 5</span>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    {activeDetail.feedbackType === 'MENTOR' ? 'Live Experience' : 'Mentor Teaching'}
                  </span>
                  <span className="text-sm font-black text-slate-800">{activeDetail.mentorRating || 5} / 5</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Title:</span>
                <h4 className="text-sm font-bold text-slate-900">{activeDetail.title}</h4>
              </div>

              <div>
                <span className="text-slate-500 block font-semibold mb-0.5">Written Feedback:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  "{activeDetail.comment}"
                </p>
              </div>

              {activeDetail.suggestions && (
                <div>
                  <span className="text-slate-500 block font-semibold mb-0.5">Improvement Suggestions:</span>
                  <p className="text-slate-700 bg-[#EAF5EA]/50 p-3 rounded-xl border border-blue-100">
                    {activeDetail.suggestions}
                  </p>
                </div>
              )}
            </div>

            {/* Moderation Controls in Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                {activeDetail.status !== 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: activeDetail.id, status: 'APPROVED', isPublished: true })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve & Feature
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      publishMutation.mutate({
                        id: activeDetail.id,
                        isPublished: !activeDetail.isPublished,
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      activeDetail.isPublished
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-[#55B957] text-white hover:bg-[#46a548]'
                    }`}
                  >
                    {activeDetail.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{activeDetail.isPublished ? 'Hide from Homepage' : 'Publish to Homepage'}</span>
                  </button>
                )}

                {activeDetail.status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ id: activeDetail.id, status: 'REJECTED' })}
                    className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteTarget({
                    id: activeDetail.id,
                    title: activeDetail.title,
                    reviewer: activeDetail.users?.name,
                  });
                }}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
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
              <h3 className="text-base font-bold text-slate-900">Delete Feedback Record?</h3>
              <p className="text-xs text-slate-600 mt-1">
                You are about to delete feedback submitted by <strong className="text-slate-900">{deleteTarget.reviewer}</strong>{' '}
                for <strong className="text-slate-900">{deleteTarget.title}</strong>.
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                This action only deletes the feedback record and leaves the student account, course, and payments intact.
                It will be permanently logged in the Admin Audit Trail.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
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

