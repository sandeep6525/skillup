import React from 'react';

export interface SplashCursorProps {
  rainbow?: boolean;
  size?: number;
  force?: number;
  swirl?: number;
  trail?: number;
  clickSplash?: boolean;
  colorSpeed?: number;
  intensity?: number;
  momentum?: number;
  shading?: number;
  glow?: number;
  quality?: 'low' | 'medium' | 'high';
  intro?: boolean;
  contained?: boolean;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
}

declare const SplashCursor: React.FC<SplashCursorProps>;
export default SplashCursor;

