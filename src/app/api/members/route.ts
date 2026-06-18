import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  getPagination,
  getQueryParam,
  serializeUser,
} from '@/lib/api-helpers';

const VALID_SORTS = ['newest', 'oldest', 'reputation', 'posts'] as const;
type SortKey = (typeof VALID_SORTS)[number];

export async function GET(request: Request) {
  try {
    const { page, limit, skip } = getPagination(request);
    const q = getQueryParam(request, 'q');
    const sortParam = getQueryParam(request, 'sort') || 'newest';

    if (!VALID_SORTS.includes(sortParam as SortKey)) {
      return errorResponse('Invalid sort option. Must be one of: newest, oldest, reputation, posts');
    }
    const sort = sortParam as SortKey;

    const orderBy =
      sort === 'oldest' ? { createdAt: 'asc' as const }
      : sort === 'reputation' ? { reputation: 'desc' as const }
      : sort === 'posts' ? { postCount: 'desc' as const }
      : { createdAt: 'desc' as const };

    const where: any = {};
    if (q && q.trim()) {
      where.OR = [
        { username: { contains: q } },
        { displayName: { contains: q } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    const publicUsers = users.map((u) => {
      const serialized = serializeUser(u);
      const { email: _email, ...publicFields } = serialized;
      return publicFields;
    });

    return successResponse({
      users: publicUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch members');
  }
}
