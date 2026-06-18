import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const settings = await db.userSetting.findMany({ where: { userId: user.id } });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    return successResponse({ settings: map });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch user settings');
  }
}

export async function PUT(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { settings } = body;
    if (!Array.isArray(settings)) {
      return errorResponse('settings must be an array of { key, value } objects');
    }

    for (const s of settings) {
      if (!s || typeof s.key !== 'string' || typeof s.value !== 'string') {
        return errorResponse('Each setting must have string key and value');
      }
    }

    await db.$transaction(
      settings.map((s: { key: string; value: string }) =>
        db.userSetting.upsert({
          where: { userId_key: { userId: user.id, key: s.key } },
          update: { value: s.value },
          create: { userId: user.id, key: s.key, value: s.value },
        })
      )
    );

    const all = await db.userSetting.findMany({ where: { userId: user.id } });
    const map: Record<string, string> = {};
    for (const s of all) map[s.key] = s.value;

    return successResponse({ settings: map });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update user settings');
  }
}
