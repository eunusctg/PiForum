import { db } from '@/lib/db';
import { serverErrorResponse, serializeUser, generateUUID } from '@/lib/api-helpers';

/**
 * Decode a JWT payload (base64url segment) into a JSON object.
 * Works in both Node.js and Cloudflare Workers (no Buffer dependency).
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  let base64 = token.split('.')[1];
  // Convert base64url → standard base64
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const jsonStr = atob(base64);
  return JSON.parse(jsonStr);
}

/**
 * Build a redirect response that includes an auth_error (and optional detail)
 * in the URL hash so the frontend AuthModal can display it.
 */
function authErrorRedirect(
  siteUrl: string,
  error: string,
  detail?: string,
): Response {
  const fragment = detail
    ? `auth_error=${error}&auth_error_detail=${encodeURIComponent(detail)}`
    : `auth_error=${error}`;
  // Use hash (#) instead of query (?) so the error detail isn't sent to
  // server logs or analytics.  The AuthModal reads both hash and query.
  return new Response(null, {
    status: 302,
    headers: { Location: `${siteUrl}#${fragment}` },
  });
}

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth 2.0 callback from Google. Exchanges the authorization
 * code for tokens, fetches the user's profile, then either:
 *   1. Logs in an existing user (matched by email), or
 *   2. Creates a new account automatically (auto-provision).
 *
 * The state record stores the redirect_uri and client_id that were used
 * during initiation, ensuring the token exchange uses the exact same values
 * (prevents redirect_uri_mismatch errors).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Resolve siteUrl for error redirects (before we have the state record)
    const siteUrlSetting = await db.setting.findUnique({ where: { key: 'seo_canonical_url' } });
    const siteUrl = siteUrlSetting?.value || process.env.NEXT_PUBLIC_SITE_URL || 'https://piforum.eu.org';

    // User denied access
    if (error) {
      return authErrorRedirect(siteUrl, 'access_denied', searchParams.get('error_subtype') || error);
    }

    if (!code || !state) {
      return authErrorRedirect(siteUrl, 'missing_params');
    }

    // Verify state (CSRF protection) — also clean up expired states
    // Delete all expired states (older than 10 min) to prevent table bloat
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    await db.setting.deleteMany({
      where: {
        key: { startsWith: 'oauth_state_' },
        value: { lt: tenMinAgo.toString() },
      },
    }).catch(() => {});

    const stateRecord = await db.setting.findUnique({ where: { key: `oauth_state_${state}` } });
    if (!stateRecord) {
      return authErrorRedirect(siteUrl, 'invalid_state');
    }

    // Parse the state value: "timestamp|redirectUri|clientId"
    // This guarantees the callback uses the exact same redirect_uri and
    // client_id that were used during initiation, preventing mismatches.
    const stateParts = stateRecord.value.split('|');
    const stateTimestamp = parseInt(stateParts[0], 10);
    const storedRedirectUri = stateParts[1] || `${siteUrl}/api/auth/google/callback`;
    const storedClientId = stateParts[2] || undefined;

    // Clean up the used state
    await db.setting.delete({ where: { key: `oauth_state_${state}` } }).catch(() => {});

    // Check state hasn't expired (10 min)
    if (Date.now() - stateTimestamp > 10 * 60 * 1000) {
      return authErrorRedirect(siteUrl, 'expired_state');
    }

    // Get Google OAuth credentials: DB settings first, then env vars
    const clientIdSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_id' } });
    const clientSecretSetting = await db.setting.findUnique({ where: { key: 'oauth_google_client_secret' } });
    const clientId = storedClientId || clientIdSetting?.value || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = clientSecretSetting?.value || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return authErrorRedirect(
        siteUrl,
        'oauth_not_configured',
        !clientId ? 'Missing GOOGLE_CLIENT_ID' : 'Missing GOOGLE_CLIENT_SECRET',
      );
    }

    // Use the redirect URI stored in the state record (guaranteed to match
    // what was sent to Google during initiation)
    const redirectUri = storedRedirectUri;

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
      console.error('[google-callback] redirect_uri used:', redirectUri);
      console.error('[google-callback] client_id used:', clientId.slice(0, 8) + '...');

      // Try to extract a human-readable reason from the Google error JSON
      let detail = 'Unknown error';
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.error_description || errJson.error || errText.slice(0, 200);
      } catch {
        detail = errText.slice(0, 200);
      }

      return authErrorRedirect(siteUrl, 'token_exchange_failed', detail);
    }

    const tokenData = await tokenResponse.json();
    const { id_token } = tokenData;

    if (!id_token) {
      return authErrorRedirect(siteUrl, 'no_id_token');
    }

    // Decode the ID token to get user info (JWT decode without full verification
    // since we trust the token came directly from Google's token endpoint)
    const payload = decodeJwtPayload(id_token);

    // Verify the audience claim matches our client ID (security check)
    if (payload.aud !== clientId) {
      console.error('[google-callback] Audience mismatch:', payload.aud, '!==', clientId);
      return authErrorRedirect(siteUrl, 'invalid_audience', `Expected aud=${clientId}, got ${String(payload.aud)}`);
    }

    const googleEmail = payload.email as string;
    const googleName = payload.name as string;
    const googlePicture = payload.picture as string;

    if (!googleEmail) {
      return authErrorRedirect(siteUrl, 'no_email');
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
        return authErrorRedirect(siteUrl, 'account_banned');
      }

      // Super-admin auto-promotion — ensure the forum owner keeps role 3
      const SUPER_ADMIN_EMAILS = ['eunus527@gmail.com'];
      if (SUPER_ADMIN_EMAILS.includes(googleEmail.toLowerCase()) && user.role < 3) {
        user = await db.user.update({
          where: { id: user.id },
          data: { role: 3 },
          include: { rank: true },
        });
      }
    } else {
      // New user — auto-provision account
      const openRegSetting = await db.setting.findUnique({ where: { key: 'open_registration' } });
      if (openRegSetting && openRegSetting.value === 'false') {
        return authErrorRedirect(siteUrl, 'registration_closed');
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

      // Super-admin auto-promotion AND auto-verification
      const SUPER_ADMIN_EMAILS = ['eunus527@gmail.com'];
      const assignedRole = SUPER_ADMIN_EMAILS.includes(googleEmail.toLowerCase()) ? 3 : 0;
      const assignedVerified = SUPER_ADMIN_EMAILS.includes(googleEmail.toLowerCase());

      user = await db.user.create({
        data: {
          firebaseUid,
          username,
          email: googleEmail,
          displayName: googleName || username,
          avatarUrl: googlePicture || null,
          role: assignedRole,
          // Only super admin gets auto-verified; others need admin approval
          isVerified: assignedVerified,
          verifiedAt: assignedVerified ? new Date() : null,
        },
        include: { rank: true },
      });
    }

    const serializedUser = serializeUser(user);
    const token = user.firebaseUid;

    // Redirect to frontend with token in URL hash (so it's not sent to server logs)
    // The frontend AuthModal will pick it up and set it in the store.
    // NOTE: Response.redirect() creates immutable headers on Cloudflare Workers,
    // so we build a new Response with Location + Set-Cookie in the init headers.
    const redirectUrl = `${siteUrl}#auth_token=${encodeURIComponent(token)}&auth_user=${encodeURIComponent(JSON.stringify(serializedUser))}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`,
      },
    });
  } catch (e: any) {
    console.error('[google-callback] Error:', e);
    return serverErrorResponse(e.message || 'Google OAuth callback failed');
  }
}
