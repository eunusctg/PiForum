import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Response helpers
export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function serverErrorResponse(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

// Password hashing helpers
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// UUID generation
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Slugify helper (for tags, etc.)
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Admin check helper
export async function getAuthenticatedUser(request: Request) {
  // Support both x-user-id header (legacy) and Authorization: Bearer <token>
  let userId = request.headers.get('x-user-id');

  if (!userId) {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7);
      // Token is firebaseUid
      const user = await db.user.findUnique({ where: { firebaseUid: token } });
      return user;
    }
  }

  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  return user;
}

export async function requireAdmin(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: errorResponse('Authentication required', 401), user: null };
  if (user.role < 2) return { error: errorResponse('Admin access required', 403), user: null };
  return { error: null, user };
}

export async function requireAuth(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: errorResponse('Authentication required', 401), user: null };
  if (user.banned) return { error: errorResponse('Your account has been banned', 403), user: null };
  return { error: null, user };
}

export async function requireModerator(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: errorResponse('Authentication required', 401), user: null };
  if (user.banned) return { error: errorResponse('Your account has been banned', 403), user: null };
  if (user.role < 1) return { error: errorResponse('Moderator access required', 403), user: null };
  return { error: null, user };
}

// Parse request body safely
export async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Get query params from URL
export function getQueryParam(request: Request, key: string): string | null {
  const url = new URL(request.url);
  return url.searchParams.get(key);
}

// Pagination helper
export function getPagination(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
  return { page, limit, skip: (page - 1) * limit };
}

// Serialize user for client (strips sensitive fields)
export function serializeUser(user: any) {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? null,
    signature: user.signature ?? null,
    location: user.location ?? null,
    website: user.website ?? null,
    role: user.role,
    banned: user.banned,
    banReason: user.banReason,
    postCount: user.postCount ?? 0,
    threadCount: user.threadCount ?? 0,
    reputation: user.reputation ?? 0,
    isVerified: user.isVerified ?? false,
    verifiedAt: user.verifiedAt ?? null,
    twoFactorEnabled: user.twoFactorEnabled ?? false,
    totpEnabled: user.totpEnabled ?? false,
    phoneNumber: user.phoneNumber ?? null,
    phoneVerified: user.phoneVerified ?? false,
    rankId: user.rankId ?? null,
    rank: user.rank
      ? {
          id: user.rank.id,
          name: user.rank.name,
          title: user.rank.title,
          color: user.rank.color,
          icon: user.rank.icon,
          minPosts: user.rank.minPosts,
          minReputation: user.rank.minReputation,
          isStaff: user.rank.isStaff,
          sortOrder: user.rank.sortOrder,
          createdAt: user.rank.createdAt,
          updatedAt: user.rank.updatedAt,
        }
      : null,
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
