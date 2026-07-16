'use client';

/* ------------------------------------------------------------------ */
/*  SiteFooter — polished, modern, fully-responsive footer.           */
/*                                                                    */
/*  Layout:                                                           */
/*    • Mobile  ( <640px ): 1-col stack                               */
/*    • ≥sm     → single column (Brand + Socials only)                */
/*                                                                    */
/*  Quick Links & Newsletter columns removed per design request.      */
/*  Social links limited to 7 platforms with neumorphic soft UI.      */
/*  Settings-driven (forum_name, forum_tagline, logo_url, social_*).  */
/* ------------------------------------------------------------------ */

import { useMemo, useState, useEffect } from 'react';
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
  Mail,
  type LucideIcon,
} from 'lucide-react';

type SocialLink = {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  color: string;
};

/* 7 platforms with brand colors — always rendered with vivid icons. */
const SOCIAL_PLATFORMS: { key: string; settingKey: string; label: string; Icon: LucideIcon; color: string }[] = [
  { key: 'facebook', settingKey: 'social_facebook', label: 'Facebook', Icon: Facebook, color: '#1877F2' },
  { key: 'twitter', settingKey: 'social_twitter', label: 'X (Twitter)', Icon: Twitter, color: '#1DA1F2' },
  { key: 'instagram', settingKey: 'social_instagram', label: 'Instagram', Icon: Instagram, color: '#E4405F' },
  { key: 'youtube', settingKey: 'social_youtube', label: 'YouTube', Icon: Youtube, color: '#FF0000' },
  { key: 'linkedin', settingKey: 'social_linkedin', label: 'LinkedIn', Icon: Linkedin, color: '#0A66C2' },
  { key: 'github', settingKey: 'social_github', label: 'GitHub', Icon: Github, color: '#6e5494' },
  { key: 'discord', settingKey: 'social_discord', label: 'Discord', Icon: MessageCircle, color: '#5865F2' },
];

export default function SiteFooter() {
  const settings = useAppStore((s) => s.settings);
  const getSetting = useAppStore((s) => s.getSetting);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { toast } = useToast();

  const [footerPages, setFooterPages] = useState<Page[]>([]);

  const forumName = getSetting('forum_name', 'PiForum');
  const forumTagline = getSetting('forum_tagline', 'PiForum');
  const forumDescription =
    getSetting('forum_description', 'Stop scrolling dead forums. Piforum delivers battle-tested tutorials and raw expert knowledge. Post your guides, crush doubts, and own the conversation.') || forumTagline || '';
  const logoUrl = getSetting('logo_url', '');
  const year = new Date().getFullYear();

  // Social links — always show all 7 platforms with brand colors
  const socials = useMemo<SocialLink[]>(() => {
    return SOCIAL_PLATFORMS.map((p) => ({
      key: p.key,
      href: getSetting(p.settingKey, ''),
      label: `${forumName} on ${p.label}`,
      Icon: p.Icon,
      color: p.color,
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

        {/* Single column layout — Brand + Socials */}
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
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-2xl">
              {forumDescription}
            </p>
          )}

          {/* Social icons — neumorphic soft UI theme-aware circles */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3" role="navigation" aria-label="Social links">
            {socials.map(({ key, href, label, Icon, color }) => {
              const hasLink = !!(href && href.trim().length > 0);

              if (hasLink) {
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="me noopener noreferrer"
                    aria-label={label}
                    className="footer-social-icon inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-200 hover:scale-110 hover:shadow-lg neu-circle"
                    title={label}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 footer-social-icon-svg" style={{ color }} aria-hidden="true" />
                  </a>
                );
              }

              return (
                <span
                  key={key}
                  aria-label={`${label} (not configured)`}
                  className="footer-social-icon footer-social-icon-muted inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full transition-all duration-200 cursor-default hover:scale-105 neu-circle"
                  title={`${label} — link not set`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 footer-social-icon-svg" style={{ color, opacity: 0.55 }} aria-hidden="true" />
                </span>
              );
            })}
          </div>
        </section>

        {/* Bottom bar — copyright + legal */}
        <div className="neu-divider mt-9 sm:mt-10 mb-5" aria-hidden="true" />

        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <address className="not-italic text-xs text-muted-foreground">
            &copy; {year} {forumName}. All rights reserved.
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
