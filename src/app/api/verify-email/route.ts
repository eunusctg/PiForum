import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
} from '@/lib/api-helpers';
import crypto from 'crypto';

/* POST /api/verify-email
   Body: { token?: string, action?: 'send' }
   - If token provided: consume the verification token, mark user verified.
   - If action='send': generate & store a new token for the authenticated user
     (resend verification email). Returns the token in the response when SMTP
     is not configured, as a sandbox fallback.
*/
export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token, action } = body;

    /* ---- Consume token flow ---- */
    if (token) {
      const record = await db.emailVerification.findUnique({
        where: { token },
      });
      if (!record) return errorResponse('Invalid or expired verification token', 400);

      if (record.consumedAt) {
        return errorResponse('This verification link has already been used', 400);
      }
      if (record.expiresAt < new Date()) {
        return errorResponse('This verification link has expired. Request a new one.', 400);
      }

      // Mark consumed + verify the user
      await db.emailVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      const user = await db.user.update({
        where: { id: record.userId },
        data: { isVerified: true, verifiedAt: new Date(), verifyToken: null, verifyExpires: null },
        include: { rank: true },
      });

      await db.securityLog.create({
        data: {
          userId: user.id,
          eventType: 'EMAIL_VERIFIED',
          details: 'User verified their email address',
        },
      });

      return successResponse({
        verified: true,
        // Re-serialize using the shared helper shape (inline to avoid import cycle)
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
        },
      });
    }

    /* ---- Resend flow ---- */
    if (action === 'send') {
      const authCheck = await requireAuth(request);
      if (authCheck.error) return authCheck.error;
      const user = authCheck.user!;

      if (user.isVerified) {
        return errorResponse('Your email is already verified', 400);
      }

      // Check whether verification is even enabled
      const requireSetting = await db.setting.findUnique({ where: { key: 'require_email_verification' } });
      if (!requireSetting || requireSetting.value !== 'true') {
        return errorResponse('Email verification is not enabled', 400);
      }

      const newToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Upsert the EmailVerification record (userId is unique)
      const existing = await db.emailVerification.findUnique({ where: { userId: user.id } });
      if (existing) {
        await db.emailVerification.update({
          where: { userId: user.id },
          data: { token: newToken, expiresAt: expires, consumedAt: null, email: user.email },
        });
      } else {
        await db.emailVerification.create({
          data: { userId: user.id, token: newToken, email: user.email, expiresAt: expires },
        });
      }

      await db.user.update({
        where: { id: user.id },
        data: { verifyToken: newToken, verifyExpires: expires },
      });

      // SMTP send would go here. In this sandbox we surface the token so the
      // frontend can show a "click to verify" link — an intentional flaw when
      // SMTP is not configured.
      const smtpSetting = await db.setting.findUnique({ where: { key: 'smtp_enabled' } });
      const smtpOn = smtpSetting?.value === 'true';

      return successResponse({
        sent: true,
        // Only expose the token when SMTP is off (fallback). When SMTP is on,
        // a real email would have been sent and the token stays secret.
        verifyToken: smtpOn ? null : newToken,
        expiresAt: expires,
        deliveredVia: smtpOn ? 'email' : 'ui-fallback',
      });
    }

    return errorResponse('Either a token or action=send is required', 400);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Verification failed');
  }
}
