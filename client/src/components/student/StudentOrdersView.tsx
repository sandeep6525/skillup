import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Receipt,
  Download,
} from 'lucide-react';

export const StudentOrdersView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['student-orders-payments'],
    queryFn: async () => {
      const res = await api.get('/payments/history');
      return res.data.data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>COMPLETED</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>PENDING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            <span>REFUNDED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  const filteredPayments = (payments as any[]).filter((p: any) => {
    const title =
      p.course?.title ||
      p.internship?.title ||
      p.material?.title ||
      p.hackathon?.title ||
      'SkillUp Mentorship / Learning Service';
    const matchesSearch =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(search.toLowerCase())) ||
      p.id.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && p.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
          <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Financial Invoices & Payment Ledger</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
          Orders & Payments
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] mt-1">
          Review your verified transaction history, invoices, partial payment installments, and payment statuses.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E4E9F0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, course, or material..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#173B73] text-white'
                  : 'bg-[#F8F9FC] text-[#667085] hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#14233B]">No transaction records found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 leading-relaxed">
              {search || statusFilter !== 'ALL'
                ? 'No orders matched your current search filters.'
                : 'When you purchase learning materials, register for hackathons, or enroll in courses, verified invoices will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E4E9F0] shadow-xs overflow-hidden divide-y divide-[#F1F5F9]">
          {filteredPayments.map((p: any) => {
            const productTitle =
              p.course?.title ||
              p.internship?.title ||
              p.material?.title ||
              p.hackathon?.title ||
              'SkillUp Learning Service';

            const itemType = p.courseId
              ? 'Course Curriculum'
              : p.internshipId
              ? 'Internship Cohort'
              : p.materialId
              ? 'Learning Material'
              : p.hackathonId
              ? 'Hackathon'
              : 'Mentor Session';

            const remaining = Number(p.remainingBalance || 0);

            return (
              <div
                key={p.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFCFF] transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(p.status)}
                    <span className="text-[11px] font-mono text-slate-400">
                      Order ID: {p.razorpayOrderId || p.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                      {itemType}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#14233B] truncate">
                    {productTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                    {p.couponCode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                        Coupon: {p.couponCode} (-₹{p.discountAmount || 0})
                      </span>
                    )}
                    <span>
                      {new Date(p.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {p.paymentMethod && (
                      <>
                        <span>&bull;</span>
                        <span className="text-[11px] font-medium text-slate-500 uppercase">
                          Via {p.paymentMethod}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                  <div>
                    <span className="text-xl font-black text-[#14233B]">
                      ₹{p.amount} <span className="text-xs text-slate-400 font-semibold">{p.currency || 'INR'}</span>
                    </span>
                    {p.originalAmount && Number(p.originalAmount) > Number(p.amount) && (
                      <span className="text-xs text-slate-400 line-through ml-2">
                        ₹{p.originalAmount}
                      </span>
                    )}
                  </div>

                  {p.status === 'COMPLETED' ? (
                    remaining > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md mt-1 border border-amber-200">
                        Balance Due: ₹{remaining}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Settled</span>
                      </span>
                    )
                  ) : p.status === 'PENDING' ? (
                    <span className="text-[11px] font-semibold text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Awaiting Payment</span>
                    </span>
                  ) : p.status === 'FAILED' ? (
                    <span className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      <span>Payment Unsuccessful</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 mt-1">
                      {p.status}
                    </span>
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
export default StudentOrdersView;
