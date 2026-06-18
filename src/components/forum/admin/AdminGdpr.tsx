'use client';

import { ShieldCheck, FileText, CalendarClock, Mail, Download, UserX, ScrollText } from 'lucide-react';
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
/*  GDPR & Privacy — data protection compliance tools. The single home  */
/*  for retention policy, export/deletion toggles, DPO contact, and     */
/*  access logging; nothing here is duplicated elsewhere.               */
/* ------------------------------------------------------------------ */

const KEYS = [
  'gdpr_enabled',
  'gdpr_policy_url',
  'gdpr_data_retention_days',
  'gdpr_allow_export',
  'gdpr_allow_deletion',
  'gdpr_dpo_email',
  'gdpr_log_access',
];

export default function AdminGdpr() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('gdpr_enabled', true);

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">GDPR &amp; Privacy</h1>
          <p className="text-xs text-muted-foreground">Data protection compliance tools.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Data export generates a JSON snapshot of the user\'s threads/posts/profile; attachments and votes are not included in this build.',
          'Account deletion soft-deletes the user (marks banned) rather than hard-deleting records, to preserve thread integrity.',
          'Data retention auto-purge is not scheduled in this build; the setting is stored for documentation.',
        ]}
      />

      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={ShieldCheck}
          title="GDPR Compliance"
          description="Enable data protection features and configure your privacy policy."
        />
        <ToggleRow
          label="Enable GDPR compliance features"
          description="Expose data export, deletion, and policy links to your users."
          checked={enabled}
          onCheckedChange={(c) => setValue('gdpr_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />

            {/* Policy URL */}
            <div className="space-y-2">
              <Label htmlFor="gdpr-policy-url" className="flex items-center gap-1.5">
                <FileText className="size-3.5" />
                Privacy / Data Policy URL
              </Label>
              <Input
                id="gdpr-policy-url"
                value={v('gdpr_policy_url')}
                onChange={(e) => setValue('gdpr_policy_url', e.target.value)}
                placeholder="/page/privacy"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                URL to your privacy/data policy (e.g. /page/privacy).
              </p>
            </div>

            {/* Retention days */}
            <div className="space-y-2">
              <Label htmlFor="gdpr-retention" className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Data Retention (days)
              </Label>
              <Input
                id="gdpr-retention"
                type="number"
                min="0"
                value={v('gdpr_data_retention_days', '365')}
                onChange={(e) => setValue('gdpr_data_retention_days', e.target.value)}
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Days to retain user data (0 = forever). Default 365. Auto-purge is not scheduled in this build.
              </p>
            </div>

            {/* DPO email */}
            <div className="space-y-2">
              <Label htmlFor="gdpr-dpo-email" className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                Data Protection Officer Email
              </Label>
              <Input
                id="gdpr-dpo-email"
                type="email"
                value={v('gdpr_dpo_email')}
                onChange={(e) => setValue('gdpr_dpo_email', e.target.value)}
                placeholder="dpo@example.com"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Contact email shown to users who want to exercise their data rights.
              </p>
            </div>
          </>
        )}
      </div>

      {/* User rights toggles */}
      {enabled && (
        <div className="neu-card p-6 space-y-1">
          <SectionHeader
            icon={ScrollText}
            title="User Rights"
            description="Let users act on their own data."
          />
          <ToggleRow
            label="Allow data export (JSON)"
            description="Let users export their data as a JSON download."
            checked={parseBool('gdpr_allow_export', true)}
            onCheckedChange={(c) => setValue('gdpr_allow_export', String(c))}
          />
          <div className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
            <Download className="size-3.5 mt-0.5 shrink-0" />
            <span>
              The export contains threads, posts, and profile fields. Attachments and votes are not included.
            </span>
          </div>
          <div className="neu-divider my-1" />
          <ToggleRow
            label="Allow account deletion"
            description="Let users request account deletion. Records are soft-deleted to preserve thread integrity."
            checked={parseBool('gdpr_allow_deletion', true)}
            onCheckedChange={(c) => setValue('gdpr_allow_deletion', String(c))}
          />
          <div className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
            <UserX className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Deletion marks the user as banned rather than removing records, so existing threads stay intact.
            </span>
          </div>
          <div className="neu-divider my-1" />
          <ToggleRow
            label="Log data-access events"
            description="Log all data-access events for audit (e.g. profile views, exports)."
            checked={parseBool('gdpr_log_access', false)}
            onCheckedChange={(c) => setValue('gdpr_log_access', String(c))}
          />
        </div>
      )}

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save GDPR Settings" />
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
