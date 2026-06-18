import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.post.findUnique({ where: { id } });
    if (!existing) return errorResponse('Post not found', 404);

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;

    // Only author or admin can edit
    if (authCheck.user!.id !== existing.authorId && authCheck.user!.role < 2) {
      return errorResponse('You can only edit your own posts', 403);
    }

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { content } = body;
    if (!content) return errorResponse('Content is required');

    const post = await db.post.update({
      where: { id },
      data: { content },
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
        votes: {
          select: { voteType: true },
        },
        attachments: true,
      },
    });

    const voteScore = post.votes.reduce((sum, v) => sum + v.voteType, 0);

    return successResponse({
      ...post,
      voteScore,
      votes: undefined,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update post');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.post.findUnique({
      where: { id },
      include: { thread: true },
    });
    if (!existing) return errorResponse('Post not found', 404);

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;

    // Only author or admin can delete
    if (authCheck.user!.id !== existing.authorId && authCheck.user!.role < 2) {
      return errorResponse('You can only delete your own posts', 403);
    }

    // Delete post and update counters
    await db.$transaction(async (tx) => {
      await tx.post.delete({ where: { id } });

      await tx.forum.update({
        where: { id: existing.thread.forumId },
        data: {
          postCount: { decrement: 1 },
        },
      });
    });

    return successResponse({ message: 'Post deleted successfully' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete post');
  }
}
