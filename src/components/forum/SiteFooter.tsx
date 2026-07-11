'use client';

/* ------------------------------------------------------------------ */
/*  SiteFooter — polished, modern, fully-responsive neumorphic footer. */
/*                                                                    */
/*  Layout:                                                           */
/*    • Mobile  ( <640px ): 1-col stack                               */
/*    • ≥sm     → 2 columns                                           */
/*    • ≥lg     → 3 columns (Brand, Quick Links, Newsletter)          */
/*                                                                    */
/*  Extras: floating back-to-top FAB (appears on scroll), inline      */
/*  newsletter form with attached submit, 40px touch targets.         */
/*                                                                    */
/*  Settings-driven (forum_name, forum_tagline, logo_url, social_*,   */
/*  forum_description), nav-driven (navigateTo), data-driven          */
/*  (/api/pages?footer=1 for legal-link slug lookup).                */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Page } from '@/lib/types';
import {
  Github,
  Twitter,
  MessageCircle,
  Youtube,
  ChevronUp,
  Mail,
  Send,
  Heart,
  type LucideIcon,
} from 'lucide-react';

type SocialLink = {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
};

export default function SiteFooter() {
  const getSetting = useAppStore((s) => s.getSetting);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { toast } = useToast();

  const [footerPages, setFooterPages] = useState<Page[]>([]);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const forumName = getSetting('forum_name', 'PiForum');
  const forumTagline = getSetting('forum_tagline', 'Where tech conversations find their form.');
  const forumDescription =
    getSetting('forum_description', 'PiForum — Where tech conversations find their form. A modern community for developers, engineers, and tech enthusiasts.') || forumTagline || '';
  const logoUrl = getSetting('logo_url', '');
  const year = new Date().getFullYear();

  // Social links — only render ones with a non-empty URL.
  const socials = useMemo<SocialLink[]>(() => {
    const list: SocialLink[] = [
      {
        key: 'github',
        href: getSetting('social_github', ''),
        label: `${forumName} on GitHub`,
        Icon: Github,
      },
      {
        key: 'twitter',
        href: getSetting('social_twitter', ''),
        label: `${forumName} on Twitter / X`,
        Icon: Twitter,
      },
      {
        key: 'discord',
        href: getSetting('social_discord', ''),
        label: `${forumName} on Discord`,
        Icon: MessageCircle,
      },
      {
        key: 'youtube',
        href: getSetting('social_youtube', ''),
        label: `${forumName} on YouTube`,
        Icon: Youtube,
      },
    ];
    return list.filter((s) => s.href && s.href.trim().length > 0);
  }, [getSetting, forumName]);

  // Look up footer pages with slug hints for the legal-ish labels.
  const legalPageBySlug = useMemo(() => {
    const map: Record<string, Page | undefined> = {};
    footerPages.forEach((p) => {
      map[p.slug.toLowerCase()] = p;
    });
    return map;
  }, [footerPages]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const pagesRes = await fetch('/api/pages?footer=1');
        if (active) {
          const data = await pagesRes.json();
          if (data?.success && Array.isArray(data.data)) {
            setFooterPages(data.data as Page[]);
          }
        }
      } catch {
        // Non-critical — footer renders fine without external data.
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Floating back-to-top visibility — appears after scrolling one viewport.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setShowTop(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: 'Enter your email',
        description: 'Please provide an email address to subscribe.',
        variant: 'destructive',
      });
      return;
    }
    // Basic email sanity check — decorative, no backend persistence.
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!looksLikeEmail) {
      toast({
        title: 'Invalid email',
        description: 'That email address does not look right.',
        variant: 'destructive',
      });
      return;
    }
    setSubscribing(true);
    // Simulated async — give the button a brief "working" state.
    window.setTimeout(() => {
      setSubscribing(false);
      setEmail('');
      toast({
        title: 'You’re subscribed!',
        description: 'Thanks for subscribing to the PiForum newsletter.',
      });
    }, 600);
  }

  function handleLegal(slug: string) {
    const page = legalPageBySlug[slug.toLowerCase()];
    if (page) {
      navigateTo('page', { pageSlug: page.slug });
    } else {
      navigateTo('page', { pageSlug: slug });
    }
  }

  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <footer
      className="mt-auto pt-8 pb-6 sm:pt-10 sm:pb-8 lg:pt-12 lg:pb-10"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Subtle top divider — neumorphic groove */}
        <div className="neu-divider mb-7 sm:mb-9 lg:mb-10" aria-hidden="true" />

        {/* ---------------------------------------------------------------- */}
        {/* Responsive grid:                                                 */}
        {/*  • mobile → single column stack.                                 */}
        {/*  • ≥sm   → 2 columns (Brand, Quick Links+Newsletter).           */}
        {/*  • ≥lg   → 3 columns (Brand, Quick Links, Newsletter).          */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-3 lg:gap-x-16">
          {/* 1. Brand */}
          <section aria-labelledby="footer-brand-heading">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl || '/logo.svg'}
                alt={`${forumName} logo`}
                className="h-9 w-auto rounded-md object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (img.src !== window.location.origin + '/logo.svg') {
                    img.src = '/logo.svg';
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />
              <div className="min-w-0">
                <h2
                  id="footer-brand-heading"
                  className="text-sm font-bold tracking-tight"
                >
                  {forumName}
                </h2>
                {forumTagline && (
                  <p className="text-xs text-muted-foreground truncate">
                    {forumTagline}
                  </p>
                )}
              </div>
            </div>

            {forumDescription && (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {forumDescription}
              </p>
            )}

            {/* Social icons row — 40px touch targets on mobile */}
            {socials.length > 0 && (
              <nav
                className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5"
                aria-label="Social links"
              >
                {socials.map(({ key, href, label, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="neu-circle flex items-center justify-center size-10 sm:size-9 p-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                ))}
              </nav>
            )}
          </section>

          {/* 2. Quick Links */}
          <section aria-labelledby="footer-links-heading">
            <h3
              id="footer-links-heading"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Quick Links
            </h3>
            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Footer quick links">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateTo('members')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Members
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tags')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Tags
              </button>
              <button
                type="button"
                onClick={() => handleLegal('privacy')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => handleLegal('terms')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => handleLegal('rules')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Community Rules
              </button>
            </nav>
          </section>

          {/* 3. Newsletter / Stay Updated */}
          <section
            aria-labelledby="footer-newsletter-heading"
            className="sm:col-span-2 lg:col-span-1"
          >
            <h3
              id="footer-newsletter-heading"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Stay Updated
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Get the best threads and community news delivered to your inbox.
              No spam — unsubscribe anytime.
            </p>

            {/* Inline form: input with attached submit button.
                Icon-only on mobile, icon+text on ≥sm. */}
            <form onSubmit={handleSubscribe} className="mt-4" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail
                  className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="footer-newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neu-input w-full pl-9 pr-12 sm:pr-28 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  aria-label="Subscribe"
                  className="absolute right-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-primary bg-background/60 backdrop-blur-sm hover:bg-background transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {subscribing ? 'Subscribing…' : 'Subscribe'}
                  </span>
                </button>
              </div>
            </form>

            {/* Powered by PiForum badge */}
            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span
                className="neu-circle-inset flex items-center justify-center size-5 text-[10px] font-bold text-primary"
                aria-hidden="true"
              >
                π
              </span>
              <span>
                Powered by <span className="font-semibold">PiForum</span>
              </span>
              <span
                className="inline-flex items-center gap-1 text-muted-foreground/70"
                aria-hidden="true"
              >
                · crafted with <Heart className="size-3 fill-current" />
              </span>
            </p>
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Bottom bar — copyright + legal + back-to-top                     */}
        {/* Centered stack on mobile, row on ≥sm.                             */}
        {/* ---------------------------------------------------------------- */}
        <div className="neu-divider mt-9 sm:mt-10 mb-5" aria-hidden="true" />

        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <address className="not-italic text-xs text-muted-foreground">
            © {year} {forumName}. All rights reserved.
          </address>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            aria-label="Legal"
          >
            <button
              type="button"
              onClick={() => handleLegal('privacy')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => handleLegal('terms')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => handleLegal('rules')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Rules
            </button>
          </nav>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Floating back-to-top FAB — appears after scrolling.              */}
      {/* Great mobile UX for long pages. Fixed to viewport bottom-right.   */}
      {/* ---------------------------------------------------------------- */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
        className={[
          'neu-circle fixed bottom-5 right-5 z-40',
          'inline-flex items-center justify-center size-11 p-0',
          'text-primary',
          'transition-all duration-300 ease-out',
          showTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none',
        ].join(' ')}
      >
        <ChevronUp className="size-5" aria-hidden="true" />
      </button>
    </footer>
  );
}
