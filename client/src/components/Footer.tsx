import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Globe, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#000000] text-[#A1A1AA] pt-16 pb-12 border-t border-emerald-900/30 overflow-hidden">
      {/* Subtle Green Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-[#55B957]/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Column 1 – SkillUp */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="SkillUp Logo"
                className="h-8 w-auto object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-extrabold text-[#FFFFFF] tracking-tight">
                Skill<span className="text-[#55B957]">Up</span>
              </span>
            </Link>

            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Empowering engineers and students through certified industry mentorship, structured course cohorts, live masterclasses, and verified skill credentials.
            </p>

            <div className="space-y-2 pt-2 border-t border-emerald-900/20">
              <span className="text-[11px] font-semibold text-emerald-300/80 tracking-wider uppercase block">
                A Product of
              </span>
              <div className="flex items-center gap-3">
                <div className="h-8 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center shrink-0 backdrop-blur-md">
                  <img
                    src="/tri-cube-logo.png"
                    alt="TRI-CUBE DIGITAL SOLUTIONS"
                    className="h-6 w-auto max-w-[120px] object-contain brightness-110"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/uploads/partners/1792993467009-282869179.png';
                    }}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block tracking-tight">
                    TRI-CUBE DIGITAL SOLUTIONS
                  </span>
                  <span className="text-[10px] text-zinc-400 block italic">
                    Building skills. Empowering careers.
                  </span>
                </div>
              </div>
            </div>

            {/* Certification Badge with Dark Glass Effect & Green Border */}
            <div className="inline-flex items-center gap-2 text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-500/30 py-1.5 px-3 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(93,186,88,0.15)] mt-2">
              <ShieldCheck className="w-4 h-4 text-[#55B957]" />
              <span className="font-medium">Certified Learning Standard</span>
            </div>
          </div>

          {/* Column 2 – Platform */}
          <div>
            <h4 className="text-[#FFFFFF] font-bold mb-4 text-xs tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55B957]" />
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/courses" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>All Courses</span>
                </Link>
              </li>
              <li>
                <Link to="/mentors" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Find a Mentor</span>
                </Link>
              </li>
              <li>
                <Link to="/live-classes" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Live Masterclasses</span>
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Verified Certificates</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 – Top Domains */}
          <div>
            <h4 className="text-[#FFFFFF] font-bold mb-4 text-xs tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55B957]" />
              Top Domains
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/courses?category=web-development" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Full-Stack TypeScript</span>
                </Link>
              </li>
              <li>
                <Link to="/courses?category=ai-data-science" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Production RAG & AI</span>
                </Link>
              </li>
              <li>
                <Link to="/courses?category=cloud-devops" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                  <span>Docker, K8s & DevOps</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 – Legal & Policies */}
          <div>
            <h4 className="text-[#FFFFFF] font-bold mb-4 text-xs tracking-wider uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#55B957]" />
              Legal & Support
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-zinc-400 hover:text-white hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li className="flex items-center gap-2 text-zinc-400 pt-1">
                <Mail className="w-4 h-4 text-[#55B957] shrink-0" />
                <a href="mailto:support@skillup.com" className="hover:text-emerald-300 transition-colors">
                  support@skillup.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-zinc-400">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Global Remote Cohorts</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Legal Links */}
        <div className="pt-8 border-t border-emerald-900/20 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-4">
          <p>© 2026 SkillUp – A Product of TRI-CUBE DIGITAL SOLUTIONS. All rights reserved.</p>
          <div className="flex items-center gap-6 text-zinc-400 font-medium">
            <Link to="/privacy" className="hover:text-emerald-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-emerald-300 transition-colors">
              Terms of Service
            </Link>
            <span className="text-zinc-600 hidden sm:inline">|</span>
            <span className="text-zinc-400 hidden sm:inline">Certified Secure Gateway</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
