'use client';

import { useAppStore } from '@/lib/store';
import type { ThemeMode } from '@/lib/store';
import {
  Palette,
  Globe,
  SlidersHorizontal,
  ListChecks,
  Lock,
  Cloud,
  Upload,
  Check,
  Sun,
  Moon,
  PanelTop,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  useAdminSettings,
  AdminGate,
  SettingsLoadingSkeleton,
  SettingsError,
  SaveBar,
  SectionHeader,
} from '@/components/forum/admin/shared';

/* ------------------------------------------------------------------ */
/*  Branding — site identity, appearance, features, posting rules,     */
/*  maintenance, and upload limits. This is the single home for all    */
/*  "general" settings; nothing here is duplicated elsewhere.          */
/* ------------------------------------------------------------------ */

const BRAND_KEYS = [
  'forum_name', 'forum_description', 'forum_tagline', 'logo_url', 'favicon_url',
  'header_announcement', 'footer_text',
  'allow_guest_viewing', 'allow_thread_voting', 'allow_post_voting',
  'allow_bookmarks', 'allow_tags', 'allow_polls', 'allow_signatures', 'allow_avatars',
  'posts_per_page', 'threads_per_page', 'min_username_length', 'max_username_length',
  'min_password_length', 'rate_limit_posts', 'rate_limit_threads',
  'maintenance_mode', 'maintenance_message',
  'max_upload_size', 'allowed_file_types',
];

export default function AdminBranding() {
  const { themeMode, setThemeMode } = useAppStore();
  const { values, setValue, save, loading, error, saving, refetch, currentUser, userIsAdmin } = useAdminSettings();

  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;

  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  /* File upload helper (reuses /api/upload) */
  const uploadFile = async (file: File, key: string) => {
    if (!currentUser) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', headers: { 'x-user-id': currentUser.id }, body: fd });
    const data = await res.json();
    if (data.success) setValue(key, data.data.url);
  };

  return (
    <div className="space-y-5">
      {/* 1. Site Identity */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Globe} title="Site Identity" description="Your forum's name, tagline, and logos." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="forum-name">Forum Name</Label>
            <Input id="forum-name" value={v('forum_name')} onChange={(e) => setValue('forum_name', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forum-tagline">Tagline</Label>
            <Input id="forum-tagline" value={v('forum_tagline')} onChange={(e) => setValue('forum_tagline', e.target.value)} placeholder="Where conversations find their form." className="neu-input px-3 py-2.5" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="forum-desc">Description</Label>
          <Textarea id="forum-desc" value={v('forum_description')} onChange={(e) => setValue('forum_description', e.target.value)} className="neu-input px-3 py-2.5 min-h-[70px] resize-none" />
          <p className="text-xs text-muted-foreground">Shown in SEO meta and the install summary.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['logo_url', 'favicon_url'] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{key === 'logo_url' ? 'Logo URL' : 'Favicon URL'}</Label>
              <div className="flex gap-2">
                <Input id={key} value={v(key)} onChange={(e) => setValue(key, e.target.value)} className="neu-input px-3 py-2.5 flex-1" />
                <label className="neu-btn px-3 py-2.5 flex items-center gap-2 cursor-pointer text-sm">
                  <Upload className="size-4" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, key); }} />
                </label>
              </div>
              {v(key) && <img src={v(key)} alt={key} className="h-8 w-auto rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Header & Footer */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={PanelTop} title="Header & Footer" description="Customize the announcement banner and footer copyright text. Footer/header nav links are managed in Content → Pages." />
        <div className="space-y-2">
          <Label htmlFor="header-announcement">Header Announcement Banner</Label>
          <Input id="header-announcement" value={v('header_announcement')} onChange={(e) => setValue('header_announcement', e.target.value)} placeholder="Welcome to our community! Read the rules." className="neu-input px-3 py-2.5" />
          <p className="text-xs text-muted-foreground">Leave empty to hide the banner.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="footer-text">Footer Copyright Text</Label>
          <Input id="footer-text" value={v('footer_text')} onChange={(e) => setValue('footer_text', e.target.value)} placeholder="© 2025 My Forum" className="neu-input px-3 py-2.5" />
          <p className="text-xs text-muted-foreground">Shown at the bottom-right of every page. Leave empty to use the default (© year Forum Name).</p>
        </div>
      </div>

      {/* 3. Appearance (per-device theme) */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Palette} title="Appearance" description="Theme is stored on each visitor's device — this preview only affects your device." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { mode: 'light', label: 'Day', desc: 'Soft grey', icon: Sun, swatch: '#e0e0e0' },
            { mode: 'dark', label: 'Night', desc: 'Dark slate', icon: Moon, swatch: '#1e1e24' },
            { mode: 'gold', label: 'Golden', desc: 'Metallic luxury', icon: Palette, swatch: '#D4AF37' },
          ] as { mode: ThemeMode; label: string; desc: string; icon: typeof Sun; swatch: string }[]).map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.mode;
            return (
              <button key={opt.mode} onClick={() => setThemeMode(opt.mode)} className={`neu-btn p-4 flex flex-col items-start gap-2 text-left ${active ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-center gap-2 w-full">
                  <span className="size-7 rounded-full flex items-center justify-center border border-border/40" style={{ backgroundColor: opt.swatch }}>
                    <Icon className="size-3.5" style={{ color: opt.mode === 'dark' ? '#e0e0e0' : opt.mode === 'gold' ? '#4A3500' : '#6b6b6b' }} />
                  </span>
                  <span className="text-sm font-semibold flex-1">{opt.label}</span>
                  {active && <Check className="size-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Features */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader icon={SlidersHorizontal} title="Features" description="Toggle community features." />
        {([
          ['allow_guest_viewing', 'Guest Viewing', 'Let visitors read without an account.'],
          ['allow_thread_voting', 'Thread Voting', 'Upvote/downvote threads.'],
          ['allow_post_voting', 'Post Voting', 'Upvote/downvote replies.'],
          ['allow_bookmarks', 'Bookmarks', 'Save threads for later.'],
          ['allow_tags', 'Tags', 'Tag and browse threads by tag.'],
          ['allow_polls', 'Polls', 'Attach polls to threads.'],
          ['allow_signatures', 'Signatures', 'Show a signature under posts.'],
          ['allow_avatars', 'Avatars', 'Allow avatar uploads.'],
        ] as const).map(([key, label, desc], i) => (
          <div key={key}>
            {i > 0 && <div className="neu-divider my-1" />}
            <ToggleRow label={label} description={desc} checked={parseBool(key, true)} onCheckedChange={(c) => setValue(key, String(c))} />
          </div>
        ))}
      </div>

      {/* 5. Posting Rules */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={ListChecks} title="Posting Rules" description="Pagination, validation, and rate limits." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['posts_per_page', 'Posts Per Page', '25'],
            ['threads_per_page', 'Threads Per Page', '25'],
            ['min_username_length', 'Min Username Length', '3'],
            ['max_username_length', 'Max Username Length', '30'],
            ['min_password_length', 'Min Password Length', '6'],
            ['rate_limit_posts', 'Post Rate Limit / hour', '30'],
            ['rate_limit_threads', 'Thread Rate Limit / hour', '10'],
          ] as const).map(([key, label, def]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <Input id={key} type="number" min="0" value={v(key, def)} onChange={(e) => setValue(key, e.target.value)} className="neu-input px-3 py-2.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 6. Registration & Maintenance */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Lock} title="Registration & Maintenance" description="Access control and maintenance mode." />
        <ToggleRow label="Open Registration" description="Allow new users to register." checked={parseBool('open_registration', true)} onCheckedChange={(c) => setValue('open_registration', String(c))} />
        <div className="neu-divider" />
        <ToggleRow label="Maintenance Mode" description="Show a maintenance page to non-admins." checked={parseBool('maintenance_mode', false)} onCheckedChange={(c) => setValue('maintenance_mode', String(c))} />
        {parseBool('maintenance_mode', false) && (
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea id="maintenance-message" value={v('maintenance_message')} onChange={(e) => setValue('maintenance_message', e.target.value)} className="neu-input px-3 py-2.5 min-h-[70px] resize-none" />
          </div>
        )}
      </div>

      {/* 7. Upload Limits */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Cloud} title="Upload Limits" description="Attachment size and allowed types." />
        <div className="space-y-2">
          <Label htmlFor="max-upload">Max Upload Size (bytes)</Label>
          <Input id="max-upload" type="number" value={v('max_upload_size', '5242880')} onChange={(e) => setValue('max_upload_size', e.target.value)} className="neu-input px-3 py-2.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allowed-types">Allowed File Types (MIME)</Label>
          <Textarea id="allowed-types" value={v('allowed_file_types', 'image/jpeg,image/png,image/gif,image/webp,application/pdf')} onChange={(e) => setValue('allowed_file_types', e.target.value)} className="neu-input px-3 py-2.5 min-h-[70px] resize-none" />
        </div>
      </div>

      <SaveBar saving={saving} onSave={() => save(BRAND_KEYS)} saveLabel="Save Branding" />
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (c: boolean) => void; }) {
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
