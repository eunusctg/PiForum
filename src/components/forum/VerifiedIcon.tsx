'use client';

import { BadgeCheck } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  VerifiedIcon — a stunning, animated verified badge icon.          */
/*  Uses an SVG with a gradient fill, soft glow, and a subtle          */
/*  shimmer sweep so it reads as "premium" without being distracting.  */
/*                                                                     */
/*  Sizes: sm (12px), md (16px), lg (20px), xl (28px)                  */
/*  Variants: default (blue/gold), gold, emerald, mono                 */
/* ------------------------------------------------------------------ */

type VerifiedSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type VerifiedVariant = 'default' | 'gold' | 'emerald' | 'mono';

const SIZE_PX: Record<VerifiedSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
};

interface VerifiedIconProps {
  size?: VerifiedSize;
  variant?: VerifiedVariant;
  className?: string;
  /** Add a slow shimmer animation (default true for md+). */
  animated?: boolean;
  title?: string;
}

export default function VerifiedIcon({
  size = 'md',
  variant = 'default',
  className = '',
  animated = true,
  title = 'Verified',
}: VerifiedIconProps) {
  const px = SIZE_PX[size];
  const shouldAnimate = animated && (size === 'lg' || size === 'xl');

  // Gradient stops per variant
  const gradId = `vg-${variant}-${size}`;
  const stops =
    variant === 'gold'
      ? [
          { o: '0%', c: '#F7E7B4' },
          { o: '45%', c: '#D4AF37' },
          { o: '100%', c: '#B8860B' },
        ]
      : variant === 'emerald'
      ? [
          { o: '0%', c: '#6EE7B7' },
          { o: '50%', c: '#10B981' },
          { o: '100%', c: '#047857' },
        ]
      : variant === 'mono'
      ? [
          { o: '0%', c: 'currentColor' },
          { o: '100%', c: 'currentColor' },
        ]
      : [
          // default — blue to indigo with a hint of cyan
          { o: '0%', c: '#7DD3FC' },
          { o: '50%', c: '#3B82F6' },
          { o: '100%', c: '#4F46E5' },
        ];

  return (
    <span
      className={`verified-icon-wrap inline-flex items-center justify-center align-middle relative ${className}`}
      style={{ width: px, height: px, color: variant === 'mono' ? 'currentColor' : undefined }}
      role="img"
      aria-label={title}
      title={title}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`verified-icon-svg ${shouldAnimate ? 'verified-icon-anim' : ''}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            {stops.map((s, i) => (
              <stop key={i} offset={s.o} stopColor={s.c} />
            ))}
          </linearGradient>
          {variant !== 'mono' && (
            <filter id={`${gradId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        {/* Scallop / star-burst seal background */}
        <path
          d="M12 1.5l2.2 1.6 2.7-.3 1.2 2.5 2.5 1.2-.3 2.7L21.9 12l-1.6 2.2.3 2.7-2.5 1.2-1.2 2.5-2.7-.3L12 21.9l-2.2-1.6-2.7.3-1.2-2.5-2.5-1.2.3-2.7L1.5 12l1.6-2.2-.3-2.7 2.5-1.2 1.2-2.5 2.7.3L12 1.5z"
          fill={`url(#${gradId})`}
          filter={variant !== 'mono' ? `url(#${gradId}-glow)` : undefined}
        />
        {/* Inner subtle ring for depth */}
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
        {/* White check mark */}
        <path
          d="M8 12.2l2.6 2.6L16 9.4"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Shimmer sweep (animated) */}
        {shouldAnimate && variant !== 'mono' && (
          <path
            d="M12 1.5l2.2 1.6 2.7-.3 1.2 2.5 2.5 1.2-.3 2.7L21.9 12l-1.6 2.2.3 2.7-2.5 1.2-1.2 2.5-2.7-.3L12 21.9l-2.2-1.6-2.7.3-1.2-2.5-2.5-1.2.3-2.7L1.5 12l1.6-2.2-.3-2.7 2.5-1.2 1.2-2.5 2.7.3L12 1.5z"
            fill={`url(#${gradId})`}
            opacity="0.55"
            className="verified-icon-shimmer"
          />
        )}
      </svg>
      {/* Fallback lucide icon (hidden, kept for SR + as a fallback if SVG fails) */}
      <BadgeCheck className="sr-only" />
    </span>
  );
}
