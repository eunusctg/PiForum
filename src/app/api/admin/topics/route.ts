import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
  getQueryParam,
} from '@/lib/api-helpers';

/* GET /api/admin/topics — list all threads across all forums for moderation.
   Supports ?type=threads|posts and ?q=search. Admin only. */
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const type = getQueryParam(request, 'type') || 'threads';
    const q = getQueryParam(request, 'q');

    if (type === 'posts') {
      const where: any = {};
      if (q && q.trim()) {
        where.content = { contains: q };
      }
      const posts = await db.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
          thread: { select: { id: true, title: true } },
        },
      });
      return successResponse({ posts, total: posts.length });
    }

    // threads
    const where: any = {};
    if (q && q.trim()) {
      where.OR = [{ title: { contains: q } }, { content: { contains: q } }];
    }
    const threads = await db.thread.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
        forum: { select: { id: true, name: true } },
        _count: { select: { posts: true } },
      },
    });
    const result = threads.map((t) => ({ ...t, postCount: t._count.posts, _count: undefined }));
    return successResponse({ threads: result, total: result.length });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch topics');
  }
}
