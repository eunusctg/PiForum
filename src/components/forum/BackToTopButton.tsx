'use client';

/* ------------------------------------------------------------------ */
/*  BackToTopButton — floating, responsive, animated FAB.             */
/*                                                                    */
/*  • Appears when user scrolls past 30% of viewport height          */
/*  • SVG progress ring shows scroll progress (only when showProgress)*/
/*  • Bounce-in + pulse animation on appear                          */
/*  • Smooth scroll to top on click                                   */
/*  • Responsive: adjusts size and position on mobile vs desktop      */
/*  • Theme-aware: adapts to day/night/golden mode via CSS            */
/*  • Completely independent of footer — floats well above it         */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface BackToTopButtonProps {
  /** Whether to show the SVG progress ring (only inside thread/post view) */
  showProgress?: boolean;
}

export default function BackToTopButton({ showProgress = false }: BackToTopButtonProps) {
  const [showTop, setShowTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const progressRef = useRef<SVGCircleElement>(null);

  // Scroll listener: track visibility + progress
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
      setShowTop(scrollY > window.innerHeight * 0.3);
      setScrollProgress(progress);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={showTop ? 0 : -1}
      className={[
        'fixed z-[100]',
        // Responsive positioning — float well above footer
        'bottom-8 right-5 sm:bottom-10 sm:right-8 lg:bottom-14 lg:right-10',
        // Layout
        'inline-flex items-center justify-center',
        showProgress ? 'size-12 sm:size-14 lg:size-16' : 'size-11 sm:size-12 lg:size-14',
        'p-0',
        // Theme-aware colors via CSS class
        'theme-back-top',
        'rounded-full',
        // Transitions
        'transition-all duration-300 ease-out',
        // Visibility states
        showTop
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-8 scale-50 pointer-events-none',
        // Hover/active effects
        'hover:scale-110',
        'active:scale-95',
      ].join(' ')}
    >
      {/* SVG progress ring — only rendered when showProgress is true */}
      {showProgress && (
        <svg
          className="absolute inset-0 size-full -rotate-90"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="2.5"
            className="theme-progress-track"
          />
          {/* Progress arc */}
          <circle
            ref={progressRef}
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="theme-progress-arc transition-[stroke-dashoffset] duration-150 ease-out"
            style={{
              strokeDasharray: 2 * Math.PI * 20,
              strokeDashoffset: 2 * Math.PI * 20 * (1 - scrollProgress),
            }}
          />
        </svg>
      )}
      <ArrowUp
        className={showProgress ? 'size-5 sm:size-6 lg:size-7 relative z-10 theme-back-top-icon' : 'size-5 sm:size-5 lg:size-6 relative z-10 theme-back-top-icon'}
        aria-hidden="true"
      />
    </button>
  );
}
