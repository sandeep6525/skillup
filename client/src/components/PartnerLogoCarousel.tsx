import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import GradientText from './GradientText';
import {
  Handshake,
  Users,
  Rocket,
  Trophy,
  Star,
  Play,
  GraduationCap,
  Sparkles,
  FolderGit2,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
}

interface TimelineMilestone {
  title: string;
  desc: string;
  year?: string;
  icon: React.ElementType;
  color: string;
}

const MILESTONES: TimelineMilestone[] = [
  {
    title: 'Our Journey Begins',
    desc: 'Together for better education',
    year: '2024',
    icon: Play,
    color: '#5DBA58',
  },
  {
    title: 'Strategic Collaboration',
    desc: 'Empowering more students',
    year: '2025',
    icon: Users,
    color: '#4ea849',
  },
  {
    title: 'Innovation in Learning',
    desc: 'Building skill-based programs',
    year: '2026',
    icon: Rocket,
    color: '#10264B',
  },
  {
    title: 'Greater Impact',
    desc: 'Creating more career opportunities',
    year: '2027',
    icon: Trophy,
    color: '#0284C7',
  },
  {
    title: 'A Stronger Future',
    desc: 'Growing together for a brighter tomorrow',
    year: 'Beyond',
    icon: Star,
    color: '#0EA5E9',
  },
];

export const PartnerLogoCarousel: React.FC = () => {
  const [activeNode, setActiveNode] = useState(0);

  // Fetch partners dynamically from existing backend API
  const { data: partnersData, isLoading: isPartnersLoading } = useQuery<{
    success: boolean;
    data: Partner[];
  }>({
    queryKey: ['public-partners'],
    queryFn: async () => {
      const res = await api.get('/partners');
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch stats for the bottom ecosystem metric cards
  const { data: homeData } = useQuery({
    queryKey: ['homepage-dynamic-data'],
    queryFn: async () => {
      const res = await api.get('/homepage');
      return res.data?.data || {};
    },
    staleTime: 1000 * 60 * 2,
  });

  const stats = homeData?.stats || {
    totalStudents: 0,
    totalProjects: 0,
  };

  const partners = partnersData?.data || [];

  // Helper for partner logo URL
  const getFullLogoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendBase =
      (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Build a seamless looping sequence for the marquee (only duplicate in frontend render loop)
  let marqueeItems: Partner[] = [];
  if (partners.length > 0) {
    let repeated = [...partners];
    while (repeated.length < 10) {
      repeated = [...repeated, ...partners];
    }
    marqueeItems = [...repeated, ...repeated];
  }

  // Sequential glowing node animation cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % MILESTONES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  if (isPartnersLoading) {
    return (
      <section className="py-16 bg-white text-[#092653] border-b border-[#E2EDFA]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="h-6 w-36 bg-slate-100 rounded-full mx-auto mb-3 animate-pulse" />
          <div className="h-10 w-72 bg-slate-100 rounded-xl mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded-md mx-auto mb-8 animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section
      id="trusted-partners-section"
      className="relative pt-14 sm:pt-20 pb-16 sm:pb-20 bg-white text-[#092653] overflow-hidden border-b border-[#E2EDFA] selection:bg-[#EAF5EA]"
      aria-labelledby="partners-heading"
    >
      {/* Subtle soft ambient background accents */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] bg-[#EAF5EA]/60 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[450px] h-[300px] bg-slate-50/60 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-6 sm:px-10 lg:px-16 relative z-10">

        {/* ========================================================
            1. SECTION HEADING WITH ANIMATED GRADIENTTEXT
        ======================================================== */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          <motion.h2
            id="partners-heading"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0B192C] tracking-tight leading-tight"
          >
            Growing Together.{' '}
            <GradientText
              colors={["#5DBA58", "#267A36", "#4ea849", "#15803d"]}
              animationSpeed={6}
              variant="linear"
              glow={0}
              className="inline-block"
            >
              Building the Future.
            </GradientText>
          </motion.h2>
        </div>

        {/* ========================================================
            2. CLEAN SEAMLESS PARTNER LOGO MARQUEE (NO CARDS / BORDERS)
        ======================================================== */}
        {partners.length > 0 && (
          <div className="mb-12 sm:mb-16">
            <div className="relative w-full overflow-hidden py-2 group select-none">
              {/* Subtle edge fade gradient to blend seamlessly into website background */}
              <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

              {/* Continuous Horizontal Marquee Track (Floating Logos directly on background) */}
              <div className="flex items-center gap-12 sm:gap-16 lg:gap-20 animate-partner-marquee group-hover:[animation-play-state:paused] w-max">
                {marqueeItems.map((partner, index) => {
                  const logoUrl = getFullLogoUrl(partner.logoUrl);
                  return (
                    <div
                      key={`${partner.id}-${index}`}
                      className="flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-300 hover:scale-110"
                      title={partner.name}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={partner.name}
                          className="h-10 sm:h-12 md:h-14 max-w-[180px] sm:max-w-[210px] object-contain filter contrast-105 opacity-85 hover:opacity-100 transition-opacity duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-base sm:text-lg font-bold text-[#092653] opacity-80 hover:opacity-100 tracking-tight transition-opacity">
                          {partner.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            3. PARTNERSHIP TIMELINE (PRESERVED FIVE MILESTONES)
        ======================================================== */}
        <div className="relative my-8 sm:my-14">

          {/* Desktop & Tablet Horizontal Timeline */}
          <div className="hidden md:block relative">
            <div className="relative w-full h-24 flex items-center">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 1000 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="whiteTimelineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#5DBA58" />
                    <stop offset="40%" stopColor="#4ea849" />
                    <stop offset="70%" stopColor="#10264B" />
                    <stop offset="100%" stopColor="#5DBA58" />
                  </linearGradient>

                  <filter id="whiteTimelineGlow" x="-20%" y="-100%" width="140%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Base guide track */}
                <line
                  x1="80"
                  y1="30"
                  x2="920"
                  y2="30"
                  stroke="#E2EDFA"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />

                {/* Ambient glowing line */}
                <line
                  x1="80"
                  y1="30"
                  x2="920"
                  y2="30"
                  stroke="url(#whiteTimelineGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.35"
                  filter="url(#whiteTimelineGlow)"
                />

                {/* Solid core timeline path */}
                <line
                  x1="80"
                  y1="30"
                  x2="920"
                  y2="30"
                  stroke="url(#whiteTimelineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Traveling glowing particle */}
                <circle r="6" fill="#5DBA58" filter="url(#whiteTimelineGlow)">
                  <animate
                    attributeName="cx"
                    from="80"
                    to="920"
                    dur="7s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="cy"
                    values="30;30"
                    dur="7s"
                    repeatCount="indefinite"
                  />
                </circle>
              </svg>

              {/* 5 Timeline Milestones positioned evenly on the track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-10 lg:px-20">
                {MILESTONES.map((milestone, idx) => {
                  const Icon = milestone.icon;
                  const isCurrent = activeNode === idx;

                  return (
                    <div
                      key={idx}
                      className="relative flex flex-col items-center cursor-pointer group select-none"
                      onClick={() => setActiveNode(idx)}
                    >
                      {/* Node Circle */}
                      <div className="relative flex items-center justify-center">
                        {isCurrent && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: 2.2, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
                            className="absolute w-8 h-8 rounded-full"
                            style={{ backgroundColor: milestone.color }}
                          />
                        )}

                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isCurrent
                            ? 'scale-110 border-white text-white shadow-[0_0_20px_rgba(93,186,88,0.5)]'
                            : 'border-[#CBD5E1] bg-white text-[#526B91] hover:border-[#5DBA58] hover:text-[#5DBA58] shadow-xs'
                            }`}
                          style={{
                            backgroundColor: isCurrent ? milestone.color : '#FFFFFF',
                            borderColor: isCurrent ? '#FFFFFF' : undefined,
                          }}
                        >
                          <Icon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'currentColor'}`} />
                        </div>
                      </div>

                      {/* Milestone Details */}
                      <div className="mt-5 text-center flex flex-col items-center max-w-[170px]">
                        <h4
                          className={`text-sm lg:text-base font-bold tracking-tight transition-colors ${isCurrent ? 'text-[#092653]' : 'text-[#334155] group-hover:text-[#5DBA58]'
                            }`}
                        >
                          {milestone.title}
                        </h4>
                        <p className="text-xs text-[#64748B] mt-1.5 leading-snug">
                          {milestone.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="md:hidden space-y-6 relative pl-6 border-l-2 border-[#5DBA58]/30">
            {MILESTONES.map((milestone, idx) => {
              const Icon = milestone.icon;
              const isCurrent = activeNode === idx;

              return (
                <div
                  key={idx}
                  className="relative pl-4 cursor-pointer"
                  onClick={() => setActiveNode(idx)}
                >
                  <div
                    className="absolute -left-[31px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: milestone.color,
                      backgroundColor: isCurrent ? milestone.color : '#FFFFFF',
                    }}
                  >
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-[#5DBA58]'}`} />
                  </div>

                  <div className="p-4 rounded-xl bg-[#F8FBFF] border border-[#E2EDFA] shadow-2xs">
                    <h4 className="text-sm font-bold text-[#092653]">{milestone.title}</h4>
                    <p className="text-xs text-[#64748B] mt-1">{milestone.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
