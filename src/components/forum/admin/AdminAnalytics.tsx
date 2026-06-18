'use client';

import { BarChart3, Globe, ShieldCheck, UserCheck, Cookie } from 'lucide-react';
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
/*  Analytics — traffic tracking integration. The single home for      */
/*  provider selection and privacy toggles; not duplicated elsewhere.  */
/* ------------------------------------------------------------------ */

const KEYS = [
  'analytics_enabled',
  'analytics_provider',
  'analytics_id',
  'analytics_script_url',
  'analytics_anonymize_ip',
  'analytics_track_admins',
  'analytics_cookieless',
];

const PROVIDERS = [
  { value: 'google', label: 'Google', desc: 'GA4 (G-XXXXXXXXXX)' },
  { value: 'plausible', label: 'Plausible', desc: 'Hosted / self-hosted' },
  { value: 'matomo', label: 'Matomo', desc: 'Self-hosted script' },
  { value: 'custom', label: 'Custom', desc: 'Your own script URL' },
] as const;

export default function AdminAnalytics() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('analytics_enabled', false);
  const provider = v('analytics_provider', 'google');
  const showScriptUrl = provider === 'matomo' || provider === 'custom';

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <BarChart3 className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-xs text-muted-foreground">Traffic tracking integration.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Analytics scripts are injected via a client component in this build; server-side rendering may briefly delay first paint.',
          'Google Analytics 4 requires a valid Measurement ID; without it the script loads but reports nothing.',
          'IP anonymization depends on the provider\'s support and is not guaranteed for custom scripts.',
        ]}
      />

      {/* Master enable + provider selection */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Globe}
          title="Tracking Provider"
          description="Pick your analytics backend and enter its identifier."
        />
        <ToggleRow
          label="Enable analytics tracking"
          description="Inject the chosen provider's tracking script across the forum."
          checked={enabled}
          onCheckedChange={(c) => setValue('analytics_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROVIDERS.map((p) => {
                  const active = provider === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue('analytics_provider', p.value)}
                      className={`neu-btn px-3 py-2.5 text-left flex flex-col gap-0.5 ${
                        active ? 'ring-2 ring-primary' : ''
                      }`}
                      aria-pressed={active}
                    >
                      <span className="text-sm font-semibold">{p.label}</span>
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Default: <code>google</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="analytics-id">
                  {provider === 'plausible' ? 'Plausible Domain' : 'Google Measurement ID'}
                </Label>
                <Input
                  id="analytics-id"
                  value={v('analytics_id')}
                  onChange={(e) => setValue('analytics_id', e.target.value)}
                  placeholder={provider === 'plausible' ? 'forum.example.com' : 'G-XXXXXXXXXX'}
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Google Measurement ID (G-XXXXXXXXXX) or Plausible domain.
                </p>
              </div>

              {showScriptUrl && (
                <div className="space-y-2">
                  <Label htmlFor="analytics-script-url">Custom Script URL</Label>
                  <Input
                    id="analytics-script-url"
                    type="url"
                    value={v('analytics_script_url')}
                    onChange={(e) => setValue('analytics_script_url', e.target.value)}
                    placeholder="https://matomo.example.com/js/container_xxx.js"
                    className="neu-input px-3 py-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom script URL (for Matomo/custom).
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Privacy toggles */}
      {enabled && (
        <div className="neu-card p-6 space-y-1">
          <SectionHeader
            icon={ShieldCheck}
            title="Privacy & Tracking"
            description="Control how visitor data is collected."
          />
          <ToggleRow
            label="Anonymize visitor IPs"
            description="Strip the last octet of visitor IPs before storage (provider-dependent)."
            checked={parseBool('analytics_anonymize_ip', true)}
            onCheckedChange={(c) => setValue('analytics_anonymize_ip', String(c))}
          />
          <div className="neu-divider my-1" />
          <ToggleRow
            label="Track admin page views"
            description="Include admin panel visits in analytics. Off by default to keep noise out."
            checked={parseBool('analytics_track_admins', false)}
            onCheckedChange={(c) => setValue('analytics_track_admins', String(c))}
          />
          <div className="neu-divider my-1" />
          <ToggleRow
            label="Use cookieless tracking"
            description="Privacy-friendly mode that avoids setting cookies (provider-dependent)."
            checked={parseBool('analytics_cookieless', false)}
            onCheckedChange={(c) => setValue('analytics_cookieless', String(c))}
          />
          <div className="flex items-start gap-2 pt-3 text-xs text-muted-foreground">
            <Cookie className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Cookieless and IP anonymization rely on the provider honoring the flag; custom scripts
              may ignore these settings entirely.
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <UserCheck className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Admin tracking is off by default so your own visits don't skew dashboard counts.
            </span>
          </div>
        </div>
      )}

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Analytics Settings" />
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
