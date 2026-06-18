'use client';

import ForumShell from '@/components/forum/ForumShell';

/**
 * /notifications — Logged-in user's notification inbox.
 * Login required — NotificationsView handles the unauthenticated case itself.
 */
export default function NotificationsPage() {
  return <ForumShell initialView="notifications" />;
}
