'use client';

import ForumShell from '@/components/forum/ForumShell';

/**
 * /bookmarks — Logged-in user's bookmarked threads.
 * Login required — BookmarksView itself redirects to the auth modal if no
 * current user, so we just render the shell.
 */
export default function BookmarksPage() {
  return <ForumShell initialView="bookmarks" />;
}
