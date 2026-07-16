'use client';

import {
  Share2,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  Github,
  MessageCircle,
  Twitch,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdminSettings,
  AdminGate,
  SettingsLoadingSkeleton,
  SettingsError,
  SaveBar,
  SectionHeader,
} from '@/components/forum/admin/shared';

/* ------------------------------------------------------------------ */
/*  Social Links — manage social media links shown in the footer.      */
/* ------------------------------------------------------------------ */

const SOCIAL_PLATFORMS = [
  { key: 'social_facebook', label: 'Facebook', Icon: Facebook, color: '#1877F2', placeholder: 'https://facebook.com/yourpage' },
  { key: 'social_twitter', label: 'X (Twitter)', Icon: Twitter, color: '#1DA1F2', placeholder: 'https://x.com/yourhandle' },
  { key: 'social_instagram', label: 'Instagram', Icon: Instagram, color: '#E4405F', placeholder: 'https://instagram.com/yourprofile' },
  { key: 'social_youtube', label: 'YouTube', Icon: Youtube, color: '#FF0000', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'social_linkedin', label: 'LinkedIn', Icon: Linkedin, color: '#0A66C2', placeholder: 'https://linkedin.com/company/yourpage' },
  { key: 'social_github', label: 'GitHub', Icon: Github, color: '#333', placeholder: 'https://github.com/yourorg' },
  { key: 'social_discord', label: 'Discord', Icon: MessageCircle, color: '#5865F2', placeholder: 'https://discord.gg/yourinvite' },
  { key: 'social_twitch', label: 'Twitch', Icon: Twitch, color: '#9146FF', placeholder: 'https://twitch.tv/yourchannel' },
];

const SOCIAL_KEYS = SOCIAL_PLATFORMS.map((p) => p.key);

export default function AdminSocialLinks() {
  const { loading, error, saving, values, setValue, save, refetch, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const v = (key: string) => values[key] ?? '';

  return (
    <div className="space-y-5">
      {/* Title Section */}
      <SectionHeader
        icon={Share2}
        title="Social Links"
        description="Manage social media links shown in the footer."
      />

      {/* Social Platforms Card */}
      <div className="neu-card p-6 space-y-5">
        {SOCIAL_PLATFORMS.map(({ key, label, Icon, color, placeholder }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:w-40 shrink-0">
              <span
                className="size-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}18`, color }}
              >
                <Icon className="size-4" />
              </span>
              <Label htmlFor={key} className="text-sm font-medium">
                {label}
              </Label>
            </div>
            <Input
              id={key}
              value={v(key)}
              onChange={(e) => setValue(key, e.target.value)}
              placeholder={placeholder}
              className="neu-input px-3 py-2.5 flex-1"
            />
          </div>
        ))}
      </div>

      {/* Live Preview Card */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={ExternalLink}
          title="Footer Preview"
          description="How your social links will appear in the footer."
        />
        <div className="flex flex-wrap items-center gap-3">
          {SOCIAL_PLATFORMS.map(({ key, label, Icon, color }) => {
            const configured = !!v(key);
            return (
              <span
                key={key}
                title={configured ? `${label}: ${v(key)}` : `${label} (not configured)`}
                className={`size-10 rounded-full flex items-center justify-center transition-colors ${
                  configured
                    ? 'border border-primary/30 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                    : 'border border-border bg-muted/40 text-muted-foreground'
                }`}
                style={configured ? { color } : undefined}
              >
                <Icon className="size-4" />
              </span>
            );
          })}
        </div>
        {SOCIAL_PLATFORMS.every(({ key }) => !v(key)) && (
          <p className="text-xs text-muted-foreground">
            No social links configured yet. Add URLs above to see a preview.
          </p>
        )}
      </div>

      {/* Save Bar */}
      <SaveBar saving={saving} onSave={() => save(SOCIAL_KEYS)} saveLabel="Save Social Links" />
    </div>
  );
}
