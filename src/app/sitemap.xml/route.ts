import { db } from '@/lib/db';
import { getSettingsMap, settingBool, getOrigin } from '@/lib/server-settings';

/* GET /sitemap.xml — dynamically generated XML sitemap with comprehensive
   coverage: homepage, categories, forums, threads, members, tags, and
   static pages — each with appropriate priority and changefreq. */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  const s = await getSettingsMap();

  if (!settingBool(s, 'sitemap_enabled', true)) {
    return new Response('Sitemap is disabled', { status: 404 });
  }

  const urls: { loc: string; lastmod?: string; changefreq: string; priority: number }[] = [];

  // 1. Homepage — highest priority
  urls.push({ loc: `${origin}/`, changefreq: 'daily', priority: 1.0 });

  // 2. Categories — priority 0.8
  const categories = await db.category.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { sortOrder: 'asc' },
  });
  categories.forEach((c) => {
    urls.push({
      loc: `${origin}/?category=${c.id}`,
      lastmod: c.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    });
  });

  // 3. Forums — priority 0.8
  const forums = await db.forum.findMany({
    select: { id: true, updatedAt: true },
    orderBy: { sortOrder: 'asc' },
  });
  forums.forEach((f) => {
    urls.push({
      loc: `${origin}/forum/${f.id}`,
      lastmod: f.updatedAt.toISOString(),
      changefreq: 'daily',
      priority: 0.8,
    });
  });

  // 4. Static pages — priority 0.7
  if (settingBool(s, 'sitemap_include_pages', true)) {
    const pages = await db.page.findMany({ where: { status: 'published' } });
    pages.forEach((p) => {
      urls.push({
        loc: `${origin}/page/${p.slug}`,
        lastmod: p.updatedAt.toISOString(),
        changefreq: 'monthly',
        priority: 0.7,
      });
    });
  }

  // 5. Threads — priority 0.6
  if (settingBool(s, 'sitemap_include_threads', true)) {
    const threads = await db.thread.findMany({
      select: { id: true, updatedAt: true },
      take: 5000,
      orderBy: { updatedAt: 'desc' },
    });
    threads.forEach((t) => {
      urls.push({
        loc: `${origin}/thread/${t.id}`,
        lastmod: t.updatedAt.toISOString(),
        changefreq: 'daily',
        priority: 0.6,
      });
    });
  }

  // 6. Tags — priority 0.5
  if (settingBool(s, 'sitemap_include_tags', true)) {
    const tags = await db.tag.findMany({ select: { slug: true, id: true } });
    tags.forEach((t) => {
      urls.push({
        loc: `${origin}/tags/${t.slug}`,
        changefreq: 'weekly',
        priority: 0.5,
      });
    });
  }

  // 7. Member pages — priority 0.4
  if (settingBool(s, 'sitemap_include_users', true)) {
    const users = await db.user.findMany({
      select: { id: true, updatedAt: true },
      take: 1000,
    });
    users.forEach((u) => {
      urls.push({
        loc: `${origin}/profile/${u.id}`,
        lastmod: u.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.4,
      });
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
  </url>`,
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
