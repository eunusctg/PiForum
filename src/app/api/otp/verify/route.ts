import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  serializeUser,
} from '@/lib/api-helpers';
import { verifyOtpCode } from '@/lib/otp';

/**
 * POST /api/otp/verify
 * Body: { channel: 'whatsapp'|'telegram'|'email', code: string }
 *
 * Verifies a one-time code against the most recent pending OtpChallenge
 * for the user + channel. On success:
 *  - marks the challenge consumed
 *  - if email channel: marks user.isVerified=true (email proven)
 *  - if phone channel (whatsapp/telegram): marks user.phoneVerified=true
 *    and stores the phone number
 *
 * Locked after 5 wrong attempts on the same challenge.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const channel = String(body.channel || '');
    const code = String(body.code || '').trim();
    if (!channel || !code) {
      return errorResponse('channel and code are required', 400);
    }

    // Find the most recent unconsumed, unexpired challenge for this user + channel
    const challenge = await db.otpChallenge.findFirst({
      where: {
        userId: user.id,
        channel,
        consumedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      return errorResponse('No active OTP found. Please request a new code.', 400);
    }

    // Lock out after 5 wrong attempts
    if (challenge.attempts >= 5) {
      await db.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() }, // invalidate
      });
      return errorResponse('Too many wrong attempts. Please request a new code.', 429);
    }

    const valid = verifyOtpCode(code, challenge.codeHash);
    if (!valid) {
      await db.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 5 - (challenge.attempts + 1);
      return errorResponse(
        remaining > 0 ? `Wrong code. ${remaining} attempts remaining.` : 'Too many wrong attempts.',
        400
      );
    }

    // Success — consume the challenge
    await db.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });

    // Apply the verification based on the channel
    const updateData: any = {};
    if (channel === 'email') {
      updateData.isVerified = true;
      updateData.verifiedAt = new Date();
    } else if (channel === 'whatsapp' || channel === 'telegram') {
      updateData.phoneVerified = true;
      if (channel === 'whatsapp') updateData.phoneNumber = challenge.target;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: updateData,
      include: { rank: true },
    });

    await db.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'OTP_VERIFIED',
        details: `${channel} OTP verified successfully`,
      },
    });

    return successResponse({
      verified: true,
      channel,
      user: serializeUser(updated),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to verify OTP');
  }
}
