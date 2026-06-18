import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, parseBody } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forumId = searchParams.get('forumId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const skip = (page - 1) * limit;

    if (!forumId) {
      return errorResponse('forumId query parameter is required');
    }

    // Verify forum exists
    const forum = await db.forum.findUnique({ where: { id: forumId } });
    if (!forum) return errorResponse('Forum not found', 404);

    const [threads, total] = await Promise.all([
      db.thread.findMany({
        where: { forumId },
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
        orderBy: [
          { pinned: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      db.thread.count({ where: { forumId } }),
    ]);

    const threadsWithPostCount = threads.map((thread) => ({
      ...thread,
      postCount: thread._count.posts,
      _count: undefined,
    }));

    return successResponse({
      threads: threadsWithPostCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch threads');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { forumId, title, content } = body;

    if (!forumId || !title || !content) {
      return errorResponse('Forum ID, title, and content are required');
    }

    // Verify forum exists
    const forum = await db.forum.findUnique({ where: { id: forumId } });
    if (!forum) return errorResponse('Forum not found', 404);

    // Create thread and first post in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the thread
      const thread = await tx.thread.create({
        data: {
          forumId,
          authorId: user.id,
          title,
          content,
        },
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
        },
      });

      // Create the first post (same content as thread)
      await tx.post.create({
        data: {
          threadId: thread.id,
          authorId: user.id,
          content,
        },
      });

      // Update forum counters
      await tx.forum.update({
        where: { id: forumId },
        data: {
          threadCount: { increment: 1 },
          postCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });

      return thread;
    });

    return successResponse({
      ...result,
      postCount: 1,
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create thread');
  }
}
