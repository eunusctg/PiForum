import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  getQueryParam,
  parseBody,
  hashPassword,
  generateUUID,
  serializeUser,
} from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const limitParam = getQueryParam(request, 'limit');
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 100)) : undefined;

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        firebaseUid: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        rankId: true,
        banned: true,
        banReason: true,
        isVerified: true,
        verifiedAt: true,
        postCount: true,
        threadCount: true,
        reputation: true,
        bio: true,
        location: true,
        website: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            threads: true,
            posts: true,
          },
        },
      },
    });

    const usersWithCounts = users.map((user) => ({
      ...user,
      threadCount: user._count.threads,
      postCount: user._count.posts,
      _count: undefined,
    }));

    return successResponse(usersWithCounts);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch users');
  }
}

/**
 * POST /api/users — Admin creates a new user with an explicit role.
 *
 * Body: {
 *   username, email, password, displayName?,
 *   role: 0|1|2|3,           // 0=User,1=Moderator,2=Admin,3=SuperAdmin
 *   rankId?: string,
 *   isVerified?: boolean,
 *   bio?: string
 * }
 *
 * Permission: requireAdmin (role >= 2). SuperAdmin (3) creation requires
 * the acting user to also be SuperAdmin.
 */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;
    const admin = adminCheck.user!;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const {
      username,
      email,
      password,
      displayName,
      role,
      rankId,
      isVerified,
      bio,
    } = body;

    // Validation
    if (!username || !email || !password) {
      return errorResponse('Username, email, and password are required', 400);
    }
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 30) {
      return errorResponse('Username must be 3–30 characters', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('Invalid email format', 400);
    }
    if (typeof password !== 'string' || password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    const roleNum = typeof role === 'number' ? role : parseInt(String(role), 10);
    if (![0, 1, 2, 3].includes(roleNum)) {
      return errorResponse('Role must be 0 (Member), 1 (Moderator), 2 (Admin), or 3 (SuperAdmin)', 400);
    }

    // Only SuperAdmin can create other SuperAdmins or Admins
    if (roleNum >= 3 && admin.role < 3) {
      return errorResponse('Only SuperAdmins can create SuperAdmin accounts', 403);
    }
    if (roleNum >= 2 && admin.role < 2) {
      return errorResponse('Insufficient privileges to create an admin account', 403);
    }

    // Uniqueness checks
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
      },
      select: { id: true },
    });
    if (existing) {
      return errorResponse('A user with that username or email already exists', 409);
    }

    // Create user + password setting (sequential — Workers proxy doesn't
    // support interactive transactions)
    const newUser = await db.user.create({
      data: {
        firebaseUid: generateUUID(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        displayName: (displayName as string) || username.trim(),
        role: roleNum,
        rankId: rankId || null,
        isVerified: isVerified === true,
        verifiedAt: isVerified === true ? new Date() : null,
        bio: bio || null,
      },
    });

    // Store password hash in Setting table
    await db.setting.create({
      data: {
        key: `password_${newUser.id}`,
        value: hashPassword(password),
      },
    });

    // Security log
    await db.securityLog.create({
      data: {
        userId: admin.id,
        eventType: 'USER_CREATED_BY_ADMIN',
        details: `Admin ${admin.username} created user ${newUser.username} (role=${roleNum})`,
      },
    });

    return successResponse(serializeUser(newUser), 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create user');
  }
}
