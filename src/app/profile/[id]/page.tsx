'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /profile/[id] — Public profile for a user.
 * ProfileView reads `viewParams.userId` (falling back to the current user's
 * id), so we sync the store with the id from the URL.
 */
export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ForumShell
      initialView="profile"
      initialParams={{ userId: id }}
    />
  );
}
