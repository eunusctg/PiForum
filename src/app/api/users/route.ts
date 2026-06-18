import { db } from '@/lib/db';
import { successResponse, serverErrorResponse, requireAdmin, getQueryParam } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const limitParam = getQueryParam(request, 'limit');
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 100)) : undefined;

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        firebaseUid: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        banned: true,
        banReason: true,
        isVerified: true,
        verifiedAt: true,
        postCount: true,
        threadCount: true,
        reputation: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            threads: true,
            posts: true,
          },
        },
      },
    });

    const usersWithCounts = users.map((user) => ({
      ...user,
      threadCount: user._count.threads,
      postCount: user._count.posts,
      _count: undefined,
    }));

    return successResponse(usersWithCounts);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch users');
  }
}
