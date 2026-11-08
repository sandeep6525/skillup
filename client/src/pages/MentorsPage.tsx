import { useToast } from '../context/ToastContext';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Star, Calendar, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export const MentorsPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: mentors, isLoading } = useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const res = await api.get('/mentors');
      return res.data.data;
    },
  });

  const bookSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      if (!user) {
        navigate('/login');
        return;
      }
      return api.post('/mentors/book', { slotId, notes: 'Career and Architecture Review' });
    },
    onSuccess: () => {
      toast.success('Slot Reserved', 'Slot reserved successfully! Meeting link generated.');
      queryClient.invalidateQueries({ queryKey: ['mentors'] });
    },
    onError: (err: any) => {
      toast.apiError(err, 'Booking failed');
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#55B957]">Expert Guidance</span>
        <h1 className="text-3xl font-extrabold text-indigo-950 mt-1">SkillUp 1-on-1 Mentor Network</h1>
        <p className="text-sm text-slate-500 mt-1">
          Accelerate your engineering decisions, system designs, and code quality with verified staff engineers.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mentors?.map((mentor: any) => (
            <div
              key={mentor.id}
              className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={mentor.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'}
                    alt={mentor.user.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-100"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-indigo-950">{mentor.user.name}</h3>
                    <p className="text-xs font-medium text-[#55B957]">{mentor.user.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{mentor.rating || '5.0'}</span>
                      <span className="text-slate-400 font-normal">({mentor.totalReviews} sessions)</span>
                    </div>
                  </div>

                  <div className="ml-auto text-right">
                    <span className="text-xs text-slate-400 block">Hourly Rate</span>
                    <span className="text-lg font-extrabold text-indigo-950">₹{mentor.hourlyRate}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{mentor.about}</p>

                <div className="flex flex-wrap gap-1.5">
                  {mentor.expertise.split(',').map((skill: string, i: number) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAF5EA] text-[#46a548] rounded-md"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Available Slots */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-indigo-950 block">Upcoming Slots:</span>
                {mentor.slots?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No slots currently available</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mentor.slots?.map((slot: any) => (
                      <button
                        key={slot.id}
                        onClick={() => bookSlotMutation.mutate(slot.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAF5EA] hover:bg-[#55B957] hover:text-white text-[#267A36] transition-colors flex items-center gap-1.5 border border-[#55B957]/30"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(slot.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

