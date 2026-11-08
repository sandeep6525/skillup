import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { getMediaUrl } from '../utils/mediaUrl';
import {
  Calendar,
  MapPin,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Trophy,
  ExternalLink,
  ArrowUpRight,
  MessageCircle,
} from 'lucide-react';

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.76v8.37H6.46v-8.37M7.84 6.88a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
    </svg>
  );
}

interface AchievementImage {
  id: string;
  imageUrl: string;
  caption?: string;
  displayOrder: number;
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
  category?: { id: string; name: string; slug: string };
  isFeatured: boolean;
  images: AchievementImage[];
  createdAt: string;
}

export const AchievementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Lightbox Modal state
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Fetch Achievement details
  const { data: achievement, isLoading, error } = useQuery<Achievement>({
    queryKey: ['achievement-detail', id],
    queryFn: async () => {
      const res = await api.get(`/achievements/${id}`);
      return res.data?.data;
    },
    enabled: Boolean(id),
  });

  // Fetch Related Achievements
  const { data: relatedData } = useQuery({
    queryKey: ['related-achievements', achievement?.category?.slug],
    queryFn: async () => {
      const catSlug = achievement?.category?.slug;
      const res = await api.get(`/achievements?limit=4${catSlug ? `&category=${catSlug}` : ''}`);
      return res.data?.data?.items?.filter((item: Achievement) => item.id !== achievement?.id) || [];
    },
    enabled: Boolean(achievement?.category?.slug),
  });

  const relatedItems: Achievement[] = relatedData || [];

  // All display photos: cover image + gallery images
  const allPhotos: { url: string; caption: string }[] = [];
  if (achievement?.coverImage) {
    allPhotos.push({
      url: getMediaUrl(achievement.coverImage),
      caption: achievement.title,
    });
  }
  if (achievement?.images && achievement.images.length > 0) {
    achievement.images.forEach((img) => {
      allPhotos.push({
        url: getMediaUrl(img.imageUrl),
        caption: img.caption || achievement.title,
      });
    });
  }

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeLightboxIndex === null) return;
      if (e.key === 'Escape') setActiveLightboxIndex(null);
      if (e.key === 'ArrowLeft' && activeLightboxIndex > 0) {
        setActiveLightboxIndex(activeLightboxIndex - 1);
      }
      if (e.key === 'ArrowRight' && activeLightboxIndex < allPhotos.length - 1) {
        setActiveLightboxIndex(activeLightboxIndex + 1);
      }
    },
    [activeLightboxIndex, allPhotos.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Social Sharing
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = achievement ? `${achievement.title} - SkillUp Achievement` : 'SkillUp Achievement';

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} - ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-white">
        <div className="w-10 h-10 border-3 border-[#55B957] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Loading achievement story...</p>
      </div>
    );
  }

  if (error || !achievement) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
          <Trophy className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#102A56]">Achievement Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The requested achievement record could not be found or may have been unlisted.
        </p>
        <Link
          to="/achievements"
          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#55B957] text-white text-xs font-semibold hover:bg-[#46a548] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Achievements
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Breadcrumb Nav */}
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-[72px] z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            to="/achievements"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#102A56] hover:text-[#55B957] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Achievements</span>
          </Link>

          {/* Social Share Buttons: WhatsApp & LinkedIn */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 bg-white shadow-2xs transition-colors cursor-pointer"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handleLinkedInShare}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:bg-[#EAF5EA] px-3 py-1.5 rounded-full border border-blue-200 bg-white shadow-2xs transition-colors cursor-pointer"
              title="Share on LinkedIn"
            >
              <LinkedInIcon className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">LinkedIn</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
              title="Copy link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Header Block */}
        <header className="space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#092653] leading-tight tracking-tight">
            {achievement.title}
          </h1>

          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 pt-1 border-b border-slate-200/80 pb-4">
            {achievement.eventDate && (
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <Calendar className="w-4 h-4 text-blue-600" />
                {new Date(achievement.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {achievement.location && (
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <MapPin className="w-4 h-4 text-rose-500" />
                {achievement.location}
              </span>
            )}
          </div>
        </header>

        {/* Hero Cover Image */}
        {achievement.coverImage && (
          <div
            onClick={() => setActiveLightboxIndex(0)}
            className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm aspect-video sm:aspect-21/9 bg-slate-100 cursor-pointer group"
          >
            <img
              src={getMediaUrl(achievement.coverImage)}
              alt={achievement.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80';
              }}
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 px-4 py-2 rounded-full bg-white/95 text-slate-900 font-bold text-xs shadow-lg transition-opacity flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> View Fullscreen
              </span>
            </div>
          </div>
        )}

        {/* Short Summary Highlight Callout */}
        {achievement.shortSummary && (
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
            <p className="text-sm sm:text-base text-[#102A56] font-medium leading-relaxed">
              &quot;{achievement.shortSummary}&quot;
            </p>
          </div>
        )}

        {/* Description Body */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-lg font-bold text-[#102A56]">Story & Milestones</h2>
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed space-y-4 whitespace-pre-line">
            {achievement.description}
          </div>
        </section>

        {/* Photo Gallery Grid */}
        {achievement.images && achievement.images.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#102A56]">Event Photo Gallery</h2>
                <p className="text-xs text-slate-500">Click any image to view in full resolution</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {achievement.images.length} {achievement.images.length === 1 ? 'photo' : 'photos'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {achievement.images.map((img, idx) => {
                const lightboxIdx = achievement.coverImage ? idx + 1 : idx;
                return (
                  <div
                    key={img.id || idx}
                    onClick={() => setActiveLightboxIndex(lightboxIdx)}
                    className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/90 cursor-pointer shadow-2xs hover:shadow-md hover:border-[#55B957]/50 transition-all"
                  >
                    <img
                      src={getMediaUrl(img.imageUrl)}
                      alt={img.caption || `Gallery photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      {img.caption && (
                        <p className="text-[11px] font-medium text-white line-clamp-1">{img.caption}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Related Achievements */}
        {relatedItems.length > 0 && (
          <section className="pt-8 border-t border-slate-200 space-y-4">
            <h2 className="text-lg font-bold text-[#102A56]">More Stories & Recognition</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/achievements/${item.slug || item.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-[#55B957]/50 transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                    <img
                      src={
                        getMediaUrl(item.coverImage) ||
                        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&q=80'
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#102A56] line-clamp-2 mt-0.5 group-hover:text-[#55B957]">
                      {item.title}
                    </h4>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-[#55B957] flex items-center justify-end gap-0.5">
                    <span>Read</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      {/* ========================================================
          FULL-SCREEN LIGHTBOX MODAL WITH FRAMER-MOTION
      ======================================================== */}
      <AnimatePresence>
        {activeLightboxIndex !== null && allPhotos[activeLightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none"
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white/80 max-w-6xl">
              <span className="text-xs font-semibold tracking-wider">
                {activeLightboxIndex + 1} of {allPhotos.length}
              </span>
              <button
                onClick={() => setActiveLightboxIndex(null)}
                className="p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Central Image with Prev / Next */}
            <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center py-4">
              {activeLightboxIndex > 0 && (
                <button
                  onClick={() => setActiveLightboxIndex(activeLightboxIndex - 1)}
                  className="absolute left-2 sm:left-4 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-xs transition-all z-10 cursor-pointer"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <motion.img
                key={activeLightboxIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                src={allPhotos[activeLightboxIndex].url}
                alt={allPhotos[activeLightboxIndex].caption || 'Lightbox View'}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              />

              {activeLightboxIndex < allPhotos.length - 1 && (
                <button
                  onClick={() => setActiveLightboxIndex(activeLightboxIndex + 1)}
                  className="absolute right-2 sm:right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-xs transition-all z-10 cursor-pointer"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Caption */}
            <div className="text-center text-white/90 text-xs sm:text-sm font-medium max-w-xl pb-2">
              {allPhotos[activeLightboxIndex].caption}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
