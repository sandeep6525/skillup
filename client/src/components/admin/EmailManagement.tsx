import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useToast, useConfirm } from '../../context/ToastContext';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Edit2,
  Play,
  RotateCcw,
  Check,
  X,
  Server,
  FileText,
  Calendar,
  Trash2,
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  htmlBody: string;
  category: string;
  isEnabled: boolean;
  isSystem?: boolean;
  updatedAt: string;
}

interface EmailDeliveryLog {
  id: string;
  recipient: string;
  subject: string;
  templateCode: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
  attempts: number;
  errorMessage: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface SmtpStatus {
  connected: boolean;
  provider: string;
  host: string;
  port: number;
  fromEmail: string;
  fromName: string;
}

export const EmailManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState<'templates' | 'logs' | 'reminders' | 'test'>('templates');

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testTemplateCode, setTestTemplateCode] = useState('STUDENT_WELCOME');
  const [testSuccessMsg, setTestSuccessMsg] = useState('');
  const [testErrorMsg, setTestErrorMsg] = useState('');

  // Edit Template State
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [logStatusFilter, setLogStatusFilter] = useState('ALL');

  // Dry run state for reminders
  const [reminderOutput, setReminderOutput] = useState<any | null>(null);

  // 1. Fetch SMTP Status
  const { data: smtpData, isLoading: isLoadingSmtp, refetch: refetchSmtp } = useQuery<SmtpStatus>({
    queryKey: ['admin-smtp-status'],
    queryFn: async () => {
      const res = await api.get('/admin/email/smtp-status');
      return res.data.data;
    },
  });

  // 2. Fetch Templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['admin-email-templates'],
    queryFn: async () => {
      const res = await api.get('/admin/email/templates');
      return res.data.data;
    },
  });

  // 3. Fetch Delivery Logs
  const { data: logsData, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery<{ logs: EmailDeliveryLog[]; total: number }>({
    queryKey: ['admin-email-logs', logStatusFilter],
    queryFn: async () => {
      const statusParam = logStatusFilter !== 'ALL' ? `?status=${logStatusFilter}` : '';
      const res = await api.get(`/admin/email/logs${statusParam}`);
      return res.data.data;
    },
  });

  // 4. Update Template Mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (payload: { id: string; subject: string; isEnabled: boolean }) => {
      const res = await api.patch(`/admin/email/templates/${payload.id}`, {
        subject: payload.subject,
        isEnabled: payload.isEnabled,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setEditingTemplate(null);
    },
  });

  // 5. Send Test Email Mutation
  const sendTestMutation = useMutation({
    mutationFn: async (payload: { recipientEmail: string; templateCode: string }) => {
      const res = await api.post('/admin/email/test', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setTestSuccessMsg(data.message || 'Test email dispatched successfully!');
      setTestErrorMsg('');
      toast.success(
        'Email Sent Successfully',
        data.message || 'The email has been queued or delivered according to the actual email delivery status.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err.message || 'Failed to dispatch test email';
      setTestErrorMsg(msg);
      setTestSuccessMsg('');
      toast.error('Email Dispatch Failed', msg);
    },
  });

  // 6. Retry Failed Email Mutation
  const retryEmailMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await api.post(`/admin/email/logs/${logId}/retry`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
  });

  // Delete Custom Template Mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/admin/email/templates/${id}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      toast.success('Template Removed', data?.message || 'Email template deleted successfully.');
    },
    onError: (err: any) => {
      toast.apiError(err, 'Failed to delete template');
    },
  });

  // 7. Trigger Payment Reminders Mutation
  const triggerRemindersMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await api.post('/admin/email/reminders/run', { dryRun });
      return res.data;
    },
    onSuccess: (data) => {
      setReminderOutput(data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
  });

  const handleEditClick = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditSubject(template.subject);
    setEditEnabled(template.isEnabled);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      subject: editSubject,
      isEnabled: editEnabled,
    });
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Centralized SMTP Status */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                smtpData?.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#0F172A] text-base">Centralized SMTP Service</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    smtpData?.connected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isLoadingSmtp ? 'Testing...' : smtpData?.connected ? 'Operational & Ready' : 'Connection Error'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Host: <span className="font-mono text-[#0F172A] font-medium">{smtpData?.host || 'smtp.hostinger.com'}:{smtpData?.port || 465}</span> | Sender:{' '}
                <span className="font-mono text-[#0F172A] font-medium">{smtpData?.fromEmail || 'support@tricubedigitalsolutions.com'}</span> ({smtpData?.fromName || 'SkillUp'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchSmtp()}
              className="px-3 py-2 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Test SMTP Ping
            </button>
            <button
              onClick={() => setSubTab('test')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Send Test Email
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('templates')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'templates'
              ? 'bg-[#173B73] text-white'
              : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Email Templates ({templates.length})
        </button>
        <button
          onClick={() => setSubTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'logs'
              ? 'bg-[#173B73] text-white'
              : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Delivery Logs & Retries
        </button>
        <button
          onClick={() => setSubTab('reminders')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'reminders'
              ? 'bg-[#173B73] text-white'
              : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Automated Payment Reminders
        </button>
        <button
          onClick={() => setSubTab('test')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            subTab === 'test'
              ? 'bg-[#173B73] text-white'
              : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Test Dispatcher
        </button>
      </div>

      {/* ========================================================
          SUBTAB 1: EMAIL TEMPLATES
      ======================================================== */}
      {subTab === 'templates' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search templates or subjects..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-[#64748B]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                <option value="ALL">All Categories</option>
                <option value="STUDENT">Student Notifications</option>
                <option value="PAYMENT">Receipts & Billing</option>
                <option value="REMINDER">Installment Reminders</option>
                <option value="MENTOR">Mentor & Instructor</option>
                <option value="AUTH">Authentication & Security</option>
                <option value="CLASS">Live Classes</option>
                <option value="ADMIN">System Alerts</option>
              </select>
            </div>
          </div>

          {/* Templates Grid / Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Template Name & Code</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Configured Subject Line</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {isLoadingTemplates ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#64748B]">
                        Loading email templates...
                      </td>
                    </tr>
                  ) : filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#64748B]">
                        No templates found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((t) => (
                      <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#0F172A]">{t.name}</div>
                          <div className="text-[10px] font-mono text-[#64748B] mt-0.5">{t.code}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-[#334155] max-w-md truncate">{t.subject}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.isEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(t)}
                              className="p-1.5 text-[#2563EB] hover:bg-[#EFF6FF] rounded-md transition-colors cursor-pointer"
                              title="Edit Subject Line & Status"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!t.isSystem && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmed = await confirm({
                                    title: 'Delete Email Template',
                                    message: `Are you sure you want to delete template "${t.name}" (${t.code})? It will no longer execute.`,
                                    confirmText: 'Delete Template',
                                    isDestructive: true,
                                  });
                                  if (confirmed) {
                                    deleteTemplateMutation.mutate(t.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Delete Template"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setTestTemplateCode(t.code);
                                setSubTab('test');
                              }}
                              className="p-1.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-md transition-colors cursor-pointer"
                              title="Test Send"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 2: DELIVERY LOGS & RETRIES
      ======================================================== */}
      {subTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#0F172A]">Filter by Status:</span>
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="ALL">All Statuses</option>
                <option value="SENT">Delivered (SENT)</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <button
              onClick={() => refetchLogs()}
              className="px-3 py-1.5 text-xs font-semibold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Subject / Event</th>
                    <th className="px-5 py-3">Delivery Status</th>
                    <th className="px-5 py-3">Attempts</th>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#64748B]">
                        Loading delivery logs...
                      </td>
                    </tr>
                  ) : !logsData?.logs || logsData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-[#64748B]">
                        No delivery logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    logsData.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[#0F172A]">{log.recipient}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-[#334155]">{log.subject}</div>
                          <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                            {log.templateCode || 'CUSTOM_TRANSMISSION'}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {log.status === 'SENT' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                            {log.status === 'FAILED' && <AlertCircle className="w-3 h-3 text-red-600" />}
                            {log.status}
                          </span>
                          {log.errorMessage && (
                            <div className="text-[10px] text-red-600 mt-1 max-w-xs truncate" title={log.errorMessage}>
                              {log.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[#64748B]">{log.attempts}</td>
                        <td className="px-5 py-3.5 text-[#64748B]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {log.status === 'FAILED' && (
                            <button
                              onClick={() => retryEmailMutation.mutate(log.id)}
                              disabled={retryEmailMutation.isPending}
                              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 3: AUTOMATED PAYMENT REMINDERS
      ======================================================== */}
      {subTab === 'reminders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
            <h3 className="font-bold text-[#0F172A] text-base mb-1">Automated Installment Reminder Engine</h3>
            <p className="text-xs text-[#64748B] mb-5">
              The automated engine scans active course enrollments with real outstanding balances against due date intervals (3 days before, 1 day before, on due date, 3 days overdue, 7 days overdue). Fully settled accounts are automatically excluded, and idempotency keys prevent duplicate reminders.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => triggerRemindersMutation.mutate(true)}
                disabled={triggerRemindersMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                {triggerRemindersMutation.isPending ? 'Analyzing...' : 'Run Dry-Run (Preview Only)'}
              </button>

              <button
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Execute Live Reminders',
                    message: 'Run automated payment reminder scan and dispatch live emails to eligible students?',
                    confirmText: 'Dispatch Reminders',
                    isDestructive: false,
                  });
                  if (confirmed) {
                    triggerRemindersMutation.mutate(false);
                  }
                }}
                disabled={triggerRemindersMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" />
                {triggerRemindersMutation.isPending ? 'Processing...' : 'Execute Live Reminder Scan'}
              </button>
            </div>

            {/* Reminder Output Preview */}
            {reminderOutput && (
              <div className="mt-6 border-t border-[#E2E8F0] pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">
                    <div className="text-[11px] font-bold text-[#64748B]">Total Checked</div>
                    <div className="text-lg font-bold text-[#0F172A]">{reminderOutput.totalChecked}</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-100">
                    <div className="text-[11px] font-bold text-emerald-700">Reminders Triggered</div>
                    <div className="text-lg font-bold text-emerald-800">{reminderOutput.remindersSent}</div>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-100">
                    <div className="text-[11px] font-bold text-blue-700">Fully Settled (Skipped)</div>
                    <div className="text-lg font-bold text-blue-800">{reminderOutput.skippedPaid}</div>
                  </div>
                  <div className="bg-red-50 p-3.5 rounded-lg border border-red-100">
                    <div className="text-[11px] font-bold text-red-700">Errors</div>
                    <div className="text-lg font-bold text-red-800">{reminderOutput.errors}</div>
                  </div>
                </div>

                {reminderOutput.details && reminderOutput.details.length > 0 && (
                  <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] text-[#64748B] font-bold uppercase">
                        <tr>
                          <th className="px-4 py-2">Student Email</th>
                          <th className="px-4 py-2">Course</th>
                          <th className="px-4 py-2">Outstanding Balance</th>
                          <th className="px-4 py-2">Interval</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {reminderOutput.details.map((d: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-2 font-medium">{d.studentEmail}</td>
                            <td className="px-4 py-2">{d.courseTitle}</td>
                            <td className="px-4 py-2 font-bold text-red-600">₹{d.outstandingBalance.toFixed(2)}</td>
                            <td className="px-4 py-2 text-[#64748B]">{d.intervalType}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 4: TEST DISPATCHER
      ======================================================== */}
      {subTab === 'test' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 max-w-xl shadow-xs">
          <h3 className="font-bold text-[#0F172A] text-base mb-1">Send a Live Test Email</h3>
          <p className="text-xs text-[#64748B] mb-5">
            Verify real SMTP email transmission and HTML rendering by sending a branded test notification to any email inbox.
          </p>

          {testSuccessMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              {testSuccessMsg}
            </div>
          )}

          {testErrorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              {testErrorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Recipient Email Address</label>
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="e.g. yourname@domain.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Select Email Template</label>
              <select
                value={testTemplateCode}
                onChange={(e) => setTestTemplateCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB] bg-white"
              >
                <option value="STUDENT_WELCOME">Student Welcome Email</option>
                <option value="COURSE_ENROLLMENT_CONFIRMATION">Course Enrollment Confirmation</option>
                <option value="COURSE_PAYMENT_RECEIPT">Course Payment Receipt</option>
                <option value="MATERIAL_PURCHASE_RECEIPT">Learning Material Purchase Receipt</option>
                <option value="PAYMENT_REMINDER_PENDING">Upcoming Payment Reminder</option>
                <option value="PAYMENT_REMINDER_OVERDUE">Overdue Payment Reminder</option>
                <option value="MENTOR_WELCOME">Mentor Welcome Email</option>
                <option value="MENTOR_COURSE_ASSIGNED">Mentor Course Assignment</option>
                <option value="MENTOR_PAYOUT_STATEMENT">Mentor Compensation Statement</option>
                <option value="LIVE_CLASS_REMINDER">Live Class Schedule Notification</option>
                <option value="CERTIFICATE_ISSUED">Course Certificate Notification</option>
                <option value="ASSIGNMENT_GRADED">Assignment Graded Notification</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!testEmailAddress) {
                  setTestErrorMsg('Please enter a recipient email address.');
                  return;
                }
                sendTestMutation.mutate({
                  recipientEmail: testEmailAddress,
                  templateCode: testTemplateCode,
                });
              }}
              disabled={sendTestMutation.isPending}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sendTestMutation.isPending ? 'Transmitting via SMTP...' : 'Transmit Test Email Now'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT TEMPLATE MODAL
      ======================================================== */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0F172A] text-base">Edit Email Template</h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Template Name</label>
                <input
                  type="text"
                  disabled
                  value={editingTemplate.name}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1">Template Code</label>
                <input
                  type="text"
                  disabled
                  value={editingTemplate.code}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Subject Line</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableTemplateToggle"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="enableTemplateToggle" className="text-xs font-semibold text-[#0F172A]">
                  Enable this notification template
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={updateTemplateMutation.isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer"
                >
                  {updateTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
