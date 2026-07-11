import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, serializeUser } from '@/lib/api-helpers';

/**
 * GET /api/auth/google
 *
 * Initiates Google OAuth 2.0 sign-in. Redirects the user to Google's
 * authorization endpoint. The client_id and client_secret are read from
 * the Setting table at runtime so they can be configured via the admin
 * panel without redeploying.
 */
export async function GET() {
  try {
    // Check if Google OAuth is enabled
    const enabledSetting = await db.setting.findUnique({ where: { key: 'oauth_google_enabled' } });
    if (!enabledSetting || enabledSetting.value !== 'true') {
      return errorResponse('Google OAuth is not enabled', 403);
    }

    const clientIdSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_id' } });
    if (!clientIdSetting || !clientIdSetting.value) {
      return errorResponse('Google OAuth Client ID is not configured', 500);
    }

    const clientId = clientIdSetting.value;

    // Build the redirect URI — must match what's registered in Google Cloud Console
    const siteUrlSetting = await db.setting.findUnique({ where: { key: 'seo_canonical_url' } });
    const siteUrl = siteUrlSetting?.value || process.env.NEXT_PUBLIC_SITE_URL || 'https://piforum.eu.org';
    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    // Generate a random state parameter for CSRF protection
    const state = crypto.randomUUID().replace(/-/g, '');

    // Store state in the Setting table temporarily (expires in 10 min via cleanup)
    await db.setting.upsert({
      where: { key: `oauth_state_${state}` },
      update: { value: Date.now().toString() },
      create: { key: `oauth_state_${state}`, value: Date.now().toString() },
    });

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    // Redirect to Google
    return Response.redirect(googleAuthUrl.toString(), 302);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to initiate Google OAuth');
  }
}
