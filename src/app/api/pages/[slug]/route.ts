import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* GET /api/pages/[slug] — public fetch of a single page by slug */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await db.page.findUnique({ where: { slug } });
    if (!page) return errorResponse('Page not found', 404);
    // Drafts are only visible to admins
    if (page.status === 'draft') {
      const adminCheck = await requireAdmin(request);
      if (adminCheck.error) return errorResponse('Page not found', 404);
    }
    return successResponse(page);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch page');
  }
}

/* PUT /api/pages/[slug] — update a page (admin only) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { slug } = await params;
    const existing = await db.page.findUnique({ where: { slug } });
    if (!existing) return errorResponse('Page not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { title, content, excerpt, status, showInFooter, showInHeader, sortOrder } = body;
    const wasDraft = existing.status === 'draft';
    const nowPublished = status === 'published' && wasDraft;

    const updated = await db.page.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(status !== undefined && { status: status === 'draft' ? 'draft' : 'published' }),
        ...(showInFooter !== undefined && { showInFooter: !!showInFooter }),
        ...(showInHeader !== undefined && { showInHeader: !!showInHeader }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(nowPublished && { publishedAt: new Date() }),
      },
    });

    // Save a revision snapshot for audit
    await db.pageRevision.create({
      data: {
        pageId: existing.id,
        title: existing.title,
        content: existing.content,
        editedBy: adminCheck.user!.id,
      },
    });

    return successResponse(updated);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update page');
  }
}

/* DELETE /api/pages/[slug] — delete a page (admin only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { slug } = await params;
    const existing = await db.page.findUnique({ where: { slug } });
    if (!existing) return errorResponse('Page not found', 404);

    await db.page.delete({ where: { id: existing.id } });

    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'PAGE_DELETED',
        details: `Deleted page "${existing.title}" (${slug})`,
      },
    });

    return successResponse({ deleted: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete page');
  }
}
