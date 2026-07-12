import { db } from '@/lib/db';

/**
 * Check if a user is allowed to perform actions that require email verification.
 * Returns true if the user is allowed (either verified, or verification is not required).
 * Returns false if the user needs to verify their email first.
 */
export async function isUserAllowedToPost(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  // Check if email verification is required by admin settings
  const requireSetting = await db.setting.findUnique({
    where: { key: 'require_email_verification' },
  });

  // If verification is not required, everyone is allowed
  if (!requireSetting || requireSetting.value !== 'true') {
    return { allowed: true };
  }

  // Check user's verification status
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isVerified: true, role: true },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Admins and moderators are always allowed
  if (user.role >= 1) {
    return { allowed: true };
  }

  // Check if verified
  if (user.isVerified) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Please verify your email address before posting. Check your inbox for the verification link.',
  };
}

/**
 * Check if a user is allowed to create threads.
 * Same logic as posting — can be extended later.
 */
export async function isUserAllowedToCreateThread(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  return isUserAllowedToPost(userId);
}
