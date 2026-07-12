'use client';

import { useEffect, useState } from 'react';

/**
 * Preloader — branded, animated splash screen shown while ForumShell runs its
 * install-check / settings / auth-restore init flow. Designed to feel
 * intentional and polished rather than a generic "Loading..." block.
 *
 * Visual layers:
 *  - Full-screen centered stage on `var(--neu-bg)`
 *  - Animated `π` glyph inside a `neu-circle` that pulses (scale 1 → 1.05) on
 *    a 2s loop with a soft breathing glow
 *  - Brand name "PiForum" + tagline (read from the settings cache in
 *    localStorage so it matches the configured forum tagline when available)
 *  - Staged loading message that cycles every ~800ms
 *  - Thin progress bar that fills 0% → 100% over ~2.5s
 *  - Footer micro-text with the current year
 *
 * All animations are defined as CSS keyframes inside an inline <style> block
 * so they don't leak globally and don't require touching globals.css. The
 * component is intentionally self-contained.
 *
 * Hydration safety: tagline + year are read in useEffect and stored in state,
 * so the first client render is deterministic (fallbacks only) and matches
 * SSR.
 */

const LOADING_MESSAGES = [
  'Initializing…',
  'Loading settings…',
  'Connecting to community…',
  'Almost there…',
] as const;

const DEFAULT_TAGLINE = 'Where tech minds connect';

/**
 * Try to read `forum_tagline` from the localStorage settings cache that the
 * Zustand store writes. Returns the cached tagline or `null` if unavailable /
 * unparseable / not yet written (e.g. first ever visit).
 */
function readCachedTagline(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('piforum_settings_cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const tagline = parsed.forum_tagline;
    if (typeof tagline === 'string' && tagline.trim().length > 0) {
      return tagline.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export default function Preloader() {
  // Tagline + year are read in an effect to avoid hydration mismatch (they
  // depend on client-only state: localStorage and the current date).
  const [tagline, setTagline] = useState<string>(DEFAULT_TAGLINE);
  const [year, setYear] = useState<number | null>(null);
  const [messageIndex, setMessageIndex] = useState<number>(0);

  // Read the cached tagline once on mount. setState here is intentional:
  // the value depends on client-only localStorage, so it cannot be computed
  // during render without risking an SSR/CSR hydration mismatch.
  useEffect(() => {
    const cached = readCachedTagline();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTagline(cached);
    }
  }, []);

  // Compute the year once on mount (avoids any chance of SSR/CSR mismatch
  // and keeps render pure). Same justification as above.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear(new Date().getFullYear());
  }, []);

  // Cycle the staged loading message every 800ms.
  useEffect(() => {
    const id = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes preloader-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes preloader-glow {
          0%, 100% {
            box-shadow:
              var(--neu-shadow, 0 4px 12px rgba(0,0,0,0.08)),
              0 0 20px color-mix(in srgb, var(--primary) 18%, transparent);
          }
          50% {
            box-shadow:
              var(--neu-shadow, 0 4px 12px rgba(0,0,0,0.08)),
              0 0 40px color-mix(in srgb, var(--primary) 42%, transparent);
          }
        }
        @keyframes preloader-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes preloader-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes preloader-fade-in-delayed {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .preloader-root {
          animation: preloader-fade-in 0.4s ease-out both;
        }
        .preloader-logo {
          animation:
            preloader-pulse 2s ease-in-out infinite,
            preloader-glow 2s ease-in-out infinite;
        }
        .preloader-brand {
          animation: preloader-fade-in-delayed 0.5s ease-out 0.1s both;
        }
        .preloader-tagline {
          animation: preloader-fade-in-delayed 0.5s ease-out 0.2s both;
        }
        .preloader-message {
          animation: preloader-fade-in 0.3s ease-out both;
        }
        .preloader-progress-track {
          animation: preloader-fade-in-delayed 0.5s ease-out 0.25s both;
        }
        .preloader-progress-fill {
          animation: preloader-progress 2.5s ease-in-out forwards;
        }
        .preloader-footer {
          animation: preloader-fade-in-delayed 0.6s ease-out 0.35s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .preloader-logo,
          .preloader-progress-fill {
            animation: none;
          }
          .preloader-progress-fill {
            width: 100%;
          }
        }
      `}</style>

      <div
        className="preloader-root min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: 'var(--neu-bg)' }}
      >
        {/* Centered brand stack */}
        <div className="flex flex-col items-center gap-5 px-6">
          {/* Animated logo */}
          <div
            className="preloader-logo neu-circle w-24 h-24 flex items-center justify-center"
            style={{ animationDuration: '2s' }}
          >
            <span className="text-5xl font-bold text-primary select-none">
              π
            </span>
          </div>

          {/* Brand name */}
          <h1 className="preloader-brand text-2xl font-bold tracking-tight text-foreground">
            PiForum
          </h1>

          {/* Tagline */}
          <p className="preloader-tagline text-xs text-muted-foreground -mt-2">
            {tagline}
          </p>

          {/* Staged loading message */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm h-5">
            <span
              key={messageIndex}
              className="preloader-message inline-block"
            >
              {LOADING_MESSAGES[messageIndex]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="preloader-progress-track w-48 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="preloader-progress-fill h-full rounded-full bg-primary"
              style={{ width: '0%' }}
            />
          </div>
        </div>

        {/* Footer micro-text */}
        <div className="preloader-footer absolute bottom-4 left-0 right-0 text-center text-[10px] text-muted-foreground/60">
          © {year ?? ''} PiForum
        </div>
      </div>
    </>
  );
}
