import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, verifyPassword, parseBody, serializeUser } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Find user by email (include rank for serialization)
    const user = await db.user.findUnique({ where: { email }, include: { rank: true } });
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check if banned
    if (user.banned) {
      return errorResponse('Your account has been banned. Reason: ' + (user.banReason || 'No reason provided'), 403);
    }

    // Get stored password hash from settings
    const passwordSetting = await db.setting.findUnique({
      where: { key: `password_${user.id}` },
    });

    if (!passwordSetting) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    if (!verifyPassword(password, passwordSetting.value)) {
      return errorResponse('Invalid email or password', 401);
    }

    // Return user data and token (firebaseUid as token)
    return successResponse({
      user: serializeUser(user),
      token: user.firebaseUid,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Login failed');
  }
}
