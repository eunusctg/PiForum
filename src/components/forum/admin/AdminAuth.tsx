'use client';

import {
  KeyRound,
  UserPlus,
  Lock,
  Clock,
  Github,
} from 'lucide-react';
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
/*  Auth Settings — registration, password policy, sessions, and       */
/*  OAuth providers. The single home for auth-related switches.        */
/* ------------------------------------------------------------------ */

const KEYS = [
  'open_registration',
  'allow_username_change',
  'password_require_uppercase',
  'password_require_number',
  'password_require_special',
  'session_timeout',
  'oauth_google_enabled',
  'oauth_google_client_id',
  'oauth_github_enabled',
  'oauth_github_client_id',
];

export default function AdminAuth() {
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
          <KeyRound className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Auth Settings</h1>
          <p className="text-xs text-muted-foreground">Registration, password policy, and OAuth providers.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'OAuth providers (Google/GitHub) require server-side credential configuration and a real OAuth callback handler that is not implemented in this build — toggles are stored but sign-in buttons are not wired.',
          'Password complexity rules are stored but not yet enforced on the registration API (only min length is enforced).',
          'Session timeout is informational only; tokens do not auto-expire server-side in this build.',
        ]}
      />

      {/* Registration */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader icon={UserPlus} title="Registration" description="Control who can create an account." />
        <ToggleRow
          label="Allow New Registrations"
          description="Let visitors create a new account."
          checked={parseBool('open_registration', true)}
          onCheckedChange={(c) => setValue('open_registration', String(c))}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Allow Username Changes"
          description="Let users change their own username from their profile."
          checked={parseBool('allow_username_change', true)}
          onCheckedChange={(c) => setValue('allow_username_change', String(c))}
        />
      </div>

      {/* Password Policy */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader
          icon={Lock}
          title="Password Policy"
          description="Complexity rules applied at registration and password reset."
        />
        <ToggleRow
          label="Require Uppercase Letter"
          description="Passwords must contain at least one A–Z character."
          checked={parseBool('password_require_uppercase', false)}
          onCheckedChange={(c) => setValue('password_require_uppercase', String(c))}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Require Number"
          description="Passwords must contain at least one digit 0–9."
          checked={parseBool('password_require_number', false)}
          onCheckedChange={(c) => setValue('password_require_number', String(c))}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Require Special Character"
          description="Passwords must contain at least one symbol (e.g. !@#$%)."
          checked={parseBool('password_require_special', false)}
          onCheckedChange={(c) => setValue('password_require_special', String(c))}
        />
        <p className="text-xs text-muted-foreground pt-2">
          Minimum password length is configured in Branding → Posting Rules. Only min length is enforced on the
          registration API in this build.
        </p>
      </div>

      {/* Sessions */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Clock} title="Sessions" description="How long a user stays signed in." />
        <div className="space-y-2">
          <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
          <Input
            id="session-timeout"
            type="number"
            min="0"
            value={v('session_timeout', '20160')}
            onChange={(e) => setValue('session_timeout', e.target.value)}
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            Default 20160 = 14 days. Informational only in this build; tokens do not auto-expire server-side.
          </p>
        </div>
      </div>

      {/* OAuth Providers */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={KeyRound}
          title="OAuth Providers"
          description="Enable third-party sign-in. Client IDs are stored here; secrets must be configured server-side."
        />

        {/* Google */}
        <div className="space-y-3">
          <ToggleRow
            label="Enable Google OAuth"
            description="Show a 'Sign in with Google' button on the login modal."
            checked={parseBool('oauth_google_enabled', false)}
            onCheckedChange={(c) => setValue('oauth_google_enabled', String(c))}
          />
          {parseBool('oauth_google_enabled', false) && (
            <div className="space-y-2 pl-1">
              <Label htmlFor="google-client-id">Google OAuth Client ID</Label>
              <Input
                id="google-client-id"
                value={v('oauth_google_client_id')}
                onChange={(e) => setValue('oauth_google_client_id', e.target.value)}
                placeholder="xxxxxx.apps.googleusercontent.com"
                className="neu-input px-3 py-2.5"
              />
            </div>
          )}
        </div>

        <div className="neu-divider" />

        {/* GitHub */}
        <div className="space-y-3">
          <ToggleRow
            label="Enable GitHub OAuth"
            description="Show a 'Sign in with GitHub' button on the login modal."
            checked={parseBool('oauth_github_enabled', false)}
            onCheckedChange={(c) => setValue('oauth_github_enabled', String(c))}
          />
          {parseBool('oauth_github_enabled', false) && (
            <div className="space-y-2 pl-1">
              <Label htmlFor="github-client-id">
                <Github className="size-3.5 inline mr-1" />
                GitHub OAuth Client ID
              </Label>
              <Input
                id="github-client-id"
                value={v('oauth_github_client_id')}
                onChange={(e) => setValue('oauth_github_client_id', e.target.value)}
                placeholder="Iv1.xxxxxxxxxxxxxxxx"
                className="neu-input px-3 py-2.5"
              />
            </div>
          )}
        </div>
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Auth Settings" />
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
