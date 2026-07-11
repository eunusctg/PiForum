import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, parseBody } from '@/lib/api-helpers';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isUserAllowedToPost } from '@/lib/verification-guard';
import { createNotification } from '@/lib/notifications';

const MAX_CONTENT_LENGTH = 50000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!threadId) {
      return errorResponse('threadId query parameter is required');
    }

    // Verify thread exists
    const thread = await db.thread.findUnique({ where: { id: threadId } });
    if (!thread) return errorResponse('Thread not found', 404);

    // If userId provided, fetch user's votes for these posts
    let userVotes: Record<string, number> = {};
    if (userId) {
      const votes = await db.postVote.findMany({
        where: {
          userId,
          post: { threadId },
        },
        select: { postId: true, voteType: true },
      });
      votes.forEach((v) => {
        userVotes[v.postId] = v.voteType;
      });
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where: { threadId },
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
            select: {
              voteType: true,
            },
          },
          attachments: true,
        },
        // Best answer always sorts to the top (after OP), then chronological
        orderBy: [{ isBestAnswer: 'desc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      db.post.count({ where: { threadId } }),
    ]);

    const postsWithScores = posts.map((post) => {
      const voteScore = post.votes.reduce((sum, v) => sum + v.voteType, 0);
      return {
        ...post,
        voteScore,
        userVote: userVotes[post.id] ?? 0,
        votes: undefined,
      };
    });

    return successResponse({
      posts: postsWithScores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch posts');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    // Check if unverified users are allowed to post
    const verifyCheck = await isUserAllowedToPost(user.id);
    if (!verifyCheck.allowed) {
      return errorResponse(verifyCheck.reason || 'Email verification required', 403);
    }

    // Rate limit: 30 posts per user per hour
    const rl = rateLimit(`post:${user.id}`, 30, 60 * 60 * 1000);
    if (!rl.success) return rateLimitResponse();

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { threadId, content, attachments: attachmentIds } = body;

    if (!threadId || !content) {
      return errorResponse('Thread ID and content are required');
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse('Content must not be empty');
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return errorResponse(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
    }

    // Verify thread exists and is not locked
    const thread = await db.thread.findUnique({ where: { id: threadId } });
    if (!thread) return errorResponse('Thread not found', 404);
    if (thread.locked) {
      return errorResponse('This thread is locked and cannot receive new posts', 403);
    }

    // Resolve any uploaded attachments (by id) so we can link them to this post.
    // Only attachments owned by the current user can be attached.
    let linkedAttachments: { id: string }[] = [];
    if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      const found = await db.attachment.findMany({
        where: {
          id: { in: attachmentIds },
          userId: user.id,
          postId: null,
        },
        select: { id: true },
      });
      linkedAttachments = found;
    }

    // Create post, link attachments, and update counters.
    // NOTE: db.$transaction(async cb) is not supported with the async-proxy
    // Prisma client on Cloudflare Workers (throws _engineConfig undefined).
    // Use sequential awaits — D1 is serializable so this is safe.
    const newPost = await db.post.create({
      data: {
        threadId,
        authorId: user.id,
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
        votes: true,
        attachments: true,
      },
    });

    // Link the uploaded attachments to this post
    if (linkedAttachments.length > 0) {
      await db.attachment.updateMany({
        where: { id: { in: linkedAttachments.map((a) => a.id) } },
        data: { postId: newPost.id },
      });
    }

    // Update forum post count and last post time (only if thread has a forum)
    if (thread.forumId) {
      await db.forum.update({
        where: { id: thread.forumId },
        data: {
          postCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });
    }

    const post = newPost;

    // Create notification for the thread author (reply notification)
    // Don't notify if the author is replying to their own thread
    if (thread.authorId !== user.id) {
      createNotification({
        userId: thread.authorId,
        actorId: user.id,
        type: 'reply',
        title: `${user.displayName || user.username} replied to your thread`,
        body: thread.title,
        link: `/thread/${threadId}`,
      }).catch(() => {
        // Non-critical — notification creation shouldn't block the post
      });
    }

    // Check for @mentions in the content and notify mentioned users
    const mentionRegex = /@(\w+)/g;
    let match;
    const mentionedUsernames = new Set<string>();
    while ((match = mentionRegex.exec(content)) !== null) {
      mentionedUsernames.add(match[1]);
    }
    if (mentionedUsernames.size > 0) {
      // Resolve mentioned users (limit to 10 to prevent abuse)
      const mentionedUsers = await db.user.findMany({
        where: {
          username: { in: Array.from(mentionedUsernames).slice(0, 10) },
        },
        select: { id: true },
      });
      for (const mentionedUser of mentionedUsers) {
        // Don't notify yourself or the thread author (they already got a reply notification)
        if (mentionedUser.id !== user.id) {
          createNotification({
            userId: mentionedUser.id,
            actorId: user.id,
            type: 'mention',
            title: `${user.displayName || user.username} mentioned you in a post`,
            body: thread.title,
            link: `/thread/${threadId}`,
          }).catch(() => {});
        }
      }
    }

    return successResponse({
      ...post,
      voteScore: 0,
      votes: undefined,
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create post');
  }
}
