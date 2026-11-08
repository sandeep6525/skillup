import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import {
  BookOpen,
  Compass,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlayCircle,
  GraduationCap,
} from 'lucide-react';

export const StudentCoursesCatalogView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [search, setSearch] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // 1. Fetch student's verified enrolled courses
  const { data: myCourses = [], isLoading: enrolledLoading } = useQuery({
    queryKey: ['my-enrolled-courses-catalog-view'],
    queryFn: async () => {
      const res = await api.get('/learning/my-courses');
      return res.data.data;
    },
  });

  // 2. Fetch all public courses catalog
  const { data: allCourses = [], isLoading: allCoursesLoading } = useQuery({
    queryKey: ['portal-courses-catalog'],
    queryFn: async () => {
      const res = await api.get('/courses');
      return res.data.data;
    },
  });

  const enrolledCourseIdSet = new Set((myCourses as any[]).map((e: any) => e.courseId));

  // Available courses: Courses the student has NOT enrolled in yet
  const availableCourses = (allCourses as any[]).filter(
    (c: any) => !enrolledCourseIdSet.has(c.id)
  );

  const categories = ['All', 'Web Development', 'System Design', 'DevOps', 'Mobile', 'AI & ML'];

  // Filtered enrolled courses
  const filteredEnrolled = (myCourses as any[]).filter((enr: any) => {
    const c = enr.course;
    if (!c) return false;
    const matchesSearch =
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Filtered available courses
  const filteredAvailable = availableCourses.filter((c: any) => {
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const isLoading = enrolledLoading || allCoursesLoading;

  return (
    <div className="p-6 sm:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <Compass className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Course Management & Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Courses & Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Access your purchased curriculums and browse available production engineering programs.
          </p>
        </div>

        <Link
          to="/dashboard/learning"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Go to Classroom Player</span>
        </Link>
      </div>

      {/* Global Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E4E9F0] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enrolled or available courses by keyword..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#173B73] text-white'
                  : 'bg-[#F8F9FC] text-[#667085] hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          SECTION A: MY PURCHASED / ENROLLED COURSES
      ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E9F0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-[#14233B]">
                My Purchased / Enrolled Courses ({filteredEnrolled.length})
              </h2>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Verified active enrollments with full access to lessons, labs, and mentor sessions.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
            ))}
          </div>
        ) : filteredEnrolled.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#CBD5E1] p-6 space-y-2">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#14233B]">No enrolled courses found</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              {search
                ? 'No enrolled courses match your search criteria.'
                : 'Browse available courses below to start your verified learning track.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEnrolled.map((enr: any) => {
              const c = enr.course;
              const progressPct = enr.progress || 0;
              const totalLessons = enr.totalLessons || 0;
              const completedLessons =
                totalLessons > 0 ? Math.round((progressPct / 100) * totalLessons) : 0;
              const enrollmentDate = enr.enrolledAt
                ? new Date(enr.enrolledAt).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Active';

              const payment = enr.payment;
              const isPaidInFull = !payment || !payment.isPartial || Number(payment.remainingBalance || 0) <= 0;
              const remainingBalance = Number(payment?.remainingBalance || 0);

              return (
                <div
                  key={enr.id}
                  className="bg-white rounded-2xl border border-[#E4E9F0] p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={
                          c?.thumbnailUrl ||
                          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'
                        }
                        alt={c?.title}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#EAF7F0] text-[#16845B] border border-[#16845B]/20">
                            Enrolled
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Joined {enrollmentDate}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#14233B] leading-tight truncate" title={c?.title}>
                          {c?.title}
                        </h3>
                        <span className="text-[11px] text-[#667085] block mt-1">
                          Mentor: {c?.instructor?.name || 'SkillUp Faculty'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-semibold text-[#667085]">
                        <span>Completed: {completedLessons} / {totalLessons} lessons</span>
                        <span className="text-[#2563EB] font-bold">{progressPct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                      <span className="text-[#64748B] text-[11px]">Payment Status:</span>
                      {isPaidInFull ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          Paid in Full
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold">
                          Bal: ₹{remainingBalance}
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/classroom/${c?.slug || c?.id}`}
                    className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{progressPct === 100 ? 'Review Course Material' : 'Continue Learning'}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================
          SECTION B: AVAILABLE COURSES FOR ENROLLMENT
      ======================================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-[#E4E9F0] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-lg font-bold text-[#14233B]">
                Available Courses ({filteredAvailable.length})
              </h2>
            </div>
            <p className="text-xs text-[#667085] mt-0.5">
              Curriculums available for purchase and cohort registration.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
            ))}
          </div>
        ) : filteredAvailable.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#CBD5E1] p-6 space-y-2">
            <Compass className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-[#14233B]">No other courses available</h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto">
              You are actively enrolled in all currently published courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAvailable.map((c: any) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-[#E4E9F0] overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <img
                    src={
                      c.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80'
                    }
                    alt={c.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase">
                        {c.level || 'Intermediate'}
                      </span>
                      <span className="text-xs font-bold text-[#14233B]">
                        {Number(c.price) === 0 ? 'Free' : `₹${c.price}`}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#14233B] line-clamp-1" title={c.title}>
                      {c.title}
                    </h3>

                    <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B] flex items-center justify-between">
                      <span>Mentor: {c.instructor?.name || 'SkillUp Faculty'}</span>
                      <span>{c.duration || '8 Weeks'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    to={`/courses/${c.slug || c.id}`}
                    className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Enroll / Buy Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCoursesCatalogView;
