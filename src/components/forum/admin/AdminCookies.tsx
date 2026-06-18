'use client';

import { Cookie, PanelTop, PanelBottom, Link2, CalendarClock, ShieldOff } from 'lucide-react';
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
/*  Cookie Consent — GDPR-style banner configuration. The single home  */
/*  for the consent banner message, position, and expiry; nothing here  */
/*  is duplicated elsewhere.                                            */
/* ------------------------------------------------------------------ */

const KEYS = [
  'cookie_consent_enabled',
  'cookie_consent_message',
  'cookie_consent_position',
  'cookie_consent_learn_more_url',
  'essential_only_default',
  'cookie_expiry_days',
];

const POSITIONS = [
  { value: 'top', label: 'Top', desc: 'Banner pinned to the top of the page', icon: PanelTop },
  { value: 'bottom', label: 'Bottom', desc: 'Banner pinned to the bottom of the page', icon: PanelBottom },
] as const;

export default function AdminCookies() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('cookie_consent_enabled', true);

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <Cookie className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Cookie Consent</h1>
          <p className="text-xs text-muted-foreground">GDPR-style cookie consent banner.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'The consent banner is rendered client-side; a brief flash of unstyled content may appear before the banner mounts.',
          'Consent state is stored in a first-party cookie; users who clear cookies will see the banner again.',
          'Essential-only mode does not automatically block third-party scripts — you must gate analytics injection on the consent value.',
        ]}
      />

      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Cookie}
          title="Cookie Consent"
          description="Control whether and how the consent banner is shown to visitors."
        />
        <ToggleRow
          label="Show cookie consent banner"
          description="Display a GDPR-style consent banner to all visitors."
          checked={enabled}
          onCheckedChange={(c) => setValue('cookie_consent_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />

            {/* Consent message */}
            <div className="space-y-2">
              <Label htmlFor="cookie-message">Consent Message</Label>
              <Textarea
                id="cookie-message"
                value={v(
                  'cookie_consent_message',
                  "We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking 'Accept', you consent to our use of cookies."
                )}
                onChange={(e) => setValue('cookie_consent_message', e.target.value)}
                className="neu-input px-3 py-2.5 min-h-[90px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The body text of the consent banner. Keep it short and clear.
              </p>
            </div>

            {/* Position selector (2-button neu-tab) */}
            <div className="space-y-2">
              <Label>Banner Position</Label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((p) => {
                  const active = v('cookie_consent_position', 'bottom') === p.value;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue('cookie_consent_position', p.value)}
                      className={`neu-btn px-3 py-2.5 text-left flex items-start gap-3 ${
                        active ? 'ring-2 ring-primary' : ''
                      }`}
                      aria-pressed={active}
                    >
                      <Icon className="size-4 mt-0.5 shrink-0 text-primary" />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Default: <code>bottom</code>.
              </p>
            </div>

            {/* Learn more URL */}
            <div className="space-y-2">
              <Label htmlFor="cookie-learn-more" className="flex items-center gap-1.5">
                <Link2 className="size-3.5" />
                Learn More URL
              </Label>
              <Input
                id="cookie-learn-more"
                value={v('cookie_consent_learn_more_url')}
                onChange={(e) => setValue('cookie_consent_learn_more_url', e.target.value)}
                placeholder="/page/privacy"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Link to your cookie/privacy policy page (e.g. /page/privacy).
              </p>
            </div>

            {/* Expiry days */}
            <div className="space-y-2">
              <Label htmlFor="cookie-expiry" className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Consent Expiry (days)
              </Label>
              <Input
                id="cookie-expiry"
                type="number"
                min="1"
                value={v('cookie_expiry_days', '365')}
                onChange={(e) => setValue('cookie_expiry_days', e.target.value)}
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Days before consent expires. Default 365.
              </p>
            </div>

            <div className="neu-divider" />

            {/* Essential-only default */}
            <ToggleRow
              label="Default to essential-only cookies"
              description="Require explicit opt-in for analytics. Visitors must re-enable analytics themselves."
              checked={parseBool('essential_only_default', false)}
              onCheckedChange={(c) => setValue('essential_only_default', String(c))}
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldOff className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Essential-only mode only records the user&apos;s preference — you must still gate any
                third-party or analytics scripts on the stored consent value.
              </span>
            </div>
          </>
        )}
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Cookie Settings" />
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
