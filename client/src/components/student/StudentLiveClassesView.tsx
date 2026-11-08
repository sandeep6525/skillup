import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  Video,
  Calendar,
  Clock,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export const StudentLiveClassesView: React.FC = () => {
  const [tab, setTab] = useState<'UPCOMING' | 'COMPLETED' | 'ALL'>('UPCOMING');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['student-portal-live-classes'],
    queryFn: async () => {
      const res = await api.get('/live-classes/my/registrations');
      return res.data.data;
    },
  });

  const now = Date.now();

  const filtered = registrations.filter((reg: any) => {
    const cls = reg.liveClass;
    if (!cls) return false;
    const startTime = new Date(cls.startTime).getTime();
    const endTime = startTime + (cls.duration || 60) * 60 * 1000;

    if (tab === 'UPCOMING') {
      return cls.status !== 'COMPLETED' && cls.status !== 'CANCELLED' && endTime > now;
    }
    if (tab === 'COMPLETED') {
      return cls.status === 'COMPLETED' || endTime <= now;
    }
    return true;
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E4E9F0] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <Radio className="w-3.5 h-3.5 text-[#2563EB] animate-pulse" />
            <span>My Live Masterclasses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Live Classes & Masterclasses
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Access live sessions included with your enrolled courses and registered masterclasses. Join live rooms with your mentor.
          </p>
        </div>

        <Link
          to="/live-classes"
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <span>Explore More Masterclasses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        {(['UPCOMING', 'COMPLETED', 'ALL'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === t
                ? 'bg-[#173B73] text-white shadow-xs'
                : 'bg-gray-100 text-[#475569] hover:bg-gray-200'
            }`}
          >
            {t === 'UPCOMING' ? 'Upcoming Sessions' : t === 'COMPLETED' ? 'Past / Completed' : 'All Registrations'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-32 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-32 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">
            {tab === 'UPCOMING' ? 'No upcoming live classes scheduled' : 'No sessions found'}
          </h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            Browse our catalog of weekend interactive masterclasses and register to join live code sessions with mentors.
          </p>
          <div>
            <Link
              to="/live-classes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition"
            >
              <span>Browse Live Classes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((reg: any) => {
            const item = reg.liveClass;
            const startDate = new Date(item.startTime);
            const dateStr = startDate.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = startDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const isCancelled = item.status === 'CANCELLED';
            const isCompleted = item.status === 'COMPLETED';
            const isPaid = reg.status === 'PAID';
            const isWindowOpen = item.isEarlyJoinOpen;
            const canJoin = item.canJoin && Boolean(item.meetingUrl);

            return (
              <div
                key={reg.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#173B73] flex flex-col items-center justify-center shrink-0 border border-blue-100">
                    <span className="text-lg font-black leading-none">{startDate.getDate()}</span>
                    <span className="text-[10px] font-bold uppercase mt-0.5">
                      {startDate.toLocaleString('default', { month: 'short' })}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                        {item.course?.title || item.internship?.title || 'Interactive Masterclass'}
                      </span>
                      {reg.isInternshipEnrolled || item.internship ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F3FF] text-[#7C3AED] border border-[#7C3AED]/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#7C3AED]" />
                          INCLUDED WITH INTERNSHIP
                        </span>
                      ) : reg.isCourseEnrolled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#2563EB]/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-[#2563EB]" />
                          INCLUDED WITH ENROLLED COURSE
                        </span>
                      ) : isPaid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF7F0] text-[#16845B] border border-[#16845B]/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID & CONFIRMED
                        </span>
                      ) : null}
                      <span className="text-xs text-[#667085] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>{dateStr} at {timeStr} ({item.duration || 60} min)</span>
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#14233B]">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-xs text-[#667085] line-clamp-2">{item.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#667085]">
                      {item.instructor && (
                        <span className="font-medium text-[#14233B]">
                          Mentor: <span className="font-semibold">{item.instructor.name}</span>
                        </span>
                      )}
                      {reg.payment && (
                        <span className="font-mono text-[11px] text-gray-400">
                          Order: {reg.payment.razorpayOrderId?.substring(0, 16)}...
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'LIVE'
                            ? 'bg-[#DCFCE7] text-[#16A34A] animate-pulse'
                            : item.status === 'COMPLETED'
                            ? 'bg-[#F1F5F9] text-[#64748B]'
                            : item.status === 'CANCELLED'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : 'bg-[#EFF6FF] text-[#2563EB]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right CTA / Join logic */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  {isCancelled ? (
                    <div className="text-right">
                      <span className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 block">
                        Class Cancelled
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">Meeting URL Deactivated</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold">
                        Completed
                      </span>
                      {item.recordingUrl ? (
                        <a
                          href={item.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-lg bg-[#EAF5EA] text-blue-700 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Watch Recording</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : canJoin ? (
                    <a
                      href={item.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Radio className="w-4 h-4 text-white animate-pulse" />
                      <span>Join Live Session</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : isWindowOpen && isPaid ? (
                    <Link
                      to={`/live-classes/${item.id}/room`}
                      className="px-5 py-3 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition shadow-xs flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                      <span>Enter Live Room</span>
                    </Link>
                  ) : (
                    <div className="text-right space-y-1">
                      <span className="px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 text-xs font-bold block">
                        Join link unlocks 5m prior
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        Scheduled for {dateStr}
                      </span>
                    </div>
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

export default StudentLiveClassesView;
