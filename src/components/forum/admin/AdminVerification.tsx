'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { BadgeCheck, RefreshCw, Check, X, Mail, Loader2, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  useAdminSettings,
  AdminGate,
  SettingsLoadingSkeleton,
  SettingsError,
  SaveBar,
  SectionHeader,
  FlawsCallout,
} from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';

const KEYS = [
  'require_email_verification',
  'verification_expiry_hours',
  'verification_email_subject',
  'verification_email_body',
  'admin_auto_verify_staff',
];

interface SimpleUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

export default function AdminVerification() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin, currentUser } = useAdminSettings();
  const { toast } = useToast();
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [filter, setFilter] = useState<'unverified' | 'all'>('unverified');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users?limit=100');
      const data = await res.json();
      if (data.success) {
        let list: SimpleUser[] = (data.data?.users || data.data || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified ?? false,
          createdAt: u.createdAt,
        }));
        if (filter === 'unverified') list = list.filter((u) => !u.isVerified);
        setUsers(list);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  }, [filter]);

  useEffect(() => {
    if (userIsAdmin) fetchUsers();
  }, [fetchUsers, userIsAdmin]);

  const handleVerify = async (userId: string, unverify = false) => {
    if (!currentUser) return;
    try {
      setActing(userId);
      const res = await fetch('/api/admin/verify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ userId, unverify }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: unverify ? 'Verification Revoked' : 'User Verified',
          description: unverify ? 'The user is no longer verified.' : 'The user is now verified.',
        });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast({ title: 'Action Failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Action Failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setActing(null);
    }
  };

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><BadgeCheck className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Verification System</h1>
          <p className="text-xs text-muted-foreground">Email verification for new accounts.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'When SMTP is not configured, verification links are surfaced directly in the UI instead of being emailed — this defeats the purpose of email verification (anyone with the link can verify).',
          'Verification only confirms that the user clicked a link; it does not prove email ownership if the link is shared.',
          'There is no rate limit on resend requests in this build, which could be abused to spam an inbox once SMTP is configured.',
          'Admin manual verification bypasses email entirely and is logged but not reversible from the user side.',
        ]}
      />

      {/* Settings */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={BadgeCheck} title="Verification Settings" description="Control how email verification works." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Require Email Verification</Label>
            <p className="text-xs text-muted-foreground">New users must verify their email before they can post.</p>
          </div>
          <Switch checked={parseBool('require_email_verification', false)} onCheckedChange={(c) => setValue('require_email_verification', String(c))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry">Verification Link Expiry (hours)</Label>
          <Input id="expiry" type="number" min="1" value={v('verification_expiry_hours', '24')} onChange={(e) => setValue('verification_expiry_hours', e.target.value)} className="neu-input px-3 py-2.5" />
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Auto-verify Staff</Label>
            <p className="text-xs text-muted-foreground">Automatically verify accounts created by admins for staff.</p>
          </div>
          <Switch checked={parseBool('admin_auto_verify_staff', false)} onCheckedChange={(c) => setValue('admin_auto_verify_staff', String(c))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Verification Email Subject</Label>
          <Input id="subject" value={v('verification_email_subject', 'Verify your email')} onChange={(e) => setValue('verification_email_subject', e.target.value)} className="neu-input px-3 py-2.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Verification Email Body</Label>
          <textarea
            id="body"
            value={v('verification_email_body', 'Click the link below to verify your email: {{verify_link}}')}
            onChange={(e) => setValue('verification_email_body', e.target.value)}
            className="neu-input px-3 py-2.5 min-h-[90px] resize-none w-full rounded-xl"
          />
          <p className="text-xs text-muted-foreground">Use <code className="font-mono">{'{{verify_link}}'}</code> as the placeholder for the verification URL.</p>
        </div>
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Verification Settings" />

      {/* Unverified users */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <SectionHeader icon={ShieldAlert} title="Pending Verifications" description="Manually verify users or revoke verification." />
          <div className="flex items-center gap-2">
            <div className="neu-well p-1 flex">
              <button onClick={() => setFilter('unverified')} className={`px-3 py-1.5 text-xs rounded-lg ${filter === 'unverified' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>Unverified</button>
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs rounded-lg ${filter === 'all' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>All</button>
            </div>
            <button onClick={fetchUsers} className="neu-btn px-3 py-1.5 text-xs flex items-center gap-1.5">
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : users.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {filter === 'unverified' ? 'No unverified users. Everyone is verified!' : 'No users found.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scroll">
            {users.map((u) => (
              <div key={u.id} className="neu-card-inset p-3 flex items-center gap-3">
                <Avatar className="size-9 neu-circle">
                  {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.username} /> : null}
                  <AvatarFallback className="text-xs font-semibold">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    {u.displayName || u.username}
                    {u.isVerified && <BadgeCheck className="size-3.5 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="size-3" />{u.email}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {u.isVerified ? (
                    <button onClick={() => handleVerify(u.id, true)} disabled={acting === u.id} className="neu-btn px-2.5 py-1.5 text-xs flex items-center gap-1">
                      {acting === u.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />} Revoke
                    </button>
                  ) : (
                    <button onClick={() => handleVerify(u.id, false)} disabled={acting === u.id} className="neu-btn px-2.5 py-1.5 text-xs flex items-center gap-1 bg-primary text-primary-foreground">
                      {acting === u.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
