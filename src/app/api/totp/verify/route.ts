import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  serializeUser,
} from '@/lib/api-helpers';
import { getSettingsMap, settingInt } from '@/lib/server-settings';
import { verifyTotpToken, generateBackupCodes, hashOtp } from '@/lib/otp';

/**
 * POST /api/totp/verify
 * Body: { token: string }
 *
 * Verifies the first TOTP token from the user's authenticator app. If valid,
 * enables TOTP for the account, generates one-time backup codes, and returns
 * the backup codes (shown once) + the updated user object.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { token } = body;
    if (!token) return errorResponse('A 6-digit token from your authenticator app is required.');

    if (!user.totpSecret) {
      return errorResponse('No pending TOTP setup found. Call /api/totp/setup first.', 400);
    }
    if (user.totpEnabled) {
      return errorResponse('TOTP is already enabled for this account.', 400);
    }

    const s = await getSettingsMap();
    const period = settingInt(s, 'totp_period', 30);
    const digits = settingInt(s, 'totp_digits', 6);

    const valid = await verifyTotpToken(String(token), user.totpSecret, { period, digits });
    if (!valid) {
      return errorResponse('That code didn\'t match. Make sure your device time is correct and try again.', 400);
    }

    // Generate one-time backup codes (hashed for storage)
    const backupCodes = generateBackupCodes(8);
    const hashedBackupCodes = backupCodes.map((c) => hashOtp(c));

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        twoFactorEnabled: true,
        totpBackupCodes: JSON.stringify(hashedBackupCodes),
      },
      include: { rank: true },
    });

    await db.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'TOTP_ENABLED',
        details: 'User enabled TOTP (authenticator app) verification',
      },
    });

    return successResponse({
      enabled: true,
      backupCodes, // shown once — user must save these
      user: serializeUser(updated),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to verify TOTP');
  }
}
