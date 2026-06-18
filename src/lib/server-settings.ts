import { db } from '@/lib/db';

/* Server-side settings loader. Returns a Record<string,string> of all
   settings (excluding password_* keys). Used by metadata, sitemap,
   robots.txt, and manifest route handlers so they can render from DB
   state without a client round-trip. */
export async function getSettingsMap(): Promise<Record<string, string>> {
  try {
    const settings = await db.setting.findMany({
      where: { NOT: { key: { startsWith: 'password_' } } },
    });
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    return map;
  } catch {
    return {};
  }
}

export function settingBool(map: Record<string, string>, key: string, fallback: boolean): boolean {
  if (map[key] === undefined) return fallback;
  return map[key] === 'true';
}

export function settingStr(map: Record<string, string>, key: string, def = ''): string {
  return map[key] ?? def;
}

/* Derive the public site origin from request headers (supports the gateway
   X-Forwarded-* pattern). Falls back to localhost for dev. */
export function getOrigin(request: Request): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}
