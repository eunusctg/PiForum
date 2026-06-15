import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const forum = await db.forum.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });
    if (!forum) return errorResponse('Forum not found', 404);
    return successResponse(forum);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch forum');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const existing = await db.forum.findUnique({ where: { id } });
    if (!existing) return errorResponse('Forum not found', 404);

    const { categoryId, name, description, icon, sortOrder } = body;

    // If categoryId is being changed, verify the new category exists
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await db.category.findUnique({ where: { id: categoryId } });
      if (!category) return errorResponse('Category not found', 404);
    }

    const forum = await db.forum.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return successResponse(forum);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update forum');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;

    const existing = await db.forum.findUnique({ where: { id } });
    if (!existing) return errorResponse('Forum not found', 404);

    await db.forum.delete({ where: { id } });

    return successResponse({ message: 'Forum deleted successfully' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete forum');
  }
}
