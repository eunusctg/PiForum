'use client';

import { DatabaseBackup, Download, Loader2, ShieldCheck } from 'lucide-react';
import { AdminGate, FlawsCallout, SectionHeader } from '@/components/forum/admin/shared';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function AdminBackup() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    if (!currentUser) return;
    try {
      setDownloading(true);
      const res = await fetch('/api/backup', { headers: { 'x-user-id': currentUser.id } });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast({ title: 'Backup Failed', description: data?.error || 'Server error', variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.replace(/"/g, '') || `piforum-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Backup Downloaded', description: 'Your JSON snapshot has been saved.' });
    } catch {
      toast({ title: 'Backup Failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (!isAdmin()) return <AdminGate />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><DatabaseBackup className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Backup</h1>
          <p className="text-xs text-muted-foreground">Export your forum data for safe-keeping or migration.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'The backup is a JSON snapshot only — it does not include the SQLite database file itself or uploaded attachments.',
          'There is no automated scheduled backup; you must trigger exports manually or set up a cron job externally.',
          'Restoring from this JSON is not automated; re-importing requires a custom script that is not included in this build.',
          'Password hashes are intentionally excluded for security, so a restore would require all users to reset their passwords.',
          'Large forums may hit memory/time limits during export since the entire dataset is serialized in one request.',
        ]}
      />

      <div className="neu-card p-6 space-y-4">
        <SectionHeader icon={Download} title="Export Data" description="Download a complete JSON snapshot of your forum." />
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
          <li>Users (without password hashes), categories, forums, threads, posts</li>
          <li>Tags, pages, rules, ranks, settings (excluding password_* keys)</li>
          <li>Reports, notifications, bookmarks, polls</li>
        </ul>
        <button
          onClick={handleExport}
          disabled={downloading}
          className="neu-btn px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {downloading ? 'Generating...' : 'Download Backup (JSON)'}
        </button>
      </div>

      <div className="neu-card p-6 space-y-3">
        <SectionHeader icon={ShieldCheck} title="Restore" description="Restoring from a backup is not yet automated." />
        <p className="text-xs text-muted-foreground">
          To restore, place the forum in maintenance mode, then use a script to re-insert the JSON
          records via Prisma. Keep backups in a secure, off-site location. Consider scheduling a
          daily export via a server cron job that hits <code className="font-mono">GET /api/backup</code> with
          an admin token.
        </p>
      </div>
    </div>
  );
}
