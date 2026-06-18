'use client';

import { DollarSign, Megaphone, CreditCard, Code2, PanelTop, PanelBottom, Sidebar, BetweenHorizontalStart } from 'lucide-react';
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
/*  Monetization — advertising and subscription revenue. The single     */
/*  home for ad provider/slot config and subscription pricing; nothing  */
/*  here is duplicated elsewhere.                                       */
/* ------------------------------------------------------------------ */

const KEYS = [
  'ads_enabled',
  'ads_provider',
  'ads_client_id',
  'ads_header_slot',
  'ads_footer_slot',
  'ads_between_posts',
  'ads_sidebar_slot',
  'subscriptions_enabled',
  'subscription_currency',
  'subscription_price',
  'subscription_stripe_key',
];

const PROVIDERS = [
  { value: 'adsense', label: 'AdSense', desc: 'Google AdSense publisher ID', icon: Megaphone },
  { value: 'custom', label: 'Custom', desc: 'Your own ad network / HTML', icon: Code2 },
] as const;

export default function AdminMonetization() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const adsEnabled = parseBool('ads_enabled', false);
  const subsEnabled = parseBool('subscriptions_enabled', false);

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <DollarSign className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Monetization</h1>
          <p className="text-xs text-muted-foreground">Advertising and subscription revenue.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Ad slots are injected as placeholder containers; a real ad network script (AdSense) is not loaded in this build.',
          'Subscriptions require a Stripe integration that is not implemented; the price and key are stored only.',
          'Ad blockers will prevent ads from rendering regardless of these settings.',
        ]}
      />

      {/* Ads card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Megaphone}
          title="Advertising"
          description="Inject ad slots across the forum. Slots are placeholder containers in this build."
        />
        <ToggleRow
          label="Enable advertising"
          description="Show ad slots in the header, footer, sidebar, and between posts."
          checked={adsEnabled}
          onCheckedChange={(c) => setValue('ads_enabled', String(c))}
        />

        {adsEnabled && (
          <>
            <div className="neu-divider" />

            {/* Provider selector (2-button neu-tab) */}
            <div className="space-y-2">
              <Label>Ad Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => {
                  const active = v('ads_provider', 'adsense') === p.value;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue('ads_provider', p.value)}
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
                Default: <code>adsense</code>.
              </p>
            </div>

            {/* Client ID */}
            <div className="space-y-2">
              <Label htmlFor="ads-client-id">AdSense Publisher ID</Label>
              <Input
                id="ads-client-id"
                value={v('ads_client_id')}
                onChange={(e) => setValue('ads_client_id', e.target.value)}
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX). Required for AdSense.
              </p>
            </div>

            {/* Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ads-header-slot" className="flex items-center gap-1.5">
                  <PanelTop className="size-3.5" />
                  Header Slot ID
                </Label>
                <Input
                  id="ads-header-slot"
                  value={v('ads_header_slot')}
                  onChange={(e) => setValue('ads_header_slot', e.target.value)}
                  placeholder="1234567890"
                  className="neu-input px-3 py-2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ads-footer-slot" className="flex items-center gap-1.5">
                  <PanelBottom className="size-3.5" />
                  Footer Slot ID
                </Label>
                <Input
                  id="ads-footer-slot"
                  value={v('ads_footer_slot')}
                  onChange={(e) => setValue('ads_footer_slot', e.target.value)}
                  placeholder="1234567890"
                  className="neu-input px-3 py-2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ads-sidebar-slot" className="flex items-center gap-1.5">
                  <Sidebar className="size-3.5" />
                  Sidebar Slot ID
                </Label>
                <Input
                  id="ads-sidebar-slot"
                  value={v('ads_sidebar_slot')}
                  onChange={(e) => setValue('ads_sidebar_slot', e.target.value)}
                  placeholder="1234567890"
                  className="neu-input px-3 py-2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ads-between-posts" className="flex items-center gap-1.5">
                  <BetweenHorizontalStart className="size-3.5" />
                  Ad Every N Posts
                </Label>
                <Input
                  id="ads-between-posts"
                  type="number"
                  min="0"
                  value={v('ads_between_posts', '0')}
                  onChange={(e) => setValue('ads_between_posts', e.target.value)}
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Show an ad every N posts (0 = off).
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscriptions card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={CreditCard}
          title="Subscriptions"
          description="Paid subscription plans. Stripe integration is not implemented in this build."
        />
        <ToggleRow
          label="Enable paid subscriptions"
          description="Offer a paid subscription tier to your members."
          checked={subsEnabled}
          onCheckedChange={(c) => setValue('subscriptions_enabled', String(c))}
        />

        {subsEnabled && (
          <>
            <div className="neu-divider" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sub-currency">Currency</Label>
                <Input
                  id="sub-currency"
                  value={v('subscription_currency', 'USD')}
                  onChange={(e) => setValue('subscription_currency', e.target.value)}
                  placeholder="USD"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Currency code (USD, EUR, …).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-price">Monthly Price</Label>
                <Input
                  id="sub-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={v('subscription_price', '4.99')}
                  onChange={(e) => setValue('subscription_price', e.target.value)}
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">
                  Monthly subscription price in the selected currency.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-stripe-key">Stripe Publishable Key</Label>
              <Input
                id="sub-stripe-key"
                value={v('subscription_stripe_key')}
                onChange={(e) => setValue('subscription_stripe_key', e.target.value)}
                placeholder="pk_live_xxxxxxxxxxxxxxxx"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Stripe publishable key. Secret keys must be configured server-side.
              </p>
            </div>
          </>
        )}
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Monetization Settings" />
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
