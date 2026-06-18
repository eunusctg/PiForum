import { getSettingsMap, settingBool, getOrigin } from '@/lib/server-settings';

/* GET /robots.txt — dynamically generated based on SEO settings. */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  const s = await getSettingsMap();
  const indexable = settingBool(s, 'seo_indexable', true);

  const lines: string[] = [];
  if (indexable) {
    lines.push('User-agent: *');
    lines.push('Allow: /');
    lines.push('Disallow: /admin');
    lines.push('Disallow: /api/');
    lines.push('Disallow: /new-thread');
  } else {
    lines.push('User-agent: *');
    lines.push('Disallow: /');
  }
  lines.push('');
  lines.push(`Sitemap: ${origin}/sitemap.xml`);

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
