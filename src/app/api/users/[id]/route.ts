import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
  hashPassword,
} from '@/lib/api-helpers';

/**
 * GET /api/users/[id] — fetch a single user (admin only).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
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
        bio: true,
        signature: true,
        location: true,
        website: true,
        postCount: true,
        threadCount: true,
        reputation: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { threads: true, posts: true } },
      },
    });
    if (!user) return errorResponse('User not found', 404);
    return successResponse({
      ...user,
      threadCount: user._count.threads,
      postCount: user._count.posts,
      _count: undefined,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch user');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;
    const admin = adminCheck.user!;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return errorResponse('User not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const {
      role,
      banned,
      banReason,
      displayName,
      avatarUrl,
      email,
      username,
      bio,
      signature,
      location,
      website,
      reputation,
      isVerified,
      rankId,
      password,
    } = body;

    // Prevent demoting the last SuperAdmin
    if (role !== undefined && existing.role === 3 && role < 3) {
      const superAdminCount = await db.user.count({ where: { role: 3 } });
      if (superAdminCount <= 1) {
        return errorResponse('Cannot demote the last SuperAdmin', 400);
      }
    }

    // Only SuperAdmin can promote to SuperAdmin
    if (role === 3 && admin.role < 3) {
      return errorResponse('Only SuperAdmins can promote to SuperAdmin', 403);
    }

    // Username uniqueness check (if changing)
    if (username !== undefined && username !== existing.username) {
      const clash = await db.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (clash) return errorResponse('Username already taken', 409);
    }
    // Email uniqueness check (if changing)
    if (email !== undefined && email !== existing.email) {
      const clash = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (clash) return errorResponse('Email already in use', 409);
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role: typeof role === 'number' ? role : parseInt(String(role), 10) }),
        ...(banned !== undefined && { banned }),
        ...(banReason !== undefined && { banReason }),
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(email !== undefined && { email }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
        ...(signature !== undefined && { signature }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(reputation !== undefined && { reputation: typeof reputation === 'number' ? reputation : parseInt(String(reputation), 10) }),
        ...(isVerified !== undefined && {
          isVerified,
          verifiedAt: isVerified ? (existing.verifiedAt || new Date()) : null,
        }),
        ...(rankId !== undefined && { rankId: rankId || null }),
      },
    });

    // Password reset (if provided)
    if (typeof password === 'string' && password.length >= 6) {
      await db.setting.upsert({
        where: { key: `password_${id}` },
        update: { value: hashPassword(password) },
        create: { key: `password_${id}`, value: hashPassword(password) },
      });
      await db.securityLog.create({
        data: {
          userId: admin.id,
          eventType: 'USER_PASSWORD_RESET_BY_ADMIN',
          details: `Admin ${admin.username} reset password for ${user.username}`,
        },
      });
    }

    // Log security event if user was banned
    if (banned === true) {
      await db.securityLog.create({
        data: {
          userId: admin.id,
          eventType: 'USER_BANNED',
          details: `User ${user.username} was banned. Reason: ${banReason || 'No reason provided'}`,
        },
      });
    } else if (banned === false) {
      await db.securityLog.create({
        data: {
          userId: admin.id,
          eventType: 'USER_UNBANNED',
          details: `User ${user.username} was unbanned`,
        },
      });
    }

    return successResponse({
      id: user.id,
      firebaseUid: user.firebaseUid,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      rankId: user.rankId,
      banned: user.banned,
      banReason: user.banReason,
      isVerified: user.isVerified,
      bio: user.bio,
      location: user.location,
      website: user.website,
      reputation: user.reputation,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update user');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return errorResponse('User not found', 404);

    // Prevent deleting the last SuperAdmin
    if (existing.role === 3) {
      const superAdminCount = await db.user.count({ where: { role: 3 } });
      if (superAdminCount <= 1) {
        return errorResponse('Cannot delete the last SuperAdmin', 400);
      }
    }

    // Delete the password setting first
    await db.setting.deleteMany({ where: { key: `password_${id}` } });

    // Delete user (cascading will handle related records)
    await db.user.delete({ where: { id } });

    // Log security event
    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'USER_DELETED',
        details: `User ${existing.username} was deleted`,
      },
    });

    return successResponse({ message: 'User deleted successfully' });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to delete user');
  }
}
