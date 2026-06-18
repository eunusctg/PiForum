'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  BadgeCheck,
  RefreshCw,
  Check,
  X,
  Mail,
  Loader2,
  ShieldAlert,
  Phone,
  IdCard,
  Clock,
  Gauge,
  Award,
  Filter,
  Users as UsersIcon,
  Activity,
  KeyRound,
} from 'lucide-react';
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
import VerifiedIcon from '@/components/forum/VerifiedIcon';
import VerifiedBadge from '@/components/forum/VerifiedBadge';

/* All setting keys managed by this panel — saved atomically via /api/settings. */
const KEYS = [
  // Email verification
  'require_email_verification',
  'verification_expiry_hours',
  'verification_email_subject',
  'verification_email_body',
  'admin_auto_verify_staff',
  // Resend & rate limiting
  'verification_resend_cooldown_minutes',
  'verification_max_resends',
  // Phone / OTP verification
  'enable_phone_verification',
  'phone_otp_length',
  'phone_otp_expiry_minutes',
  'phone_otp_provider',
  // ID / document verification
  'enable_id_verification',
  'id_allowed_types',
  'id_review_mode',
  // Verified badge
  'verified_badge_enabled',
  'verified_badge_text',
  'verified_badge_color',
  // Action requirements (which actions require a verified account)
  'require_verified_to_post',
  'require_verified_to_thread',
  'require_verified_to_vote',
  'require_verified_to_message',
  'require_verified_to_link',
];

interface SimpleUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  role: number;
  createdAt: string;
}

interface VerificationStats {
  total: number;
  verified: number;
  unverified: number;
  pending: number;
  rate: number;
}

export default function AdminVerification() {
  const { values, setValue, setMany, save, loading, error, saving, refetch, userIsAdmin, currentUser } = useAdminSettings();
  const { toast } = useToast();
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [filter, setFilter] = useState<'unverified' | 'all'>('unverified');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [stats, setStats] = useState<VerificationStats>({ total: 0, verified: 0, unverified: 0, pending: 0, rate: 0 });

  /* Default values for every numeric/text key. When a key has never been
     saved, the form shows these defaults — but on save the underlying value
     is still empty. We merge these defaults into the values before saving so
     untouched fields persist as their displayed default rather than ''. */
  const DEFAULTS: Record<string, string> = {
    verification_expiry_hours: '24',
    verification_resend_cooldown_minutes: '5',
    verification_max_resends: '5',
    verification_email_subject: 'Verify your email',
    verification_email_body: 'Click the link below to verify your email: {{verify_link}}',
    phone_otp_length: '6',
    phone_otp_expiry_minutes: '10',
    phone_otp_provider: 'none',
    id_allowed_types: 'passport,drivers_license,national_id',
    id_review_mode: 'manual',
    verified_badge_text: 'Verified',
    verified_badge_color: 'primary',
  };

  const handleSave = useCallback(async () => {
    if (!currentUser) return;
    // Build the entries to save, filling empty values with their defaults so
    // the persisted value matches what the admin sees in the form.
    const entries = KEYS.map((k) => {
      const raw = values[k] ?? '';
      const val = raw === '' ? (DEFAULTS[k] ?? '') : raw;
      return { key: k, value: val };
    });
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ settings: entries }),
      });
      const data = await res.json();
      if (data.success) {
        // Sync local values state with what we just saved (so defaults stick).
        const merged: Record<string, string> = { ...values };
        entries.forEach((e) => { merged[e.key] = e.value; });
        setMany(merged);
        toast({ title: 'Settings Saved', description: 'Verification settings have been applied.' });
      } else {
        toast({ title: 'Save Failed', description: data.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Save Failed', description: 'Network error', variant: 'destructive' });
    }
  }, [currentUser, values, toast, setMany]);

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users?limit=100', {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        let list: SimpleUser[] = (data.data?.users || data.data || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified ?? false,
          role: u.role ?? 0,
          createdAt: u.createdAt,
        }));
        // Derive stats from the full list before filtering
        const total = list.length;
        const verified = list.filter((u) => u.isVerified).length;
        setStats({
          total,
          verified,
          unverified: total - verified,
          pending: 0,
          rate: total ? Math.round((verified / total) * 100) : 0,
        });
        if (filter === 'unverified') list = list.filter((u) => !u.isVerified);
        setUsers(list);
      }
    } catch {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  }, [filter, currentUser]);

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

  const handleBulkVerify = async () => {
    if (!currentUser) return;
    const unverified = users.filter((u) => !u.isVerified);
    if (unverified.length === 0) {
      toast({ title: 'Nothing to do', description: 'No unverified users in the current list.' });
      return;
    }
    try {
      setActing('bulk');
      let ok = 0;
      for (const u of unverified) {
        const res = await fetch('/api/admin/verify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
          body: JSON.stringify({ userId: u.id }),
        });
        if (res.ok) ok++;
      }
      toast({
        title: 'Bulk Verification Complete',
        description: `Verified ${ok} of ${unverified.length} users.`,
      });
      fetchUsers();
    } catch {
      toast({ title: 'Bulk Action Failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setActing(null);
    }
  };

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const num = (k: string, def: number) => {
    const n = parseInt(v(k, String(def)), 10);
    return Number.isFinite(n) ? n : def;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><VerifiedIcon size="lg" /></div>
        <div>
          <h1 className="text-xl font-bold">User Verification System</h1>
          <p className="text-xs text-muted-foreground">Email, phone (OTP), ID review, verified badges & action requirements.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'When SMTP is not configured, verification links are surfaced directly in the UI instead of being emailed — this defeats the purpose of email verification (anyone with the link can verify).',
          'Phone OTP verification in this build is simulated: the OTP is returned in the API response and shown in the UI. A real SMS provider (e.g. Twilio) is required for genuine phone verification.',
          'ID/document verification is a manual admin-review queue only. There is no automated identity provider (Persona, Stripe Identity, Onfido) integration — the admin must visually inspect and approve.',
          'There is no rate limit on resend requests enforced server-side in this build (the cooldown here is advisory); a malicious client can bypass it. Enforce limits at the API or edge in production.',
          'Admin manual verification bypasses email entirely and is logged but not reversible from the user side.',
          'Verified badges are cosmetic and do not cryptographically prove identity — they can be spoofed in screenshots.',
        ]}
      />

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="neu-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><UsersIcon className="size-3.5" /> Total Users</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="neu-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BadgeCheck className="size-3.5 text-emerald-500" /> Verified</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.verified}</div>
        </div>
        <div className="neu-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldAlert className="size-3.5 text-amber-500" /> Unverified</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unverified}</div>
        </div>
        <div className="neu-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-3.5 text-primary" /> Verification Rate</div>
          <div className="text-2xl font-bold text-primary">{stats.rate}%</div>
        </div>
      </div>

      {/* ============ Email Verification ============ */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Mail} title="Email Verification" description="Require new users to verify their email address before participating." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Require Email Verification</Label>
            <p className="text-xs text-muted-foreground">New users must verify their email before they can post.</p>
          </div>
          <Switch checked={parseBool('require_email_verification', false)} onCheckedChange={(c) => setValue('require_email_verification', String(c))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry" className="flex items-center gap-1.5"><Clock className="size-3.5" /> Link Expiry (hours)</Label>
            <Input id="expiry" type="number" min="1" value={v('verification_expiry_hours', '24')} onChange={(e) => setValue('verification_expiry_hours', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cooldown" className="flex items-center gap-1.5"><Gauge className="size-3.5" /> Resend Cooldown (minutes)</Label>
            <Input id="cooldown" type="number" min="0" value={v('verification_resend_cooldown_minutes', '5')} onChange={(e) => setValue('verification_resend_cooldown_minutes', e.target.value)} className="neu-input px-3 py-2.5" />
            <p className="text-xs text-muted-foreground">0 = no cooldown (not recommended).</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxresend">Max Resend Attempts (per pending window)</Label>
          <Input id="maxresend" type="number" min="1" value={v('verification_max_resends', '5')} onChange={(e) => setValue('verification_max_resends', e.target.value)} className="neu-input px-3 py-2.5" />
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

      {/* ============ Phone / OTP Verification ============ */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Phone} title="Phone (OTP) Verification" description="Optional one-time-passcode verification via SMS. Requires an SMS provider." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Enable Phone Verification</Label>
            <p className="text-xs text-muted-foreground">Ask users to verify a phone number with an OTP code.</p>
          </div>
          <Switch checked={parseBool('enable_phone_verification', false)} onCheckedChange={(c) => setValue('enable_phone_verification', String(c))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="otplen">OTP Length (digits)</Label>
            <Input id="otplen" type="number" min="4" max="8" value={v('phone_otp_length', '6')} onChange={(e) => setValue('phone_otp_length', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otpexp">OTP Expiry (minutes)</Label>
            <Input id="otpexp" type="number" min="1" value={v('phone_otp_expiry_minutes', '10')} onChange={(e) => setValue('phone_otp_expiry_minutes', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otpprov">SMS Provider</Label>
            <select
              id="otpprov"
              value={v('phone_otp_provider', 'none')}
              onChange={(e) => setValue('phone_otp_provider', e.target.value)}
              className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent"
            >
              <option value="none">None (simulated)</option>
              <option value="twilio">Twilio</option>
              <option value="vonage">Vonage / Nexmo</option>
              <option value="messagebird">MessageBird</option>
            </select>
          </div>
        </div>
        <div className="neu-card-inset p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <span>When the provider is <strong>None</strong>, OTPs are shown in the UI for development — never enable this on a live site. Enter provider credentials in <strong>System → Backup</strong> (or via environment variables) once a real provider is selected.</span>
        </div>
      </div>

      {/* ============ ID / Document Verification ============ */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={IdCard} title="ID / Document Verification" description="Optional manual review of government-issued ID for high-trust accounts." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Enable ID Verification</Label>
            <p className="text-xs text-muted-foreground">Allow users to submit an ID document for admin review.</p>
          </div>
          <Switch checked={parseBool('enable_id_verification', false)} onCheckedChange={(c) => setValue('enable_id_verification', String(c))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="idtypes">Allowed Document Types</Label>
          <Input id="idtypes" value={v('id_allowed_types', 'passport,drivers_license,national_id')} onChange={(e) => setValue('id_allowed_types', e.target.value)} className="neu-input px-3 py-2.5" />
          <p className="text-xs text-muted-foreground">Comma-separated list. Submitted documents appear in the pending queue below for manual approval.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="idmode">Review Mode</Label>
          <select
            id="idmode"
            value={v('id_review_mode', 'manual')}
            onChange={(e) => setValue('id_review_mode', e.target.value)}
            className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent"
          >
            <option value="manual">Manual (admin reviews each)</option>
            <option value="auto_approve">Auto-approve on upload (not recommended)</option>
            <option value="disabled">Disabled — collect only, no review</option>
          </select>
        </div>
      </div>

      {/* ============ Verified Badge ============ */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Award} title="Verified Badge" description="Stunning seal-style badge shown next to verified users' names across the site." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label>Show Verified Badge</Label>
            <p className="text-xs text-muted-foreground">Display a badge next to verified users' names.</p>
          </div>
          <Switch checked={parseBool('verified_badge_enabled', true)} onCheckedChange={(c) => setValue('verified_badge_enabled', String(c))} />
        </div>

        {/* Live preview — shows the actual stunning badge in all sizes */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Award className="size-3.5" /> Live Preview
          </div>
          {/* Inline label preview (as it appears next to a username on profile pages) */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">{v('verified_badge_text', 'Verified') === 'Verified' ? 'Ada Lovelace' : 'Sample User'}</span>
            <VerifiedBadge size="md" showLabel force />
          </div>
          {/* Icon-only sizes preview */}
          <div className="flex items-center gap-5 flex-wrap pt-1">
            <div className="flex flex-col items-center gap-1.5">
              <VerifiedIcon size="xs" variant={v('verified_badge_color', 'primary') === 'gold' ? 'gold' : v('verified_badge_color', 'primary') === 'green' ? 'emerald' : 'default'} />
              <span className="text-[10px] text-muted-foreground">xs</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <VerifiedIcon size="sm" variant={v('verified_badge_color', 'primary') === 'gold' ? 'gold' : v('verified_badge_color', 'primary') === 'green' ? 'emerald' : 'default'} />
              <span className="text-[10px] text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <VerifiedIcon size="md" variant={v('verified_badge_color', 'primary') === 'gold' ? 'gold' : v('verified_badge_color', 'primary') === 'green' ? 'emerald' : 'default'} />
              <span className="text-[10px] text-muted-foreground">md</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <VerifiedIcon size="lg" variant={v('verified_badge_color', 'primary') === 'gold' ? 'gold' : v('verified_badge_color', 'primary') === 'green' ? 'emerald' : 'default'} />
              <span className="text-[10px] text-muted-foreground">lg (animated)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <VerifiedIcon size="xl" variant={v('verified_badge_color', 'primary') === 'gold' ? 'gold' : v('verified_badge_color', 'primary') === 'green' ? 'emerald' : 'default'} />
              <span className="text-[10px] text-muted-foreground">xl (animated)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">The lg/xl sizes include a subtle shimmer sweep. Hover any badge to see the lift effect.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="badgetext">Badge Text</Label>
            <Input id="badgetext" value={v('verified_badge_text', 'Verified')} onChange={(e) => setValue('verified_badge_text', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="badgecolor">Badge Color</Label>
            <select
              id="badgecolor"
              value={v('verified_badge_color', 'primary')}
              onChange={(e) => setValue('verified_badge_color', e.target.value)}
              className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent"
            >
              <option value="primary">Primary (theme)</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="gold">Gold</option>
              <option value="purple">Purple</option>
            </select>
          </div>
        </div>
      </div>

      {/* ============ Action Requirements ============ */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={KeyRound} title="Action Requirements" description="Require a verified account to perform specific actions. Toggles are advisory unless enforced in each API route." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'require_verified_to_post', label: 'Post replies', desc: 'Must be verified to reply in threads.' },
            { key: 'require_verified_to_thread', label: 'Create threads', desc: 'Must be verified to start new threads.' },
            { key: 'require_verified_to_vote', label: 'Vote on posts', desc: 'Must be verified to upvote/downvote.' },
            { key: 'require_verified_to_message', label: 'Send messages', desc: 'Must be verified to DM other users.' },
            { key: 'require_verified_to_link', label: 'Post links', desc: 'Must be verified to include URLs in posts.' },
          ].map((row) => (
            <div key={row.key} className="neu-card-inset p-3 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm">{row.label}</Label>
                <p className="text-xs text-muted-foreground truncate">{row.desc}</p>
              </div>
              <Switch checked={parseBool(row.key, false)} onCheckedChange={(c) => setValue(row.key, String(c))} />
            </div>
          ))}
        </div>
      </div>

      <SaveBar saving={saving} onSave={handleSave} saveLabel="Save Verification Settings" />

      {/* ============ Pending Verifications ============ */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <SectionHeader icon={ShieldAlert} title="Pending Verifications" description="Manually verify users or revoke verification." />
          <div className="flex items-center gap-2">
            <div className="neu-well p-1 flex">
              <button onClick={() => setFilter('unverified')} className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${filter === 'unverified' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>
                <Filter className="size-3" /> Unverified
              </button>
              <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs rounded-lg ${filter === 'all' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>All</button>
            </div>
            <button onClick={fetchUsers} className="neu-btn px-3 py-1.5 text-xs flex items-center gap-1.5">
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>
        </div>

        {filter === 'unverified' && users.length > 0 && (
          <button
            onClick={handleBulkVerify}
            disabled={acting === 'bulk'}
            className="neu-btn px-4 py-2 text-xs font-medium flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            {acting === 'bulk' ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Verify All ({users.length})
          </button>
        )}

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
                    {u.isVerified && <VerifiedIcon size="sm" />}
                    {u.role >= 2 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">STAFF</span>}
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
