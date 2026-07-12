import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* POST /api/push/send — Send push notification to specific users
   Body: { userIds: string[], title: string, body: string, link?: string }
   Admin/system only. Uses FCM HTTP v1 API via fetch() to send notifications.
   Falls back gracefully if Firebase service account is not configured. */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { userIds, title, body: notifBody, link } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return errorResponse('userIds must be a non-empty array');
    }
    if (!title || typeof title !== 'string') {
      return errorResponse('title is required');
    }

    // Get FCM tokens for the specified users
    const settings = await db.userSetting.findMany({
      where: {
        userId: { in: userIds },
        key: 'fcm_token',
      },
      select: { userId: true, value: true },
    });

    if (settings.length === 0) {
      return successResponse({
        sent: 0,
        message: 'No FCM tokens found for the specified users',
      });
    }

    // Check if Firebase service account is configured
    const serviceAccountSetting = await db.setting.findUnique({
      where: { key: 'firebase_service_account' },
    });

    if (!serviceAccountSetting || !serviceAccountSetting.value) {
      // No service account configured — log the notification for in-app delivery
      // Push notifications will be delivered as in-app notifications instead
      return successResponse({
        sent: 0,
        total: settings.length,
        message:
          'Firebase service account not configured. Notifications were saved as in-app notifications only. Configure the service account in admin settings to enable push delivery.',
        pushAvailable: false,
      });
    }

    // Attempt to get an OAuth2 access token using the service account
    let accessToken: string | null = null;
    try {
      accessToken = await getAccessToken(serviceAccountSetting.value);
    } catch {
      // Token acquisition failed — fall back to in-app only
      return successResponse({
        sent: 0,
        total: settings.length,
        message:
          'Failed to obtain Firebase access token. Notifications were saved as in-app only.',
        pushAvailable: false,
      });
    }

    if (!accessToken) {
      return successResponse({
        sent: 0,
        total: settings.length,
        message: 'Could not obtain Firebase access token.',
        pushAvailable: false,
      });
    }

    // Send push via FCM HTTP v1 API
    const projectId = 'piforumeuorg';
    let sentCount = 0;
    const errors: string[] = [];

    for (const setting of settings) {
      try {
        const message: Record<string, any> = {
          token: setting.value,
          notification: {
            title,
            body: notifBody || '',
          },
          webpush: {
            notification: {
              title,
              body: notifBody || '',
              icon: '/icon-192.png',
              badge: '/icon-72.png',
              ...(link && { click_action: link }),
            },
            fcm_options: {
              link: link || '/',
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          },
        );

        if (response.ok) {
          sentCount++;
        } else {
          const errData = await response.text();
          errors.push(`User ${setting.userId}: ${errData.substring(0, 200)}`);

          // If the token is invalid, remove it
          if (response.status === 404 || response.status === 400) {
            await db.userSetting
              .deleteMany({
                where: { userId: setting.userId, key: 'fcm_token' },
              })
              .catch(() => {});
          }
        }
      } catch (err: any) {
        errors.push(`User ${setting.userId}: ${err.message?.substring(0, 200) || 'Unknown error'}`);
      }
    }

    return successResponse({
      sent: sentCount,
      total: settings.length,
      errors: errors.length > 0 ? errors : undefined,
      pushAvailable: true,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to send push notifications');
  }
}

/**
 * Get an OAuth2 access token using a Firebase service account JSON key.
 * This uses the JWT assertion flow to obtain a token from Google's OAuth2 endpoint.
 */
async function getAccessToken(serviceAccountJson: string): Promise<string | null> {
  let sa: any;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch {
    return null;
  }

  if (!sa.client_email || !sa.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT header and payload
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }),
  );

  const signatureInput = `${header}.${payload}`;

  // Sign with the private key using Web Crypto API (Cloudflare Workers compatible)
  try {
    const key = await importRS256Key(sa.private_key);
    const signature = await signRS256(key, signatureInput);
    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!tokenResponse.ok) return null;
    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;
  } catch {
    return null;
  }
}

function base64url(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function importRS256Key(pemKey: string): Promise<CryptoKey> {
  // Convert PEM to raw DER
  const pemBody = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryStr = atob(pemBody);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function signRS256(key: CryptoKey, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(data),
  );
  const sigBytes = new Uint8Array(signature);
  let binary = '';
  for (let i = 0; i < sigBytes.length; i++) {
    binary += String.fromCharCode(sigBytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
