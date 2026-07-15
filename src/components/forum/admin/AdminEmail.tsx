'use client';

import { useState } from 'react';
import { Mail, Server, Lock, AtSign, Send, Loader2, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  useAdminSettings,
  AdminGate,
  SettingsLoadingSkeleton,
  SettingsError,
  SaveBar,
  SectionHeader,
} from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Email Settings — outbound mail delivery configuration. The single  */
/*  home for email provider credentials; nothing here is duplicated.   */
/* ------------------------------------------------------------------ */

const PROVIDERS = [
  { value: 'cloudflare-send', label: 'Cloudflare Send Email (Native)' },
  { value: 'cloudflare', label: 'Cloudflare (MailChannels)' },
  { value: 'resend', label: 'Resend' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'mailgun', label: 'Mailgun' },
] as const;

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
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin, currentUser } = useAdminSettings();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;
  const enabled = parseBool('smtp_enabled', false);
  const provider = v('smtp_host') || 'cloudflare';

  const handleProviderChange = (val: string) => {
    setValue('smtp_host', val);
    // Clear fields that aren't relevant when switching provider
    if (val === 'cloudflare' || val === 'cloudflare-send') {
      setValue('smtp_password', '');
      setValue('smtp_username', '');
      setValue('smtp_port', '');
      setValue('smtp_secure', 'false');
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !currentUser) return;
    setSendingTest(true);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Test email sent', description: `A test email was sent to ${testEmail}.` });
      } else {
        toast({
          title: 'Test email failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Test email failed', description: 'Network error', variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title header */}
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">
          <Mail className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Email Settings</h1>
          <p className="text-xs text-muted-foreground">
            Outbound email for verification, notifications, and password resets.
          </p>
        </div>
      </div>

      {/* Master enable + Provider card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Server}
          title="Email Provider"
          description="Choose and configure your outbound email provider."
        />
        <ToggleRow
          label="Enable email delivery"
          description="Turn on outbound email. When off, the forum skips all email sending."
          checked={enabled}
          onCheckedChange={(c) => setValue('smtp_enabled', String(c))}
        />

        {enabled && (
          <>
            <div className="neu-divider" />
            <div className="space-y-4">
              {/* Provider dropdown */}
              <div className="space-y-2">
                <Label htmlFor="email-provider">Provider</Label>
                <select
                  id="email-provider"
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="neu-input px-3 py-2.5 w-full bg-transparent text-sm appearance-none cursor-pointer"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Select your email delivery provider.
                </p>
              </div>

              {/* Provider-specific info */}
              {provider === 'cloudflare-send' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                    <Info className="size-4" />
                    Cloudflare Send Email (Native Binding)
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    Native Cloudflare Workers email sending. Requires the <code>send_email</code> binding in wrangler.toml and a verified destination address. Falls back to MailChannels automatically if the binding is unavailable.
                  </p>
                </div>
              )}
              {provider === 'cloudflare' && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                    <Info className="size-4" />
                    Cloudflare Email (MailChannels)
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Free for Cloudflare Workers. No API key needed. Your domain must have SPF/DKIM records configured.
                  </p>
                </div>
              )}

              {/* API key field for resend, sendgrid, mailgun */}
              {provider !== 'cloudflare' && provider !== 'cloudflare-send' && (
                <div className="space-y-2">
                  <Label htmlFor="smtp-api-key">
                    {provider === 'mailgun' ? 'API Key' : 'API Key'}
                  </Label>
                  <Input
                    id="smtp-api-key"
                    type="password"
                    value={v('smtp_password')}
                    onChange={(e) => setValue('smtp_password', e.target.value)}
                    placeholder={provider === 'resend' ? 're_xxxx...' : provider === 'sendgrid' ? 'SG.xxxx...' : 'key-xxxx...'}
                    className="neu-input px-3 py-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    {provider === 'resend' && 'Your Resend API key from dashboard.resend.com.'}
                    {provider === 'sendgrid' && 'Your SendGrid API key from app.sendgrid.com.'}
                    {provider === 'mailgun' && 'Your Mailgun API key from the Mailgun dashboard.'}
                  </p>
                </div>
              )}

              {/* Domain field for mailgun */}
              {provider === 'mailgun' && (
                <div className="space-y-2">
                  <Label htmlFor="smtp-domain">Domain</Label>
                  <Input
                    id="smtp-domain"
                    value={v('smtp_username')}
                    onChange={(e) => setValue('smtp_username', e.target.value)}
                    placeholder="mg.example.com"
                    className="neu-input px-3 py-2.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Mailgun domain name.
                  </p>
                </div>
              )}
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
                placeholder={provider === 'cloudflare' ? 'noreply@yourdomain.com' : 'noreply@example.com'}
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'cloudflare' || provider === 'cloudflare-send'
                  ? 'Must be an email on your Cloudflare Workers domain with SPF/DKIM.'
                  : 'From email address.'}
              </p>
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
          {provider !== 'cloudflare' && provider !== 'cloudflare-send' && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 mt-0.5 shrink-0" />
              <span>
                The API key above is stored in plaintext. Restrict admin access and prefer
                scoped API keys with minimal permissions.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Test email card */}
      {enabled && provider && (
        <div className="neu-card p-6 space-y-5">
          <SectionHeader
            icon={Send}
            title="Test Email"
            description="Send a test email to verify your configuration works."
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="neu-input px-3 py-2.5"
              />
            </div>
            <Button
              onClick={handleTestEmail}
              disabled={sendingTest || !testEmail}
              className="neu-btn px-6 py-2.5 shadow-none"
            >
              {sendingTest ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              Send Test
            </Button>
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
