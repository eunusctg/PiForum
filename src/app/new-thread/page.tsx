'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /new-thread — Create a new thread.
 * Optional `?forumId=...` query param pre-selects the forum.
 * NewThread takes `forumId` as a prop (read from the store's viewParams by
 * the SPA switch in ForumShell), so we sync the store with the query value.
 */
export default function NewThreadPage({
  searchParams,
}: {
  searchParams: Promise<{ forumId?: string }>;
}) {
  const { forumId } = use(searchParams);
  return (
    <ForumShell
      initialView="new-thread"
      initialParams={forumId ? { forumId } : {}}
    />
  );
}
