import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* GET /api/ranks — list all ranks (public) */
export async function GET() {
  try {
    const ranks = await db.rank.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { users: true } } },
    });
    return successResponse(ranks);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch ranks');
  }
}

/* POST /api/ranks — create a rank (admin only) */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { name, title, color, icon, minPosts, minReputation, isStaff, sortOrder } = body;
    if (!name || !title) return errorResponse('Name and title are required');

    const existing = await db.rank.findUnique({ where: { name } });
    if (existing) return errorResponse('A rank with this name already exists');

    const rank = await db.rank.create({
      data: {
        name,
        title,
        color: color || null,
        icon: icon || null,
        minPosts: typeof minPosts === 'number' ? minPosts : 0,
        minReputation: typeof minReputation === 'number' ? minReputation : 0,
        isStaff: !!isStaff,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    return successResponse(rank, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create rank');
  }
}
