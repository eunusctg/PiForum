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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;
    const { threadId } = await params;

    // Check if thread exists
    const thread = await db.thread.findUnique({ where: { id: threadId } });
    if (!thread) return errorResponse('Thread not found', 404);

    // Check if already bookmarked
    const existing = await db.bookmark.findUnique({
      where: { userId_threadId: { userId: user.id, threadId } },
    });
    if (existing) {
      // Toggle: remove bookmark
      await db.bookmark.delete({ where: { id: existing.id } });
      return successResponse({ bookmarked: false, message: 'Bookmark removed' });
    }

    // Create bookmark
    await db.bookmark.create({
      data: { userId: user.id, threadId },
    });

    return successResponse({ bookmarked: true, message: 'Bookmarked' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to toggle bookmark');
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
