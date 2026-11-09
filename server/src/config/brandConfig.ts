/**
 * Central Brand and Communication Configuration for SkillUp (Server-side)
 * Used across email templates, PDF exports, and system alerts.
 */

export const BRAND_CONFIG = {
  companyName: 'SkillUp',
  tagline: 'Student Skill Development Platform',
  mission: 'Empowering students through practical learning, expert mentorship and industry-focused training.',
  copyrightYear: 2026,

  // Official URLs
  websiteUrl: 'https://skillups.co.in',
  logoUrl: 'https://cdn.jsdelivr.net/gh/sandeep6525/skillup@main/client/public/logo.png',
  faviconUrl: 'https://cdn.jsdelivr.net/gh/sandeep6525/skillup@main/client/public/favicon.png',
  supportEmail: process.env.SMTP_FROM_EMAIL || 'support@skillup.com',
  privacyPolicyUrl: 'https://skillups.co.in/privacy',
  termsUrl: 'https://skillups.co.in/terms',

  // Social Media Profiles (Official TRI CUBE DIGITAL SOLUTIONS)
  socialLinks: {
    youtube: {
      name: 'YouTube',
      url: 'https://www.youtube.com/@tricube_digital_solutions/shorts',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/3670/3670147.png',
      brandColor: '#FF0000',
    },
    linkedin: {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/tri-cube-digital-solutions-undefined-061547407/',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/3536/3536505.png',
      brandColor: '#0A66C2',
    },
    instagram: {
      name: 'Instagram',
      url: 'https://www.instagram.com/tricube_digital_solutions?psln=OWZlaXM3a2l2Y3li',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/3955/3955024.png',
      brandColor: '#E1306C',
    },
  },

  // Color System (Official SkillUp Brand)
  colors: {
    primaryGreen: '#5DBA58',
    black: '#111111',
    white: '#FFFFFF',
    lightBg: '#F7F9FC',
    supportingGrey: '#64748B',
    border: '#E2E8F0',
  },
};

export default BRAND_CONFIG;

