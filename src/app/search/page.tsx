'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /search — Full-text search across threads, posts, users, tags.
 * Optional `?q=...` query param runs an initial search.
 * SearchView reads `viewParams.q` from the store, so we sync it here.
 */
export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = use(searchParams);
  return (
    <ForumShell
      initialView="search"
      initialParams={q ? { q } : {}}
    />
  );
}
