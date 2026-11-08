import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquareQuote, ChevronRight, User, Award, BookOpen, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { getMediaUrl } from '../utils/mediaUrl';

export const HomeFeedbackSection: React.FC = () => {
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['public-feedback-homepage'],
    queryFn: async () => {
      const res = await api.get('/feedback/public?limit=6');
      return res.data?.data || [];
    },
  });

  const feedbacks = Array.isArray(feedbackData) ? feedbackData : [];

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] text-[#267A36] text-xs font-bold tracking-wide uppercase mb-2">
            <MessageSquareQuote className="w-3.5 h-3.5 text-[#55B957]" />
            <span>Learner & Educator Voices</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#000000] tracking-tight">
            Student & Mentor Feedback
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Authentic course experiences and peer reflections verified across SkillUp cohorts.
          </p>
        </div>
        <Link
          to="/feedback"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#267A36] hover:text-[#55B957] bg-[#EAF5EA] hover:bg-[#d8eed8] px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
        >
          <span>View All Feedback</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-16 bg-slate-100 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-14 px-6 bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#EAF5EA] flex items-center justify-center text-[#55B957]">
            <MessageSquareQuote className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#000000]">Feedback from our learners and mentors will appear here.</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Only approved testimonials from registered students and mentors are showcased here after course completion.
          </p>
          <div className="mt-5">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#55B957] hover:bg-[#46a548] text-white text-xs font-bold transition shadow-xs"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore Active Courses</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedbacks.map((f: any) => {
            const isMentor = f.feedbackType === 'MENTOR';
            const courseTitle = f.courses?.title || 'SkillUp Engineering Masterclass';
            const reviewerName = f.users?.name || (isMentor ? 'Assigned Mentor' : 'Verified Student');
            const reviewerAvatar = f.users?.avatarUrl ? getMediaUrl(f.users.avatarUrl) : null;
            const subtitle = isMentor
              ? (f.users?.mentorProfile?.expertise || f.users?.title || 'Industry Mentor')
              : 'Verified Student Enrollment';

            return (
              <div
                key={f.id}
                className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-[#55B957]/50 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                        isMentor
                          ? 'bg-[#EAF5EA] text-[#267A36] border border-[#55B957]/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isMentor ? <Award className="w-3 h-3 text-[#55B957]" /> : <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                      <span>{isMentor ? 'Verified Mentor' : 'Verified Student'}</span>
                    </span>

                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-extrabold text-[#000000] ml-1">
                        {Number(f.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-[#267A36] tracking-tight uppercase flex items-center gap-1 line-clamp-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span>{courseTitle}</span>
                    </h4>
                    <p className="text-sm font-bold text-[#000000] mt-1 line-clamp-1">
                      {f.title}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 italic">
                    "{f.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 mt-5 border-t border-slate-100">
                  {reviewerAvatar ? (
                    <img
                      src={reviewerAvatar}
                      alt={reviewerName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#EAF5EA] text-[#267A36] flex items-center justify-center font-bold text-xs border border-[#55B957]/20">
                      {reviewerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-[#000000] truncate">{reviewerName}</h5>
                    <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#55B957]" />
                      <span>{subtitle}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};



