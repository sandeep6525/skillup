import React from 'react';

export interface ScrollStackItemProps {
  children?: React.ReactNode;
  itemClassName?: string;
  style?: React.CSSProperties;
}

export declare const ScrollStackItem: React.FC<ScrollStackItemProps>;

export interface ScrollStackProps {
  children?: React.ReactNode;
  className?: string;
  itemDistance?: number;
  itemStackDistance?: number;
  stackPosition?: string | number;
  itemScale?: number;
  baseScale?: number;
  dimAmount?: number;
  blurAmount?: number;
  tiltAmount?: number;
  rotationAmount?: number;
  holdDistance?: number;
  smoothScroll?: boolean;
  snap?: boolean;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
}

declare const ScrollStack: React.FC<ScrollStackProps>;
export default ScrollStack;

