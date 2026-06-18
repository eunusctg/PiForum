import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
} from '@/lib/api-helpers';

/* DELETE /api/tags/[id] — delete a tag (admin only). Removes the tag and its
   thread-tag associations (cascade). Does not delete the threads. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.tag.findUnique({ where: { id } });
    if (!existing) return errorResponse('Tag not found', 404);

    await db.tag.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete tag');
  }
}

/* PUT /api/tags/[id] — update a tag's color (admin only) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.tag.findUnique({ where: { id } });
    if (!existing) return errorResponse('Tag not found', 404);

    const body = await (async () => {
      try {
        return await request.json();
      } catch {
        return null;
      }
    })();
    if (!body) return errorResponse('Invalid request body');

    const { name, color } = body;
    const updated = await db.tag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color: color || null }),
      },
    });

    return successResponse(updated);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update tag');
  }
}
