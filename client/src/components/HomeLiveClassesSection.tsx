import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Award,
  Radio,
  Star,
  Check,
  GraduationCap,
  Sparkle,
  X,
  MessageSquareQuote,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export interface LiveClassItem {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  duration: number;
  meetingUrl?: string | null;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  courseId?: string | null;
  batchId?: string | null;
  internshipId?: string | null;
  instructorId?: string | null;
  price: number;
  maxCapacity: number;
  timezone: string;
  meetingProvider?: string | null;
  course?: {
    id: string;
    title: string;
    slug?: string;
    thumbnailUrl?: string | null;
  } | null;
  instructor?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    title?: string | null;
  } | null;
  _count?: {
    registrations: number;
    attendees: number;
  };
  registeredCount?: number;
  remainingSeats?: number | null;
  isRegistered?: boolean;
  isCourseEnrolled?: boolean;
  isInternshipEnrolled?: boolean;
  registrationStatus?: string;
  canJoin?: boolean;
  isEarlyJoinOpen?: boolean;
}

export const HomeLiveClassesSection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters & Search State
  const [activeStatusTab, setActiveStatusTab] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [selectedMentorId, setSelectedMentorId] = useState('ALL');

  // 1. Fetch live classes from public endpoint
  const { data: liveClasses = [], isLoading: isLoadingClasses } = useQuery<LiveClassItem[]>({
    queryKey: ['home-public-live-classes'],
    queryFn: async () => {
      const res = await api.get('/live-classes?public=true');
      return res.data?.data || [];
    },
    refetchInterval: 30000, // Keep status fresh every 30s
  });

  // 2. Fetch mentor profiles dynamically
  const { data: mentors = [], isLoading: isLoadingMentors } = useQuery({
    queryKey: ['home-mentors-list'],
    queryFn: async () => {
      const res = await api.get('/mentors');
      return res.data?.data || [];
    },
  });

  // Extract unique courses and instructors from classes for quick filtering
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    liveClasses.forEach((c) => {
      if (c.course?.id && c.course?.title) {
        map.set(c.course.id, c.course.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [liveClasses]);

  const mentorOptions = useMemo(() => {
    const map = new Map<string, string>();
    liveClasses.forEach((c) => {
      if (c.instructor?.id && c.instructor?.name) {
        map.set(c.instructor.id, c.instructor.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [liveClasses]);

  // Compute live count for header live badge
  const liveNowCount = useMemo(() => {
    return liveClasses.filter((c) => c.status === 'LIVE').length;
  }, [liveClasses]);

  // Filtered live classes list
  const filteredClasses = useMemo(() => {
    return liveClasses.filter((item) => {
      // 1. Status Filter
      if (activeStatusTab === 'LIVE' && item.status !== 'LIVE') return false;
      if (activeStatusTab === 'UPCOMING' && item.status !== 'SCHEDULED') return false;
      if (activeStatusTab === 'COMPLETED' && item.status !== 'COMPLETED') return false;
      if (item.status === 'CANCELLED') return false;

      // 2. Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCourse = item.course?.title?.toLowerCase().includes(q);
        const matchesMentor = item.instructor?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesMentor) return false;
      }

      // 3. Course Filter
      if (selectedCourseId !== 'ALL' && item.courseId !== selectedCourseId) {
        return false;
      }

      // 4. Mentor Filter
      if (selectedMentorId !== 'ALL' && item.instructorId !== selectedMentorId) {
        return false;
      }

      return true;
    });
  }, [liveClasses, activeStatusTab, searchTerm, selectedCourseId, selectedMentorId]);

  return (
    <section className="relative w-full bg-[#F8FAFC] py-16 sm:py-24 border-t border-b border-slate-200/80 overflow-hidden selection:bg-[#EAF5EA]">
      {/* Subtle soft background illumination */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] bg-[#EAF5EA]/50 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        {/* ========================================================
            2. LIVE CLASSES HERO SECTION
            - Centered Section Introduction
            - Heading: Learn Live. Build Real Skills.
            - Description: Join expert-led interactive sessions...
            - 3 Highlights: Expert Mentors, Interactive Sessions, Practical Learning
        ======================================================== */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Top Live Badge */}
           

          {/* Main Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#000000] tracking-tight leading-tight">
            Learn Live.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#55B957] via-[#46a548] to-[#267A36]">
              Build Real Skills.
            </span>
          </h2>

          {/* Description */}
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            Join expert-led interactive sessions, ask questions, and gain practical knowledge from industry professionals.
          </p>

          {/* 3 Small Highlights */}
           
        </div>

        {/* ========================================================
            7. SEARCH & FILTER CONTROLS
        ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Status Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL' as const, label: 'All Sessions', isLive: false },
                { id: 'LIVE' as const, label: 'Live Now', isLive: true },
                { id: 'UPCOMING' as const, label: 'Upcoming', isLive: false },
                { id: 'COMPLETED' as const, label: 'Completed', isLive: false },
              ].map((tab) => {
                const isActive = activeStatusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStatusTab(tab.id)}
                    className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#55B957] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {tab.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View All Classes Navigation Link */}
            <Link
              to="/live-classes"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#267A36] hover:text-[#55B957] transition-colors self-start lg:self-auto group"
            >
              <span>View All Classes Catalog</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Search + Filter Selects */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search classes or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#55B957] focus:bg-white transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Course */}
            <div>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-[#55B957] focus:bg-white transition-all shadow-2xs"
              >
                <option value="ALL">All Courses</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Mentor */}
            <div>
              <select
                value={selectedMentorId}
                onChange={(e) => setSelectedMentorId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:border-[#55B957] focus:bg-white transition-all shadow-2xs"
              >
                <option value="ALL">All Mentors</option>
                {mentorOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================
            3 & 4. UPCOMING LIVE CLASSES GRID & CARDS
            - Clean responsive grid layout (2 or 3 cards per row)
            - Professional status indicators (LIVE NOW, UPCOMING, COMPLETED)
            - Displays: Course thumbnail, course title, class title, mentor photo & name, date & time, duration, available seats, Join Class button
        ======================================================== */}
        <div>
          {isLoadingClasses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse shadow-xs">
                  <div className="w-full h-44 bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-16 px-6 bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs max-w-lg mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-[#55B957] flex items-center justify-center mx-auto shadow-xs">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#000000]">No live classes match your filter</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Check back soon or explore our complete catalog of scheduled cohort sessions.
              </p>
              {(searchTerm || selectedCourseId !== 'ALL' || selectedMentorId !== 'ALL' || activeStatusTab !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCourseId('ALL');
                    setSelectedMentorId('ALL');
                    setActiveStatusTab('ALL');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#EAF5EA] text-xs font-semibold text-[#267A36] hover:bg-[#d4edd4] transition-colors cursor-pointer"
                >
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((item) => {
                const startDate = new Date(item.startTime);
                const isValidDate = !isNaN(startDate.getTime());
                const formattedDate = isValidDate
                  ? startDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Scheduled Soon';
                const formattedTime = isValidDate
                  ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                  : 'TBD';

                const courseTitle = item.course?.title || 'SkillUp Engineering Cohort';
                const courseThumbnail = item.course?.thumbnailUrl ? getMediaUrl(item.course.thumbnailUrl) : null;
                const mentorName = item.instructor?.name || 'Assigned Instructor';
                const mentorAvatar = item.instructor?.avatarUrl ? getMediaUrl(item.instructor.avatarUrl) : null;
                const mentorTitle = item.instructor?.title || 'Technical Mentor';

                const isLive = item.status === 'LIVE';
                const isCompleted = item.status === 'COMPLETED';
                const isScheduled = item.status === 'SCHEDULED';

                // Seats calculation
                const seatsAvailable = item.maxCapacity ? Math.max(0, item.maxCapacity - (item._count?.registrations || 0)) : null;

                // Join availability logic
                const canJoin = Boolean(item.canJoin);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-[#55B957]/60 p-5 shadow-xs hover:shadow-xl hover:shadow-[#55B957]/10 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 overflow-hidden"
                  >
                    <div>
                      {/* Course Thumbnail or Topic Visual */}
                      <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                        {courseThumbnail ? (
                          <img
                            src={courseThumbnail}
                            alt={courseTitle}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#EAF5EA] to-slate-100 text-[#55B957]">
                            <Video className="w-10 h-10 mb-1" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Live Interactive Classroom
                            </span>
                          </div>
                        )}

                        {/* Top-Left: Status Badge */}
                        <div className="absolute top-3 left-3 z-10">
                          {isLive && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#267A36] text-white shadow-md backdrop-blur-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                              </span>
                              <span>LIVE NOW</span>
                            </span>
                          )}
                          {isScheduled && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EAF5EA] text-[#267A36] border border-[#55B957]/30 shadow-xs backdrop-blur-xs">
                              <Clock className="w-3 h-3 text-[#55B957]" />
                              <span>UPCOMING</span>
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-800/85 text-white backdrop-blur-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>COMPLETED</span>
                            </span>
                          )}
                        </div>

                        {/* Top-Right: Duration pill */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-black/75 text-white backdrop-blur-xs shadow-xs">
                            {item.duration || 60} mins
                          </span>
                        </div>
                      </div>

                      {/* Course Name Supertitle */}
                      <span className="text-[11px] font-extrabold text-[#267A36] uppercase tracking-wider block truncate">
                        {courseTitle}
                      </span>

                      {/* Class Title */}
                      <h3 className="font-extrabold text-[#000000] text-base sm:text-lg leading-snug group-hover:text-[#55B957] transition-colors line-clamp-2 mt-1">
                        {item.title}
                      </h3>

                      {/* Schedule Meta */}
                      <div className="mt-3.5 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#55B957]" />
                          <span>{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-[#171717]">
                          <Clock className="w-3.5 h-3.5 text-[#55B957]" />
                          <span>{formattedTime}</span>
                        </div>
                      </div>

                      {/* Available Seats Indicator */}
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Seats</span>
                        </span>
                        <span className="font-bold text-[#171717]">
                          {seatsAvailable !== null ? (
                            seatsAvailable > 0 ? (
                              <span className="text-[#267A36]">{seatsAvailable} seats left</span>
                            ) : (
                              <span className="text-rose-600">Full</span>
                            )
                          ) : (
                            'Open Enrollment'
                          )}
                        </span>
                      </div>

                      {/* Course Enrollment Warning for logged-in students not enrolled */}
                      {user && user.role === 'STUDENT' && item.courseId && !item.isCourseEnrolled && (
                        <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200/70 text-[11px] font-medium text-amber-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="line-clamp-1">Purchase this course to access its live classes.</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Mentor & Join Action */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      {/* Mentor Avatar & Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mentorAvatar ? (
                          <img
                            src={mentorAvatar}
                            alt={mentorName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#EAF5EA] text-[#267A36] font-bold text-xs flex items-center justify-center shrink-0 border border-[#55B957]/20">
                            {mentorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#000000] truncate">{mentorName}</h4>
                          <p className="text-[10px] text-slate-400 truncate">{mentorTitle}</p>
                        </div>
                      </div>

                      {/* Join / Course Enrollment CTA */}
                      {canJoin ? (
                        <button
                          onClick={() => {
                            if (item.meetingUrl) {
                              window.open(item.meetingUrl, '_blank', 'noopener,noreferrer');
                            } else {
                              navigate(`/live-classes/${item.id}`);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-[#55B957] hover:bg-[#46a548] active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Class</span>
                        </button>
                      ) : !user ? (
                        <Link
                          to="/login"
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                        >
                          <span>Login to Join</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : item.courseId && !item.isCourseEnrolled ? (
                        <Link
                          to={`/courses/${item.course?.slug || item.courseId}`}
                          className="px-3.5 py-2 rounded-xl bg-[#EAF5EA] hover:bg-[#55B957] text-[#267A36] hover:text-white border border-[#55B957]/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                          title="Purchase this course to access its live classes"
                        >
                          <span>Enroll Course</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          to={`/live-classes`}
                          className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-[#EAF5EA] text-slate-700 hover:text-[#267A36] border border-slate-200 hover:border-[#55B957]/40 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
