'use client';

import { LogIn, Clock, ShieldAlert, KeySquare, BellRing } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useAdminSettings,
  AdminGate,
  SettingsLoadingSkeleton,
  SettingsError,
  SaveBar,
  SectionHeader,
  FlawsCallout,
} from '@/components/forum/admin/shared';

/* ------------------------------------------------------------------ */
/*  Login Settings — remember-me, brute-force lockout, 2FA, and        */
/*  new-device login notifications. The single home for login-flow     */
/*  switches.                                                          */
/* ------------------------------------------------------------------ */

const KEYS = [
  'remember_me_enabled',
  'remember_me_duration',
  'max_login_attempts',
  'lockout_duration',
  'enable_2fa',
  'require_2fa_admins',
  'login_notification_email',
];

export default function AdminLogin() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <LogIn className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Login Settings</h1>
          <p className="text-xs text-muted-foreground">Sessions, brute-force protection, and 2FA.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Brute-force lockout is stored but not enforced on the login API in this build.',
          '2FA (TOTP) enrollment and verification are not implemented; toggles are stored only.',
          'New-device login emails require a configured SMTP server (see Email / SMTP).',
        ]}
      />

      {/* Remember Me */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Clock}
          title="Remember Me"
          description="Let users stay signed in across browser restarts."
        />
        <ToggleRow
          label="Allow 'Remember Me'"
          description="Show a 'Remember me' checkbox on the login modal."
          checked={parseBool('remember_me_enabled', true)}
          onCheckedChange={(c) => setValue('remember_me_enabled', String(c))}
        />
        {parseBool('remember_me_enabled', true) && (
          <div className="space-y-2">
            <Label htmlFor="remember-me-duration">Remember-Me Duration (days)</Label>
            <Input
              id="remember-me-duration"
              type="number"
              min="1"
              value={v('remember_me_duration', '30')}
              onChange={(e) => setValue('remember_me_duration', e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">
              How long a remembered session cookie stays valid. Default 30 days.
            </p>
          </div>
        )}
      </div>

      {/* Brute-Force Protection */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={ShieldAlert}
          title="Brute-Force Protection"
          description="Lock accounts after repeated failed login attempts."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max-login-attempts">Max Failed Login Attempts</Label>
            <Input
              id="max-login-attempts"
              type="number"
              min="1"
              value={v('max_login_attempts', '5')}
              onChange={(e) => setValue('max_login_attempts', e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Failed attempts before lockout triggers.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
            <Input
              id="lockout-duration"
              type="number"
              min="0"
              value={v('lockout_duration', '15')}
              onChange={(e) => setValue('lockout_duration', e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">How long the account stays locked.</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Stored but not enforced on the login API in this build.
        </p>
      </div>

      {/* Two-Factor Auth */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader
          icon={KeySquare}
          title="Two-Factor Auth"
          description="Optional TOTP-based 2FA (not yet implemented in this build)."
        />
        <ToggleRow
          label="Allow 2FA"
          description="Let users enable two-factor authentication (TOTP) on their account."
          checked={parseBool('enable_2fa', false)}
          onCheckedChange={(c) => setValue('enable_2fa', String(c))}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Require 2FA for Admins"
          description="Force administrators to enroll in 2FA before accessing the admin panel."
          checked={parseBool('require_2fa_admins', false)}
          onCheckedChange={(c) => setValue('require_2fa_admins', String(c))}
        />
      </div>

      {/* Notifications */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader
          icon={BellRing}
          title="Notifications"
          description="Email alerts sent on suspicious activity."
        />
        <ToggleRow
          label="New-Device Login Email"
          description="Email users when their account is signed in from a new device. Requires SMTP."
          checked={parseBool('login_notification_email', false)}
          onCheckedChange={(c) => setValue('login_notification_email', String(c))}
        />
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Login Settings" />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
