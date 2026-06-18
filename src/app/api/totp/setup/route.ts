import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
} from '@/lib/api-helpers';
import { getSettingsMap, settingStr, settingBool, settingInt } from '@/lib/server-settings';
import { generateTotpSecret, buildTotpUri, generateQrCodeDataUrl } from '@/lib/otp';

/**
 * POST /api/totp/setup
 * Generates a new TOTP secret for the authenticated user and returns the
 * otpauth:// URI + QR code data URL so the user can scan it with an
 * authenticator app (Google Authenticator, Authy, 1Password, etc.).
 *
 * The secret is stored on the user record but totpEnabled stays false
 * until the user verifies a code via /api/totp/verify.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;

    // Load TOTP config from settings (admin-configurable)
    const s = await getSettingsMap();
    const issuer = settingStr(s, 'totp_issuer', 'PiForum');
    const period = settingInt(s, 'totp_period', 30);
    const digits = settingInt(s, 'totp_digits', 6);
    const totpEnabled = settingBool(s, 'enable_totp', false);

    if (!totpEnabled) {
      return errorResponse('TOTP (authenticator app) verification is not enabled on this site.', 403);
    }

    // Don't allow re-setup if already enabled (must disable first)
    if (user.totpEnabled) {
      return errorResponse('TOTP is already enabled. Disable it first to reconfigure.', 400);
    }

    // Generate a fresh secret (overwrites any pending setup)
    const secret = generateTotpSecret();

    // Store the secret temporarily; totpEnabled stays false until verified
    await db.user.update({
      where: { id: user.id },
      data: { totpSecret: secret },
    });

    const uri = buildTotpUri(secret, {
      issuer,
      label: user.email || user.username,
      period,
      digits,
    });

    const qrDataUrl = await generateQrCodeDataUrl(uri);

    return successResponse({
      secret,
      uri,
      qrCode: qrDataUrl,
      issuer,
      period,
      digits,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to set up TOTP');
  }
}

/**
 * DELETE /api/totp/setup
 * Cancels a pending TOTP setup (clears the stored secret if not yet enabled).
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;

    // Only allow clearing if TOTP is not yet enabled
    if (user.totpEnabled) {
      return errorResponse('TOTP is already enabled. Use /api/totp/disable instead.', 400);
    }

    await db.user.update({
      where: { id: user.id },
      data: { totpSecret: null },
    });

    return successResponse({ cancelled: true });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to cancel TOTP setup');
  }
}
