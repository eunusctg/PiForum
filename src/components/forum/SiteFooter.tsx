'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Page } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  SiteFooter — clean, admin-configurable footer.                      */
/*  Renders: site identity (logo + name + tagline) | footer pages       */
/*  (from /api/pages?footer=1) | copyright line.                        */
/*  No hardcoded "Powered by ..." clutter — admin controls footer_text  */
/*  and the footer page links via Content → Pages.                      */
/* ------------------------------------------------------------------ */

export default function SiteFooter() {
  const getSetting = useAppStore((s) => s.getSetting);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [footerPages, setFooterPages] = useState<Page[]>([]);

  const forumName = getSetting('forum_name', 'PiForum');
  const forumTagline = getSetting('forum_tagline', '');
  const logoUrl = getSetting('logo_url', '');
  const footerText = getSetting('footer_text', '');
  const year = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/pages?footer=1');
        const data = await res.json();
        if (active && data.success && Array.isArray(data.data)) {
          setFooterPages(data.data);
        }
      } catch {
        // Non-critical
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="mt-auto py-8" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="neu-divider mb-6" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Site identity */}
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${forumName} logo`}
                className="h-7 w-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="neu-circle flex items-center justify-center w-7 h-7 text-sm font-bold text-primary">
                π
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{forumName}</p>
              {forumTagline && (
                <p className="text-xs text-muted-foreground truncate">{forumTagline}</p>
              )}
            </div>
          </div>

          {/* Footer page links (admin-controlled via Content → Pages) */}
          {footerPages.length > 0 && (
            <nav
              className="flex flex-wrap items-center gap-x-5 gap-y-2"
              aria-label="Footer"
            >
              {footerPages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateTo('page', { pageSlug: p.slug })}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </nav>
          )}

          {/* Copyright / footer text */}
          <p className="text-xs text-muted-foreground">
            {footerText || `© ${year} ${forumName}`}
          </p>
        </div>
      </div>
    </footer>
  );
}
