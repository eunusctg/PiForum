'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

/* Injects JSON-LD structured data and the analytics script into <head>
   based on the loaded settings. Runs client-side after the settings store
   hydrates. */
export default function SiteHeadInjector() {
  const settings = useAppStore((s) => s.settings);
  const getSetting = useAppStore((s) => s.getSetting);

  useEffect(() => {
    const forumName = getSetting('forum_name', 'PiForum');
    const forumDescription = getSetting('forum_description', '');
    const canonical = getSetting('seo_canonical_url', '');
    const jsonldType = getSetting('seo_jsonld_type', 'WebSite');
    const logoUrl = getSetting('logo_url', '/logo.svg');

    // JSON-LD structured data
    const existingJsonLd = document.getElementById('piforum-jsonld');
    if (existingJsonLd) existingJsonLd.remove();
    if (jsonldType !== 'None' && canonical) {
      const script = document.createElement('script');
      script.id = 'piforum-jsonld';
      script.type = 'application/ld+json';
      const data: any = {
        '@context': 'https://schema.org',
        name: forumName,
        description: forumDescription,
        url: canonical,
      };
      if (jsonldType === 'Organization') {
        data['@type'] = 'Organization';
        if (logoUrl) data.logo = logoUrl.startsWith('http') ? logoUrl : `${canonical}${logoUrl}`;
      } else {
        data['@type'] = 'WebSite';
        data.potentialAction = {
          '@type': 'SearchAction',
          target: `${canonical}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        };
      }
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    }

    // Analytics injection
    const existingAnalytics = document.getElementById('piforum-analytics');
    if (existingAnalytics) existingAnalytics.remove();
    const analyticsEnabled = getSetting('analytics_enabled', 'false') === 'true';
    const provider = getSetting('analytics_provider', 'google');
    const analyticsId = getSetting('analytics_id', '');
    const scriptUrl = getSetting('analytics_script_url', '');
    const trackAdmins = getSetting('analytics_track_admins', 'false') === 'true';
    const isAdmin = useAppStore.getState().isAdmin();

    if (analyticsEnabled && analyticsId && (trackAdmins || !isAdmin)) {
      const script = document.createElement('script');
      script.id = 'piforum-analytics';
      script.async = true;
      if (provider === 'google') {
        script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
        document.head.appendChild(script);
        const inline = document.createElement('script');
        inline.id = 'piforum-analytics-inline';
        inline.textContent = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${analyticsId}', { ${getSetting('analytics_anonymize_ip', 'true') === 'true' ? "anonymize_ip: true," : ''} });
        `;
        document.head.appendChild(inline);
      } else if (provider === 'plausible') {
        script.src = 'https://plausible.io/js/script.js';
        script.dataset.domain = analyticsId;
        document.head.appendChild(script);
      } else if ((provider === 'matomo' || provider === 'custom') && scriptUrl) {
        script.src = scriptUrl;
        document.head.appendChild(script);
      }
    }

    // Cleanup on unmount
    return () => {
      // no-op: scripts persist for the session
    };
  }, [settings, getSetting]);

  return null;
}
