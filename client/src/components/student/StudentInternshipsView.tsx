import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Briefcase, Calendar, MapPin, ArrowRight, ExternalLink, CheckCircle2, BookOpen } from 'lucide-react';

export const StudentInternshipsView: React.FC = () => {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['student-portal-internships'],
    queryFn: async () => {
      const res = await api.get('/internships/my/applications');
      return res.data.data;
    },
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Industry Experience & Cohort Placements</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Internships
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Review your active internship cohort admissions, application status, and organization details.
          </p>
        </div>

        <Link
          to="/internship"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span>Explore All Internships</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-40 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">You haven't applied for any internships yet</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            SkillUp partners with engineering teams to offer hands-on internships with verified project mentors.
          </p>
          <Link
            to="/internship"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#173B73] transition mt-2"
          >
            Explore Internships
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => {
            const isAccepted = app.status === 'ACCEPTED' || app.status === 'COMPLETED';
            const isPendingPayment =
              Number(app.internship?.price || 0) > 0 && Number(app.paidAmount || 0) === 0 && app.status !== 'REJECTED';

            return (
              <div
                key={app.id}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isAccepted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {app.status === 'ACCEPTED'
                        ? 'Enrolled'
                        : app.status === 'COMPLETED'
                        ? 'Completed'
                        : isPendingPayment
                        ? 'Payment Pending'
                        : 'Application Under Review'}
                    </span>

                    <span className="text-xs text-slate-400">
                      Applied: {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#14233B]">
                    {app.internship?.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                    <span className="font-semibold text-[#2563EB]">
                      {app.internship?.organization}
                    </span>
                    <span>&bull;</span>
                    <span>Duration: {app.internship?.duration}</span>
                    <span>&bull;</span>
                    <span>Mode: {app.internship?.deliveryMode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isAccepted ? (
                    <Link
                      to={`/internship/${app.internshipId}/learning`}
                      className="px-4 py-2 rounded-xl bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                      <span>Launch Learning Portal</span>
                    </Link>
                  ) : (
                    <Link
                      to="/internship"
                      className="px-4 py-2 rounded-xl bg-[#EFF6FF] text-[#2563EB] hover:bg-[#2563EB] hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>Cohort Details</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {isPendingPayment && (
                    <Link
                      to="/internship"
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition shadow-xs"
                    >
                      Complete Fee
                    </Link>
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
export default StudentInternshipsView;
