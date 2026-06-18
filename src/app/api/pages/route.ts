import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
  getQueryParam,
  slugify,
} from '@/lib/api-helpers';

/* GET /api/pages — list pages. ?footer=1 filters showInFooter, ?header=1 filters showInHeader */
export async function GET(request: Request) {
  try {
    const footerOnly = getQueryParam(request, 'footer') === '1';
    const headerOnly = getQueryParam(request, 'header') === '1';

    const where: any = {};
    if (footerOnly) where.showInFooter = true;
    if (headerOnly) where.showInHeader = true;
    // Only return published pages for public list requests; admins get all via ?all=1.
    const all = getQueryParam(request, 'all') === '1';
    if (!all) where.status = 'published';

    const pages = await db.page.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return successResponse(pages);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch pages');
  }
}

/* POST /api/pages — create a page (admin only) */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { slug, title, content, excerpt, status, showInFooter, showInHeader, sortOrder } = body;
    if (!title || !content) return errorResponse('Title and content are required');

    let finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) return errorResponse('Could not generate a valid slug');

    const existing = await db.page.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    }

    const page = await db.page.create({
      data: {
        slug: finalSlug,
        title,
        content,
        excerpt: excerpt || null,
        status: status === 'draft' ? 'draft' : 'published',
        showInFooter: !!showInFooter,
        showInHeader: !!showInHeader,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        authorId: adminCheck.user!.id,
        publishedAt: status === 'draft' ? null : new Date(),
      },
    });

    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'PAGE_CREATED',
        details: `Created page "${title}" (${finalSlug})`,
      },
    });

    return successResponse(page, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create page');
  }
}
