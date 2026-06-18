import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  serializeUser,
} from '@/lib/api-helpers';
import { verifyTotpToken } from '@/lib/otp';
import { getSettingsMap, settingInt } from '@/lib/server-settings';

/**
 * POST /api/totp/disable
 * Body: { token: string }
 *
 * Disables TOTP for the authenticated account. Requires a valid current
 * TOTP token (or a backup code) to prevent a compromised session from
 * silently removing 2FA. Clears the secret + backup codes.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token } = body;
    if (!token) return errorResponse('A current TOTP token or backup code is required to disable.');

    if (!user.totpEnabled) {
      return errorResponse('TOTP is not enabled for this account.', 400);
    }

    const s = await getSettingsMap();
    const period = settingInt(s, 'totp_period', 30);
    const digits = settingInt(s, 'totp_digits', 6);

    // Check against the TOTP token first
    let valid = false;
    if (user.totpSecret) {
      valid = await verifyTotpToken(String(token), user.totpSecret, { period, digits });
    }

    // If not valid as TOTP, check against backup codes
    if (!valid && user.totpBackupCodes) {
      try {
        const hashed: string[] = JSON.parse(user.totpBackupCodes);
        const { hashOtp } = await import('@/lib/otp');
        const tokenHash = hashOtp(String(token).trim());
        if (hashed.includes(tokenHash)) {
          valid = true;
          // Consume this backup code (remove it from the list)
          const remaining = hashed.filter((h) => h !== tokenHash);
          await db.user.update({
            where: { id: user.id },
            data: { totpBackupCodes: JSON.stringify(remaining) },
          });
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!valid) {
      return errorResponse('Invalid token or backup code. TOTP was not disabled.', 400);
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        twoFactorEnabled: false,
        totpSecret: null,
        totpBackupCodes: null,
      },
      include: { rank: true },
    });

    await db.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'TOTP_DISABLED',
        details: 'User disabled TOTP (authenticator app) verification',
      },
    });

    return successResponse({
      disabled: true,
      user: serializeUser(updated),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to disable TOTP');
  }
}
