import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

/* GET /api/users/[id]/following — Get users this user is following
   Query: ?page=1&limit=20 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
              role: true,
              bio: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.follow.count({ where: { followerId: userId } }),
    ]);

    return successResponse({
      users: follows.map((f) => ({
        ...f.following,
        followedAt: f.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch following list');
  }
}
