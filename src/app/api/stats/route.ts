import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

export async function GET() {
  try {
    const [
      totalUsers,
      totalThreads,
      totalPosts,
      totalCategories,
      totalForums,
      recentUsers,
      recentThreads,
    ] = await Promise.all([
      db.user.count(),
      db.thread.count(),
      db.post.count(),
      db.category.count(),
      db.forum.count(),
      db.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          banned: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.thread.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
            },
          },
          _count: {
            select: { posts: true },
          },
        },
      }),
    ]);

    // Estimate storage used (rough calculation based on post content)
    const posts = await db.post.findMany({
      select: { content: true },
    });
    const storageUsed = posts.reduce((sum, p) => sum + Buffer.byteLength(p.content, 'utf8'), 0);

    const recentThreadsWithCount = recentThreads.map((t) => ({
      ...t,
      postCount: t._count.posts,
      _count: undefined,
    }));

    return successResponse({
      totalUsers,
      totalThreads,
      totalPosts,
      totalCategories,
      totalForums,
      storageUsed,
      recentUsers,
      recentThreads: recentThreadsWithCount,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch stats');
  }
}
