import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* PUT /api/rules/[id] — update a rule (admin only) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.rule.findUnique({ where: { id } });
    if (!existing) return errorResponse('Rule not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { title, description, icon, category, sortOrder, active } = body;
    const updated = await db.rule.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon: icon || null }),
        ...(category !== undefined && { category: category || null }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(active !== undefined && { active: !!active }),
      },
    });

    return successResponse(updated);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update rule');
  }
}

/* DELETE /api/rules/[id] — delete a rule (admin only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const existing = await db.rule.findUnique({ where: { id } });
    if (!existing) return errorResponse('Rule not found', 404);

    await db.rule.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete rule');
  }
}
