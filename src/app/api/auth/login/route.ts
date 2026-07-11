import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, verifyPassword, parseBody, serializeUser } from '@/lib/api-helpers';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per IP per 15 minutes
    const ip = getClientIp(request);
    const rl = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) return rateLimitResponse();

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Input length validation
    if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH) {
      return errorResponse('Invalid email format');
    }
    if (typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
      return errorResponse('Invalid email or password', 401);
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
