import { db } from '@/lib/db';
import { successResponse, serverErrorResponse, requireAuth, serializeUser } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const now = new Date();
    await db.user.update({
      where: { id: user.id },
      data: { lastSeenAt: now },
    });
    user.lastSeenAt = now;

    return successResponse({ user: serializeUser(user) });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch current user');
  }
}
