import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        forums: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return successResponse(categories);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch categories');
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { name, description, icon, sortOrder, accessLevel } = body;

    if (!name) {
      return errorResponse('Category name is required');
    }

    const category = await db.category.create({
      data: {
        name,
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
        accessLevel: accessLevel ?? 0,
      },
    });

    return successResponse(category, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create category');
  }
}
