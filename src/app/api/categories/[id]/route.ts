import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await db.category.findUnique({
      where: { id },
      include: { forums: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!category) return errorResponse('Category not found', 404);
    return successResponse(category);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch category');
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

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return errorResponse('Category not found', 404);

    const { name, description, icon, sortOrder, accessLevel } = body;

    const category = await db.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(accessLevel !== undefined && { accessLevel }),
      },
    });

    return successResponse(category);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update category');
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

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return errorResponse('Category not found', 404);

    await db.category.delete({ where: { id } });

    return successResponse({ message: 'Category deleted successfully' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete category');
  }
}
