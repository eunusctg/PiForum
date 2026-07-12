import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  getQueryParam,
} from '@/lib/api-helpers';
import crypto from 'crypto';
import { sendEmail, generateVerificationEmailHtml, generateVerificationEmailText } from '@/lib/email';
import { getOrigin } from '@/lib/server-settings';

/* POST /api/verify-email
   Body: { token?: string, action?: 'send' }
   - If token provided: consume the verification token, mark user verified.
   - If action='send': generate & store a new token for the authenticated user
     (resend verification email). Returns the token in the response when SMTP
     is not configured, as a sandbox fallback. */
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

      // Mark consumed + clear verification token
      // NOTE: Email verification is separate from the "Verified" badge.
      // The isVerified badge is ONLY granted by super admin.
      // Email verification just clears the pending token and records the time.
      await db.emailVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      const user = await db.user.update({
        where: { id: record.userId },
        // Only clear verify token/expires — do NOT set isVerified (that's admin-only)
        data: { verifyToken: null, verifyExpires: null },
        include: { rank: true },
      });

      await db.securityLog.create({
        data: {
          userId: user.id,
          eventType: 'EMAIL_VERIFIED',
          details: 'User verified their email address',
        },
      });

      // Import serializeUser inline to avoid circular dependency
      const { serializeUser } = await import('@/lib/api-helpers');

      return successResponse({
        verified: true,
        user: serializeUser(user),
      });
    }

    /* ---- Resend flow ---- */
    if (action === 'send') {
      const authCheck = await requireAuth(request);
      if (authCheck.error) return authCheck.error;
      const user = authCheck.user!;

      // Check if user already verified their email (no pending token means verified)
      if (!user.verifyToken) {
        return errorResponse('Your email is already verified', 400);
      }

      // Check whether verification is even enabled
      const requireSetting = await db.setting.findUnique({ where: { key: 'require_email_verification' } });
      if (!requireSetting || requireSetting.value !== 'true') {
        return errorResponse('Email verification is not enabled', 400);
      }

      // Rate limit: max 3 resend requests per user per hour
      const lastResend = await db.userSetting.findUnique({
        where: { userId_key: { userId: user.id, key: 'last_verify_resend' } },
      });
      if (lastResend) {
        const lastTime = new Date(lastResend.value).getTime();
        const now = Date.now();
        if (now - lastTime < 20 * 60 * 1000) {
          // 20 minute cooldown
          const waitMinutes = Math.ceil((20 * 60 * 1000 - (now - lastTime)) / 60000);
          return errorResponse(`Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before requesting another verification email`, 429);
        }
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

      // Record the resend timestamp
      await db.userSetting.upsert({
        where: { userId_key: { userId: user.id, key: 'last_verify_resend' } },
        update: { value: new Date().toISOString() },
        create: { userId: user.id, key: 'last_verify_resend', value: new Date().toISOString() },
      });

      // Attempt to send the verification email
      const smtpSetting = await db.setting.findUnique({ where: { key: 'smtp_enabled' } });
      const smtpOn = smtpSetting?.value === 'true';
      let emailSent = false;

      if (smtpOn) {
        try {
          const origin = getOrigin(request);
          const forumNameSetting = await db.setting.findUnique({ where: { key: 'forum_name' } });
          const forumName = forumNameSetting?.value || 'PiForum';
          const verifyLink = `${origin}/api/verify-email?token=${newToken}`;

          await sendEmail({
            to: user.email,
            subject: `Verify Your Email - ${forumName}`,
            html: generateVerificationEmailHtml(forumName, verifyLink, user.username),
            text: generateVerificationEmailText(forumName, verifyLink, user.username),
          });
          emailSent = true;
        } catch {
          // Email sending failed — fall back to UI
          emailSent = false;
        }
      }

      return successResponse({
        sent: true,
        // Only expose the token when SMTP is off (fallback). When SMTP is on
        // and email was actually sent, the token stays secret.
        verifyToken: !emailSent ? newToken : null,
        expiresAt: expires,
        deliveredVia: emailSent ? 'email' : 'ui-fallback',
        emailSent,
      });
    }

    return errorResponse('Either a token or action=send is required', 400);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Verification failed');
  }
}

/* GET /api/verify-email?token=xxx
   Convenience endpoint for clicking a verification link from an email */
export async function GET(request: Request) {
  try {
    const token = getQueryParam(request, 'token');
    if (!token) {
      return new Response(
        '<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>Invalid Link</h1><p>This verification link is invalid.</p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } },
      );
    }

    const record = await db.emailVerification.findUnique({
      where: { token },
    });
    if (!record) {
      return new Response(
        '<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>Invalid Link</h1><p>This verification link is invalid or has expired.</p><p><a href="/" style="color:#e8e8e8">Return to forum</a></p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } },
      );
    }

    if (record.consumedAt) {
      return new Response(
        '<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>Already Verified</h1><p>Your email has already been verified.</p><p><a href="/" style="color:#e8e8e8">Return to forum</a></p></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    }

    if (record.expiresAt < new Date()) {
      return new Response(
        '<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>Link Expired</h1><p>This verification link has expired. Please request a new one.</p><p><a href="/" style="color:#e8e8e8">Return to forum</a></p></body></html>',
        { status: 400, headers: { 'Content-Type': 'text/html' } },
      );
    }

    // Mark consumed + clear verification token
    // NOTE: Email verification is separate from the "Verified" badge.
    // The isVerified badge is ONLY granted by super admin.
    await db.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    await db.user.update({
      where: { id: record.userId },
      // Only clear verify token/expires — do NOT set isVerified (that's admin-only)
      data: { verifyToken: null, verifyExpires: null },
    });

    await db.securityLog.create({
      data: {
        userId: record.userId,
        eventType: 'EMAIL_VERIFIED',
        details: 'User verified their email address via link click',
      },
    });

    // Redirect to the forum home
    return new Response(null, {
      status: 302,
      headers: { Location: '/?verified=true' },
    });
  } catch (e: any) {
    return new Response(
      '<!DOCTYPE html><html><body style="font-family:system-ui;text-align:center;padding:40px"><h1>Error</h1><p>Something went wrong. Please try again.</p></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }
}
