'use client';

import { Mail, Server, Lock, AtSign } from 'lucide-react';
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
/*  Email / SMTP — outbound mail delivery configuration. The single    */
/*  home for SMTP credentials; nothing here is duplicated elsewhere.    */
/* ------------------------------------------------------------------ */

const KEYS = [
  'smtp_enabled',
  'smtp_host',
  'smtp_port',
  'smtp_username',
  'smtp_password',
  'smtp_secure',
  'smtp_from_email',
  'smtp_from_name',
];

export default function AdminEmail() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('smtp_enabled', false);

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <Mail className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Email / SMTP</h1>
          <p className="text-xs text-muted-foreground">
            Outbound email for verification, notifications, and password resets.
          </p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'SMTP password is stored in the settings table in plain text — secure it by restricting admin access and using an app-specific password.',
          'Email sending is not yet wired to a transport library in this build; settings are stored but no emails are actually sent.',
          'Without a configured SMTP server, email verification links are surfaced directly in the UI as a fallback (see Verification).',
        ]}
      />

      {/* Master enable + SMTP server card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Server}
          title="SMTP Server"
          description="Connection details for your outbound mail relay."
        />
        <ToggleRow
          label="Enable SMTP email delivery"
          description="Turn on outbound email. When off, the forum skips all email sending."
          checked={enabled}
          onCheckedChange={(c) => setValue('smtp_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={v('smtp_host')}
                  onChange={(e) => setValue('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">SMTP server host (e.g. smtp.gmail.com).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  value={v('smtp_port', '587')}
                  onChange={(e) => setValue('smtp_port', e.target.value)}
                  placeholder="587"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">SMTP port (25, 465, 587, 2525).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-secure">Connection Security</Label>
                <div className="neu-input px-3 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Use TLS/SSL (true for port 465)</span>
                  <Switch
                    checked={parseBool('smtp_secure', false)}
                    onCheckedChange={(c) => setValue('smtp_secure', String(c))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Toggle direct TLS (465) vs STARTTLS (587).</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">SMTP Username</Label>
                <Input
                  id="smtp-username"
                  value={v('smtp_username')}
                  onChange={(e) => setValue('smtp_username', e.target.value)}
                  placeholder="user@example.com"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">SMTP username.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={v('smtp_password')}
                  onChange={(e) => setValue('smtp_password', e.target.value)}
                  placeholder="••••••••••"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">SMTP password (stored in settings).</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* From address card */}
      {enabled && (
        <div className="neu-card p-6 space-y-5">
          <SectionHeader
            icon={AtSign}
            title="From Address"
            description="The name and address that appears in the From header of every email."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-from-email">From Email</Label>
              <Input
                id="smtp-from-email"
                type="email"
                value={v('smtp_from_email')}
                onChange={(e) => setValue('smtp_from_email', e.target.value)}
                placeholder="noreply@example.com"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">From email address.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from-name">From Name</Label>
              <Input
                id="smtp-from-name"
                value={v('smtp_from_name', 'PiForum')}
                onChange={(e) => setValue('smtp_from_name', e.target.value)}
                placeholder="PiForum"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">From display name.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="size-3.5 mt-0.5 shrink-0" />
            <span>
              The password above is stored in plaintext. Restrict admin access and prefer an app-specific
              password over your real account password.
            </span>
          </div>
        </div>
      )}

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Email Settings" />
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
