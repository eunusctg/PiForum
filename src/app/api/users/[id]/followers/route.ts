import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

/* GET /api/users/[id]/followers — Get users who follow this user
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
        where: { followingId: userId },
        include: {
          follower: {
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
      db.follow.count({ where: { followingId: userId } }),
    ]);

    return successResponse({
      users: follows.map((f) => ({
        ...f.follower,
        followedAt: f.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch followers');
  }
}
