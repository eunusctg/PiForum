import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  getQueryParam,
  slugify,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const q = getQueryParam(request, 'q');
    const where: any = {};
    if (q && q.trim()) {
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
      ];
    }

    const tags = await db.tag.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });

    return successResponse(tags);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch tags');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { name, color } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('Tag name is required');
    }

    const slug = slugify(name);
    if (!slug) return errorResponse('Tag name must contain valid alphanumeric characters');

    const existing = await db.tag.findUnique({ where: { slug } });
    if (existing) return errorResponse('A tag with this slug already exists', 409);

    const tag = await db.tag.create({
      data: {
        name: name.trim(),
        slug,
        ...(color && typeof color === 'string' && { color }),
      },
    });

    return successResponse(tag, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create tag');
  }
}
