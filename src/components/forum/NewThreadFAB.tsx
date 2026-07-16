'use client';

/* ------------------------------------------------------------------ */
/*  NewThreadFAB — floating, responsive action button.                 */
/*                                                                    */
/*  • Only visible when a user is logged in                           */
/*  • Appears on 'home' and 'forum' views                             */
/*  • Positioned bottom-right, above the BackToTop button             */
/*  • Bounce-in + pulse animation on appear                           */
/*  • Responsive: adjusts size and position on mobile vs desktop      */
/*  • Theme-aware: adapts to day/night/golden mode via CSS            */
/*  • Completely independent of footer — floats well above it         */
/* ------------------------------------------------------------------ */

import { useAppStore } from '@/lib/store';
import { Plus } from 'lucide-react';

export default function NewThreadFAB() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentView = useAppStore((s) => s.currentView);
  const viewParams = useAppStore((s) => s.viewParams);
  const navigateTo = useAppStore((s) => s.navigateTo);

  // Only show on home and forum views for logged-in users
  const shouldShow = currentUser && (currentView === 'home' || currentView === 'forum');

  if (!shouldShow) return null;

  const handleClick = () => {
    if (currentView === 'forum' && viewParams.forumId) {
      navigateTo('new-thread', { forumId: viewParams.forumId });
    } else {
      navigateTo('new-thread');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Create new thread"
      className={[
        'fixed z-[99]',
        // Responsive positioning — float well above footer, above BackToTop
        'bottom-24 right-5 sm:bottom-28 sm:right-8 lg:bottom-32 lg:right-10',
        // Layout
        'inline-flex items-center justify-center',
        'size-14 sm:size-16 lg:size-[72px] p-0',
        // Theme-aware colors via CSS class
        'theme-fab',
        'rounded-full',
        // Transitions
        'transition-all duration-300 ease-out',
        // Hover/active effects
        'hover:scale-110',
        'active:scale-95',
        // Animation
        'fab-animated',
      ].join(' ')}
    >
      <Plus className="size-6 sm:size-7 lg:size-8 theme-fab-icon" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
