'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /forum/[id] — Thread list for a specific forum.
 * The `id` from the URL is passed to ForumShell as `initialParams.forumId`
 * so that <ThreadList forumId=... /> renders the right forum.
 */
export default function ForumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ForumShell
      initialView="forum"
      initialParams={{ forumId: id }}
    />
  );
}
