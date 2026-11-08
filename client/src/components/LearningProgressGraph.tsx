import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Code2,
  Laptop,
  Briefcase,
  Target,
} from 'lucide-react';

interface MilestoneData {
  id: string;
  stepNumber: number;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  xPercent: number; // percentage along the graph container
  yPercent: number; // percentage vertical position from top
  color: string;
  glowColor: string;
}

// 5 Milestones exactly matching the reference image:
// 1. Start Learning (bottom platform with concentric circles & vertical light pillar)
// 2. Learn Coding
// 3. Build Projects
// 4. Get Certified
// 5. Career Ready (top target milestone with concentric rings & glow)
const MILESTONES: MilestoneData[] = [
  {
    id: 'start-learning',
    stepNumber: 1,
    label: 'Start Learning',
    icon: Play,
    xPercent: 12,
    yPercent: 78,
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.85)',
  },
  {
    id: 'learn-coding',
    stepNumber: 2,
    label: 'Learn Coding',
    icon: Code2,
    xPercent: 35,
    yPercent: 66,
    color: '#C084FC',
    glowColor: 'rgba(192, 132, 252, 0.85)',
  },
  {
    id: 'build-projects',
    stepNumber: 3,
    label: 'Build Projects',
    icon: Laptop,
    xPercent: 57,
    yPercent: 51,
    color: '#818CF8',
    glowColor: 'rgba(129, 140, 248, 0.85)',
  },
  {
    id: 'get-certified',
    stepNumber: 4,
    label: 'Get Certified',
    icon: Briefcase,
    xPercent: 78,
    yPercent: 36,
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.9)',
  },
  {
    id: 'career-ready',
    stepNumber: 5,
    label: 'Career Ready',
    icon: Target,
    xPercent: 93,
    yPercent: 18,
    color: '#F472B6',
    glowColor: 'rgba(244, 114, 182, 0.95)',
  },
];

// SVG viewBox 0 0 1000 550
// Smooth rising curve passing exactly through the milestone coordinates:
// Node 1: (120, 430)
// Node 2: (350, 360)
// Node 3: (570, 280)
// Node 4: (780, 200)
// Node 5: (930, 100)
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 550;
const GRAPH_PATH =
  'M 80 435 C 100 435, 120 430, 160 425 C 240 415, 300 380, 350 360 C 420 330, 500 305, 570 280 C 640 255, 710 225, 780 200 C 850 170, 890 125, 930 100';

export const LearningProgressGraph: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [cycleCount, setCycleCount] = useState<number>(0);

  // Cycle through the 5 milestones smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= 5) {
          setCycleCount((c) => c + 1);
          return 1;
        }
        return prev + 1;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px] select-none flex items-center justify-center overflow-visible">
      {/* 1. Subtle Radial Purple Glow directly behind the learning graph */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[500px] h-[320px] sm:h-[380px] bg-purple-600/[0.12] blur-[110px] rounded-full pointer-events-none" />

      {/* 2. Main SVG Graph Canvas */}
      <div className="relative w-full h-full max-w-[960px] mx-auto flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradient for main line */}
            <linearGradient id="risingGraphGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="30%" stopColor="#9333EA" />
              <stop offset="60%" stopColor="#6366F1" />
              <stop offset="85%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>

            {/* Gradient for line glow filter */}
            <linearGradient id="risingGraphGlow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>

            {/* Area fill gradient below curve */}
            <linearGradient id="risingAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#050407" stopOpacity="0" />
            </linearGradient>

            {/* Soft Glow Filter */}
            <filter id="intenseNeonFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Vertical Pillar Gradients */}
            <linearGradient id="pillarGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#7C3AED" stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill under curve */}
          <path
            d={`${GRAPH_PATH} L 930 520 L 80 520 Z`}
            fill="url(#risingAreaGrad)"
            pointerEvents="none"
          />

          {/* Background Dotted Guideline */}
          <path
            d={GRAPH_PATH}
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />

          {/* Deep Ambient Glow Line */}
          <path
            d={GRAPH_PATH}
            stroke="url(#risingGraphGlow)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.45"
            filter="url(#intenseNeonFilter)"
          />

          {/* Secondary Medium Glow Line */}
          <path
            d={GRAPH_PATH}
            stroke="url(#risingGraphGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Crisp Core Rising Path with Animated Dash Drawing */}
          <path
            d={GRAPH_PATH}
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.9))',
            }}
          />

          {/* Vertical Light Beams beneath the Nodes */}
          {/* Milestone 1 Pillar */}
          <rect x="117" y="430" width="6" height="85" fill="url(#pillarGlow)" opacity="0.8" />
          {/* Milestone 2 Pillar */}
          <rect x="348" y="360" width="4" height="155" fill="url(#pillarGlow)" opacity="0.6" />
          {/* Milestone 3 Pillar */}
          <rect x="568" y="280" width="4" height="235" fill="url(#pillarGlow)" opacity="0.7" />
          {/* Milestone 4 Pillar */}
          <rect x="778" y="200" width="4" height="315" fill="url(#pillarGlow)" opacity="0.6" />
          {/* Milestone 5 Pillar */}
          <rect x="927" y="100" width="6" height="415" fill="url(#pillarGlow)" opacity="0.9" />

          {/* Concentric Horizon Rings at Milestone 1 base (Origin) */}
          <g transform="translate(120, 435)">
            <ellipse rx="36" ry="11" stroke="#A855F7" strokeWidth="1.5" opacity="0.75" />
            <ellipse rx="22" ry="7" stroke="#C084FC" strokeWidth="1.5" opacity="0.9" />
            <ellipse rx="10" ry="3" fill="#A855F7" opacity="0.8" />
          </g>

          {/* Concentric Target Rings at Milestone 5 (Destination / Career Ready) */}
          <g transform="translate(930, 100)">
            <ellipse rx="42" ry="13" stroke="#F472B6" strokeWidth="1.5" opacity="0.7" />
            <ellipse rx="26" ry="8" stroke="#E879F9" strokeWidth="1.5" opacity="0.85" />
            <ellipse rx="12" ry="4" stroke="#FFFFFF" strokeWidth="1" opacity="0.9" />
          </g>

          {/* Traveling Glowing Comet along the SVG Path */}
          <g>
            <circle r="7" fill="#FFFFFF" filter="url(#intenseNeonFilter)">
              <animateMotion
                key={cycleCount}
                path={GRAPH_PATH}
                dur="12s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>
            <circle r="4" fill="#FFFFFF">
              <animateMotion
                key={`core-${cycleCount}`}
                path={GRAPH_PATH}
                dur="12s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>
            {/* Trailing particle */}
            <circle r="12" fill="#38BDF8" opacity="0.6" filter="url(#intenseNeonFilter)">
              <animateMotion
                key={`glow-${cycleCount}`}
                path={GRAPH_PATH}
                dur="12s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>
          </g>
        </svg>

        {/* 4. Interactive & Pulsing Milestones HTML Overlay */}
        {/* Node 1: Start Learning (120, 430) -> left: 12%, top: 78% */}
        <MilestoneNode
          milestone={MILESTONES[0]}
          isActive={activeStep >= 1}
          isCurrent={activeStep === 1}
          onClick={() => setActiveStep(1)}
          positionClass="left-[8%] sm:left-[12%] top-[74%] sm:top-[78%]"
          labelPosition="top"
        />

        {/* Node 2: Learn Coding (350, 360) -> left: 35%, top: 65% */}
        <MilestoneNode
          milestone={MILESTONES[1]}
          isActive={activeStep >= 2}
          isCurrent={activeStep === 2}
          onClick={() => setActiveStep(2)}
          positionClass="left-[31%] sm:left-[35%] top-[61%] sm:top-[65%]"
          labelPosition="top"
        />

        {/* Node 3: Build Projects (570, 280) -> left: 57%, top: 51% */}
        <MilestoneNode
          milestone={MILESTONES[2]}
          isActive={activeStep >= 3}
          isCurrent={activeStep === 3}
          onClick={() => setActiveStep(3)}
          positionClass="left-[53%] sm:left-[57%] top-[47%] sm:top-[51%]"
          labelPosition="top"
        />

        {/* Node 4: Get Certified (780, 200) -> left: 78%, top: 36% */}
        <MilestoneNode
          milestone={MILESTONES[3]}
          isActive={activeStep >= 4}
          isCurrent={activeStep === 4}
          onClick={() => setActiveStep(4)}
          positionClass="left-[74%] sm:left-[78%] top-[32%] sm:top-[36%]"
          labelPosition="top"
        />

        {/* Node 5: Career Ready (930, 100) -> left: 93%, top: 18% */}
        <MilestoneNode
          milestone={MILESTONES[4]}
          isActive={activeStep >= 5}
          isCurrent={activeStep === 5}
          onClick={() => setActiveStep(5)}
          positionClass="left-[86%] sm:left-[92%] top-[14%] sm:top-[18%]"
          labelPosition="top"
          isTargetMilestone
        />
      </div>
    </div>
  );
};

interface MilestoneNodeProps {
  milestone: MilestoneData;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
  positionClass: string;
  labelPosition?: 'top' | 'bottom';
  isTargetMilestone?: boolean;
}

const MilestoneNode: React.FC<MilestoneNodeProps> = ({
  milestone,
  isActive,
  isCurrent,
  onClick,
  positionClass,
  isTargetMilestone,
}) => {
  const Icon = milestone.icon;

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group transition-all duration-300 ${positionClass}`}
      onClick={onClick}
    >
      {/* Container holding badge and glowing node */}
      <div className="flex flex-col items-center">
        
        {/* Floating Futuristic Glass Tag / Badge above the node */}
        <motion.div
          initial={false}
          animate={{
            scale: isCurrent ? 1.08 : 1,
            y: isCurrent ? -4 : 0,
          }}
          transition={{ duration: 0.3 }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all shadow-lg ${
            isCurrent
              ? 'bg-[#18112C]/90 border-[#A855F7] shadow-[0_0_25px_rgba(168,85,247,0.5)] text-white'
              : isActive
              ? 'bg-[#0f0b1d]/80 border-purple-500/30 text-zinc-200'
              : 'bg-[#08060F]/70 border-white/10 text-zinc-400 opacity-80'
          }`}
        >
          {/* Node Icon */}
          <div
            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center ${
              isCurrent
                ? 'text-[#C084FC]'
                : isActive
                ? 'text-purple-300'
                : 'text-zinc-500'
            }`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
          </div>

          {/* Milestone Label */}
          <div className="flex flex-col text-left">
            <span
              className={`text-[10px] sm:text-[11px] font-bold tracking-tight whitespace-nowrap leading-none ${
                isCurrent
                  ? 'text-white'
                  : isActive
                  ? 'text-zinc-200'
                  : 'text-zinc-400'
              }`}
            >
              {milestone.label}
            </span>
          </div>
        </motion.div>

        {/* Vertical connector line between label and node */}
        <div
          className={`w-[1.5px] h-3.5 sm:h-4 transition-colors duration-300 ${
            isCurrent
              ? 'bg-gradient-to-b from-[#A855F7] to-white'
              : isActive
              ? 'bg-purple-400/60'
              : 'bg-white/20'
          }`}
        />

        {/* Glowing Circular Node on the Line */}
        <div className="relative flex items-center justify-center">
          {/* Animated Pulse Ring if Current */}
          {isCurrent && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
              className="absolute w-7 h-7 rounded-full bg-[#A855F7]"
            />
          )}

          {/* Node Outer Ring */}
          <div
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              isCurrent
                ? 'border-white bg-[#A855F7] shadow-[0_0_20px_#A855F7]'
                : isActive
                ? 'border-purple-300 bg-[#7C3AED] shadow-[0_0_12px_rgba(168,85,247,0.7)]'
                : 'border-white/40 bg-[#1e1338]'
            }`}
          >
            {/* Node Center Dot */}
            <div
              className={`w-2 h-2 rounded-full ${
                isCurrent
                  ? 'bg-white shadow-[0_0_8px_#ffffff]'
                  : isActive
                  ? 'bg-purple-100'
                  : 'bg-zinc-500'
              }`}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

