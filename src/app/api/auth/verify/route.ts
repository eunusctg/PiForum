import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, parseBody } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token } = body;

    if (!token) {
      return errorResponse('Token is required');
    }

    // Token is the firebaseUid
    const user = await db.user.findUnique({ where: { firebaseUid: token } });

    if (!user) {
      return errorResponse('Invalid token', 401);
    }

    if (user.banned) {
      return errorResponse('Your account has been banned', 403);
    }

    return successResponse({
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Token verification failed');
  }
}
