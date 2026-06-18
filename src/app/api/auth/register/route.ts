import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, parseBody, serializeUser } from '@/lib/api-helpers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { username, email, password } = body;

    if (!username || !email || !password) {
      return errorResponse('Username, email, and password are required');
    }

    // Validate username length (respect admin-configured limits)
    const minLenSetting = await db.setting.findUnique({ where: { key: 'min_username_length' } });
    const maxLenSetting = await db.setting.findUnique({ where: { key: 'max_username_length' } });
    const minLen = minLenSetting ? parseInt(minLenSetting.value, 10) || 3 : 3;
    const maxLen = maxLenSetting ? parseInt(maxLenSetting.value, 10) || 30 : 30;
    if (username.length < minLen || username.length > maxLen) {
      return errorResponse(`Username must be between ${minLen} and ${maxLen} characters`);
    }

    // Reserved username check
    const reservedSetting = await db.setting.findUnique({ where: { key: 'reserved_usernames' } });
    if (reservedSetting) {
      const reserved = reservedSetting.value
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (reserved.includes(username.toLowerCase())) {
        return errorResponse('This username is reserved and cannot be used');
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format');
    }

    // Validate password length (respect admin-configured limit)
    const minPwSetting = await db.setting.findUnique({ where: { key: 'min_password_length' } });
    const minPw = minPwSetting ? parseInt(minPwSetting.value, 10) || 6 : 6;
    if (password.length < minPw) {
      return errorResponse(`Password must be at least ${minPw} characters`);
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

    // Determine whether email verification is required.
    const requireVerifySetting = await db.setting.findUnique({ where: { key: 'require_email_verification' } });
    const requireVerify = requireVerifySetting?.value === 'true';

    // Create user (unverified if verification required, else auto-verified)
    const verifyToken = requireVerify ? crypto.randomBytes(32).toString('hex') : null;
    const verifyExpires = requireVerify
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      : null;

    const user = await db.user.create({
      data: {
        firebaseUid,
        username,
        email,
        displayName: username,
        role: 0, // Regular User
        avatarUrl: null,
        isVerified: !requireVerify,
        verifiedAt: requireVerify ? null : new Date(),
        verifyToken,
        verifyExpires,
      },
      include: { rank: true },
    });

    // Store password hash
    await db.setting.create({
      data: {
        key: `password_${user.id}`,
        value: hashPassword(password),
      },
    });

    // If verification required, create an EmailVerification record (token log)
    if (requireVerify && verifyToken) {
      await db.emailVerification.create({
        data: {
          userId: user.id,
          token: verifyToken,
          email: user.email,
          expiresAt: verifyExpires!,
        },
      });
      // NOTE: A real email would be sent here via SMTP. In this sandbox SMTP is
      // usually not configured, so the verification link is surfaced in the
      // register response for the user to click. This is an intentional
      // limitation (a "flaw") of the verification system when SMTP is off.
    }

    return successResponse({
      user: serializeUser(user),
      token: user.firebaseUid,
      // When verification is required, expose the token so the frontend can
      // show a "verify now" link even without email delivery (sandbox flaw).
      verifyToken: requireVerify ? verifyToken : null,
      verificationRequired: requireVerify,
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Registration failed');
  }
}
