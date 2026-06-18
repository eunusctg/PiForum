'use client';

import { useAppStore } from '@/lib/store';
import VerifiedIcon from './VerifiedIcon';

/* ------------------------------------------------------------------ */
/*  VerifiedBadge — public-facing badge shown next to verified users'  */
/*  names. Reads the admin-configured text/color/visibility from the    */
/*  global settings store so changes in the admin panel apply site-wide */
/*  instantly (no rebuild required).                                    */
/*                                                                      */
/*  Usage:                                                              */
/*    <VerifiedBadge />            // icon only, compact                */
/*    <VerifiedBadge showLabel />  // icon + "Verified" pill            */
/*    <VerifiedBadge size="lg" />  // bigger icon                       */
/* ------------------------------------------------------------------ */

type BadgeColor = 'primary' | 'blue' | 'green' | 'gold' | 'purple';
type IconVariant = 'default' | 'gold' | 'emerald' | 'mono';

const COLOR_TO_VARIANT: Record<BadgeColor, IconVariant> = {
  primary: 'default',
  blue: 'default',
  green: 'emerald',
  gold: 'gold',
  purple: 'mono', // mono picks up currentColor; we tint via the pill
};

const COLOR_TO_PILL: Record<BadgeColor, string> = {
  primary: 'verified-badge-primary',
  blue: 'verified-badge-blue',
  green: 'verified-badge-emerald',
  gold: 'verified-badge-gold',
  purple: 'verified-badge-purple',
};

interface VerifiedBadgeProps {
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Override the global enabled setting (force-show even if disabled globally). */
  force?: boolean;
  className?: string;
}

export default function VerifiedBadge({
  showLabel = false,
  size = 'sm',
  force = false,
  className = '',
}: VerifiedBadgeProps) {
  const getSetting = useAppStore((s) => s.getSetting);

  const enabledGlobally = getSetting('verified_badge_enabled', 'true') !== 'false';
  if (!enabledGlobally && !force) return null;

  const text = getSetting('verified_badge_text', 'Verified');
  const colorRaw = getSetting('verified_badge_color', 'primary') as BadgeColor;
  const color: BadgeColor = ['primary', 'blue', 'green', 'gold', 'purple'].includes(colorRaw)
    ? colorRaw
    : 'primary';

  const iconVariant: IconVariant = COLOR_TO_VARIANT[color];

  if (showLabel) {
    return (
      <span
        className={`verified-badge-inline ${COLOR_TO_PILL[color]} ${className}`}
        title={text}
      >
        <VerifiedIcon size="xs" variant={iconVariant} animated={false} title={text} />
        <span>{text}</span>
      </span>
    );
  }

  return (
    <VerifiedIcon
      size={size}
      variant={iconVariant}
      animated
      title={text}
      className={className}
    />
  );
}
