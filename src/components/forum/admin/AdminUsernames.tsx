'use client';

import { AtSign, Ban, Regex, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
/*  Username Rules — reserved names, allowed pattern, change limits.   */
/*  NOTE: `allow_username_change` lives in AdminAuth; this panel does  */
/*  NOT duplicate it.                                                  */
/* ------------------------------------------------------------------ */

const KEYS = [
  'reserved_usernames',
  'username_pattern',
  'username_change_cooldown',
  'username_require_rotation',
];

export default function AdminUsernames() {
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
          <AtSign className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Username Rules</h1>
          <p className="text-xs text-muted-foreground">Reserved names, allowed patterns, and change limits.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Username pattern regex is stored but not yet enforced on the registration API.',
          'Username change cooldown is not enforced server-side in this build.',
        ]}
      />

      {/* Reserved usernames */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Ban}
          title="Reserved Usernames"
          description="Names that cannot be registered by new users."
        />
        <div className="space-y-2">
          <Label htmlFor="reserved-usernames">Reserved Usernames (comma-separated)</Label>
          <Textarea
            id="reserved-usernames"
            value={v('reserved_usernames')}
            onChange={(e) => setValue('reserved_usernames', e.target.value)}
            placeholder="admin, root, support, moderator"
            className="neu-input px-3 py-2.5 min-h-[90px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated, case-insensitive. Matching is checked against the lowercased username.
          </p>
        </div>
      </div>

      {/* Allowed pattern */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Regex}
          title="Allowed Pattern"
          description="Restrict which characters a username may contain."
        />
        <div className="space-y-2">
          <Label htmlFor="username-pattern">Username Pattern (regex)</Label>
          <Input
            id="username-pattern"
            value={v('username_pattern')}
            onChange={(e) => setValue('username_pattern', e.target.value)}
            placeholder="Leave empty for default [a-zA-Z0-9_]"
            className="neu-input px-3 py-2.5 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Stored but not yet enforced on the registration API in this build.
          </p>
        </div>
      </div>

      {/* Change limits */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader
          icon={History}
          title="Change Limits"
          description="Throttle how often users can rename themselves."
        />
        <div className="space-y-2 py-2">
          <Label htmlFor="username-change-cooldown">Username Change Cooldown (days)</Label>
          <Input
            id="username-change-cooldown"
            type="number"
            min="0"
            value={v('username_change_cooldown', '30')}
            onChange={(e) => setValue('username_change_cooldown', e.target.value)}
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            Days between username changes. Use 0 for no limit. Not enforced server-side in this build.
          </p>
        </div>
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Require Username Rotation"
          description="Prevent users from reusing a previous username they have already held."
          checked={parseBool('username_require_rotation', false)}
          onCheckedChange={(c) => setValue('username_require_rotation', String(c))}
        />
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Username Rules" />
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
