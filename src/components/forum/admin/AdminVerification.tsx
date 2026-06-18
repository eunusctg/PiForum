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
  Smartphone,
  MessageCircle,
  Send,
  QrCode,
  Lock,
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
  // Phone / OTP verification (legacy single-provider field)
  'enable_phone_verification',
  'phone_otp_length',
  'phone_otp_expiry_minutes',
  'phone_otp_provider',
  // TOTP (Time-based OTP / authenticator apps)
  'enable_totp',
  'totp_issuer',
  'totp_period',
  'totp_digits',
  // WhatsApp Cloud API OTP
  'enable_whatsapp_otp',
  'whatsapp_phone_number_id',
  'whatsapp_access_token',
  'whatsapp_api_version',
  // Telegram Bot API OTP
  'enable_telegram_otp',
  'telegram_bot_token',
  'telegram_bot_username',
  // Email OTP (code-based, distinct from link-based email verification)
  'enable_email_otp',
  'email_otp_subject',
  'email_from_address',
  // Shared OTP settings
  'otp_code_length',
  'otp_expiry_minutes',
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
  verifiedAt: string | null;
  role: number;
  postCount: number;
  threadCount: number;
  reputation: number;
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
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [filter, setFilter] = useState<'unverified' | 'all'>('unverified');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [verifiedSearch, setVerifiedSearch] = useState('');
  const [stats, setStats] = useState<VerificationStats>({ total: 0, verified: 0, unverified: 0, pending: 0, rate: 0 });

  /* All currently-verified users, optionally filtered by the directory search box. */
  const verifiedUsers = allUsers.filter((u) => u.isVerified);
  const filteredVerified = verifiedUsers.filter((u) => {
    if (!verifiedSearch.trim()) return true;
    const q = verifiedSearch.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q)
    );
  });

  /* Human-readable "verified X ago" / "verified on Y" label. */
  const formatVerifiedAt = (iso: string | null): string => {
    if (!iso) return 'Verified';
    try {
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const days = Math.floor(diff / 86400000);
      if (days < 1) {
        const hrs = Math.floor(diff / 3600000);
        if (hrs < 1) {
          const mins = Math.floor(diff / 60000);
          return mins < 1 ? 'Verified just now' : `Verified ${mins}m ago`;
        }
        return `Verified ${hrs}h ago`;
      }
      if (days < 30) return `Verified ${days}d ago`;
      return `Verified on ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Verified';
    }
  };

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
    // TOTP defaults
    totp_issuer: 'PiForum',
    totp_period: '30',
    totp_digits: '6',
    // WhatsApp defaults
    whatsapp_api_version: 'v18.0',
    // Telegram defaults (no bot username by default)
    telegram_bot_username: '',
    // Email OTP defaults
    email_otp_subject: 'Your PiForum verification code',
    email_from_address: 'noreply@piforum.com',
    // Shared OTP defaults
    otp_code_length: '6',
    otp_expiry_minutes: '10',
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
        const list: SimpleUser[] = (data.data?.users || data.data || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          isVerified: u.isVerified ?? false,
          verifiedAt: u.verifiedAt ?? null,
          role: u.role ?? 0,
          postCount: u.postCount ?? 0,
          threadCount: u.threadCount ?? 0,
          reputation: u.reputation ?? 0,
          createdAt: u.createdAt,
        }));
        // Keep the full list for the Verified Users Directory
        setAllUsers(list);
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
        let display = list;
        if (filter === 'unverified') display = display.filter((u) => !u.isVerified);
        setUsers(display);
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
        // Update both the pending list and the full directory list in-place
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isVerified: !unverify, verifiedAt: unverify ? null : new Date().toISOString() } : u)));
        // Refresh stats locally
        setStats((prev) => {
          const delta = unverify ? -1 : 1;
          const newVerified = Math.max(0, prev.verified + delta);
          return {
            ...prev,
            verified: newVerified,
            unverified: prev.total - newVerified,
            rate: prev.total ? Math.round((newVerified / prev.total) * 100) : 0,
          };
        });
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
          'TOTP secrets are stored in plaintext in the database. In production they should be encrypted at rest with a KMS or app-level AES key derived from an environment variable.',
          'WhatsApp & Telegram OTP delivery is real (calls the live Meta/Telegram APIs) but only works when valid credentials are entered here. With no credentials, the code is returned in the API response for sandbox testing.',
          'Email OTP dispatch is stubbed — it returns the code in the API response instead of actually sending email until the SMTP transport in src/lib/email.ts is wired to the Email-SMTP admin settings.',
          'TOTP backup codes are hashed with SHA-256 (good) but there is no rate limit on backup-code consumption attempts (a 1/10000 guess per request is feasible if an attacker has the session).',
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

      {/* ============ Verified Users Directory ============ */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <SectionHeader
            icon={Award}
            title="Verified Users Directory"
            description="All users who currently hold the verified badge. Search, inspect, or revoke verification."
          />
          <div className="flex items-center gap-2">
            <div className="neu-well px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
              <VerifiedIcon size="sm" />
              <span>{verifiedUsers.length} verified</span>
            </div>
            <button onClick={fetchUsers} className="neu-btn px-3 py-1.5 text-xs flex items-center gap-1.5">
              <RefreshCw className="size-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Search box */}
        <div className="relative">
          <Filter className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={verifiedSearch}
            onChange={(e) => setVerifiedSearch(e.target.value)}
            placeholder="Search verified users by name, username, or email…"
            className="neu-input pl-9 py-2.5"
          />
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : filteredVerified.length === 0 ? (
          <div className="neu-card-inset p-8 text-center space-y-2">
            <div className="flex justify-center"><div className="neu-circle p-3 opacity-60"><VerifiedIcon size="lg" variant="mono" /></div></div>
            <div className="text-sm font-medium">
              {verifiedUsers.length === 0 ? 'No verified users yet' : 'No matches for your search'}
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {verifiedUsers.length === 0
                ? 'Verify users from the “Pending Verifications” list at the bottom of this page to populate this directory.'
                : 'Try a different name, username, or email.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[28rem] overflow-y-auto custom-scroll pr-1">
            {filteredVerified.map((u) => (
              <div key={u.id} className="neu-card-inset p-4 space-y-3 group hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="size-11 neu-circle">
                      {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.username} /> : null}
                      <AvatarFallback className="text-xs font-semibold">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {/* Stunning verified badge pinned to the avatar corner */}
                    <span className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
                      <VerifiedIcon size="md" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {u.displayName || u.username}
                      {u.role >= 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold shrink-0">
                          {u.role >= 3 ? 'SUPER' : 'STAFF'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{u.email}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Clock className="size-3" />
                    {formatVerifiedAt(u.verifiedAt)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span title="Threads"><span className="font-semibold text-foreground">{u.threadCount}</span> t</span>
                    <span title="Posts"><span className="font-semibold text-foreground">{u.postCount}</span> p</span>
                    <span title="Reputation"><span className="font-semibold text-foreground">{u.reputation}</span> rep</span>
                  </div>
                </div>
                <button
                  onClick={() => handleVerify(u.id, true)}
                  disabled={acting === u.id}
                  className="neu-btn w-full px-3 py-1.5 text-xs flex items-center justify-center gap-1.5 text-destructive hover:text-destructive"
                >
                  {acting === u.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                  Revoke Verification
                </button>
              </div>
            ))}
          </div>
        )}
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

      {/* ============ OTP & Authenticator Apps ============ */}
      <div className="neu-card p-6 space-y-6">
        <SectionHeader
          icon={Smartphone}
          title="OTP & Authenticator Apps"
          description="Time-based OTP (Google Authenticator, Authy) plus WhatsApp, Telegram & Email code delivery. All channels are free or have generous free tiers."
        />

        {/* Provider channel status grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'enable_totp', icon: Smartphone, label: 'TOTP', desc: 'Authenticator apps', color: 'text-blue-500' },
            { key: 'enable_whatsapp_otp', icon: MessageCircle, label: 'WhatsApp', desc: 'Cloud API · 1k/mo free', color: 'text-emerald-500' },
            { key: 'enable_telegram_otp', icon: Send, label: 'Telegram', desc: 'Bot API · free, no limits', color: 'text-cyan-500' },
            { key: 'enable_email_otp', icon: Mail, label: 'Email OTP', desc: 'SendGrid 100/day free', color: 'text-amber-500' },
          ].map((ch) => (
            <div key={ch.key} className={`neu-card-inset p-3 space-y-1 ${parseBool(ch.key, false) ? 'ring-1 ring-primary/30' : ''}`}>
              <div className="flex items-center gap-1.5">
                <ch.icon className={`size-4 ${ch.color}`} />
                <span className="text-sm font-semibold">{ch.label}</span>
                {parseBool(ch.key, false) && <span className="ml-auto size-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">{ch.desc}</p>
            </div>
          ))}
        </div>

        {/* ---- TOTP (Time-based OTP / authenticator apps) ---- */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-blue-500" />
            <h3 className="text-sm font-semibold">TOTP — Authenticator Apps</h3>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">RECOMMENDED</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Time-based One-Time Passwords work with Google Authenticator, Authy, 1Password, Microsoft Authenticator, and any RFC 6238 app.
            No SMS fees, works offline, and is the most secure non-hardware 2FA. Powered by <code className="font-mono">otplib</code>.
          </p>
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-0.5">
              <Label>Enable TOTP Verification</Label>
              <p className="text-xs text-muted-foreground">Allow users to set up an authenticator app for 2FA / verification.</p>
            </div>
            <Switch checked={parseBool('enable_totp', false)} onCheckedChange={(c) => setValue('enable_totp', String(c))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totpissuer" className="flex items-center gap-1.5"><Award className="size-3.5" /> Issuer Name</Label>
              <Input id="totpissuer" value={v('totp_issuer', 'PiForum')} onChange={(e) => setValue('totp_issuer', e.target.value)} className="neu-input px-3 py-2.5" placeholder="PiForum" />
              <p className="text-xs text-muted-foreground">Shown in the user's authenticator app above their username.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totpperiod" className="flex items-center gap-1.5"><Clock className="size-3.5" /> Step Period (seconds)</Label>
              <Input id="totpperiod" type="number" min="15" max="120" value={v('totp_period', '30')} onChange={(e) => setValue('totp_period', e.target.value)} className="neu-input px-3 py-2.5" />
              <p className="text-xs text-muted-foreground">30s is standard. Longer = more convenience, less security.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totpdigits" className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> Code Digits</Label>
              <select
                id="totpdigits"
                value={v('totp_digits', '6')}
                onChange={(e) => setValue('totp_digits', e.target.value)}
                className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent"
              >
                <option value="6">6 digits (standard)</option>
                <option value="8">8 digits (higher security)</option>
              </select>
            </div>
          </div>
          {/* QR preview placeholder */}
          <div className="flex items-center gap-4 neu-well p-4 rounded-xl">
            <div className="size-16 rounded-lg bg-white flex items-center justify-center shrink-0">
              <QrCode className="size-10 text-gray-400" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-semibold flex items-center gap-1.5"><Lock className="size-3 text-emerald-500" /> RFC 6238 compliant</div>
              <p className="text-xs text-muted-foreground">When a user enables TOTP, a QR code is generated on-the-fly from their unique secret + these settings. Users scan it with any authenticator app — no per-app configuration needed.</p>
            </div>
          </div>
        </div>

        {/* ---- WhatsApp Cloud API OTP ---- */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">WhatsApp Cloud API</h3>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">1,000 FREE / MONTH</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Send OTP codes via WhatsApp using Meta's official Cloud API. Free tier includes 1,000 conversations per month.
            <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Get credentials →</a>
          </p>
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-0.5">
              <Label>Enable WhatsApp OTP</Label>
              <p className="text-xs text-muted-foreground">Users can receive verification codes via WhatsApp.</p>
            </div>
            <Switch checked={parseBool('enable_whatsapp_otp', false)} onCheckedChange={(c) => setValue('enable_whatsapp_otp', String(c))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="waphid">Phone Number ID</Label>
              <Input id="waphid" value={v('whatsapp_phone_number_id', '')} onChange={(e) => setValue('whatsapp_phone_number_id', e.target.value)} className="neu-input px-3 py-2.5 font-mono text-xs" placeholder="123456789012345" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wapiver">API Version</Label>
              <Input id="wapiver" value={v('whatsapp_api_version', 'v18.0')} onChange={(e) => setValue('whatsapp_api_version', e.target.value)} className="neu-input px-3 py-2.5" placeholder="v18.0" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="watoken">Access Token</Label>
              <Input id="watoken" type="password" value={v('whatsapp_access_token', '')} onChange={(e) => setValue('whatsapp_access_token', e.target.value)} className="neu-input px-3 py-2.5 font-mono text-xs" placeholder="EAAG..." />
              <p className="text-xs text-muted-foreground">Generate a permanent access token in Meta App → WhatsApp → API Setup.</p>
            </div>
          </div>
        </div>

        {/* ---- Telegram Bot API OTP ---- */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-cyan-500" />
            <h3 className="text-sm font-semibold">Telegram Bot API</h3>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold">FREE · NO LIMITS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Send OTP codes via your own Telegram bot. Completely free with no monthly limits. Users must start a chat with the bot first (the bot's username is shown on the verification page).
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Create a bot with @BotFather →</a>
          </p>
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-0.5">
              <Label>Enable Telegram OTP</Label>
              <p className="text-xs text-muted-foreground">Users can receive verification codes via your Telegram bot.</p>
            </div>
            <Switch checked={parseBool('enable_telegram_otp', false)} onCheckedChange={(c) => setValue('enable_telegram_otp', String(c))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tgtoken">Bot Token</Label>
              <Input id="tgtoken" type="password" value={v('telegram_bot_token', '')} onChange={(e) => setValue('telegram_bot_token', e.target.value)} className="neu-input px-3 py-2.5 font-mono text-xs" placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tguser">Bot Username (shown to users)</Label>
              <Input id="tguser" value={v('telegram_bot_username', '')} onChange={(e) => setValue('telegram_bot_username', e.target.value)} className="neu-input px-3 py-2.5" placeholder="PiForumVerifyBot" />
              <p className="text-xs text-muted-foreground">Without the @ prefix. Users will be told to message this bot.</p>
            </div>
          </div>
        </div>

        {/* ---- Email OTP ---- */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Email OTP</h3>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">100 FREE / DAY</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Send a one-time code to the user's email (distinct from link-based email verification). Works with any SMTP server or transactional provider (SendGrid free tier: 100 emails/day).
            Configure SMTP credentials in <strong>Auth & Communication → Email-SMTP</strong>.
          </p>
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-0.5">
              <Label>Enable Email OTP</Label>
              <p className="text-xs text-muted-foreground">Users can receive a 6-digit code via email instead of a verification link.</p>
            </div>
            <Switch checked={parseBool('enable_email_otp', false)} onCheckedChange={(c) => setValue('enable_email_otp', String(c))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eotpsubj">Email Subject</Label>
              <Input id="eotpsubj" value={v('email_otp_subject', 'Your PiForum verification code')} onChange={(e) => setValue('email_otp_subject', e.target.value)} className="neu-input px-3 py-2.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="efrom">From Address</Label>
              <Input id="efrom" type="email" value={v('email_from_address', 'noreply@piforum.com')} onChange={(e) => setValue('email_from_address', e.target.value)} className="neu-input px-3 py-2.5" />
            </div>
          </div>
        </div>

        {/* ---- Shared OTP settings ---- */}
        <div className="neu-card-inset p-5 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Shared OTP Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="otpclen" className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> OTP Code Length</Label>
              <Input id="otpclen" type="number" min="4" max="8" value={v('otp_code_length', '6')} onChange={(e) => setValue('otp_code_length', e.target.value)} className="neu-input px-3 py-2.5" />
              <p className="text-xs text-muted-foreground">Applies to WhatsApp, Telegram, and Email OTP (not TOTP).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otpexpmin" className="flex items-center gap-1.5"><Clock className="size-3.5" /> OTP Expiry (minutes)</Label>
              <Input id="otpexpmin" type="number" min="1" value={v('otp_expiry_minutes', '10')} onChange={(e) => setValue('otp_expiry_minutes', e.target.value)} className="neu-input px-3 py-2.5" />
              <p className="text-xs text-muted-foreground">How long a code stays valid after being sent.</p>
            </div>
          </div>
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
