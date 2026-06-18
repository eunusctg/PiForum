'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  useAdminSettings, AdminGate, SettingsLoadingSkeleton, SettingsError,
  SaveBar, SectionHeader, FlawsCallout,
} from '@/components/forum/admin/shared';

const KEYS = [
  'seo_title_suffix', 'seo_meta_description', 'seo_keywords', 'seo_og_image',
  'seo_twitter_handle', 'seo_canonical_url', 'seo_indexable', 'seo_author',
  'seo_jsonld_type', 'show_online_users', 'show_statistics', 'show_birthdays',
];

export default function AdminSeo() {
  const { values, setValue, save, loading, error, saving, refetch, userIsAdmin } = useAdminSettings();
  if (!userIsAdmin) return <AdminGate />;
  if (loading) return <SettingsLoadingSkeleton />;
  if (error) return <SettingsError message={error} onRetry={refetch} />;
  const parseBool = (k: string, fallback: boolean) => (values[k] === undefined ? fallback : values[k] === 'true');
  const v = (k: string, def = '') => values[k] ?? def;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><Search className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">SEO Settings</h1>
          <p className="text-xs text-muted-foreground">Search engine metadata & structured data.</p>
        </div>
      </div>

      <FlawsCallout
        flaws={[
          'Meta tags are rendered server-side from the database on each request; if the DB is slow, first-byte time (TTFB) increases and can hurt Core Web Vitals.',
          'Next.js generates a single static metadata set per route at build for cached pages — dynamic per-thread SEO titles require per-route generateMetadata, which is only implemented for the root layout in this build.',
          'Open Graph image previews depend on the image being publicly reachable; relative URLs (e.g. /uploads/x.png) will not render previews in social scrapers.',
          'The JSON-LD structured data is a static Organization/WebSite block; per-thread Article schema is not generated in this build.',
        ]}
      />

      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Search} title="Meta Tags" description="Default meta tags applied to every page." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seo-suffix">Title Suffix</Label>
            <Input id="seo-suffix" value={v('seo_title_suffix')} onChange={(e) => setValue('seo_title_suffix', e.target.value)} placeholder="— PiForum" className="neu-input px-3 py-2.5" />
            <p className="text-xs text-muted-foreground">Appended to every page title.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-author">Author</Label>
            <Input id="seo-author" value={v('seo_author')} onChange={(e) => setValue('seo_author', e.target.value)} placeholder="PiForum Team" className="neu-input px-3 py-2.5" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="seo-desc">Meta Description</Label>
            <span className="text-xs text-muted-foreground">{v('seo_meta_description').length}/160</span>
          </div>
          <Textarea id="seo-desc" value={v('seo_meta_description')} onChange={(e) => setValue('seo_meta_description', e.target.value.slice(0, 160))} maxLength={160} className="neu-input px-3 py-2.5 min-h-[70px] resize-none" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seo-keywords">Keywords</Label>
          <Input id="seo-keywords" value={v('seo_keywords')} onChange={(e) => setValue('seo_keywords', e.target.value)} placeholder="forum, community, discussion" className="neu-input px-3 py-2.5" />
          <p className="text-xs text-muted-foreground">Comma-separated. (Most search engines now ignore the keywords tag, but it is included for completeness.)</p>
        </div>
      </div>

      <div className="neu-card p-6 space-y-5">
        <SectionHeader icon={Search} title="Social & Canonical" description="Open Graph, Twitter cards, and canonical URL." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="seo-og">OG Image URL</Label>
            <Input id="seo-og" value={v('seo_og_image')} onChange={(e) => setValue('seo_og_image', e.target.value)} placeholder="https://example.com/og.png" className="neu-input px-3 py-2.5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo-twitter">Twitter Handle</Label>
            <Input id="seo-twitter" value={v('seo_twitter_handle')} onChange={(e) => setValue('seo_twitter_handle', e.target.value)} placeholder="@piforum" className="neu-input px-3 py-2.5" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seo-canonical">Canonical URL</Label>
          <Input id="seo-canonical" value={v('seo_canonical_url')} onChange={(e) => setValue('seo_canonical_url', e.target.value)} placeholder="https://forum.example.com" className="neu-input px-3 py-2.5" />
        </div>
      </div>

      <div className="neu-card p-6 space-y-1">
        <SectionHeader icon={Search} title="Indexing & Structured Data" description="Control crawler access and JSON-LD schema." />
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5"><Label>Indexable</Label><p className="text-xs text-muted-foreground">Allow search engines to index the site (adds allow in robots.txt).</p></div>
          <Switch checked={parseBool('seo_indexable', true)} onCheckedChange={(c) => setValue('seo_indexable', String(c))} />
        </div>
        <div className="neu-divider my-1" />
        <div className="space-y-2 py-2">
          <Label htmlFor="seo-jsonld">JSON-LD Type</Label>
          <select id="seo-jsonld" value={v('seo_jsonld_type', 'WebSite')} onChange={(e) => setValue('seo_jsonld_type', e.target.value)} className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent">
            <option value="WebSite">WebSite</option>
            <option value="Organization">Organization</option>
            <option value="None">None (disable)</option>
          </select>
        </div>
      </div>

      <div className="neu-card p-6 space-y-1">
        <SectionHeader icon={Search} title="Home Page Display" description="What to show on the forum home page." />
        {([
          ['show_online_users', 'Show Online Users', 'Display currently online users.'],
          ['show_statistics', 'Show Statistics', 'Show thread/post/member counts.'],
          ['show_birthdays', 'Show Birthdays', "Highlight today's birthdays."],
        ] as const).map(([key, label, desc], i) => (
          <div key={key}>
            {i > 0 && <div className="neu-divider my-1" />}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-0.5"><Label>{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
              <Switch checked={parseBool(key, key === 'show_birthdays' ? false : true)} onCheckedChange={(c) => setValue(key, String(c))} />
            </div>
          </div>
        ))}
      </div>

      <SaveBar saving={saving} onSave={() => save(KEYS)} saveLabel="Save SEO Settings" />
    </div>
  );
}
