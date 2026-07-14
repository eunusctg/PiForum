import { db } from '@/lib/db';
import { errorResponse } from '@/lib/api-helpers';

/**
 * GET /api/auth/google/debug
 *
 * Diagnostic endpoint for Google OAuth configuration.
 * Returns the current OAuth settings (masks secrets) to help debug
 * authentication failures. Only available in development or for
 * super-admins.
 */
export async function GET(request: Request) {
  try {
    // Read all Google OAuth related settings from DB
    const settings = await db.setting.findMany({
      where: {
        OR: [
          { key: { contains: 'google' } },
          { key: { contains: 'oauth' } },
          { key: 'seo_canonical_url' },
          { key: 'open_registration' },
        ],
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // Determine effective values (DB first, then env)
    const effectiveClientId = settingsMap['oauth_google_client_id'] || envClientId;
    const effectiveClientSecret = settingsMap['oauth_google_client_secret'] || envClientSecret;
    const effectiveSiteUrl = settingsMap['seo_canonical_url'] || siteUrl || 'https://piforum.eu.org';
    const effectiveRedirectUri = `${effectiveSiteUrl}/api/auth/google/callback`;

    // Determine site URL using the same logic as the initiation route
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const forwardedOrigin = host ? `${proto}://${host}` : null;

    // Determine which URL source would actually be used
    let urlSource: string;
    if (settingsMap['seo_canonical_url']) {
      urlSource = 'DB (seo_canonical_url)';
    } else if (siteUrl) {
      urlSource = 'ENV (NEXT_PUBLIC_SITE_URL)';
    } else if (forwardedOrigin) {
      urlSource = `Forwarded headers (${forwardedOrigin})`;
    } else {
      urlSource = 'Hardcoded fallback (https://piforum.eu.org)';
    }

    // Mask secrets for display
    const mask = (val: string | undefined) => {
      if (!val) return '(not set)';
      if (val.length <= 8) return '****';
      return val.slice(0, 4) + '****' + val.slice(-4);
    };

    // Check for stale OAuth state records
    const stateRecords = await db.setting.findMany({
      where: { key: { startsWith: 'oauth_state_' } },
    });
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const staleStates = stateRecords.filter(s => {
      const ts = parseInt(s.value.split('|')[0], 10);
      return !isNaN(ts) && ts < tenMinAgo;
    });

    const diagnostics = {
      oauth_enabled: settingsMap['oauth_google_enabled'] === 'true',
      client_id_source: settingsMap['oauth_google_client_id'] ? 'DB' : (envClientId ? 'ENV' : 'MISSING'),
      client_id_masked: mask(effectiveClientId),
      client_secret_source: settingsMap['oauth_google_client_secret'] ? 'DB' : (envClientSecret ? 'ENV' : 'MISSING'),
      client_secret_masked: mask(effectiveClientSecret),
      canonical_url: effectiveSiteUrl,
      redirect_uri: effectiveRedirectUri,
      url_source: urlSource,
      forwarded_origin: forwardedOrigin || '(not available)',
      request_url_origin: new URL(request.url).origin,
      open_registration: settingsMap['open_registration'] !== 'false',
      env_client_id_set: !!envClientId,
      env_client_secret_set: !!envClientSecret,
      next_public_site_url: siteUrl || '(not set)',
      stale_oauth_states: staleStates.length,
      total_oauth_states: stateRecords.length,
      all_oauth_settings: Object.fromEntries(
        Object.entries(settingsMap)
          .filter(([k]) => !k.startsWith('oauth_state_'))
          .map(([k, v]) => {
            // Mask sensitive values
            if (k.includes('secret')) return [k, mask(v)];
            return [k, v];
          })
      ),
      // Common issues checklist
      checks: {
        client_id_configured: !!effectiveClientId,
        client_secret_configured: !!effectiveClientSecret,
        oauth_enabled: settingsMap['oauth_google_enabled'] === 'true' || !!envClientId,
        redirect_uri_format: effectiveRedirectUri.startsWith('https://') ? 'OK (https)' : 'WARNING: not https — Google requires HTTPS redirect URIs',
        canonical_url_set: !!settingsMap['seo_canonical_url'],
        canonical_url_https: effectiveSiteUrl.startsWith('https://'),
        request_origin_matches_canonical: new URL(request.url).origin === effectiveSiteUrl || !effectiveSiteUrl.includes('localhost'),
        // Suggest checking Google Cloud Console
        tip: `Make sure "${effectiveRedirectUri}" is added to Authorized redirect URIs in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client. The redirect URI must match EXACTLY (no trailing slash, same protocol).`,
      },
      // Step-by-step verification guide
      verification_steps: [
        `1. Go to console.cloud.google.com/apis/credentials`,
        `2. Add redirect URI: ${effectiveRedirectUri}`,
        `3. Ensure Client ID matches: ${mask(effectiveClientId)}`,
        `4. If secret was regenerated, update in admin panel`,
        `5. No trailing slash on redirect URI`,
        `6. Must use HTTPS`,
      ],
    };

    return Response.json({ success: true, diagnostics });
  } catch (e: any) {
    return errorResponse(e.message || 'Failed to get diagnostics', 500);
  }
}
