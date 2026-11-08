import React from 'react';

export interface GradientTextProps {
  children: React.ReactNode;
  colors?: string[];
  animationSpeed?: number;
  variant?: 'linear' | 'flow' | 'conic';
  angle?: number;
  direction?: 'horizontal' | 'vertical' | 'diagonal';
  scale?: number;
  yoyo?: boolean;
  glow?: number;
  showBorder?: boolean;
  borderWidth?: number;
  pauseOnHover?: boolean;
  followPointer?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare const GradientText: React.FC<GradientTextProps>;
export default GradientText;

