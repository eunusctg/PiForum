'use client';

import { Map as MapIcon, ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useAdminSettings, AdminGate, SettingsLoadingSkeleton, SettingsError,
  SaveBar, SectionHeader, FlawsCallout,
} from '@/components/forum/admin/shared';

const KEYS = [
  'sitemap_enabled', 'sitemap_include_threads', 'sitemap_include_users',
  'sitemap_include_pages', 'sitemap_include_tags', 'sitemap_change_freq',
  'sitemap_priority_threads', 'sitemap_priority_pages',
];

export default function AdminSitemap() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();
  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;
  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><MapIcon className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Sitemap</h1>
          <p className="text-xs text-muted-foreground">XML sitemap generation for search engines.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'The sitemap is generated on-demand at /sitemap.xml on every request; for very large forums this is slow and should be cached or pre-built.',
          'There is no sitemap index splitting — a single file is served, which exceeds Google\'s 50,000-URL limit on huge sites.',
          'Last-modified dates use the thread/post updatedAt field, which may not reflect edits to nested posts.',
          'The sitemap is not automatically submitted to Google Search Console; you must do that manually.',
        ]}
      />

      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5"><Label>Enable Sitemap</Label><p className="text-xs text-muted-foreground">Serve /sitemap.xml and reference it in robots.txt.</p></div>
          <Switch checked={parseBool('sitemap_enabled', true)} onCheckedChange={(c) => setValue('sitemap_enabled', String(c))} />
        </div>
        {parseBool('sitemap_enabled', true) && (
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="neu-btn px-4 py-2 text-sm inline-flex items-center gap-2">
            <ExternalLink className="size-4" /> View /sitemap.xml
          </a>
        )}
      </div>

      <div className="neu-card p-6 space-y-1">
        <SectionHeader icon={MapIcon} title="Content Inclusion" description="Choose what to include in the sitemap." />
        {([
          ['sitemap_include_threads', 'Include Threads', 'Add every thread URL.'],
          ['sitemap_include_pages', 'Include Pages', 'Add published static pages.'],
          ['sitemap_include_tags', 'Include Tags', 'Add tag listing pages.'],
          ['sitemap_include_users', 'Include User Profiles', 'Add member profile pages.'],
        ] as const).map(([key, label, desc], i) => (
          <div key={key}>
            {i > 0 && <div className="neu-divider my-1" />}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-0.5"><Label>{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
              <Switch checked={parseBool(key, key === 'sitemap_include_users' ? false : true)} onCheckedChange={(c) => setValue(key, String(c))} />
            </div>
          </div>
        ))}
      </div>

      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={MapIcon} title="Crawl Settings" description="Update frequency and priority hints." />
        <div className="space-y-2">
          <Label htmlFor="sm-freq">Change Frequency</Label>
          <select id="sm-freq" value={v('sitemap_change_freq', 'daily')} onChange={(e) => setValue('sitemap_change_freq', e.target.value)} className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent">
            <option value="always">always</option>
            <option value="hourly">hourly</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
            <option value="yearly">yearly</option>
            <option value="never">never</option>
          </select>
          <p className="text-xs text-muted-foreground">A hint to crawlers, not a command.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sm-pt">Thread Priority</Label>
            <Input id="sm-pt" type="number" step="0.1" min="0" max="1" value={v('sitemap_priority_threads', '0.8')} onChange={(e) => setValue('sitemap_priority_threads', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sm-pp">Page Priority</Label>
            <Input id="sm-pp" type="number" step="0.1" min="0" max="1" value={v('sitemap_priority_pages', '0.6')} onChange={(e) => setValue('sitemap_priority_pages', e.target.value)} className="neu-input px-3 py-2.5" />
          </div>
        </div>
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save Sitemap Settings" />
    </div>
  );
}
