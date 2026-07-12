import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* POST /api/push/token — Save FCM token for the current user
   Body: { token: string }
   Stores the FCM token in the UserSetting table with key 'fcm_token' */
export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token } = body;
    if (!token || typeof token !== 'string') {
      return errorResponse('FCM token is required');
    }
    if (token.length > 500) {
      return errorResponse('FCM token is too long');
    }

    // Upsert the FCM token in UserSetting
    await db.userSetting.upsert({
      where: { userId_key: { userId: user.id, key: 'fcm_token' } },
      update: { value: token },
      create: { userId: user.id, key: 'fcm_token', value: token },
    });

    return successResponse({ saved: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to save FCM token');
  }
}

/* DELETE /api/push/token — Remove FCM token for the current user */
export async function DELETE(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const existing = await db.userSetting.findUnique({
      where: { userId_key: { userId: user.id, key: 'fcm_token' } },
    });

    if (existing) {
      await db.userSetting.delete({ where: { id: existing.id } });
    }

    return successResponse({ removed: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to remove FCM token');
  }
}

/* GET /api/push/token — Get FCM tokens (admin only, for sending notifications)
   Query: ?userId=<id> to get a specific user's token */
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (userId) {
      const setting = await db.userSetting.findUnique({
        where: { userId_key: { userId, key: 'fcm_token' } },
      });
      return successResponse({
        token: setting?.value ?? null,
      });
    }

    // Return all FCM tokens (for bulk sending)
    const settings = await db.userSetting.findMany({
      where: { key: 'fcm_token' },
      select: { userId: true, value: true },
    });

    return successResponse({
      tokens: settings.map((s) => ({ userId: s.userId, token: s.value })),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch FCM tokens');
  }
}
