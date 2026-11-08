import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Bell, LifeBuoy, CheckCircle2, MessageSquare, Send, Trash2, CheckCheck } from 'lucide-react';
import { useToast, useConfirm } from '../context/ToastContext';

export const NotificationsSupportPage: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
  });

  const { data: tickets, refetch: refetchTickets } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await api.get('/tickets/my');
      return res.data.data;
    },
  });

  const syncNotificationQueries = () => {
    refetchNotifs();
    queryClient.invalidateQueries({ queryKey: ['navbar-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['student-portal-notifications'] });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read');
      syncNotificationQueries();
      toast.success('Marked as Read', 'All notifications have been marked as read.');
    } catch {
      toast.error('Error', 'Failed to mark notifications as read.');
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      syncNotificationQueries();
      toast.success('Deleted', 'Notification removed.');
    } catch {
      toast.error('Error', 'Failed to delete notification.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!notifications || notifications.length === 0) return;
    const confirmed = await confirm({
      title: 'Clear All Notifications',
      message: 'Are you sure you want to permanently delete all notifications? This action cannot be undone.',
      confirmText: 'Clear All',
      isDestructive: true,
    });
    if (!confirmed) return;

    setIsClearingAll(true);
    try {
      await api.delete('/notifications');
      syncNotificationQueries();
      toast.success('Notifications Cleared', 'All notifications have been removed.');
    } catch (err: any) {
      toast.apiError(err, 'Failed to Clear Notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setIsSubmitting(true);

    try {
      await api.post('/tickets', { subject, message, priority: 'MEDIUM' });
      toast.success('Ticket Submitted', 'Our operations team will respond promptly.');
      setSubject('');
      setMessage('');
      refetchTickets();
    } catch (err: any) {
      toast.error('Ticket Failed', err.response?.data?.error?.message || 'Ticket creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#55B957]">Communication Center</span>
        <h1 className="text-3xl font-extrabold text-indigo-950 mt-1">Notifications & Technical Support</h1>
        <p className="text-sm text-slate-500 mt-1">
          Stay updated on session reminders, system announcements, and file support tickets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Notifications */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#55B957]" />
              <h2 className="text-xl font-bold text-indigo-950">In-App Notifications</h2>
              {notifications && notifications.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#EAF5EA] text-[#55B957]">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {notifications && notifications.some((n: any) => !n.isRead) && (
                <button
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#55B957] hover:text-indigo-800 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications && notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                  title="Delete all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No notifications at the moment</p>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3 group">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-indigo-950 truncate">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#55B957] shrink-0" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 break-words">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteNotification(n.id, e)}
                    disabled={deletingId === n.id}
                    title="Delete notification"
                    aria-label={`Delete notification ${n.title}`}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Support Tickets */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#55B957]" />
            <h2 className="text-xl font-bold text-indigo-950">Raise Support Ticket</h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Issue Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Video player playback latency or billing inquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details about the issue you are experiencing..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#55B957]/30 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r bg-[#55B957] hover:bg-[#46a548]  rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}</span>
              </button>
            </form>

            {/* Existing tickets */}
            {tickets && tickets.length > 0 && (
              <div className="pt-6 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-950 uppercase">My Open Tickets:</h4>
                <div className="space-y-2">
                  {tickets.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl bg-[#EAF5EA]/50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{t.subject}</span>
                        <span className="text-[10px] text-slate-400 block">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#46a548] border border-[#55B957]/30">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

