import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAuth, parseBody } from '@/lib/api-helpers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    // Verify post exists
    const post = await db.post.findUnique({ where: { id } });
    if (!post) return errorResponse('Post not found', 404);

    // Users can't vote on their own posts
    if (post.authorId === user.id) {
      return errorResponse('You cannot vote on your own post', 400);
    }

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { voteType } = body;

    if (voteType !== 1 && voteType !== -1) {
      return errorResponse('Vote type must be 1 (upvote) or -1 (downvote)');
    }

    // Upsert the vote
    const vote = await db.postVote.upsert({
      where: {
        postId_userId: {
          postId: id,
          userId: user.id,
        },
      },
      update: {
        voteType,
      },
      create: {
        postId: id,
        userId: user.id,
        voteType,
      },
    });

    // Calculate new score
    const allVotes = await db.postVote.findMany({
      where: { postId: id },
      select: { voteType: true },
    });
    const voteScore = allVotes.reduce((sum, v) => sum + v.voteType, 0);

    return successResponse({
      vote,
      voteScore,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to vote on post');
  }
}
