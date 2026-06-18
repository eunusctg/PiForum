import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
} from '@/lib/api-helpers';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
} as const;

export async function GET(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      include: {
        thread: {
          include: {
            author: { select: authorSelect },
            forum: { select: { id: true, name: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ bookmarks });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch bookmarks');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { threadId } = body;
    if (!threadId || typeof threadId !== 'string') {
      return errorResponse('threadId is required');
    }

    const thread = await db.thread.findUnique({ where: { id: threadId } });
    if (!thread) return errorResponse('Thread not found', 404);

    const existing = await db.bookmark.findUnique({
      where: { userId_threadId: { userId: user.id, threadId } },
    });
    if (existing) return errorResponse('Bookmark already exists', 409);

    const bookmark = await db.bookmark.create({
      data: { userId: user.id, threadId },
      include: {
        thread: { select: { id: true, title: true } },
      },
    });

    return successResponse(bookmark, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create bookmark');
  }
}
