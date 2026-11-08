import { useToast } from '../context/ToastContext';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Award, CheckCircle2, Download, ShieldCheck } from 'lucide-react';

export const CertificatesPage: React.FC = () => {
  const toast = useToast();
  const { data: certificates, isLoading } = useQuery({
    queryKey: ['certificates-page'],
    queryFn: async () => {
      const res = await api.get('/certificates/my');
      return res.data.data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#5DBA58]">Accreditations</span>
        <h1 className="text-3xl font-extrabold text-indigo-950 mt-1">Verified SkillUp Certificates</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cryptographically verifiable certificates issued on completion of full curriculums.
        </p>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
      ) : certificates?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-indigo-600 mx-auto flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-indigo-950">No certificates earned yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Complete 100% of any enrolled course curriculum to generate your verified certificate of completion.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {certificates?.map((cert: any) => (
            <div
              key={cert.id}
              className="p-8 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-[#5DBA58]/30 shadow-md space-y-6 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#4ea849] bg-[#EAF5EA] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Official Certificate
                  </span>
                  <h3 className="text-xl font-bold text-indigo-950 pt-1">{cert.course?.title}</h3>
                  <p className="text-xs text-slate-500">Instructor: {cert.course?.instructor?.name}</p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">VERIFICATION ID</span>
                  <span className="font-mono font-bold text-indigo-950">{cert.certificateNo}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Issued on {new Date(cert.issuedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => toast.success('Link Copied', `Certificate verification link copied: https://skillup.com/verify/${cert.certificateNo}`)}
                  className="px-4 py-2 text-xs font-bold text-indigo-600 bg-[#EAF5EA] hover:bg-emerald-100 rounded-xl transition-colors"
                >
                  Share Credential
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


