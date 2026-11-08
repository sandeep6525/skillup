import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AccordionGallery from '../components/AccordionGallery';
import { MultiLineTypewriter } from '../components/MultiLineTypewriter';
import AeroShards from '../components/AeroShards';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  ArrowRight,
  Star,
  Users,
  Play,
  Award,
  Clock,
  Video,
  Code,
  Database,
  ChevronRight,
  GraduationCap,
  X,
  Laptop,
  UserCheck,
  Brain,
  FileCode2,
  FolderKanban,
  FileText,
  Building,
  PlayCircle,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartnerLogoCarousel } from '../components/PartnerLogoCarousel';
import { HomeFeedbackSection } from '../components/HomeFeedbackSection';
import { HomeLiveClassesSection } from '../components/HomeLiveClassesSection';

export const HomePage: React.FC = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load fully connected homepage CMS data from backend
  const { data: homeData, isLoading } = useQuery({
    queryKey: ['homepage-dynamic-data'],
    queryFn: async () => {
      const res = await api.get('/homepage');
      return res.data?.data || {};
    },
  });

  // Load public accordion gallery from admin backend
  const { data: galleryData, isLoading: isGalleryLoading } = useQuery({
    queryKey: ['homepage-gallery-public'],
    queryFn: async () => {
      const res = await api.get('/gallery/public');
      return res.data?.data || { items: [], settings: {} };
    },
  });

  const galleryItems = galleryData?.items || [];
  const gallerySettings = galleryData?.settings || {
    badge: 'EXPLORE SKILLUP',
    sectionTitle: 'Discover. Learn. Create.',
    sectionDesc: 'Experience our world-class hands-on ecosystem designed to transform beginners into industry-ready engineers.',
    defaultIndex: 2,
    isEnabled: true,
  };

  const featuredCourses = homeData?.featuredCourses || [];
  const liveClasses = homeData?.liveClasses || [];
  const materials = homeData?.materials || [];
  const internships = homeData?.internships || [];
  const banners = homeData?.banners || [];
  const activeBanner = banners.length > 0 ? banners[0] : null;

  const stats = homeData?.stats || {
    totalStudents: 0,
    totalMentors: 0,
    totalCourses: 0,
    totalLiveClasses: 0,
    totalMaterials: 0,
    totalProjects: 0,
    studentSatisfaction: '95%',
  };

  // Top 4 courses for the right floating panel in hero
  const popularCourses = featuredCourses.slice(0, 4);

  // Responsive device tier detection for Hero Background Animation:
  // - desktop: Large monitors (1440px+) -> 680 shards (optimized by ~48%), smooth cinematic flow
  // - laptop: Standard laptops (1024px - 1439px) -> 480 shards, minimal depth/glow, no lag
  // - tablet: Tablets (768px - 1023px) -> 260 shards, reduced complexity
  // - mobile: (< 768px) -> 0 particles, completely disabled WebGPU/canvas overhead
  const [deviceTier, setDeviceTier] = useState<'mobile' | 'tablet' | 'laptop' | 'desktop'>('laptop');

  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        if (width < 768) {
          setDeviceTier('mobile');
        } else if (width < 1024) {
          setDeviceTier('tablet');
        } else if (width < 1440) {
          setDeviceTier('laptop');
        } else {
          setDeviceTier('desktop');
        }
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-w-0 bg-[#F7FAF7] text-[#171717] font-sans overflow-x-hidden selection:bg-[#5DBA58] selection:text-white">
      {/* ========================================================
          1. CLEAN CENTERED HERO SECTION WITH RESPONSIVE BACKGROUND
          - Desktop (1440px+): 680 shards (~48% reduction), smooth 60fps cinematic flow
          - Laptop (1024px - 1439px): 480 shards, minimal blur, zero GPU lag or stutter
          - Tablet (768px - 1023px): 260 shards, lightweight rendering
          - Mobile (< 768px): Completely disabled, clean white background, zero canvas overhead
          - Completely center-aligned headline, description, and action buttons
          - Palette: #5DBA58, #000000, #FFFFFF, #F7FAF7, #EAF5EA, #171717
      ======================================================== */}
      <section className="relative flex flex-col justify-center items-center overflow-hidden bg-white text-[#171717] pt-20 sm:pt-28 pb-18 sm:pb-24 border-b border-slate-200/70">
        
        {/* Animated Background Layers (Rendered only on >= 768px, completely absent on Mobile) */}
        {deviceTier !== 'mobile' && (
          <div className="hidden md:block absolute inset-0 z-0 pointer-events-auto motion-reduce:hidden will-change-transform">
            <AeroShards
              shardColor="#5DBA58"
              accentColor="#267A36"
              backgroundColor="transparent"
              placement="full"
              material="glass"
              markers="plus"
              count={deviceTier === 'desktop' ? 680 : deviceTier === 'laptop' ? 480 : 260}
              depthOfField={deviceTier === 'desktop' ? 0.45 : 0.25}
              vignette={0.08}
              mouseInteraction
              pulseOnClick
              holdToGather
              lightMode={true}
              shardSize={1.05}
              spread={1}
              twist={0.7}
              billow={0.8}
              speed={0.65}
              scale={1}
              glow={deviceTier === 'desktop' ? 0.25 : 0.1}
              grain={0.02}
              intro
              mouseStrength={0.45}
              parallax={0.35}
              paused={false}
            />
          </div>
        )}

        {/* Atmosphere Overlays - Desktop and Tablet only; Lightweight blur avoiding lag */}
        <div className="hidden md:block absolute inset-0 bg-white/10 pointer-events-none z-[1]" />
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-[#EAF5EA]/35 blur-[80px] rounded-full pointer-events-none z-[2]" />

        {/* Hero Main Content Container - Centered */}
        <div className="max-w-4xl w-full mx-auto px-6 sm:px-10 relative z-10 text-center flex flex-col items-center">
          
          {/* Main Headline: Centered with green accent gradient */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-6xl lg:text-[64px] font-black tracking-tight leading-[1.12] text-[#000000] text-center"
          >
            <MultiLineTypewriter
              lines={[
                {
                  text: 'Learn Skills.',
                  className: 'text-[#000000]',
                },
                {
                  text: 'Build Projects.',
                  className:
                    'text-transparent bg-clip-text bg-gradient-to-r from-[#5DBA58] via-[#4ea849] to-[#3a8b36]',
                },
                {
                  text: 'Launch Your Career.',
                  className: 'text-[#000000]',
                },
              ]}
              typingSpeed={45}
              pauseDuration={2400}
              cursorColor="#5DBA58"
              cursorCharacter="_"
            />
          </motion.h1>

          {/* Centered Professional Description */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-base sm:text-xl text-[#171717]/75 font-normal leading-relaxed max-w-2xl mx-auto mt-6"
          >
            Your journey from beginner to industry-ready developer starts here.
          </motion.p>

          {/* Centered Dual Call To Actions */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-8"
          >
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm sm:text-base font-semibold text-white bg-[#5DBA58] hover:bg-[#4ea849] active:scale-95 rounded-full shadow-[0_8px_24px_rgba(93,186,88,0.35)] transition-all group cursor-pointer"
            >
              <span>Explore Courses</span>
              <span className="transition-transform group-hover:translate-x-1 font-bold">→</span>
            </Link>

            <Link
              to={user ? "/courses" : "/register"}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm sm:text-base font-medium text-[#171717] hover:text-[#5DBA58] bg-[#EAF5EA] hover:bg-[#d8eed8] border border-[#5DBA58]/30 active:scale-95 rounded-full transition-all cursor-pointer shadow-xs"
            >
              <div className="w-5 h-5 rounded-full bg-[#5DBA58] flex items-center justify-center text-white">
                <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
              </div>
              <span>Start Your Journey</span>
            </Link>
          </motion.div>

        </div>

      </section>

      {/* ========================================================
          CLEAN SECTION: PARTNERS, COURSES, & OTHER CONTENT
      ======================================================== */}
      <div className="bg-[#F7FAF7] text-[#171717] pt-12 pb-16">
        
        {/* OUR TRUSTED PARTNERS */}
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 mb-12 bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
          <PartnerLogoCarousel />
        </div>

      {/* ========================================================
          3. EXPLORE OUR COURSES (PREMIUM EDTECH REDESIGN)
      ======================================================== */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
        
        {/* Horizontal Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div>
             
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102A56] tracking-tight">
              Explore Our Courses
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-1.5 font-normal max-w-xl">
              Learn in-demand technologies through practical courses designed for real-world careers.
            </p>
          </div>

          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#5DBA58] hover:bg-[#4ea849] active:scale-95 rounded-xl shadow-xs transition-all self-start sm:self-auto group cursor-pointer"
          >
            <span>View All Courses</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Dynamic Courses Cards Grid (4 cols on xl/2xl, 3 cols on lg, 2 cols on sm/md, 1 on mobile) */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs animate-pulse space-y-4"
              >
                <div className="w-full h-44 bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-1/2 pt-4" />
              </div>
            ))}
          </div>
        ) : featuredCourses.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#CBD5E1] shadow-2xs">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#102A56]">No courses published yet</h3>
            <p className="text-sm text-[#64748B] mt-1">Check back soon for new releases and mentor sessions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredCourses.map((course: any, idx: number) => {
              const currentPrice = Number(course.discountPrice || course.price);
              const originalPrice = Number(course.price);
              const hasDiscount = course.discountPrice && currentPrice < originalPrice;
              const categoryName = course.category?.name || 'Computer Science';
              const level = course.level || 'All Levels';

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="h-full"
                >
                  <Link
                    to={`/courses/${course.slug}`}
                    className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#5DBA58]/50 p-4 shadow-xs hover:shadow-xl hover:shadow-[#5DBA58]/10 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1.5"
                  >
                    <div>
                      {/* Course Thumbnail */}
                      <div className="relative w-full h-44 rounded-xl overflow-hidden mb-4 bg-slate-100 border border-slate-100">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EAF5EA] to-slate-100">
                            <Code className="w-10 h-10 text-[#5DBA58]" />
                          </div>
                        )}

                        {/* Top Category Badge Overlay */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/95 text-[#102A56] backdrop-blur-md shadow-xs border border-white/40">
                            {categoryName}
                          </span>
                        </div>

                        {/* Level Badge Overlay */}
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#102A56]/85 text-white backdrop-blur-md">
                            {level}
                          </span>
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-bold text-[#102A56] group-hover:text-[#5DBA58] transition-colors leading-snug line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Course Description */}
                      <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed line-clamp-2">
                        {course.subtitle || course.description}
                      </p>
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="mt-5 pt-3.5 border-t border-[#F1F5F9] flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#102A56]">
                          {currentPrice === 0 ? 'Free' : `₹${currentPrice.toLocaleString('en-IN')}`}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-[#94A3B8] line-through">
                            ₹{originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5DBA58] group-hover:text-[#4ea849] transition-colors">
                        <span>Explore</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================
          4. PREMIUM DARK GREEN FEATURE HIGHLIGHT SECTION
      ======================================================== */}
      <section className="relative mt-14 sm:mt-20 overflow-hidden">
        <div className="relative bg-[#000000] border-t border-b border-zinc-800 text-white py-12 sm:py-14 px-4 sm:px-6 lg:px-8">
          {/* Subtle green ambient gradient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[220px] bg-[#5DBA58]/10 blur-[140px] rounded-full pointer-events-none" />

          <div className="max-w-[1340px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-10 divide-y sm:divide-y-0 lg:divide-x divide-zinc-800">
            {/* 1. Experienced Mentors */}
            <div className="flex items-center gap-4 group p-2 transition-all">
              <div className="w-13 h-13 rounded-2xl bg-zinc-900 border border-[#5DBA58]/30 flex items-center justify-center shrink-0 text-[#5DBA58] backdrop-blur-md shadow-[0_0_15px_rgba(93,186,88,0.15)] group-hover:border-[#5DBA58] group-hover:shadow-[0_0_20px_rgba(93,186,88,0.35)] group-hover:scale-105 transition-all">
                <UserCheck className="w-6 h-6 text-[#5DBA58] group-hover:text-[#5DBA58] transition-colors" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF] leading-snug group-hover:text-[#5DBA58] transition-colors">
                  Experienced Mentors
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                  Learn from software engineers and professionals
                </p>
              </div>
            </div>

            {/* 2. Scheduled Live Classes */}
            <div className="flex items-center gap-4 group p-2 pt-6 sm:pt-2 lg:pl-8 transition-all">
              <div className="w-13 h-13 rounded-2xl bg-zinc-900 border border-[#5DBA58]/30 flex items-center justify-center shrink-0 text-[#5DBA58] backdrop-blur-md shadow-[0_0_15px_rgba(93,186,88,0.15)] group-hover:border-[#5DBA58] group-hover:shadow-[0_0_20px_rgba(93,186,88,0.35)] group-hover:scale-105 transition-all">
                <Video className="w-6 h-6 text-[#5DBA58] group-hover:text-[#5DBA58] transition-colors" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF] leading-snug group-hover:text-[#5DBA58] transition-colors">
                  Scheduled Live Classes
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                  Live sessions and interactive Q&A
                </p>
              </div>
            </div>

            {/* 3. Practical Projects */}
            <div className="flex items-center gap-4 group p-2 pt-6 sm:pt-2 lg:pl-8 transition-all">
              <div className="w-13 h-13 rounded-2xl bg-zinc-900 border border-[#5DBA58]/30 flex items-center justify-center shrink-0 text-[#5DBA58] backdrop-blur-md shadow-[0_0_15px_rgba(93,186,88,0.15)] group-hover:border-[#5DBA58] group-hover:shadow-[0_0_20px_rgba(93,186,88,0.35)] group-hover:scale-105 transition-all">
                <FileCode2 className="w-6 h-6 text-[#5DBA58] group-hover:text-[#5DBA58] transition-colors" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF] leading-snug group-hover:text-[#5DBA58] transition-colors">
                  Practical Projects
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                  Build portfolio-ready applications
                </p>
              </div>
            </div>

            {/* 4. Course Certificates */}
            <div className="flex items-center gap-4 group p-2 pt-6 sm:pt-2 lg:pl-8 transition-all">
              <div className="w-13 h-13 rounded-2xl bg-zinc-900 border border-[#5DBA58]/30 flex items-center justify-center shrink-0 text-[#5DBA58] backdrop-blur-md shadow-[0_0_15px_rgba(93,186,88,0.15)] group-hover:border-[#5DBA58] group-hover:shadow-[0_0_20px_rgba(93,186,88,0.35)] group-hover:scale-105 transition-all">
                <Award className="w-6 h-6 text-[#5DBA58] group-hover:text-[#5DBA58] transition-colors" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF] leading-snug group-hover:text-[#5DBA58] transition-colors">
                  Course Certificates
                </h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">
                  Verified certificates upon course completion
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. REDESIGNED LIVE CLASSES & INDUSTRY MENTOR SECTION
      ======================================================== */}
      <HomeLiveClassesSection />

      {/* ========================================================
          6. COURSE STUDY MATERIALS (PREMIUM RESOURCE LIBRARY)
      ======================================================== */}
      {materials.length > 0 && (
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EA] border border-[#5DBA58]/30 text-[#5DBA58] text-xs font-semibold tracking-wide mb-2.5">
                <FileText className="w-3.5 h-3.5 text-[#5DBA58]" />
                <span>KNOWLEDGE REPOSITORY</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102A56] tracking-tight">
                Course Study Materials
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] mt-1.5 font-normal max-w-xl">
                Reference guides, interview cheat-sheets, source code, and developer handbooks.
              </p>
            </div>

            <Link
              to="/materials"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#102A56] hover:text-[#5DBA58] bg-white border border-[#E2E8F0] hover:border-[#5DBA58]/40 rounded-xl shadow-2xs hover:shadow-md transition-all self-start sm:self-auto group cursor-pointer"
            >
              <span>View All Materials</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Dynamic Resource Cards Grid (3 or 4 columns on large screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {materials.map((mat: any, idx: number) => {
              const fileType = String(mat.type || 'PDF').toUpperCase();
              const price = Number(mat.price || 0);
              const isFree = mat.isFree || price === 0;
              const category = mat.category || 'Development';

              // Select tailored icon and color for document types
              const isPdf = fileType.includes('PDF');
              const isCode = fileType.includes('CODE') || fileType.includes('DEV');
              const isZip = fileType.includes('ZIP') || fileType.includes('ARCHIVE');

              return (
                <motion.div
                  key={mat.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                  className="h-full"
                >
                  <div className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#5DBA58]/50 p-5 shadow-xs hover:shadow-xl hover:shadow-[#5DBA58]/10 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1.5">
                    <div>
                      {/* Top Badges: File Type & Price */}
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider ${
                            isPdf
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isCode
                              ? 'bg-[#EAF5EA] text-[#5DBA58] border border-[#5DBA58]/30'
                              : isZip
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isPdf && <FileText className="w-3.5 h-3.5" />}
                          {isCode && <FileCode2 className="w-3.5 h-3.5" />}
                          {isZip && <FolderKanban className="w-3.5 h-3.5" />}
                          {!isPdf && !isCode && !isZip && <BookOpen className="w-3.5 h-3.5" />}
                          <span>{fileType}</span>
                        </span>

                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            isFree
                              ? 'bg-[#EAF5EA] text-[#5DBA58] border border-[#5DBA58]/30'
                              : 'bg-[#102A56]/5 text-[#102A56] font-bold'
                          }`}
                        >
                          {isFree ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-[#102A56] group-hover:text-[#5DBA58] transition-colors leading-snug line-clamp-2">
                        {mat.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-[#64748B] mt-2 leading-relaxed line-clamp-3">
                        {mat.description}
                      </p>
                    </div>

                    {/* Card Footer: Category / Associated Course & Details Button */}
                    <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#94A3B8] truncate max-w-[130px]">
                        {mat.course?.title || category}
                      </span>

                      <Link
                        to="/materials"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5DBA58] group-hover:text-[#4ea849] transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          7. INTERNSHIP PROGRAMS (CAREER OPPORTUNITIES SHOWCASE)
      ======================================================== */}
      {internships.length > 0 && (
        <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-xs font-semibold tracking-wide mb-2.5">
                <Building className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>INDUSTRY IMMERSION</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#102A56] tracking-tight">
                Internship Programs
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] mt-1.5 font-normal max-w-xl">
                Hands-on project work, code reviews, and mentorship to jumpstart your professional career.
              </p>
            </div>

            <Link
              to="/internship"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#102A56] hover:text-[#2563EB] bg-white border border-[#E2E8F0] hover:border-blue-300 rounded-xl shadow-2xs hover:shadow-md transition-all self-start sm:self-auto group cursor-pointer"
            >
              <span>View All Internships</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Dynamic Internship Grid (2 or 3 columns) */}
          <div
            className={`grid gap-6 sm:gap-8 ${
              internships.length === 1
                ? 'grid-cols-1 max-w-3xl mx-auto'
                : internships.length === 2
                ? 'grid-cols-1 lg:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {internships.map((item: any, idx: number) => {
              const techList = item.technologies
                ? item.technologies.split(',').map((t: string) => t.trim())
                : [];
              const banner = item.bannerUrl ? getMediaUrl(item.bannerUrl) : null;
              const deliveryMode = item.deliveryMode || 'Hybrid';
              const duration = item.duration || '3 Months';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="h-full"
                >
                  <div className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-blue-500/40 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1.5">
                    <div>
                      {/* Optional Top Banner Preview */}
                      {banner && (
                        <Link
                          to={`/internship/${item.id}`}
                          className="block w-full h-40 rounded-xl overflow-hidden mb-5 bg-slate-100 border border-slate-100"
                        >
                          <img
                            src={banner}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </Link>
                      )}

                      {/* Header Badge & Duration */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.organization || 'SkillUp Partner Network'}</span>
                        </span>

                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B]">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{duration}</span>
                        </span>
                      </div>

                      {/* Internship Title (Clickable) */}
                      <Link to={`/internship/${item.id}`} className="block">
                        <h3 className="text-xl font-bold text-[#102A56] group-hover:text-[#2563EB] transition-colors leading-snug">
                          {item.title}
                        </h3>
                      </Link>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-[#64748B] mt-2.5 line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Technology Stack Badges */}
                      {techList.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {techList.map((tech: string, i: number) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#102A56] text-[11px] font-semibold"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Eligibility Note */}
                      {item.eligibility && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#64748B]">
                          <ShieldCheck className="w-4 h-4 text-[#5DBA58] shrink-0" />
                          <span className="truncate">Eligibility: {item.eligibility}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-7 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
                      <Link
                        to={`/internship/${item.id}`}
                        className="text-xs font-bold text-[#64748B] hover:text-[#102A56] transition-colors"
                      >
                        <span>View Details</span>
                      </Link>

                      <Link
                        to={user ? `/internship/${item.id}?action=apply` : `/login?redirect=${encodeURIComponent(`/internship/${item.id}?action=apply`)}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#5DBA58] hover:bg-[#4ea849] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        <span>Apply Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          8. STUDENT & MENTOR FEEDBACK SECTION
      ======================================================== */}
      <div className="mt-14 sm:mt-18">
        <HomeFeedbackSection />
      </div>

      {/* ========================================================
          NEW SECTION: ACCORDION IMAGE GALLERY (ADMIN-CONTROLLED)
      ======================================================== */}
      {gallerySettings.isEnabled !== false && (galleryItems.length > 0 || isGalleryLoading) && (
        <section className="relative w-full bg-[#000000] border-t border-b border-zinc-800 py-20 px-4 sm:px-6 lg:px-8 mt-16 overflow-hidden">
          {/* Subtle background ambient green glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#5DBA58]/10 blur-[130px] rounded-full pointer-events-none -z-0" />

          <div className="relative max-w-[1340px] mx-auto z-10">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
               
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                {gallerySettings.sectionTitle || 'Discover. Learn. Create.'}
              </h2>
              {gallerySettings.sectionDesc && (
                <p className="mt-4 text-base sm:text-lg text-zinc-400 font-normal leading-relaxed">
                  {gallerySettings.sectionDesc}
                </p>
              )}
            </div>

            {/* Accordion Gallery Component */}
            {isGalleryLoading ? (
              <div className="w-full h-[520px] rounded-3xl bg-zinc-900/60 border border-zinc-800/80 animate-pulse flex items-center justify-center">
                <span className="text-sm font-medium text-[#5DBA58]">Loading gallery showcase...</span>
              </div>
            ) : galleryItems.length > 0 ? (
              <div className="w-full">
                <AccordionGallery
                  items={galleryItems.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    label: item.label || item.title,
                    description: item.description,
                    image: getMediaUrl(item.imageUrl),
                    link: item.link || item.targetLink,
                  }))}
                  defaultIndex={gallerySettings.defaultIndex ?? 2}
                  height={520}
                />
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* ========================================================
          10. CALL TO ACTION BANNER – BLACK & GREEN (#5DBA58)
      ======================================================== */}
      <section className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[24px] bg-[#000000] border border-zinc-800 text-white p-8 sm:p-12 lg:p-14 overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col lg:flex-row items-center justify-between gap-8 group"
        >
          {/* Subtle Green Gradient Glows */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#5DBA58]/15 blur-[100px] pointer-events-none group-hover:bg-[#5DBA58]/25 transition-all duration-700" />
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#5DBA58]/10 blur-[90px] pointer-events-none" />

          {/* Heading & Supporting Content */}
          <div className="space-y-3 max-w-xl text-center lg:text-left z-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
              Start Learning with SkillUp
            </h2>
            <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed">
              Explore our courses, join live mentor sessions, and practice building real software projects.
            </p>
          </div>

          {/* CTA Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 z-10 w-full sm:w-auto">
            {/* Primary Action Button: Green */}
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 text-xs sm:text-sm font-semibold text-white bg-[#5DBA58] hover:bg-[#4ea849] active:scale-95 rounded-full shadow-[0_0_25px_rgba(93,186,88,0.4)] transition-all flex items-center justify-center gap-2 group/btn"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>

            {/* Secondary Action Button: Clean bordered */}
            <Link
              to="/courses"
              className="w-full sm:w-auto px-7 py-3.5 text-xs sm:text-sm font-semibold text-white hover:text-[#5DBA58] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#5DBA58]/60 rounded-full transition-all flex items-center justify-center shadow-xs active:scale-95"
            >
              Browse All Courses
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ========================================================
          VIDEO DEMO MODAL
      ======================================================== */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800"
            >
              <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-[#5DBA58]" />
                  <span className="font-semibold text-white text-sm sm:text-base">SkillUp Overview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  src="https://www.w3schools.com/html/mov_bbb.mp4"
                >
                  Your browser does not support HTML5 video.
                </video>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};
