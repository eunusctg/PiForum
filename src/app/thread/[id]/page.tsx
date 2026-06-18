'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /thread/[id] — Single thread view with posts.
 * The `id` from the URL is passed to ForumShell as `initialParams.threadId`.
 */
export default function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ForumShell
      initialView="thread"
      initialParams={{ threadId: id }}
    />
  );
}
