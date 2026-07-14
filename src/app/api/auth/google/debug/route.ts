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
export async function GET() {
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

    // Mask secrets for display
    const mask = (val: string | undefined) => {
      if (!val) return '(not set)';
      if (val.length <= 8) return '****';
      return val.slice(0, 4) + '****' + val.slice(-4);
    };

    const diagnostics = {
      oauth_enabled: settingsMap['oauth_google_enabled'] === 'true',
      client_id_source: settingsMap['oauth_google_client_id'] ? 'DB' : (envClientId ? 'ENV' : 'MISSING'),
      client_id_masked: mask(effectiveClientId),
      client_secret_source: settingsMap['oauth_google_client_secret'] ? 'DB' : (envClientSecret ? 'ENV' : 'MISSING'),
      client_secret_masked: mask(effectiveClientSecret),
      canonical_url: effectiveSiteUrl,
      redirect_uri: effectiveRedirectUri,
      open_registration: settingsMap['open_registration'] !== 'false',
      env_client_id_set: !!envClientId,
      env_client_secret_set: !!envClientSecret,
      next_public_site_url: siteUrl || '(not set)',
      all_oauth_settings: Object.fromEntries(
        Object.entries(settingsMap).map(([k, v]) => {
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
        redirect_uri_format: effectiveRedirectUri.startsWith('https://') ? 'OK (https)' : 'WARNING: not https',
        // Suggest checking Google Cloud Console
        tip: 'Make sure the redirect_uri above is added to Authorized redirect URIs in Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client',
      },
    };

    return Response.json({ success: true, diagnostics });
  } catch (e: any) {
    return errorResponse(e.message || 'Failed to get diagnostics', 500);
  }
}
