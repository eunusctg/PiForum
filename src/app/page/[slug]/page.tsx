'use client';

import { use } from 'react';
import ForumShell from '@/components/forum/ForumShell';

/**
 * /page/[slug] — renders a static CMS page (About, Privacy, Terms, etc.)
 * managed via Content → Pages in the admin panel.
 */
export default function StaticPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <ForumShell initialView="page" initialParams={{ pageSlug: slug }} />;
}
