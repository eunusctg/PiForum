"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { UserRole } from "@/lib/types";

/**
 * UserAvatar
 * ----------
 * A reusable avatar that shows an ornate gold "admin frame" (red gems,
 * silver spikes, curved gold accents) around the profile picture — but
 * ONLY when the user is an Admin (role >= 2). Regular users / moderators
 * render with the standard raised ring styling.
 *
 * The frame is implemented as an absolutely-positioned SVG that scales
 * with the avatar, so it works at every size.
 */

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-28",
};

const FALLBACK_TEXT_SIZE: Record<AvatarSize, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-3xl",
};

interface UserLike {
  avatarUrl: string | null | undefined;
  username: string;
  displayName?: string | null;
  role?: UserRole | number;
}

export interface UserAvatarProps {
  user: UserLike;
  /** One of the predefined sizes. Defaults to "md". */
  size?: AvatarSize;
  /** Override the size class entirely (e.g. "size-9 sm:size-10"). */
  className?: string;
  /** Override the fallback text size class. */
  fallbackClassName?: string;
  /** Disable the admin frame even for admins (e.g. in tiny inline contexts). */
  disableFrame?: boolean;
  /** Optional extra wrapper class. */
  wrapperClassName?: string;
}

/**
 * The decorative admin frame rendered as an SVG. The SVG is drawn in a
 * 100x100 viewBox and positioned to extend slightly beyond the avatar
 * (it overflows by ~6% on each side via the wrapper's padding).
 */
function AdminFrame({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Metallic gold gradient (top highlight → bottom shadow) */}
        <linearGradient id="af-gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCE9A8" />
          <stop offset="35%" stopColor="#E8C25A" />
          <stop offset="55%" stopColor="#D4AF37" />
          <stop offset="80%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#8B6914" />
        </linearGradient>
        {/* Brighter gold for highlights / gems' bezels */}
        <linearGradient id="af-gold-bright" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4C2" />
          <stop offset="50%" stopColor="#F0D68C" />
          <stop offset="100%" stopColor="#C99A2E" />
        </linearGradient>
        {/* Cool silver for the angular spikes */}
        <linearGradient id="af-silver" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5F5F5" />
          <stop offset="45%" stopColor="#D3D3D3" />
          <stop offset="100%" stopColor="#8C8C8C" />
        </linearGradient>
        {/* Ruby red radial for the gems */}
        <radialGradient id="af-ruby" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="45%" stopColor="#E10E1F" />
          <stop offset="100%" stopColor="#7A0814" />
        </radialGradient>
        {/* Soft red glow for gems */}
        <radialGradient id="af-ruby-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF0000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
        </radialGradient>
        {/* Outer drop shadow for depth */}
        <filter id="af-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.1"
            floodColor="#000000"
            floodOpacity="0.35"
          />
        </filter>
      </defs>

      {/* Soft red glow halos behind the two gems */}
      <circle cx="50" cy="9" r="9" fill="url(#af-ruby-glow)" />
      <circle cx="50" cy="91" r="9" fill="url(#af-ruby-glow)" />

      {/* --- Silver angular spikes at N / E / S / W --- */}
      {/* Top spike */}
      <path
        d="M50 4 L54 14 L50 18 L46 14 Z"
        fill="url(#af-silver)"
        stroke="#5A5A5A"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />
      {/* Bottom spike */}
      <path
        d="M50 96 L54 86 L50 82 L46 86 Z"
        fill="url(#af-silver)"
        stroke="#5A5A5A"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />
      {/* Left spike */}
      <path
        d="M4 50 L14 54 L18 50 L14 46 Z"
        fill="url(#af-silver)"
        stroke="#5A5A5A"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />
      {/* Right spike */}
      <path
        d="M96 50 L86 54 L82 50 L86 46 Z"
        fill="url(#af-silver)"
        stroke="#5A5A5A"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />

      {/* --- Curved gold flame-like accents (left & right) --- */}
      {/* Left curve */}
      <path
        d="M22 50
           C 22 38, 30 28, 40 24
           C 34 30, 30 38, 30 50
           C 30 62, 34 70, 40 76
           C 30 72, 22 62, 22 50 Z"
        fill="url(#af-gold)"
        stroke="#8B6914"
        strokeWidth="0.5"
        filter="url(#af-shadow)"
      />
      {/* Right curve (mirrored) */}
      <path
        d="M78 50
           C 78 38, 70 28, 60 24
           C 66 30, 70 38, 70 50
           C 70 62, 66 70, 60 76
           C 70 72, 78 62, 78 50 Z"
        fill="url(#af-gold)"
        stroke="#8B6914"
        strokeWidth="0.5"
        filter="url(#af-shadow)"
      />

      {/* --- Main gold ring around the avatar --- */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="url(#af-gold)"
        strokeWidth="3.2"
        filter="url(#af-shadow)"
      />
      {/* Inner brighter highlight ring */}
      <circle
        cx="50"
        cy="50"
        r="44.5"
        fill="none"
        stroke="url(#af-gold-bright)"
        strokeWidth="0.6"
        opacity="0.9"
      />
      {/* Inner dark bezel to separate frame from avatar */}
      <circle
        cx="50"
        cy="50"
        r="42.5"
        fill="none"
        stroke="#5A3E0A"
        strokeWidth="0.5"
        opacity="0.6"
      />

      {/* --- Gold crown bezels holding the gems (top & bottom) --- */}
      {/* Top crown */}
      <path
        d="M42 12
           L46 7
           L50 10
           L54 7
           L58 12
           L54 16
           L50 14
           L46 16 Z"
        fill="url(#af-gold-bright)"
        stroke="#8B6914"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />
      {/* Bottom crown (mirrored) */}
      <path
        d="M42 88
           L46 93
           L50 90
           L54 93
           L58 88
           L54 84
           L50 86
           L46 84 Z"
        fill="url(#af-gold-bright)"
        stroke="#8B6914"
        strokeWidth="0.4"
        filter="url(#af-shadow)"
      />

      {/* --- Red diamond gems (top & bottom) --- */}
      {/* Top gem */}
      <path
        d="M50 5 L57 12 L50 19 L43 12 Z"
        fill="url(#af-ruby)"
        stroke="#4A0008"
        strokeWidth="0.4"
      />
      {/* Top gem highlight */}
      <path
        d="M50 6 L55 11 L50 13 L45 11 Z"
        fill="#FFFFFF"
        opacity="0.45"
      />
      {/* Bottom gem */}
      <path
        d="M50 81 L57 88 L50 95 L43 88 Z"
        fill="url(#af-ruby)"
        stroke="#4A0008"
        strokeWidth="0.4"
      />
      {/* Bottom gem highlight */}
      <path
        d="M50 82 L55 87 L50 89 L45 87 Z"
        fill="#FFFFFF"
        opacity="0.45"
      />

      {/* --- Small silver rivets at the diagonal corners --- */}
      {[
        [18, 18],
        [82, 18],
        [18, 82],
        [82, 82],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="1.4"
          fill="url(#af-silver)"
          stroke="#5A5A5A"
          strokeWidth="0.3"
        />
      ))}
    </svg>
  );
}

/**
 * Pick a sensible size for the decorative frame wrapper based on the
 * avatar size. The wrapper is slightly larger than the avatar so the
 * frame's spikes/gems can overflow nicely.
 */
function framePadding(size: AvatarSize): string {
  switch (size) {
    case "xs":
      return "p-0.5";
    case "sm":
      return "p-1";
    case "md":
      return "p-1.5";
    case "lg":
      return "p-2";
    case "xl":
      return "p-3";
  }
}

export function UserAvatar({
  user,
  size = "md",
  className,
  fallbackClassName,
  disableFrame = false,
  wrapperClassName,
}: UserAvatarProps) {
  const role: number =
    typeof user?.role === "number" ? user.role : UserRole.User;
  const isAdmin = role >= UserRole.Admin; // Admin (2) or SuperAdmin (3)
  const showFrame = isAdmin && !disableFrame;

  const sizeClass = className ?? SIZE_MAP[size];
  const fbText = fallbackClassName ?? FALLBACK_TEXT_SIZE[size];

  // Initials: first char of displayName, else first 2 of username, uppercased.
  const initial = (user.displayName?.trim()?.[0] ?? user.username?.slice(0, 2) ?? "?").toUpperCase();

  const avatarEl = (
    <Avatar className={cn(sizeClass, "ring-0")}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
      <AvatarFallback className={cn("font-semibold", fbText)}>{initial}</AvatarFallback>
    </Avatar>
  );

  if (!showFrame) {
    // Standard raised ring styling for non-admins (matches existing pattern).
    return (
      <div className={cn("neu-circle p-0.5 shrink-0", wrapperClassName)}>
        {avatarEl}
      </div>
    );
  }

  // Admin: replace the neu-circle with the ornate gold frame.
  // The frame SVG is absolutely positioned inside a padded wrapper that's
  // slightly larger than the avatar, so the spikes/gems overflow outward.
  return (
    <div
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center",
        framePadding(size),
        wrapperClassName
      )}
      title="Administrator"
    >
      {/* The avatar sits on top, the frame surrounds it */}
      <div className="relative z-10">{avatarEl}</div>
      <AdminFrame />
    </div>
  );
}

export default UserAvatar;
