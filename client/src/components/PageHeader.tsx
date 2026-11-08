import React from 'react';

export interface PageHeaderProps {
  /**
   * Main heading prefix text in Bold Black (#111111)
   */
  title: string;
  /**
   * Highlighted keyword or phrase in Bold Green (#4CAF50)
   */
  highlight?: string;
  /**
   * Optional trailing text after the highlight in Bold Black (#111111)
   */
  titleSuffix?: string;
  /**
   * Subtitle in Dark Navy (#142B4F)
   */
  subtitle?: string;
  /**
   * Optional badge / category pill displayed above the heading
   */
  badge?: React.ReactNode;
  /**
   * Optional right-side actions or buttons (aligned with the header)
   */
  children?: React.ReactNode;
  /**
   * Text alignment: 'left' | 'center'
   * Defaults to 'left'
   */
  align?: 'left' | 'center';
  /**
   * Additional wrapper class names
   */
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  highlight,
  titleSuffix,
  subtitle,
  badge,
  children,
  align = 'left',
  className = '',
}) => {
  const isCentered = align === 'center';

  return (
    <div
      className={`w-full py-8 sm:py-10 ${
        isCentered ? 'text-center flex flex-col items-center' : ''
      } ${className}`}
    >
      <div
        className={`w-full flex flex-col ${
          isCentered
            ? 'items-center'
            : 'md:flex-row md:items-end md:justify-between'
        } gap-4 sm:gap-6`}
      >
        <div className={`space-y-2.5 ${isCentered ? 'max-w-3xl mx-auto' : 'max-w-3xl'}`}>
          {badge && <div className="inline-block mb-1">{badge}</div>}

          {/* Exact 2-color heading: Bold Black (#111111) + Bold Green (#4CAF50) */}
          <h1 className="text-[30px] sm:text-[36px] lg:text-[48px] font-black tracking-tight leading-[1.15] text-[#111111]">
            <span>{title}</span>
            {highlight && (
              <>
                {' '}
                <span className="text-[#4CAF50]">{highlight}</span>
              </>
            )}
            {titleSuffix && <span> {titleSuffix}</span>}
          </h1>

          {/* Subtitle in Dark Navy (#142B4F), font-size 18px on desktop, 15-16px on mobile */}
          {subtitle && (
            <p className="text-[15px] sm:text-[16px] lg:text-[18px] text-[#142B4F] font-normal leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Buttons aligned neatly on the right */}
        {children && (
          <div
            className={`flex flex-wrap items-center gap-3 shrink-0 ${
              isCentered ? 'justify-center pt-2' : 'self-start md:self-end'
            }`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;

