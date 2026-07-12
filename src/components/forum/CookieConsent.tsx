'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Cookie, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'piforum_cookie_consent';

export default function CookieConsent() {
  const getSetting = useAppStore((s) => s.getSetting);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const enabled = getSetting('cookie_consent_enabled', 'true') === 'true';
  const message = getSetting(
    'cookie_consent_message',
    'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.'
  );
  const position = getSetting('cookie_consent_position', 'bottom');
  const learnMoreUrl = getSetting('cookie_consent_learn_more_url', '/page/privacy');

  const isBottom = position !== 'top';

  // Check whether consent has already been given
  useEffect(() => {
    if (!enabled) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'accepted' || stored === 'declined') return;
    } catch {
      // localStorage unavailable — fall through to showing banner
    }
    // Delay appearance slightly so the page renders first
    const showTimer = setTimeout(() => {
      setVisible(true);
      // Trigger the slide animation on the next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }, 600);
    return () => clearTimeout(showTimer);
  }, [enabled]);

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // Silently ignore storage errors
    }
    setAnimateIn(false);
    // Wait for exit animation to finish before removing
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleDecline = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'declined');
    } catch {
      // Silently ignore storage errors
    }
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  }, []);

  if (!enabled || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-consent-message"
      className={`fixed left-0 right-0 z-[60] ${
        isBottom ? 'bottom-0' : 'top-0'
      }`}
      style={{
        // On mobile with bottom nav, offset above the mobile nav bar (~60px + safe area)
        ...(isBottom
          ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
          : { paddingTop: 'env(safe-area-inset-top, 0px)' }),
      }}
    >
      <div
        className={`neu-card-static mx-3 sm:mx-6 lg:mx-auto lg:max-w-4xl rounded-xl p-4 sm:p-5 transition-all duration-300 ease-out ${
          isBottom
            ? animateIn
              ? 'translate-y-0 opacity-100'
              : 'translate-y-full opacity-0'
            : animateIn
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        } ${
          // On mobile bottom position, add extra bottom margin to clear the mobile nav
          isBottom ? 'mb-[calc(60px+env(safe-area-inset-bottom,0px))] md:mb-4' : 'mt-2'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Icon & Message */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Cookie className="size-6 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p
              id="cookie-consent-message"
              className="text-sm text-foreground/85 leading-relaxed"
            >
              {message}
              {learnMoreUrl && (
                <a
                  href={learnMoreUrl}
                  target={learnMoreUrl.startsWith('/') ? undefined : '_blank'}
                  rel={learnMoreUrl.startsWith('/') ? undefined : 'noopener noreferrer'}
                  className="inline-flex items-center gap-1 ml-1 text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
                >
                  Learn More
                  {!learnMoreUrl.startsWith('/') && (
                    <ExternalLink className="size-3" aria-hidden="true" />
                  )}
                </a>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDecline}
              className="neu-btn flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-lg text-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Decline cookies"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="neu-btn flex-1 sm:flex-initial px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Accept cookies"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
