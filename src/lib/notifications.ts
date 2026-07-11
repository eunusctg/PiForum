import { db } from '@/lib/db';

/**
 * Notification types supported by the system.
 * Each type has a distinct icon and color in the UI.
 */
export type NotificationType =
  | 'reply'
  | 'mention'
  | 'like'
  | 'follow'
  | 'login'
  | 'system'
  | 'welcome'
  | 'vote'
  | 'bookmark'
  | 'report';

/**
 * Create a notification for a user and optionally attempt a push notification.
 *
 * This is the SINGLE place to create notifications from any API route.
 * It also checks the user's notification preferences before creating.
 *
 * @param params.userId    Recipient user ID
 * @param params.actorId   User ID of the person who triggered the action (optional)
 * @param params.type      Notification type (reply, mention, like, etc.)
 * @param params.title     Short title shown in the notification list
 * @param params.body      Optional longer body text
 * @param params.link      Optional URL/path the user can navigate to
 * @returns The created notification record (with actor attached) or null if skipped
 */
export async function createNotification(params: {
  userId: string;
  actorId?: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  link?: string;
}): Promise<any | null> {
  const { userId, actorId, type, title, body, link } = params;

  // Don't notify yourself (e.g., replying to your own thread)
  if (actorId && actorId === userId) return null;

  // Check user notification preferences
  const prefKey = `notif_${type}`;
  const pref = await db.userSetting.findUnique({
    where: { userId_key: { userId, key: prefKey } },
  });
  // If the user explicitly disabled this type, skip
  if (pref && pref.value === 'disabled') return null;

  // Create the notification in DB
  const notification = await db.notification.create({
    data: {
      userId,
      actorId: actorId || null,
      type,
      title,
      ...(body && { body }),
      ...(link && { link }),
    },
  });

  // Resolve actor info for the response
  let actor = null;
  if (actorId) {
    const actorUser = await db.user.findUnique({
      where: { id: actorId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    actor = actorUser;
  }

  // Attempt push notification if the user has an FCM token
  try {
    const fcmSetting = await db.userSetting.findUnique({
      where: { userId_key: { userId, key: 'fcm_token' } },
    });
    if (fcmSetting && fcmSetting.value) {
      // Check if push notifications are enabled for this user
      const pushPref = await db.userSetting.findUnique({
        where: { userId_key: { userId, key: 'notif_push' } },
      });
      if (pushPref && pushPref.value === 'disabled') {
        // Push disabled for this user, skip
      } else {
        // We could send push here via /api/push/send, but to avoid
        // circular API calls from server-side code, we'll rely on the
        // FCM HTTP v1 API being called from the push/send endpoint.
        // For now, the in-app notification is created and the client
        // will show it. Push delivery will be handled by a background
        // job or admin action.
      }
    }
  } catch {
    // Non-critical — in-app notification already created
  }

  return { ...notification, actor };
}

/**
 * Create a login notification with new-device detection.
 *
 * @param userId   The user who just logged in
 * @param ip       Client IP address
 * @param userAgent Client User-Agent string
 * @returns Whether this is a new device (for the caller to know)
 */
export async function createLoginNotification(
  userId: string,
  ip: string,
  userAgent: string,
): Promise<{ isNewDevice: boolean }> {
  // Check last login IP and user-agent
  const lastIpSetting = await db.userSetting.findUnique({
    where: { userId_key: { userId, key: 'last_login_ip' } },
  });
  const lastUaSetting = await db.userSetting.findUnique({
    where: { userId_key: { userId, key: 'last_login_ua' } },
  });

  const lastIp = lastIpSetting?.value || '';
  const lastUa = lastUaSetting?.value || '';

  const isNewDevice = lastIp !== '' && (lastIp !== ip || lastUa !== userAgent);

  // Update the stored values
  await db.userSetting.upsert({
    where: { userId_key: { userId, key: 'last_login_ip' } },
    update: { value: ip },
    create: { userId, key: 'last_login_ip', value: ip },
  });
  await db.userSetting.upsert({
    where: { userId_key: { userId, key: 'last_login_ua' } },
    update: { value: userAgent },
    create: { userId, key: 'last_login_ua', value: userAgent },
  });

  // Create the notification
  if (isNewDevice) {
    await createNotification({
      userId,
      type: 'login',
      title: 'New device login detected',
      body: `Your account was logged in from a new device (IP: ${ip}). If this wasn't you, please change your password immediately.`,
      link: '/profile/' + userId,
    });
  } else {
    await createNotification({
      userId,
      type: 'login',
      title: 'New login detected',
      body: `Your account was logged in from ${ip === 'unknown' ? 'an unknown location' : `IP: ${ip}`}. If this wasn't you, please change your password.`,
      link: '/profile/' + userId,
    });
  }

  return { isNewDevice };
}

/**
 * Create a welcome notification for a newly registered user.
 */
export async function createWelcomeNotification(userId: string, forumName: string): Promise<void> {
  await createNotification({
    userId,
    type: 'welcome',
    title: `Welcome to ${forumName}!`,
    body: 'Your account has been created successfully. Start by exploring the forums and introducing yourself!',
    link: '/',
  });
}
