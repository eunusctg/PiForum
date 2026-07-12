import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, serializeUser } from '@/lib/api-helpers';

/**
 * POST /api/setup
 *
 * One-time setup endpoint to create the super admin account and configure
 * essential settings. This endpoint is ONLY available when no admin user
 * exists in the database (idempotent guard).
 *
 * Request body:
 *   { email: string, password: string, username?: string }
 *
 * The super admin email is also hardcoded as 'eunus527@gmail.com' in the
 * Google OAuth callback for automatic role elevation.
 */
export async function POST(request: Request) {
  try {
    // Guard: if any admin already exists, this endpoint is disabled
    const adminCount = await db.user.count({ where: { role: { gte: 2 } } });
    if (adminCount > 0) {
      return errorResponse('Setup already completed. Admin accounts exist.', 403);
    }

    const body = await request.json().catch(() => null);
    if (!body) return errorResponse('Invalid request body');

    const { email, password, username } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format');
    }

    // Validate password
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters');
    }

    // Generate username from email or use provided
    const finalUsername = username || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 30) || 'admin';

    // Check if username/email already taken
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return errorResponse('Email is already registered');
    }

    const existingUsername = await db.user.findUnique({ where: { username: finalUsername } });
    if (existingUsername) {
      return errorResponse('Username is already taken');
    }

    // Create the super admin user
    const firebaseUid = generateUUID();

    // Super admin emails (auto-promoted to role 3)
    const SUPER_ADMIN_EMAILS = ['eunus527@gmail.com'];
    const isAdmin = SUPER_ADMIN_EMAILS.includes(email.toLowerCase());

    const user = await db.user.create({
      data: {
        firebaseUid,
        username: finalUsername,
        email,
        displayName: finalUsername,
        role: isAdmin ? 3 : 2, // SuperAdmin for hardcoded emails, Admin otherwise
        isVerified: true,
        verifiedAt: new Date(),
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

    // Create essential default settings if they don't exist
    const defaultSettings = [
      { key: 'forum_name', value: 'PiForum' },
      { key: 'forum_description', value: 'Where Ideas Converge, Communities Thrive' },
      { key: 'open_registration', value: 'true' },
      { key: 'oauth_google_enabled', value: 'false' },
      { key: 'require_email_verification', value: 'false' },
      { key: 'min_password_length', value: '6' },
      { key: 'cookie_consent_enabled', value: 'true' },
      { key: 'cookie_consent_message', value: 'We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.' },
    ];

    for (const setting of defaultSettings) {
      await db.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    // Create a welcome notification for the admin
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'system',
        title: 'Welcome to PiForum!',
        body: 'Your admin account has been set up successfully. Configure your forum through the Admin panel.',
        link: '/admin/settings',
      },
    });

    // Log the setup event
    await db.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'ADMIN_SETUP',
        details: `Super admin account created: ${email}`,
      },
    });

    return successResponse({
      user: serializeUser(user),
      token: user.firebaseUid,
      message: 'Super admin account created successfully',
    }, 201);
  } catch (e: any) {
    console.error('[setup] Error:', e);
    return serverErrorResponse(e.message || 'Setup failed');
  }
}
