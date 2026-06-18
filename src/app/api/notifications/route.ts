import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  getQueryParam,
} from '@/lib/api-helpers';

const actorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

// The Notification model only has a relation to the recipient (`user`).
// `actorId` is a plain string, so we resolve actor users manually.
async function attachActors(notifications: any[]) {
  const actorIds = Array.from(
    new Set(notifications.map((n) => n.actorId).filter((id): id is string => !!id))
  );
  if (actorIds.length === 0) {
    return notifications.map((n) => ({ ...n, actor: null }));
  }
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: actorSelect,
  });
  const actorMap = new Map(actors.map((a) => [a.id, a]));
  return notifications.map((n) => ({
    ...n,
    actor: n.actorId ? actorMap.get(n.actorId) ?? null : null,
  }));
}

export async function GET(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const unreadOnly = getQueryParam(request, 'unreadOnly') === 'true';
    const where: any = { userId: user.id };
    if (unreadOnly) where.read = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const withActors = await attachActors(notifications);

    return successResponse({ notifications: withActors });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch notifications');
  }
}

export async function PUT(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { id, all } = body;
    if (!id && !all) {
      return errorResponse('Either id or all=true is required');
    }

    let count: number;
    if (all) {
      const result = await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      count = result.count;
    } else {
      const existing = await db.notification.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return errorResponse('Notification not found', 404);

      await db.notification.update({
        where: { id },
        data: { read: true },
      });
      count = 1;
    }

    return successResponse({ updated: count });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to mark notifications as read');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { userId, type, title, body: notifBody, link, actorId } = body;

    if (!userId || !type || !title) {
      return errorResponse('userId, type, and title are required');
    }

    if (type === 'system' && user.role < 2) {
      return errorResponse('Admin access required to send system notifications', 403);
    }

    // Non-admins cannot forge actorId — must be themselves
    const finalActorId = user.role < 2 ? user.id : (actorId ?? user.id);

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) return errorResponse('Target user not found', 404);

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        ...(notifBody && { body: notifBody }),
        ...(link && { link }),
        actorId: finalActorId,
      },
    });

    const [withActor] = await attachActors([notification]);

    return successResponse(withActor, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create notification');
  }
}
