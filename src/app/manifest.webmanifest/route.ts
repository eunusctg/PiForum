import { getSettingsMap, settingBool, settingStr } from '@/lib/server-settings';

/* GET /manifest.webmanifest — dynamic PWA manifest from settings. */
export async function GET() {
  const s = await getSettingsMap();
  if (!settingBool(s, 'pwa_enabled', true)) {
    return new Response('PWA is disabled', { status: 404 });
  }

  const name = settingStr(s, 'pwa_name', settingStr(s, 'forum_name', 'PiForum'));
  const shortName = settingStr(s, 'pwa_short_name', 'PiForum');
  const description = settingStr(s, 'pwa_description', settingStr(s, 'forum_description', 'A modern forum'));
  const themeColor = settingStr(s, 'pwa_theme_color', '#D4AF37');
  const backgroundColor = settingStr(s, 'pwa_background_color', '#e0e0e0');
  const display = settingStr(s, 'pwa_display', 'standalone') as any;
  const startUrl = settingStr(s, 'pwa_start_url', '/');
  const icon192 = settingStr(s, 'pwa_icon_192', '/icon-192.png');
  const icon512 = settingStr(s, 'pwa_icon_512', '/icon-512.png');

  const manifest = {
    name,
    short_name: shortName,
    description,
    start_url: startUrl,
    display,
    background_color: backgroundColor,
    theme_color: themeColor,
    orientation: 'portrait-primary',
    icons: [
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['social', 'communication', 'productivity'],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
