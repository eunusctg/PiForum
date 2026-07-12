import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  createNotification,
} from '@/lib/api-helpers';

/* POST /api/users/[id]/follow — Follow a user
   Body: (empty) — the authenticated user follows the target user */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const currentUser = authCheck.user!;
    const { id: targetUserId } = await params;

    if (targetUserId === currentUser.id) {
      return errorResponse('You cannot follow yourself', 400);
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    // Check if already following
    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUser.id, followingId: targetUserId } },
    });

    if (existing) {
      return errorResponse('You are already following this user', 400);
    }

    // Create the follow relationship
    await db.follow.create({
      data: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    });

    // Create a notification for the followed user
    await createNotification({
      userId: targetUserId,
      actorId: currentUser.id,
      type: 'follow',
      title: 'New follower',
      body: `${currentUser.displayName || currentUser.username} started following you`,
      link: `/profile/${currentUser.id}`,
    });

    // Get updated counts
    const followerCount = await db.follow.count({ where: { followingId: targetUserId } });
    const followingCount = await db.follow.count({ where: { followerId: targetUserId } });

    return successResponse({
      following: true,
      followerCount,
      followingCount,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to follow user');
  }
}

/* DELETE /api/users/[id]/follow — Unfollow a user */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const currentUser = authCheck.user!;
    const { id: targetUserId } = await params;

    if (targetUserId === currentUser.id) {
      return errorResponse('You cannot unfollow yourself', 400);
    }

    // Find and delete the follow relationship
    const existing = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUser.id, followingId: targetUserId } },
    });

    if (!existing) {
      return errorResponse('You are not following this user', 400);
    }

    await db.follow.delete({
      where: { id: existing.id },
    });

    // Get updated counts
    const followerCount = await db.follow.count({ where: { followingId: targetUserId } });
    const followingCount = await db.follow.count({ where: { followerId: targetUserId } });

    return successResponse({
      following: false,
      followerCount,
      followingCount,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to unfollow user');
  }
}
