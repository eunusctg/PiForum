import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, parseBody } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { username, email, password } = body;

    if (!username || !email || !password) {
      return errorResponse('Username, email, and password are required');
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      return errorResponse('Username must be between 3 and 30 characters');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format');
    }

    // Validate password length
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    // Check if email exists
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return errorResponse('Email is already registered');
    }

    // Check if username exists
    const existingUsername = await db.user.findUnique({ where: { username } });
    if (existingUsername) {
      return errorResponse('Username is already taken');
    }

    // Check if registration is open
    const openRegSetting = await db.setting.findUnique({ where: { key: 'open_registration' } });
    if (openRegSetting && openRegSetting.value === 'false') {
      return errorResponse('Registration is currently closed', 403);
    }

    const firebaseUid = generateUUID();

    // Create user
    const user = await db.user.create({
      data: {
        firebaseUid,
        username,
        email,
        displayName: username,
        role: 0, // Regular User
        avatarUrl: null,
      },
    });

    // Store password hash
    await db.setting.create({
      data: {
        key: `password_${user.id}`,
        value: hashPassword(password),
      },
    });

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
      token: user.firebaseUid,
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Registration failed');
  }
}
