import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import {
  BookOpen,
  PlayCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Briefcase,
  Users,
} from 'lucide-react';

export const StudentMyLearningView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [learningTab, setLearningTab] = useState<'ALL' | 'COURSES' | 'INTERNSHIPS'>('ALL');

  const { data: myCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['my-courses-student-view'],
    queryFn: async () => {
      const res = await api.get('/learning/my-courses');
      return res.data.data;
    },
  });

  const { data: myInternships = [], isLoading: internshipsLoading } = useQuery({
    queryKey: ['my-internships-student-view'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
  });

  const acceptedInternships = (myInternships as any[]).filter(
    (app) => app.status === 'ACCEPTED' || app.status === 'COMPLETED'
  );

  const filteredCourses = (myCourses as any[]).filter((enr: any) => {
    if (!search) return true;
    const title = enr.course?.title || '';
    const instructor = enr.course?.instructor?.name || '';
    return (
      title.toLowerCase().includes(search.toLowerCase()) ||
      instructor.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredInternships = acceptedInternships.filter((app: any) => {
    if (!search) return true;
    const title = app.internship?.title || '';
    const org = app.internship?.organization || '';
    return (
      title.toLowerCase().includes(search.toLowerCase()) ||
      org.toLowerCase().includes(search.toLowerCase())
    );
  });

  const isLoading = coursesLoading || internshipsLoading;

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Active Curriculums & Classrooms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Learning
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Track your ongoing course progress, watch video lectures, and launch interactive code labs & internship cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <span>Explore Courses</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/internship"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Internships</span>
          </Link>
        </div>
      </div>

      {/* Program Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E4E9F0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLearningTab('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              learningTab === 'ALL'
                ? 'bg-[#14233B] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Programs ({myCourses.length + acceptedInternships.length})
          </button>
          <button
            onClick={() => setLearningTab('COURSES')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              learningTab === 'COURSES'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Courses ({myCourses.length})
          </button>
          <button
            onClick={() => setLearningTab('INTERNSHIPS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              learningTab === 'INTERNSHIPS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Internships ({acceptedInternships.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enrolled courses or internships..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] focus:outline-hidden focus:bg-white focus:border-[#2563EB] transition-colors"
          />
        </div>
      </div>

      {/* Main Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          ))}
        </div>
      ) : (filteredCourses.length === 0 && (learningTab === 'COURSES' || filteredInternships.length === 0)) ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#14233B]">
              {search ? 'No matching enrollments found' : 'No active enrollments found'}
            </h3>
            <p className="text-xs text-[#667085] max-w-sm mx-auto mt-1 leading-relaxed">
              {search
                ? 'Try a different search query.'
                : 'Browse our catalog of software engineering courses and industry internships to begin.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#173B73] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <span>Browse Courses</span>
            </Link>
            <Link
              to="/internship"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <span>Explore Internships</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render Active Internships when tab is ALL or INTERNSHIPS */}
          {(learningTab === 'ALL' || learningTab === 'INTERNSHIPS') &&
            filteredInternships.map((app: any) => {
              const internship = app.internship;
              return (
                <div
                  key={`internship_${app.id}`}
                  className="bg-white rounded-2xl border-2 border-purple-100 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-200">
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-800">
                            Internship Cohort
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700">
                            Enrolled
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#14233B] leading-tight truncate" title={internship?.title}>
                          {internship?.title}
                        </h3>
                        <span className="text-[11px] text-[#2563EB] font-semibold block mt-0.5">
                          {internship?.organization}
                        </span>
                        <span className="text-[10px] text-[#64748B] block">
                          Mentor: {internship?.mentor?.name || 'Supervising Staff'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#EDF0F4] space-y-1 text-xs text-[#667085]">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-semibold text-slate-700">{internship?.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Mode:</span>
                        <span className="font-semibold text-slate-700">{internship?.deliveryMode}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/internship/${app.internshipId}/learning`}
                    className="w-full py-2.5 text-center text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Launch Cohort Portal</span>
                  </Link>
                </div>
              );
            })}

          {/* Render Courses when tab is ALL or COURSES */}
          {(learningTab === 'ALL' || learningTab === 'COURSES') &&
            filteredCourses.map((enr: any) => {
            const course = enr.course;
            const progressPct = enr.progress || 0;
            const totalLessons = enr.totalLessons || 0;
            const completedLessons =
              totalLessons > 0 ? Math.round((progressPct / 100) * totalLessons) : 0;
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
                        course?.thumbnailUrl ||
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'
                      }
                      alt={course?.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-sm font-bold text-[#14233B] leading-tight truncate"
                        title={course?.title}
                      >
                        {course?.title}
                      </h3>
                      <span className="text-[11px] text-[#667085] block mt-1">
                        Mentor: {course?.instructor?.name || 'SkillUp Faculty'}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">
                        Enrolled:{' '}
                        {enr.enrolledAt
                          ? new Date(enr.enrolledAt).toLocaleDateString()
                          : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-[#667085]">
                      <span>
                        Completed: {completedLessons} / {totalLessons} lessons
                      </span>
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
                  to={`/classroom/${course?.slug || course?.id}`}
                  className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#173B73] hover:bg-[#14233B] rounded-xl transition-colors shadow-xs"
                >
                  {progressPct === 100 ? 'Review Course Material' : 'Continue Learning'}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default StudentMyLearningView;
