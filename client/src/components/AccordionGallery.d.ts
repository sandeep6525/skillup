import React from 'react';

export interface AccordionGalleryItem {
  image: string;
  label?: string;
  title?: string;
  description?: string;
  link?: string;
  alt?: string;
}

export interface AccordionGalleryProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  grayscale?: boolean;
  showLabels?: boolean;
  trigger?: 'hover' | 'click';
  stagger?: number;
  className?: string;
}

declare const AccordionGallery: React.FC<AccordionGalleryProps>;
export default AccordionGallery;

