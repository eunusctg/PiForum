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

// Admin check helper
export async function getAuthenticatedUser(request: Request) {
  const userId = request.headers.get('x-user-id');
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

// Parse request body safely
export async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
