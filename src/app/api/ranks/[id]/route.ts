import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* PUT /api/ranks/[id] — update a rank (admin only) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.rank.findUnique({ where: { id } });
    if (!existing) return errorResponse('Rank not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { name, title, color, icon, minPosts, minReputation, isStaff, sortOrder } = body;
    if (name && name !== existing.name) {
      const dup = await db.rank.findUnique({ where: { name } });
      if (dup) return errorResponse('A rank with this name already exists');
    }

    const updated = await db.rank.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(title !== undefined && { title }),
        ...(color !== undefined && { color: color || null }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(minPosts !== undefined && { minPosts: Number(minPosts) }),
        ...(minReputation !== undefined && { minReputation: Number(minReputation) }),
        ...(isStaff !== undefined && { isStaff: !!isStaff }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    return successResponse(updated);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update rank');
  }
}

/* DELETE /api/ranks/[id] — delete a rank (admin only). Users keep their rankId
   but it will no longer resolve; they fall back to role-based display. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.rank.findUnique({ where: { id } });
    if (!existing) return errorResponse('Rank not found', 404);

    // Unassign users before deleting to avoid orphaned references
    await db.user.updateMany({ where: { rankId: id }, data: { rankId: null } });
    await db.rank.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete rank');
  }
}
