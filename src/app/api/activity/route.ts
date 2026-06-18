import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
} as const;

export async function GET() {
  try {
    const [threads, posts] = await Promise.all([
      db.thread.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          forum: { select: { id: true, name: true, icon: true } },
        },
      }),
      db.post.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          thread: { select: { id: true, title: true } },
        },
      }),
    ]);

    const activities = [
      ...threads.map((t) => ({
        type: 'thread' as const,
        id: t.id,
        createdAt: t.createdAt,
        title: t.title,
        author: t.author,
        forum: t.forum,
      })),
      ...posts.map((p) => ({
        type: 'post' as const,
        id: p.id,
        createdAt: p.createdAt,
        content: p.content,
        author: p.author,
        thread: p.thread,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return successResponse({ activities });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch activity feed');
  }
}
