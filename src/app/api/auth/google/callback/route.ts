import { db } from '@/lib/db';
import { serverErrorResponse, serializeUser, generateUUID } from '@/lib/api-helpers';

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth 2.0 callback from Google. Exchanges the authorization
 * code for tokens, fetches the user's profile, then either:
 *   1. Logs in an existing user (matched by email), or
 *   2. Creates a new account automatically (auto-provision).
 *
 * Credentials are read from DB settings first, falling back to env vars
 * (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET set via wrangler secret).
 *
 * On success, redirects to the frontend with the auth token in a secure
 * cookie and URL fragment so the client-side store can pick it up.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const siteUrlSetting = await db.setting.findUnique({ where: { key: 'seo_canonical_url' } });
    const siteUrl = siteUrlSetting?.value || process.env.NEXT_PUBLIC_SITE_URL || 'https://piforum.eu.org';

    // User denied access
    if (error) {
      return Response.redirect(`${siteUrl}?auth_error=access_denied`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${siteUrl}?auth_error=missing_params`, 302);
    }

    // Verify state (CSRF protection)
    const stateRecord = await db.setting.findUnique({ where: { key: `oauth_state_${state}` } });
    if (!stateRecord) {
      return Response.redirect(`${siteUrl}?auth_error=invalid_state`, 302);
    }

    // Clean up the used state
    await db.setting.delete({ where: { key: `oauth_state_${state}` } }).catch(() => {});

    // Check state hasn't expired (10 min)
    const stateAge = Date.now() - parseInt(stateRecord.value, 10);
    if (stateAge > 10 * 60 * 1000) {
      return Response.redirect(`${siteUrl}?auth_error=expired_state`, 302);
    }

    // Get Google OAuth credentials: DB settings first, then env vars
    const clientIdSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_id' } });
    const clientSecretSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_secret' } });
    const clientId = clientIdSetting?.value || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = clientSecretSetting?.value || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.redirect(`${siteUrl}?auth_error=oauth_not_configured`, 302);
    }

    const redirectUri = `${siteUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[google-callback] Token exchange failed:', errText);
      return Response.redirect(`${siteUrl}?auth_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    const { id_token } = tokenData;

    if (!id_token) {
      return Response.redirect(`${siteUrl}?auth_error=no_id_token`, 302);
    }

    // Decode the ID token to get user info (JWT decode without verification
    // since we trust the token came directly from Google's token endpoint)
    const payload = JSON.parse(
      Buffer.from(id_token.split('.')[1], 'base64').toString('utf-8'),
    );

    const googleEmail = payload.email as string;
    const googleName = payload.name as string;
    const googlePicture = payload.picture as string;

    if (!googleEmail) {
      return Response.redirect(`${siteUrl}?auth_error=no_email`, 302);
    }

    // Try to find existing user by email
    let user = await db.user.findUnique({
      where: { email: googleEmail },
      include: { rank: true },
    });

    if (user) {
      // Existing user — update avatar if they don't have one
      if (!user.avatarUrl && googlePicture) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            avatarUrl: googlePicture,
            isVerified: true,
            verifiedAt: user.verifiedAt || new Date(),
            lastSeenAt: new Date(),
          },
          include: { rank: true },
        });
      } else {
        user = await db.user.update({
          where: { id: user.id },
          data: { lastSeenAt: new Date() },
          include: { rank: true },
        });
      }

      // Check if banned
      if (user.banned) {
        return Response.redirect(`${siteUrl}?auth_error=account_banned`, 302);
      }
    } else {
      // New user — auto-provision account
      const openRegSetting = await db.setting.findUnique({ where: { key: 'open_registration' } });
      if (openRegSetting && openRegSetting.value === 'false') {
        return Response.redirect(`${siteUrl}?auth_error=registration_closed`, 302);
      }

      // Generate a unique username from the Google name
      let baseUsername = googleName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      if (!baseUsername) baseUsername = 'user';
      let username = baseUsername;
      let suffix = 1;

      while (await db.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      const firebaseUid = generateUUID();

      user = await db.user.create({
        data: {
          firebaseUid,
          username,
          email: googleEmail,
          displayName: googleName || username,
          avatarUrl: googlePicture || null,
          role: 0,
          isVerified: true, // Google-verified email
          verifiedAt: new Date(),
        },
        include: { rank: true },
      });
    }

    const serializedUser = serializeUser(user);
    const token = user.firebaseUid;

    // Redirect to frontend with token in URL hash (so it's not sent to server logs)
    // The frontend AuthModal will pick it up and set it in the store
    const redirectUrl = `${siteUrl}#auth_token=${encodeURIComponent(token)}&auth_user=${encodeURIComponent(JSON.stringify(serializedUser))}`;

    const response = Response.redirect(redirectUrl, 302);

    // Also set a secure HttpOnly cookie as backup
    response.headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`,
    );

    return response;
  } catch (e: any) {
    console.error('[google-callback] Error:', e);
    return serverErrorResponse(e.message || 'Google OAuth callback failed');
  }
}
