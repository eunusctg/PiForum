import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where = categoryId && categoryId !== 'all' ? { categoryId } : {};

    const forums = await db.forum.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    return successResponse(forums);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch forums');
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { categoryId, name, description, icon, sortOrder } = body;

    if (!categoryId || !name) {
      return errorResponse('Category ID and forum name are required');
    }

    // Verify category exists
    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) return errorResponse('Category not found', 404);

    const forum = await db.forum.create({
      data: {
        categoryId,
        name,
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    return successResponse(forum, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create forum');
  }
}
