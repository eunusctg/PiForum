import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  serializeUser,
} from '@/lib/api-helpers';

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({ where: { id }, include: { rank: true } });
    if (!user) return errorResponse('User not found', 404);

    const [recentThreads, postCount] = await Promise.all([
      db.thread.findMany({
        where: { authorId: id },
        include: {
          forum: { select: { id: true, name: true, icon: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      db.post.count({ where: { authorId: id } }),
    ]);

    return successResponse({
      user: serializeUser(user),
      recentThreads,
      postCount,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch profile');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;
    const { id } = await params;

    if (user.id !== id && user.role < 2) {
      return errorResponse('You can only update your own profile', 403);
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return errorResponse('User not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { displayName, bio, signature, location, website, avatarUrl } = body;

    if (website !== undefined && website !== null && website !== '' && !isValidUrl(website)) {
      return errorResponse('website must be a valid http(s) URL');
    }
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '' && !isValidUrl(avatarUrl)) {
      return errorResponse('avatarUrl must be a valid http(s) URL');
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(signature !== undefined && { signature }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: { rank: true },
    });

    return successResponse({ user: serializeUser(updated) });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update profile');
  }
}
