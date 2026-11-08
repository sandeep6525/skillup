import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Trophy, Calendar, MapPin, Users, ArrowRight, ExternalLink } from 'lucide-react';

export const StudentHackathonsView: React.FC = () => {
  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['student-portal-hackathons'],
    queryFn: async () => {
      const res = await api.get('/hackathons/my/registrations');
      return res.data.data;
    },
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Competitive Engineering Sprints</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
            My Hackathons
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Track your registered hackathons, project deadlines, and team collaborator rosters.
          </p>
        </div>

        <Link
          to="/hackathons"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#173B73] hover:bg-[#14233B] text-white text-xs font-bold rounded-xl transition-all shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <span>Browse All Hackathons</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-48 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">You haven't registered for any hackathons yet</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            Participate in our upcoming sprints, build solutions with peers, and compete for industry awards.
          </p>
          <Link
            to="/hackathons"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#173B73] transition mt-2"
          >
            Explore Hackathons
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg: any) => (
            <div
              key={reg.id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs hover:shadow-md transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    reg.status === 'CONFIRMED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : reg.status === 'REGISTERED'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {reg.status}
                </span>
                <span className="text-[11px] text-[#98A2B3]">
                  Starts {new Date(reg.hackathon?.startDate).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#14233B] line-clamp-1">
                  {reg.hackathon?.title}
                </h3>
                <p className="text-xs text-[#2563EB] font-medium mt-0.5">
                  Theme: {reg.hackathon?.theme}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8F9FC] border border-[#E4E9F0] text-xs space-y-1.5">
                {reg.teamName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Team:</span>
                    <span className="font-bold text-[#14233B]">{reg.teamName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mode:</span>
                  <span className="font-semibold text-slate-700">{reg.hackathon?.mode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Registered:</span>
                  <span className="text-slate-700">{new Date(reg.registeredAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default StudentHackathonsView;
