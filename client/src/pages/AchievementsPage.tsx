import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { getMediaUrl } from '../utils/mediaUrl';
import { PageHeader } from '../components/PageHeader';
import {
  Trophy,
  Calendar,
  Search,
  ArrowRight,
  X,
  Award,
  CalendarDays,
  Users,
  Code2,
  Handshake,
  Star,
  CheckCircle2,
  Rocket,
  Image as ImageIcon,
} from 'lucide-react';

interface AchievementCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  _count?: { achievements: number };
}

interface AchievementImage {
  id?: string;
  imageUrl: string;
  caption?: string;
  displayOrder?: number;
}

interface Achievement {
  id: string;
  title: string;
  slug: string;
  shortSummary?: string;
  description: string;
  coverImage?: string;
  eventDate?: string;
  location?: string;
  categoryId: string;
  category?: AchievementCategory;
  isFeatured: boolean;
  images: AchievementImage[];
}

export const AchievementsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery<AchievementCategory[]>({
    queryKey: ['public-achievement-categories'],
    queryFn: async () => {
      const res = await api.get('/achievements/categories');
      return res.data?.data || [];
    },
  });

  // 2. Fetch Achievements
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['public-achievements', selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '50');
      const res = await api.get(`/achievements?${params.toString()}`);
      return (res.data?.data || []) as Achievement[];
    },
  });

  const allAchievements: Achievement[] = achievementsData || [];

  // Filter Bar Icons
  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'awards-recognition':
        return <Trophy className="w-3.5 h-3.5 text-[#55B957]" />;
      case 'events-workshops':
        return <CalendarDays className="w-3.5 h-3.5 text-[#55B957]" />;
      case 'student-achievements':
        return <Users className="w-3.5 h-3.5 text-slate-700" />;
      case 'projects-innovations':
        return <Code2 className="w-3.5 h-3.5 text-slate-700" />;
      case 'partnerships-collaborations':
        return <Handshake className="w-3.5 h-3.5 text-[#55B957]" />;
      case 'company-milestones':
        return <Star className="w-3.5 h-3.5 text-amber-500" />;
      case 'certifications':
        return <Award className="w-3.5 h-3.5 text-[#55B957]" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#55B957]" />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#171717] font-sans">
      {/* ========================================================
          1. HERO SECTION WITH UNIFIED PAGEHEADER
      ======================================================== */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
            {/* Left Content using PageHeader */}
            <div className="w-full md:max-w-xl">
              <PageHeader
                title="Our"
                highlight="Achievements"
                subtitle="Celebrating milestones, partnerships and student success."
              />
            </div>

            {/* Right Hero Visual: Trophy with Laurel and Green Ribbon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative w-full md:w-[580px] h-[190px] sm:h-[220px] flex items-center justify-end select-none pointer-events-none"
            >
              <svg
                viewBox="0 0 580 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full object-contain"
              >
                <defs>
                  <linearGradient id="greenRibbonM1" x1="0%" y1="0%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#EAF5EA" stopOpacity="0.4" />
                    <stop offset="30%" stopColor="#55B957" stopOpacity="0.85" />
                    <stop offset="60%" stopColor="#46a548" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#A3E635" stopOpacity="0.5" />
                  </linearGradient>

                  <linearGradient id="greenRibbonMShadow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2E692B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#46a548" stopOpacity="0.1" />
                  </linearGradient>

                  <linearGradient id="goldCupM" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FEF08A" />
                    <stop offset="25%" stopColor="#F59E0B" />
                    <stop offset="65%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#92400E" />
                  </linearGradient>

                  <linearGradient id="goldHighlightM" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFFBEB" />
                    <stop offset="50%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>

                  <linearGradient id="trophyBaseM" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0F172A" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                </defs>

                {/* Flowing Satin Ribbon Wave in Background */}
                <path
                  d="M0 130 C120 70, 200 160, 360 85 C420 55, 480 60, 580 110 L580 145 C490 90, 420 85, 360 115 C220 185, 120 100, 0 160 Z"
                  fill="url(#greenRibbonM1)"
                  opacity="0.85"
                />
                <path
                  d="M160 145 C240 185, 340 130, 420 80 C480 50, 540 70, 580 100 L580 115 C530 80, 470 65, 415 95 C330 145, 230 195, 150 155 Z"
                  fill="url(#greenRibbonMShadow)"
                  opacity="0.4"
                />

                {/* Confetti flakes */}
                <rect x="230" y="50" width="7" height="4" rx="1" fill="#F59E0B" opacity="0.8" transform="rotate(25 230 50)" />
                <rect x="290" y="70" width="6" height="4" rx="1" fill="#55B957" opacity="0.7" transform="rotate(-15 290 70)" />
                <rect x="330" y="30" width="8" height="5" rx="1" fill="#FBBF24" opacity="0.85" transform="rotate(40 330 30)" />
                <rect x="490" y="45" width="7" height="4" rx="1" fill="#F59E0B" opacity="0.7" transform="rotate(18 490 45)" />
                <rect x="520" y="80" width="8" height="5" rx="1" fill="#A3E635" opacity="0.8" transform="rotate(-25 520 80)" />

                {/* Trophy & Laurel around x=415, y=110 */}
                <g transform="translate(415, 110)">
                  {/* Left Laurel Wreath Branch */}
                  <g stroke="#D97706" strokeWidth="2.2" fill="none">
                    <path d="M-40 55 C-65 30, -68 -20, -32 -60" />
                    <path d="M-36 42 C-45 37, -49 28, -41 24 C-37 30, -34 36, -36 42 Z" fill="#F59E0B" />
                    <path d="M-48 20 C-58 15, -60 4, -50 1 C-45 7, -44 14, -48 20 Z" fill="#FBBF24" />
                    <path d="M-52 -5 C-63 -12, -63 -23, -53 -25 C-48 -19, -47 -11, -52 -5 Z" fill="#F59E0B" />
                    <path d="M-48 -30 C-57 -39, -54 -49, -44 -50 C-41 -43, -42 -35, -48 -30 Z" fill="#FBBF24" />
                    <path d="M-35 -52 C-41 -60, -36 -70, -26 -68 C-25 -60, -29 -54, -35 -52 Z" fill="#F59E0B" />
                  </g>

                  {/* Right Laurel Wreath Branch */}
                  <g stroke="#D97706" strokeWidth="2.2" fill="none">
                    <path d="M40 55 C65 30, 68 -20, 32 -60" />
                    <path d="M36 42 C45 37, 49 28, 41 24 C37 30, 34 36, 36 42 Z" fill="#F59E0B" />
                    <path d="M48 20 C58 15, 60 4, 50 1 C45 7, 44 14, 48 20 Z" fill="#FBBF24" />
                    <path d="M52 -5 C63 -12, 63 -23, 53 -25 C48 -19, 47 -11, 52 -5 Z" fill="#F59E0B" />
                    <path d="M48 -30 C57 -39, 54 -49, 44 -50 C41 -43, 42 -35, -48 -30 Z" fill="#FBBF24" />
                    <path d="M35 -52 C41 -60, 36 -70, 26 -68 C25 -60, 29 -54, 35 -52 Z" fill="#F59E0B" />
                  </g>

                  {/* Handles */}
                  <path d="M-28 -30 C-50 -30, -50 5, -25 10" stroke="url(#goldCupM)" strokeWidth="6" strokeLinecap="round" fill="none" />
                  <path d="M28 -30 C50 -30, 50 5, 25 10" stroke="url(#goldCupM)" strokeWidth="6" strokeLinecap="round" fill="none" />

                  {/* Cup */}
                  <path d="M-26 -48 L26 -48 C26 -48, 26 -2, 0 24 C-26 -2, -26 -48, -26 -48 Z" fill="url(#goldCupM)" stroke="#B45309" strokeWidth="1" />
                  <ellipse cx="0" cy="-48" rx="26" ry="4.5" fill="url(#goldHighlightM)" stroke="#B45309" strokeWidth="1" />
                  <polygon points="0,-24 2.5,-17 9.5,-16 4.5,-11 6,-4 0,-8 -6,-4 -4.5,-11 -9.5,-16 -2.5,-17" fill="#FFFBEB" opacity="0.9" />

                  {/* Stem & Pedestal */}
                  <path d="M-5 24 L5 24 L6 42 L-6 42 Z" fill="url(#goldCupM)" />
                  <ellipse cx="0" cy="43" rx="10" ry="2.5" fill="url(#goldHighlightM)" />
                  <path d="M-14 46 L14 46 L18 68 L-18 68 Z" fill="url(#trophyBaseM)" />
                  <rect x="-24" y="68" width="48" height="7" rx="2" fill="#020617" />
                </g>
              </svg>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. SEARCH AND CATEGORY FILTERS (Single Row)
      ======================================================== */}
      <section className="sticky top-[72px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] py-3">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input Bar */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search achievements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#55B957] focus:bg-white transition-all shadow-2xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills with real categories */}
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 flex-1">
              {/* All Button */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap shadow-xs ${
                  selectedCategory === 'all'
                    ? 'bg-[#55B957] text-white shadow-[#55B957]/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All
              </button>

              {/* Dynamic Category Pills */}
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-xs ${
                      isActive
                        ? 'bg-[#55B957] text-white shadow-[#55B957]/30 border-transparent'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : ''}>{getCategoryIcon(cat.slug)}</span>
                    <span>{cat.name}</span>
                    {cat._count && cat._count.achievements > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {cat._count.achievements}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. MASONRY GALLERY – MAIN SECTION
      ======================================================== */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 animate-pulse">
            {[340, 420, 290, 480, 360, 310].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className="bg-slate-100 rounded-2xl w-full break-inside-avoid"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && allAchievements.length === 0 && (
          <div className="max-w-md mx-auto text-center py-16 px-6 bg-slate-50/80 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF5EA] text-[#55B957] flex items-center justify-center mx-auto shadow-xs">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#000000]">Our next milestone is on its way.</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Stay connected as we continue creating new stories of growth and achievement.
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-[#55B957] hover:bg-[#EAF5EA] transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        )}

        {/* Masonry Layout Container */}
        {!isLoading && allAchievements.length > 0 && (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
            <AnimatePresence mode="popLayout">
              {allAchievements.map((item, idx) => {
                const aspectOptions = ['aspect-4/3', 'aspect-16/10', 'aspect-3/2', 'aspect-5/4'];
                const cardAspect = aspectOptions[idx % aspectOptions.length];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
                    className="break-inside-avoid mb-6"
                  >
                    <Link
                      to={`/achievements/${item.slug || item.id}`}
                      className="group block bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl hover:border-[#55B957]/50 transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* Image container */}
                      <div className={`relative ${cardAspect} bg-slate-100 overflow-hidden`}>
                        <img
                          src={
                            getMediaUrl(item.coverImage) ||
                            'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80'
                          }
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80';
                          }}
                        />

                        {/* Top-Left Date Pill */}
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow-sm backdrop-blur-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#55B957]" />
                            <span>
                              {item.eventDate
                                ? new Date(item.eventDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : 'Recent Milestone'}
                            </span>
                          </span>
                        </div>

                        {/* Multiple photos badge indicator */}
                        {item.images && item.images.length > 0 && (
                          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                            <ImageIcon className="w-3 h-3 text-[#55B957]" />
                            <span>{item.images.length} photos</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-2">
                        {/* Event Title */}
                        <h3 className="font-extrabold text-[#000000] text-base sm:text-lg leading-snug group-hover:text-[#55B957] transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                          {item.shortSummary || item.description}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#55B957] group-hover:text-[#46a548] transition-colors">
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>

                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-[#55B957] group-hover:text-white group-hover:border-[#55B957] transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ========================================================
            4. BOTTOM CTA BANNER
        ======================================================== */}
        <section className="relative rounded-2xl bg-[#000000] border border-zinc-800 p-6 sm:p-8 text-white shadow-md overflow-hidden mt-6">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#55B957]/20 blur-[100px] pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#55B957]/20 border border-[#55B957]/30 flex items-center justify-center shrink-0">
                <Rocket className="w-6 h-6 text-[#55B957]" />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-bold tracking-tight">Together for a brighter future</h4>
                <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
                  Join us in our mission to build skills, create opportunities and shape tomorrow.
                </p>
              </div>
            </div>

            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#55B957] hover:bg-[#46a548] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all shrink-0"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};
