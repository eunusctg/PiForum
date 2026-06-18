import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { id } = await params;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return errorResponse('User not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { role, banned, banReason, displayName, avatarUrl } = body;

    // Prevent demoting the last SuperAdmin
    if (role !== undefined && existing.role === 3 && role < 3) {
      const superAdminCount = await db.user.count({ where: { role: 3 } });
      if (superAdminCount <= 1) {
        return errorResponse('Cannot demote the last SuperAdmin', 400);
      }
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(banned !== undefined && { banned }),
        ...(banReason !== undefined && { banReason }),
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    // Log security event if user was banned
    if (banned === true) {
      await db.securityLog.create({
        data: {
          userId: adminCheck.user!.id,
          eventType: 'USER_BANNED',
          details: `User ${user.username} was banned. Reason: ${banReason || 'No reason provided'}`,
        },
      });
    } else if (banned === false) {
      await db.securityLog.create({
        data: {
          userId: adminCheck.user!.id,
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
      banned: user.banned,
      banReason: user.banReason,
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
