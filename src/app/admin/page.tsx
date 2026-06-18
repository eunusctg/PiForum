'use client';

import ForumShell from '@/components/forum/ForumShell';

/**
 * /admin — Admin Dashboard
 * Direct URL access to the admin overview. The ForumShell will sync the
 * store's currentView to 'admin-dashboard' on mount and render
 * <AdminDashboard /> via the SPA switch.
 */
export default function AdminPage() {
  return <ForumShell initialView="admin-dashboard" />;
}
