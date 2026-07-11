import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const thread = await db.thread.findUnique({
      where: { id },
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
        forum: {
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            icon: true,
            sortOrder: true,
            lastPostAt: true,
            threadCount: true,
            postCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!thread) return errorResponse('Thread not found', 404);

    // Increment views
    await db.thread.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return successResponse({
      ...thread,
      postCount: thread._count.posts,
      views: thread.views + 1,
      _count: undefined,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch thread');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.thread.findUnique({ where: { id } });
    if (!existing) return errorResponse('Thread not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { pinned, locked, title, content } = body;

    // Check permissions: author can edit title/content, admin can pin/lock
    const userId = request.headers.get('x-user-id');

    if (pinned !== undefined || locked !== undefined) {
      // Only admins can pin/lock
      const adminCheck = await requireAdmin(request);
      if (adminCheck.error) return adminCheck.error;
    }

    if (title !== undefined || content !== undefined) {
      // Author or admin can edit
      const authCheck = await requireAuth(request);
      if (authCheck.error) return authCheck.error;
      if (authCheck.user!.id !== existing.authorId && authCheck.user!.role < 2) {
        return errorResponse('You can only edit your own threads', 403);
      }
      // Validate title/content if being updated
      if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
        return errorResponse('Title must not be empty');
      }
      if (title !== undefined && title.trim().length > 200) {
        return errorResponse('Title must be 200 characters or less');
      }
      if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
        return errorResponse('Content must not be empty');
      }
      if (content !== undefined && content.length > 50000) {
        return errorResponse('Content must be 50000 characters or less');
      }
    }

    const thread = await db.thread.update({
      where: { id },
      data: {
        ...(pinned !== undefined && { pinned }),
        ...(locked !== undefined && { locked }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
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

    return successResponse(thread);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update thread');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.thread.findUnique({ where: { id } });
    if (!existing) return errorResponse('Thread not found', 404);

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;

    // Author or admin can delete
    if (authCheck.user!.id !== existing.authorId && authCheck.user!.role < 2) {
      return errorResponse('You can only delete your own threads', 403);
    }

    // Delete thread and update forum counters (sequential — Workers proxy
    // doesn't support interactive transactions)
    const postCount = await db.post.count({ where: { threadId: id } });

    await db.thread.delete({ where: { id } });

    // Update forum counters only if thread was in a forum
    if (existing.forumId) {
      await db.forum.update({
        where: { id: existing.forumId },
        data: {
          threadCount: { decrement: 1 },
          postCount: { decrement: postCount },
        },
      });
    }

    return successResponse({ message: 'Thread deleted successfully' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete thread');
  }
}
