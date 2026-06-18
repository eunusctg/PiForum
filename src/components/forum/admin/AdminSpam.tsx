'use client';

import { ShieldAlert, Ban, Link2, UserX, KeyRound, ShieldCheck } from 'lucide-react';
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
/*  Spam Protection — word filters, link limits, and anti-spam         */
/*  services (Akismet / reCAPTCHA). The single home for all of it.     */
/* ------------------------------------------------------------------ */

const KEYS = [
  'spam_filter_enabled',
  'banned_words',
  'link_limit_per_post',
  'new_user_link_restriction',
  'new_user_post_moderation',
  'akismet_enabled',
  'akismet_key',
  'recaptcha_enabled',
  'recaptcha_site_key',
  'recaptcha_secret_key',
];

export default function AdminSpam() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('spam_filter_enabled', true);
  const akismetEnabled = parseBool('akismet_enabled', false);
  const recaptchaEnabled = parseBool('recaptcha_enabled', false);

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <ShieldAlert className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Spam Protection</h1>
          <p className="text-xs text-muted-foreground">Filters, link limits, and anti-spam services.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Banned-word filtering uses simple substring matching; it does not catch obfuscations (e.g. sp4m, s.p.a.m).',
          'Akismet and reCAPTCHA are not wired to their APIs in this build; keys are stored only.',
          'New-user link restrictions are stored but not enforced on the post creation API in this build.',
        ]}
      />

      {/* Master enable + content filters card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Ban}
          title="Content Filters"
          description="Word bans and per-post link limits applied to new submissions."
        />
        <ToggleRow
          label="Enable spam filtering"
          description="Master switch for all content-level spam filters below."
          checked={enabled}
          onCheckedChange={(c) => setValue('spam_filter_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />
            <div className="space-y-2">
              <Label htmlFor="banned-words">Banned Words</Label>
              <Textarea
                id="banned-words"
                value={v('banned_words')}
                onChange={(e) => setValue('banned_words', e.target.value)}
                placeholder={'spam, casino, viagra'}
                className="neu-input px-3 py-2.5 min-h-[90px] resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Banned words (censored in posts). Separate with commas or newlines.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link-limit">Max Links Per Post</Label>
              <Input
                id="link-limit"
                type="number"
                min="0"
                value={v('link_limit_per_post', '3')}
                onChange={(e) => setValue('link_limit_per_post', e.target.value)}
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Max links allowed per post (0 = unlimited).
              </p>
            </div>
          </>
        )}
      </div>

      {/* New-user restrictions */}
      {enabled && (
        <div className="neu-card p-6 space-y-1">
          <SectionHeader
            icon={UserX}
            title="New User Restrictions"
            description="Extra friction for accounts that have not built up trust yet."
          />
          <ToggleRow
            label="Block links from new users"
            description="Block links from users with fewer than 5 posts."
            checked={parseBool('new_user_link_restriction', true)}
            onCheckedChange={(c) => setValue('new_user_link_restriction', String(c))}
          />
          <div className="neu-divider my-1" />
          <ToggleRow
            label="Hold new-user posts for moderation"
            description="Queue posts from new users for moderator approval before they appear."
            checked={parseBool('new_user_post_moderation', false)}
            onCheckedChange={(c) => setValue('new_user_post_moderation', String(c))}
          />
          <div className="flex items-start gap-2 pt-3 text-xs text-muted-foreground">
            <Link2 className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Stored but not enforced on the post creation API in this build. Wire these checks into your
              <code className="mx-1">/api/posts</code> validation before relying on them.
            </span>
          </div>
        </div>
      )}

      {/* Akismet */}
      {enabled && (
        <div className="neu-card p-6 space-y-5">
          <SectionHeader
            icon={KeyRound}
            title="Akismet"
            description="Cloud spam-checking service for submitted posts."
          />
          <ToggleRow
            label="Use Akismet for spam checks"
            description="Send post content to Akismet for a spam verdict before publishing."
            checked={akismetEnabled}
            onCheckedChange={(c) => setValue('akismet_enabled', String(c))}
          />
          {akismetEnabled && (
            <div className="space-y-2">
              <Label htmlFor="akismet-key">Akismet API Key</Label>
              <Input
                id="akismet-key"
                type="password"
                value={v('akismet_key')}
                onChange={(e) => setValue('akismet_key', e.target.value)}
                placeholder="xxxxxxxxxxxx"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Akismet API key. Get one at akismet.com. Not wired to the API in this build.
              </p>
            </div>
          )}
        </div>
      )}

      {/* reCAPTCHA */}
      {enabled && (
        <div className="neu-card p-6 space-y-5">
          <SectionHeader
            icon={ShieldCheck}
            title="reCAPTCHA"
            description="Bot protection on the registration form."
          />
          <ToggleRow
            label="Use reCAPTCHA on registration"
            description="Require a reCAPTCHA challenge before a new account is created."
            checked={recaptchaEnabled}
            onCheckedChange={(c) => setValue('recaptcha_enabled', String(c))}
          />
          {recaptchaEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recaptcha-site-key">reCAPTCHA Site Key</Label>
                <Input
                  id="recaptcha-site-key"
                  value={v('recaptcha_site_key')}
                  onChange={(e) => setValue('recaptcha_site_key', e.target.value)}
                  placeholder="6Lcxxxxxxxxxxxxxxx"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">Public site key embedded in the page.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recaptcha-secret-key">reCAPTCHA Secret Key</Label>
                <Input
                  id="recaptcha-secret-key"
                  type="password"
                  value={v('recaptcha_secret_key')}
                  onChange={(e) => setValue('recaptcha_secret_key', e.target.value)}
                  placeholder="6Lcxxxxxxxxxxxxxxx"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">Server-side secret key. Not wired to the API in this build.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Spam Settings" />
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
