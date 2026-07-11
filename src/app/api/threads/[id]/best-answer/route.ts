import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireModerator,
  parseBody,
} from '@/lib/api-helpers';
import { UserRole } from '@/lib/types';

/**
 * PUT /api/threads/[id]/best-answer
 * ---------------------------------
 * Mark a post as the best answer for a thread.
 *
 * Body: { postId: string }
 *
 * Permission: Admin (role >= 2) OR Moderator (role >= 1) OR the thread author.
 * - Thread author can select a best answer (OP privilege).
 * - Admins/Moderators can override/select.
 *
 * Effects:
 * - Sets thread.bestAnswerId, thread.solved = true, thread.bestAnswerSelectedAt/By
 * - Sets post.isBestAnswer = true (clears any previous best answer's flag)
 * - Bumps the post author's reputation by +1 (optional, can be skipped)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;

    // Allow moderators, admins, or the thread author.
    // requireModerator checks role >= 1. We also allow the thread author below.
    const modCheck = await requireModerator(request);
    let selectorUserId: string;

    if (modCheck.error) {
      // Not a moderator — check if the user is the thread author
      const user = await (await import('@/lib/api-helpers')).getAuthenticatedUser(request);
      if (!user) return modCheck.error;

      const thread = await db.thread.findUnique({
        where: { id: threadId },
        select: { authorId: true, locked: true },
      });
      if (!thread) return errorResponse('Thread not found', 404);
      if (thread.authorId !== user.id) {
        return errorResponse(
          'Only moderators, admins, or the thread author can select a best answer',
          403,
        );
      }
      selectorUserId = user.id;
    } else if (modCheck.user) {
      selectorUserId = modCheck.user.id;
    } else {
      return modCheck.error!;
    }

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');
    const { postId } = body;
    if (!postId || typeof postId !== 'string') {
      return errorResponse('postId is required', 400);
    }

    // Verify the post belongs to this thread
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, threadId: true, authorId: true, isBestAnswer: true },
    });
    if (!post) return errorResponse('Post not found', 404);
    if (post.threadId !== threadId) {
      return errorResponse('Post does not belong to this thread', 400);
    }

    // If this post is already the best answer, do nothing (idempotent)
    if (post.isBestAnswer) {
      return successResponse({ alreadyBestAnswer: true, postId, threadId });
    }

    // Clear any previous best answer on this thread's posts, then set the new one.
    // NOTE: db.$transaction(async cb) is not supported with the async-proxy Prisma
    // client on Cloudflare Workers (throws _engineConfig undefined). We use
    // sequential awaits instead — D1 is serializable so this is safe.
    const existing = await db.thread.findUnique({
      where: { id: threadId },
      select: { bestAnswerId: true },
    });

    // Clear the old best answer post flag
    if (existing?.bestAnswerId) {
      await db.post.update({
        where: { id: existing.bestAnswerId },
        data: { isBestAnswer: false },
      });
    }
    // Set the new best answer post flag
    await db.post.update({
      where: { id: postId },
      data: { isBestAnswer: true },
    });
    // Update the thread
    await db.thread.update({
      where: { id: threadId },
      data: {
        bestAnswerId: postId,
        solved: true,
        bestAnswerSelectedAt: new Date(),
        bestAnswerSelectedBy: selectorUserId,
      },
    });
    // Bump post author reputation
    if (post.authorId !== selectorUserId) {
      await db.user.update({
        where: { id: post.authorId },
        data: { reputation: { increment: 1 } },
      });
    }

    return successResponse({
      postId,
      threadId,
      solved: true,
      selectedBy: selectorUserId,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to set best answer';
    return serverErrorResponse(msg);
  }
}

/**
 * DELETE /api/threads/[id]/best-answer
 * ------------------------------------
 * Unset the best answer for a thread.
 *
 * Permission: Admin (role >= 2) or Moderator (role >= 1).
 * (Thread author cannot unset — only staff can revoke.)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;
    const modCheck = await requireModerator(request);
    if (modCheck.error) return modCheck.error;

    const thread = await db.thread.findUnique({
      where: { id: threadId },
      select: { bestAnswerId: true },
    });
    if (!thread) return errorResponse('Thread not found', 404);

    if (!thread.bestAnswerId) {
      return successResponse({ alreadyUnset: true });
    }

    // Sequential updates (interactive transactions not supported on Workers proxy)
    await db.post.update({
      where: { id: thread.bestAnswerId! },
      data: { isBestAnswer: false },
    });
    await db.thread.update({
      where: { id: threadId },
      data: {
        bestAnswerId: null,
        solved: false,
        bestAnswerSelectedAt: null,
        bestAnswerSelectedBy: null,
      },
    });

    return successResponse({ unset: true, threadId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to unset best answer';
    return serverErrorResponse(msg);
  }
}
