import { db } from '@/lib/db';
import { getSettingsMap, settingBool, getOrigin } from '@/lib/server-settings';

/* GET /sitemap.xml — dynamically generated XML sitemap. */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  const s = await getSettingsMap();

  if (!settingBool(s, 'sitemap_enabled', true)) {
    return new Response('Sitemap is disabled', { status: 404 });
  }

  const changeFreq = s.sitemap_change_freq || 'daily';
  const priorityThreads = parseFloat(s.sitemap_priority_threads || '0.8');
  const priorityPages = parseFloat(s.sitemap_priority_pages || '0.6');

  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  // Home
  urls.push({ loc: `${origin}/`, changefreq: 'daily', priority: 1.0 });

  // Static pages
  if (settingBool(s, 'sitemap_include_pages', true)) {
    const pages = await db.page.findMany({ where: { status: 'published' } });
    pages.forEach((p) => {
      urls.push({ loc: `${origin}/page/${p.slug}`, lastmod: p.updatedAt.toISOString(), changefreq: changeFreq, priority: priorityPages });
    });
  }

  // Threads
  if (settingBool(s, 'sitemap_include_threads', true)) {
    const threads = await db.thread.findMany({ select: { id: true, updatedAt: true }, take: 5000, orderBy: { updatedAt: 'desc' } });
    threads.forEach((t) => {
      urls.push({ loc: `${origin}/thread/${t.id}`, lastmod: t.updatedAt.toISOString(), changefreq: changeFreq, priority: priorityThreads });
    });
  }

  // Tags
  if (settingBool(s, 'sitemap_include_tags', true)) {
    const tags = await db.tag.findMany({ select: { slug: true } });
    tags.forEach((t) => {
      urls.push({ loc: `${origin}/tags`, changefreq: 'weekly', priority: 0.4 });
    });
  }

  // Users
  if (settingBool(s, 'sitemap_include_users', false)) {
    const users = await db.user.findMany({ select: { id: true, updatedAt: true }, take: 1000 });
    users.forEach((u) => {
      urls.push({ loc: `${origin}/profile/${u.id}`, lastmod: u.updatedAt.toISOString(), changefreq: 'weekly', priority: 0.3 });
    });
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
