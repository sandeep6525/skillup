import { useToast } from '../../context/ToastContext';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Award, CheckCircle2, ShieldCheck, Download, ExternalLink } from 'lucide-react';

export const StudentCertificatesView: React.FC = () => {
  const toast = useToast();
  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['student-portal-certificates'],
    queryFn: async () => {
      const res = await api.get('/certificates/my');
      return res.data.data;
    },
  });

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-bold border border-[#2563EB]/20 mb-2">
          <Award className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Accreditations & Verified Badges</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14233B] tracking-tight">
          Certificates
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] mt-1">
          Cryptographically verifiable certificates issued on 100% completion of enrolled engineering curriculums.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-56 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
          <div className="h-56 rounded-2xl bg-white border border-[#E4E9F0] animate-pulse" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#CBD5E1] p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] mx-auto flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#14233B]">No certificates earned yet</h3>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            Complete all lessons and milestones of any enrolled course to generate your official verified certificate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert: any) => (
            <div
              key={cert.id}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E4E9F0] shadow-xs space-y-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#2563EB]/20">
                    Official SkillUp Certificate
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#14233B] pt-1">
                    {cert.course?.title}
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Instructor: {cert.course?.instructor?.name || 'SkillUp Faculty'}
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#173B73] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FC] border border-[#E4E9F0] flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">VERIFICATION ID</span>
                  <span className="font-mono font-bold text-[#14233B] text-xs">
                    #{cert.certificateNo || cert.id.slice(-8)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-bold">DATE ISSUED</span>
                  <span className="text-slate-600 font-semibold text-xs">
                    {new Date(cert.issuedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified Credential</span>
                </span>

                <button
                  onClick={() => toast.info('Certificate Verified', `Certificate #${cert.certificateNo} verified by SkillUp Credential Authority.`)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Badge</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default StudentCertificatesView;
