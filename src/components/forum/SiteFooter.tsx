'use client';

/* ------------------------------------------------------------------ */
/*  SiteFooter — polished, modern, fully-responsive footer. */
/*                                                                    */
/*  Layout:                                                           */
/*    • Mobile  ( <640px ): 1-col stack                               */
/*    • ≥sm     → 2 columns                                           */
/*    • ≥lg     → 3 columns (Brand, Quick Links, Newsletter)          */
/*                                                                    */
/*  Extras: inline newsletter form with attached submit,              */
/*  40px touch targets.                                               */
/*                                                                    */
/*  Settings-driven (forum_name, forum_tagline, logo_url, social_*,   */
/*  forum_description), nav-driven (navigateTo), data-driven          */
/*  (/api/pages?footer=1 for legal-link slug lookup).                */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { Page } from '@/lib/types';
import {
  Github,
  Twitter,
  MessageCircle,
  Youtube,
  Facebook,
  Instagram,
  Linkedin,
  Twitch,
  Mail,
  Send,
  type LucideIcon,
} from 'lucide-react';

type SocialLink = {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
};

/* All 8 platforms — always rendered; grayed-out when no URL is set. */
const SOCIAL_PLATFORMS: { key: string; settingKey: string; label: string; Icon: LucideIcon }[] = [
  { key: 'facebook', settingKey: 'social_facebook', label: 'Facebook', Icon: Facebook },
  { key: 'twitter', settingKey: 'social_twitter', label: 'X (Twitter)', Icon: Twitter },
  { key: 'instagram', settingKey: 'social_instagram', label: 'Instagram', Icon: Instagram },
  { key: 'youtube', settingKey: 'social_youtube', label: 'YouTube', Icon: Youtube },
  { key: 'linkedin', settingKey: 'social_linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'github', settingKey: 'social_github', label: 'GitHub', Icon: Github },
  { key: 'discord', settingKey: 'social_discord', label: 'Discord', Icon: MessageCircle },
  { key: 'twitch', settingKey: 'social_twitch', label: 'Twitch', Icon: Twitch },
];

export default function SiteFooter() {
  const settings = useAppStore((s) => s.settings);
  const getSetting = useAppStore((s) => s.getSetting);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { toast } = useToast();

  const [footerPages, setFooterPages] = useState<Page[]>([]);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const forumName = getSetting('forum_name', 'PiForum');
  const forumTagline = getSetting('forum_tagline', 'PiForum');
  const forumDescription =
    getSetting('forum_description', 'Stop scrolling dead forums. Piforum delivers battle-tested tutorials and raw expert knowledge. Post your guides, crush doubts, and own the conversation.') || forumTagline || '';
  const logoUrl = getSetting('logo_url', '');
  const year = new Date().getFullYear();

  // Social links — always show all platforms; grayed-out when no URL
  const socials = useMemo<SocialLink[]>(() => {
    return SOCIAL_PLATFORMS.map((p) => ({
      key: p.key,
      href: getSetting(p.settingKey, ''),
      label: `${forumName} on ${p.label}`,
      Icon: p.Icon,
    }));
  }, [settings, getSetting, forumName]);

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
        // Non-critical
      }
    }
    load();
    return () => { active = false; };
  }, []);

  function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: 'Enter your email', description: 'Please provide an email address to subscribe.', variant: 'destructive' });
      return;
    }
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!looksLikeEmail) {
      toast({ title: 'Invalid email', description: 'That email address does not look right.', variant: 'destructive' });
      return;
    }
    setSubscribing(true);
    window.setTimeout(() => {
      setSubscribing(false);
      setEmail('');
      toast({ title: 'You\'re subscribed!', description: 'Thanks for subscribing to the PiForum newsletter.' });
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

  return (
    <footer
      className="mt-auto pt-8 pb-6 sm:pt-10 sm:pb-8 lg:pt-12 lg:pb-10"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Subtle top divider */}
        <div className="neu-divider mb-7 sm:mb-9 lg:mb-10" aria-hidden="true" />

        {/* Responsive grid */}
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
                <h2 id="footer-brand-heading" className="text-sm font-bold tracking-tight">
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

            {/* Social icons row — configured ones are interactive, unconfigured shown as outlined */}
            <nav className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5" aria-label="Social links">
              {socials.map(({ key, href, label, Icon }) => {
                const hasLink = href && href.trim().length > 0;
                return hasLink ? (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group flex items-center justify-center size-10 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    key={key}
                    aria-label={`${label} (not configured)`}
                    className="flex items-center justify-center size-10 rounded-full border border-border bg-muted/40 text-muted-foreground cursor-default"
                    title={`${label} — link not set`}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                );
              })}
            </nav>
          </section>

          {/* 2. Quick Links */}
          <section aria-labelledby="footer-links-heading">
            <h3 id="footer-links-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                onClick={() => handleLegal('about')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => handleLegal('contact')}
                className="text-left text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Contact Us
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

          {/* 3. Newsletter */}
          <section aria-labelledby="footer-newsletter-heading" className="sm:col-span-2 lg:col-span-1">
            <h3 id="footer-newsletter-heading" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Stay Updated
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Get the best threads and community news delivered to your inbox.
              No spam — unsubscribe anytime.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4" noValidate>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
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
          </section>
        </div>

        {/* Bottom bar — copyright + legal */}
        <div className="neu-divider mt-9 sm:mt-10 mb-5" aria-hidden="true" />

        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <address className="not-italic text-xs text-muted-foreground">
            © {year} {forumName}. All rights reserved.
          </address>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Legal">
            <button
              type="button"
              onClick={() => handleLegal('about')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => handleLegal('contact')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </button>
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
    </footer>
  );
}
