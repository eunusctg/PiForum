import { db } from '@/lib/db';
import { successResponse, serverErrorResponse, requireAdmin } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
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
