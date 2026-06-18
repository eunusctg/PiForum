'use client';

import { Smartphone, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useAdminSettings, AdminGate, SettingsLoadingSkeleton, SettingsError,
  SaveBar, SectionHeader, FlawsCallout,
} from '@/components/forum/admin/shared';

const KEYS = [
  'pwa_enabled', 'pwa_name', 'pwa_short_name', 'pwa_description',
  'pwa_theme_color', 'pwa_background_color', 'pwa_display',
  'pwa_icon_192', 'pwa_icon_512', 'pwa_start_url',
];

export default function AdminPwa() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();
  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;
  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><Smartphone className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">PWA</h1>
          <p className="text-xs text-muted-foreground">Make PiForum installable as a native app.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'The service worker caches the app shell for offline use, but dynamic content (threads, posts) requires a network connection — offline mode shows cached pages only.',
          'Installability requires a valid manifest with icons of at least 192×192 and 512×512px; without both, Chrome will not show the install prompt.',
          'The service worker is registered at a fixed scope (/); it cannot be used to cache cross-origin API responses without explicit caching strategies.',
          'iOS Safari has limited PWA support — push notifications and background sync do not work reliably on iOS in this build.',
          'On HTTP (non-HTTPS) origins the service worker will not register at all, except on localhost.',
        ]}
      />

      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5"><Label>Enable PWA</Label><p className="text-xs text-muted-foreground">Serve a web manifest and register a service worker.</p></div>
          <Switch checked={parseBool('pwa_enabled', true)} onCheckedChange={(c) => setValue('pwa_enabled', String(c))} />
        </div>
        {parseBool('pwa_enabled', true) && (
          <div className="flex gap-2">
            <a href="/manifest.webmanifest" target="_blank" rel="noopener noreferrer" className="neu-btn px-4 py-2 text-sm inline-flex items-center gap-2">
              <Download className="size-4" /> View Manifest
            </a>
            <a href="/sw.js" target="_blank" rel="noopener noreferrer" className="neu-btn px-4 py-2 text-sm inline-flex items-center gap-2">
              <Smartphone className="size-4" /> View Service Worker
            </a>
          </div>
        )}
      </div>

      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Smartphone} title="App Identity" description="How the installed app appears." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pwa-name">Name</Label>
            <Input id="pwa-name" value={v('pwa_name', 'PiForum')} onChange={(e) => setValue('pwa_name', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwa-short">Short Name</Label>
            <Input id="pwa-short" value={v('pwa_short_name', 'PiForum')} onChange={(e) => setValue('pwa_short_name', e.target.value)} className="neu-input px-3 py-2.5" />
            <p className="text-xs text-muted-foreground">Shown on the home screen icon (≤12 chars).</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwa-desc">Description</Label>
          <Input id="pwa-desc" value={v('pwa_description')} onChange={(e) => setValue('pwa_description', e.target.value)} placeholder="A modern neumorphic forum" className="neu-input px-3 py-2.5" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwa-display">Display Mode</Label>
          <select id="pwa-display" value={v('pwa_display', 'standalone')} onChange={(e) => setValue('pwa_display', e.target.value)} className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent">
            <option value="standalone">Standalone (no browser UI)</option>
            <option value="fullscreen">Fullscreen (no OS UI)</option>
            <option value="minimal-ui">Minimal UI</option>
            <option value="browser">Browser</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwa-start">Start URL</Label>
          <Input id="pwa-start" value={v('pwa_start_url', '/')} onChange={(e) => setValue('pwa_start_url', e.target.value)} className="neu-input px-3 py-2.5" />
        </div>
      </div>

      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Smartphone} title="Theme & Icons" description="Colors and app icons." />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pwa-theme">Theme Color</Label>
            <div className="flex gap-2">
              <input type="color" value={v('pwa_theme_color', '#D4AF37')} onChange={(e) => setValue('pwa_theme_color', e.target.value)} className="neu-input h-10 w-14 p-1 rounded-xl" />
              <Input value={v('pwa_theme_color', '#D4AF37')} onChange={(e) => setValue('pwa_theme_color', e.target.value)} className="neu-input px-3 py-2.5 flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwa-bg">Background Color</Label>
            <div className="flex gap-2">
              <input type="color" value={v('pwa_background_color', '#e0e0e0')} onChange={(e) => setValue('pwa_background_color', e.target.value)} className="neu-input h-10 w-14 p-1 rounded-xl" />
              <Input value={v('pwa_background_color', '#e0e0e0')} onChange={(e) => setValue('pwa_background_color', e.target.value)} className="neu-input px-3 py-2.5 flex-1" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pwa-192">Icon 192×192 (URL)</Label>
            <Input id="pwa-192" value={v('pwa_icon_192', '/icon-192.png')} onChange={(e) => setValue('pwa_icon_192', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwa-512">Icon 512×512 (URL)</Label>
            <Input id="pwa-512" value={v('pwa_icon_512', '/icon-512.png')} onChange={(e) => setValue('pwa_icon_512', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Upload icons to <code className="font-mono">/public/</code> or use an absolute URL. Both sizes are required for installability.</p>
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save PWA Settings" />
    </div>
  );
}
