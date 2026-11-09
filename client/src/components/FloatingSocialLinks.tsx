import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND_CONFIG } from '../config/brandConfig';

interface SocialItem {
  id: 'linkedin' | 'youtube' | 'instagram';
  name: string;
  url: string;
  ariaLabel: string;
  brandColor: string;
  brandHoverBg: string;
  icon: React.ReactNode;
}

export const FloatingSocialLinks: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const socialLinks: SocialItem[] = [
    {
      id: 'linkedin',
      name: BRAND_CONFIG.socialLinks.linkedin.name,
      url: BRAND_CONFIG.socialLinks.linkedin.url,
      ariaLabel: BRAND_CONFIG.socialLinks.linkedin.label,
      brandColor: '#0A66C2',
      brandHoverBg: 'rgba(10, 102, 194, 0.08)',
      icon: (
        <svg
          className="w-5 h-5 transition-colors duration-200"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0 0-3.24 1.62 1.62 0 0 0 0 3.24m1.39 9.74v-8.37H5.07v8.37h2.78z" />
        </svg>
      ),
    },
    {
      id: 'youtube',
      name: BRAND_CONFIG.socialLinks.youtube.name,
      url: BRAND_CONFIG.socialLinks.youtube.url,
      ariaLabel: BRAND_CONFIG.socialLinks.youtube.label,
      brandColor: '#FF0000',
      brandHoverBg: 'rgba(255, 0, 0, 0.08)',
      icon: (
        <svg
          className="w-5 h-5 transition-colors duration-200"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: 'instagram',
      name: BRAND_CONFIG.socialLinks.instagram.name,
      url: BRAND_CONFIG.socialLinks.instagram.url,
      ariaLabel: BRAND_CONFIG.socialLinks.instagram.label,
      brandColor: '#E1306C',
      brandHoverBg: 'rgba(225, 48, 108, 0.08)',
      icon: (
        <svg
          className="w-5 h-5 transition-colors duration-200"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      aria-label="SkillUp Social Media Links"
      className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-3"
    >
      {socialLinks.map((item) => {
        const isHovered = hoveredId === item.id;

        return (
          <div key={item.id} className="relative flex items-center justify-end">
            {/* Platform Name Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.9 }}
                  transition={{ duration: 0.16 }}
                  className="hidden sm:flex absolute right-14 items-center pointer-events-none"
                >
                  <span
                    className="px-2.5 py-1 text-[12px] font-semibold text-white rounded-lg shadow-md whitespace-nowrap"
                    style={{ backgroundColor: item.brandColor }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="w-1.5 h-1.5 rotate-45 -ml-1"
                    style={{ backgroundColor: item.brandColor }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Circular Icon Button */}
            <motion.a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.ariaLabel}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(item.id)}
              onBlur={() => setHoveredId(null)}
              whileHover={{ scale: 1.12, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              style={{
                color: isHovered ? item.brandColor : '#475569',
                borderColor: isHovered ? item.brandColor : '#E2E8F0',
                backgroundColor: isHovered ? item.brandHoverBg : '#FFFFFF',
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#55B957]"
            >
              {item.icon}
            </motion.a>
          </div>
        );
      })}
    </aside>
  );
};

export default FloatingSocialLinks;

