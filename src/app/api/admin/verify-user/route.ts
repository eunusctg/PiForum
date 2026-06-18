import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
  serializeUser,
} from '@/lib/api-helpers';

/* POST /api/admin/verify-user — admin manually marks a user as verified.
   Body: { userId: string }
   Also supports { userId, unverify: true } to revoke verification. */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { userId, unverify } = body;
    if (!userId) return errorResponse('userId is required');

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return errorResponse('User not found', 404);

    if (unverify) {
      const updated = await db.user.update({
        where: { id: userId },
        data: { isVerified: false, verifiedAt: null },
        include: { rank: true },
      });
      await db.securityLog.create({
        data: {
          userId: adminCheck.user!.id,
          eventType: 'VERIFICATION_REVOKED',
          details: `Admin revoked verification for ${target.username}`,
        },
      });
      return successResponse({ user: serializeUser(updated) });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { isVerified: true, verifiedAt: new Date(), verifyToken: null, verifyExpires: null },
      include: { rank: true },
    });

    // Consume any pending verification record
    await db.emailVerification.updateMany({
      where: { userId },
      data: { consumedAt: new Date() },
    });

    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'VERIFICATION_GRANTED',
        details: `Admin manually verified ${target.username}`,
      },
    });

    return successResponse({ user: serializeUser(updated) });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update verification');
  }
}
