import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, parseBody } from '@/lib/api-helpers';

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
        orderBy: { createdAt: 'asc' },
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

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { threadId, content } = body;

    if (!threadId || !content) {
      return errorResponse('Thread ID and content are required');
    }

    // Verify thread exists and is not locked
    const thread = await db.thread.findUnique({ where: { id: threadId } });
    if (!thread) return errorResponse('Thread not found', 404);
    if (thread.locked) {
      return errorResponse('This thread is locked and cannot receive new posts', 403);
    }

    // Create post and update counters in a transaction
    const post = await db.$transaction(async (tx) => {
      const newPost = await tx.post.create({
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

      // Update forum post count and last post time
      await tx.forum.update({
        where: { id: thread.forumId },
        data: {
          postCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });

      return newPost;
    });

    return successResponse({
      ...post,
      voteScore: 0,
      votes: undefined,
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create post');
  }
}
