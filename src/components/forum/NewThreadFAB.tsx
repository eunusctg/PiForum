'use client';

/* ------------------------------------------------------------------ */
/*  NewThreadFAB — floating, responsive action button.                 */
/*                                                                    */
/*  • Only visible when a user is logged in                           */
/*  • Appears on 'home' and 'forum' views                             */
/*  • Positioned bottom-right, above the BackToTop button             */
/*  • Bounce-in + pulse animation on appear                           */
/*  • Responsive: adjusts size and position on mobile vs desktop      */
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
        // Colors — prominent primary background
        'text-primary-foreground',
        'rounded-full',
        // Shadow for floating effect
        'shadow-lg shadow-primary/30',
        // Transitions
        'transition-all duration-300 ease-out',
        // Hover/active effects
        'hover:scale-110 hover:shadow-xl hover:shadow-primary/40',
        'active:scale-95',
        // Background with gradient
        'bg-gradient-to-br from-primary via-primary to-primary/80',
        // Animation
        'fab-animated',
        // Border
        'border-2 border-primary-foreground/20',
      ].join(' ')}
    >
      <Plus className="size-6 sm:size-7 lg:size-8" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
