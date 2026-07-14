import { db } from '@/lib/db';
import { errorResponse, serverErrorResponse } from '@/lib/api-helpers';

/**
 * GET /api/auth/google
 *
 * Initiates Google OAuth 2.0 sign-in. Redirects the user to Google's
 * authorization endpoint. Credentials are read from:
 *   1. DB Setting table (configured via admin panel)
 *   2. Environment variables (GOOGLE_CLIENT_ID set via wrangler secret)
 */
export async function GET(request: Request) {
  try {
    // Check if Google OAuth is enabled — check DB setting first, then
    // assume enabled if GOOGLE_CLIENT_ID env var exists
    const enabledSetting = await db.setting.findUnique({ where: { key: 'oauth_google_enabled' } });
    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const isEnabled = enabledSetting?.value === 'true' || !!envClientId;

    if (!isEnabled) {
      return errorResponse('Google OAuth is not enabled', 403);
    }

    // Read client ID from DB first, fall back to env var
    const clientIdSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_id' } });
    const clientId = clientIdSetting?.value || envClientId;

    // Read client secret to verify OAuth is fully configured (fail early)
    const clientSecretSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_secret' } });
    const hasClientSecret = !!(clientSecretSetting?.value || process.env.GOOGLE_CLIENT_SECRET);

    if (!clientId) {
      return errorResponse('Google OAuth Client ID is not configured', 500);
    }

    if (!hasClientSecret) {
      return errorResponse('Google OAuth Client Secret is not configured. The callback will fail.', 500);
    }

    // Build the redirect URI — must match what's registered in Google Cloud Console
    // Use the canonical URL from DB, then env, then the request's origin, then default
    const siteUrlSetting = await db.setting.findUnique({ where: { key: 'seo_canonical_url' } });
    const requestOrigin = new URL(request.url).origin;
    const siteUrl = siteUrlSetting?.value || process.env.NEXT_PUBLIC_SITE_URL || requestOrigin || 'https://piforum.eu.org';
    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomUUID().replace(/-/g, '');

    // Store state + redirect URI + client ID in the Setting table temporarily
    // Value format: "timestamp|redirectUri|clientId" so the callback can use
    // the exact same redirect_uri that was sent to Google (prevents mismatch)
    await db.setting.upsert({
      where: { key: `oauth_state_${state}` },
      update: { value: `${Date.now()}|${redirectUri}|${clientId}` },
      create: { key: `oauth_state_${state}`, value: `${Date.now()}|${redirectUri}|${clientId}` },
    });

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    // Use select_account for returning users (better UX), consent for first time
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    // Redirect to Google
    return Response.redirect(googleAuthUrl.toString(), 302);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to initiate Google OAuth');
  }
}
