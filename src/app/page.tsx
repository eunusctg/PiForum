'use client';

import ForumShell from '@/components/forum/ForumShell';

export default function Home() {
  // The root `/` route renders the shared ForumShell with the home view as
  // its initial state. ForumShell handles install-check, settings load, auth
  // restore, header/footer chrome, and the full view switch — exactly the
  // same as every other App Router route, so behaviour is identical.
  return <ForumShell initialView="home" />;
}
