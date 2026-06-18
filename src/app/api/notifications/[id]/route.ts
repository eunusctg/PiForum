import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-helpers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;
    const { id } = await params;

    const existing = await db.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return errorResponse('Notification not found', 404);

    await db.notification.delete({ where: { id } });

    return successResponse({ message: 'Notification deleted' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete notification');
  }
}
