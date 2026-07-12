import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

/* ------------------------------------------------------------------ */
/*  /api/threads/featured                                              */
/*                                                                    */
/*  Returns featured/recent threads with first attachment as thumb-   */
/*  nail for the sliding grid on the home page.                       */
/*                                                                    */
/*  GET ?limit=10&categoryId=<id>                                     */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    const categoryId = searchParams.get('categoryId');

    const where: any = {};
    if (categoryId) {
      where.forum = { categoryId };
    }

    // Get threads with their first post's first attachment as thumbnail
    const threads = await db.thread.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            isVerified: true,
          },
        },
        forum: {
          select: {
            id: true,
            name: true,
            icon: true,
            categoryId: true,
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: { id: true, name: true, slug: true, color: true },
            },
          },
        },
        posts: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: {
              take: 1,
              where: {
                mimeType: { startsWith: 'image/' },
              },
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                url: true,
                filename: true,
              },
            },
          },
        },
        _count: {
          select: { posts: true },
        },
      },
      orderBy: [
        { pinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
    });

    // Flatten: extract first attachment URL from first post as thumbnail
    const featured = threads.map((thread) => {
      const firstPost = thread.posts?.[0];
      const firstAttachment = firstPost?.attachments?.[0];
      return {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        views: thread.views,
        pinned: thread.pinned,
        locked: thread.locked,
        featured: thread.featured,
        solved: thread.solved,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        postCount: thread._count.posts,
        thumbnail: firstAttachment?.url || null,
        author: thread.author,
        forum: thread.forum,
        tags: thread.tags.map((tt: any) => tt.tag),
      };
    });

    return successResponse({ threads: featured });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch featured threads');
  }
}
