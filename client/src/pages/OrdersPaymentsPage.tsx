import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { CreditCard, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export const OrdersPaymentsPage: React.FC = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments-history'],
    queryFn: async () => {
      const res = await api.get('/payments/history');
      return res.data.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#5DBA58]">Financial History</span>
        <h1 className="text-3xl font-extrabold text-indigo-950 mt-1">Orders & Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review all verified transactions, course enrollment fees, and mentor bookings.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !payments || payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-indigo-600 mx-auto flex items-center justify-center">
            <CreditCard className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-indigo-950">No transaction records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once you enroll in a course or book a mentor session, your verified payment invoices will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {payments.map((p: any) => (
              <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        p.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : p.status === 'FAILED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Order ID: {p.razorpayOrderId}</span>
                  </div>

                  <h4 className="text-base font-bold text-indigo-950">
                    {p.course?.title ||
                      p.internship?.title ||
                      p.material?.title ||
                      p.hackathon?.title ||
                      'SkillUp Mentorship / Learning Service'}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#2563EB]">
                      {p.courseId
                        ? 'Course'
                        : p.internshipId
                        ? 'Internship Cohort'
                        : p.materialId
                        ? 'Learning Material'
                        : p.hackathonId
                        ? 'Hackathon'
                        : 'Mentor Session'}
                    </span>
                    {p.couponCode && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                        Coupon: {p.couponCode} (-₹{p.discountAmount || 0})
                      </span>
                    )}
                    {p.paymentMethod && p.paymentMethod !== 'RAZORPAY' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Method: {p.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    )}
                    {p.isPartial && Number(p.remainingBalance) > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF5EA] text-[#4ea849] border border-[#5DBA58]/30">
                        Remaining Balance: ₹{Number(p.remainingBalance).toLocaleString()}
                      </span>
                    )}
                    {p.refundId && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Refund ID: {p.refundId}
                      </span>
                    )}
                    <span>&bull;</span>
                    <span>
                      {new Date(p.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <div>
                    <span className="text-xl font-extrabold text-indigo-950">
                      ₹{p.amount} {p.currency}
                    </span>
                    {p.originalAmount && Number(p.originalAmount) > Number(p.amount) && (
                      <span className="text-xs text-slate-400 line-through ml-2">
                        ₹{p.originalAmount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium mt-1">
                    {p.status === 'COMPLETED' || p.status === 'PAID' ? (
                      p.razorpayPaymentId?.startsWith('pay_test_') || p.razorpayOrderId?.startsWith('order_test_') ? (
                        <div className="flex items-center gap-1 text-blue-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Test Mode Payment</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Razorpay Transaction</span>
                        </div>
                      )
                    ) : p.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Payment Pending</span>
                        </div>
                        <a
                          href={p.course?.slug ? `/courses/${p.course.slug}` : p.courseId ? `/courses` : p.internshipId ? `/internship` : `/materials`}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#2563EB] hover:bg-[#173B73] rounded-lg transition-colors cursor-pointer"
                        >
                          Retry Checkout
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-rose-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Payment {p.status}</span>
                        </div>
                        <a
                          href={p.course?.slug ? `/courses/${p.course.slug}` : p.courseId ? `/courses` : p.internshipId ? `/internship` : `/materials`}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#173B73] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors cursor-pointer"
                        >
                          Retry Payment
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

