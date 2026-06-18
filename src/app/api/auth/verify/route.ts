import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, parseBody, serializeUser } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token } = body;

    if (!token) {
      return errorResponse('Token is required');
    }

    // Token is the firebaseUid
    const user = await db.user.findUnique({ where: { firebaseUid: token }, include: { rank: true } });

    if (!user) {
      return errorResponse('Invalid token', 401);
    }

    if (user.banned) {
      return errorResponse('Your account has been banned', 403);
    }

    return successResponse({
      user: serializeUser(user),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Token verification failed');
  }
}
