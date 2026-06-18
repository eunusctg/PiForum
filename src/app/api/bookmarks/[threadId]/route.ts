import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;
    const { threadId } = await params;

    const bookmark = await db.bookmark.findUnique({
      where: { userId_threadId: { userId: user.id, threadId } },
    });

    return successResponse({ bookmarked: !!bookmark });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to check bookmark');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;
    const { threadId } = await params;

    const existing = await db.bookmark.findUnique({
      where: { userId_threadId: { userId: user.id, threadId } },
    });
    if (!existing) return errorResponse('Bookmark not found', 404);

    await db.bookmark.delete({ where: { id: existing.id } });

    return successResponse({ message: 'Bookmark deleted' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete bookmark');
  }
}
