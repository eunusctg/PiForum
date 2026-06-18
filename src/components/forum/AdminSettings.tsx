'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { ThemeMode } from '@/lib/store';
import {
  Settings,
  ArrowLeft,
  Shield,
  Loader2,
  Upload,
  Save,
  Globe,
  Lock,
  Cloud,
  Palette,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Admin Settings — Global settings panel                             */
/* ------------------------------------------------------------------ */

export default function AdminSettings() {
  const { currentUser, isAdmin, navigateTo, setSettings, themeMode, setThemeMode } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // General settings
  const [forumName, setForumName] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  // Registration & Access
  const [openRegistration, setOpenRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Upload settings
  const [maxUploadSize, setMaxUploadSize] = useState('5242880');
  const [allowedFileTypes, setAllowedFileTypes] = useState(
    'image/jpeg,image/png,image/gif,image/webp,application/pdf'
  );

  const userIsAdmin = isAdmin();

  // ---------- Fetch Settings ----------
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        const s = data.data;
        setForumName(s.forum_name || '');
        setMetaDescription(s.forum_description || '');
        setLogoUrl(s.logo_url || '');
        setFaviconUrl(s.favicon_url || '');
        setOpenRegistration(s.open_registration !== 'false');
        setMaintenanceMode(s.maintenance_mode === 'true');
        setMaxUploadSize(s.max_upload_size || '5242880');
        setAllowedFileTypes(
          s.allowed_file_types ||
            'image/jpeg,image/png,image/gif,image/webp,application/pdf'
        );
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchSettings();
  }, [fetchSettings, userIsAdmin]);

  // ---------- File Upload ----------
  const handleFileUpload = async (
    file: File,
    setter: (url: string) => void
  ) => {
    if (!currentUser) return;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setter(data.data.url);
        toast({ title: 'File Uploaded', description: 'File has been uploaded successfully' });
      } else {
        toast({ title: 'Upload Error', description: data.error || 'Failed to upload file', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Upload Error', description: 'Network error during upload', variant: 'destructive' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, setLogoUrl);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file, setFaviconUrl);
  };

  // ---------- Save All ----------
  const handleSaveAll = async () => {
    if (!currentUser) return;
    try {
      setSaving(true);
      const settings = [
        { key: 'forum_name', value: forumName },
        { key: 'forum_description', value: metaDescription },
        { key: 'logo_url', value: logoUrl },
        { key: 'favicon_url', value: faviconUrl },
        { key: 'open_registration', value: String(openRegistration) },
        { key: 'maintenance_mode', value: String(maintenanceMode) },
        { key: 'max_upload_size', value: maxUploadSize },
        { key: 'allowed_file_types', value: allowedFileTypes },
      ];

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (data.success) {
        // Update store with new settings
        const forumSettings = settings.map((s) => ({
          id: s.key,
          key: s.key,
          value: s.value,
        }));
        setSettings(forumSettings);

        toast({ title: 'Settings Saved', description: 'All settings have been updated successfully' });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Not Admin ----------
  if (!userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Shield className="size-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm text-center">
          You need administrator privileges to access this page.
        </p>
        <Button onClick={() => navigateTo('home')} className="neu-btn px-6 py-2">
          <ArrowLeft className="size-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-card p-6 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="neu-card p-6 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchSettings} className="neu-btn px-6 py-2">Retry</Button>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-3">
            <Settings className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Forum Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure your forum preferences
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigateTo('admin-dashboard')}
          variant="ghost"
          className="neu-btn px-4 py-2 text-sm"
        >
          <ArrowLeft className="size-4 mr-2" />
          Dashboard
        </Button>
      </div>

      {/* General Settings */}
      <div className="neu-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">General Settings</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="forum-name">Forum Name</Label>
          <Input
            id="forum-name"
            value={forumName}
            onChange={(e) => setForumName(e.target.value)}
            placeholder="My Forum"
            className="neu-input px-3 py-2.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-desc">Meta Description</Label>
          <Textarea
            id="meta-desc"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="A brief description of your forum for SEO purposes..."
            className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This description appears in search engine results.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-url">Logo URL</Label>
          <div className="flex gap-2">
            <Input
              id="logo-url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="/uploads/logo.png"
              className="neu-input px-3 py-2.5 flex-1"
            />
            <label className="neu-btn px-3 py-2.5 flex items-center gap-2 cursor-pointer text-sm hover:text-primary transition-colors">
              <Upload className="size-4" />
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>
          {logoUrl && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs text-muted-foreground">{logoUrl}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="favicon-url">Favicon URL</Label>
          <div className="flex gap-2">
            <Input
              id="favicon-url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="/uploads/favicon.ico"
              className="neu-input px-3 py-2.5 flex-1"
            />
            <label className="neu-btn px-3 py-2.5 flex items-center gap-2 cursor-pointer text-sm hover:text-primary transition-colors">
              <Upload className="size-4" />
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleFaviconUpload}
                className="hidden"
              />
            </label>
          </div>
          {faviconUrl && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={faviconUrl}
                alt="Favicon preview"
                className="h-6 w-6 rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-xs text-muted-foreground">{faviconUrl}</span>
            </div>
          )}
        </div>
      </div>

      {/* Appearance / Theme Selector */}
      <div className="neu-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Appearance</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Choose the visual theme for the forum. The selection is stored locally
          on this device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { mode: 'light', label: 'Day', desc: 'Soft grey neumorphism', icon: Sun, swatch: '#e0e0e0' },
            { mode: 'dark', label: 'Night', desc: 'Dark slate neumorphism', icon: Moon, swatch: '#1e1e24' },
            { mode: 'gold', label: 'Golden', desc: 'Metallic gold luxury', icon: Palette, swatch: '#D4AF37' },
          ] as { mode: ThemeMode; label: string; desc: string; icon: typeof Sun; swatch: string }[]).map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setThemeMode(opt.mode);
                  toast({ title: 'Theme Updated', description: `Switched to ${opt.label} mode` });
                }}
                className={`neu-btn p-4 flex flex-col items-start gap-2 text-left transition-all ${
                  active ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className="size-8 rounded-full flex items-center justify-center border border-border/40"
                    style={{ backgroundColor: opt.swatch }}
                  >
                    <Icon className="size-4 text-foreground" style={{ color: opt.mode === 'dark' ? '#e0e0e0' : opt.mode === 'gold' ? '#4A3500' : '#6b6b6b' }} />
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

      {/* Registration & Access */}
      <div className="neu-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Registration & Access</h2>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>Open Registration</Label>
            <p className="text-xs text-muted-foreground">
              Allow new users to register accounts on the forum.
            </p>
          </div>
          <Switch
            checked={openRegistration}
            onCheckedChange={setOpenRegistration}
          />
        </div>

        <div className="neu-divider" />

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label>Maintenance Mode</Label>
            <p className="text-xs text-muted-foreground">
              Enable to show a maintenance page to all non-admin visitors.
            </p>
          </div>
          <Switch
            checked={maintenanceMode}
            onCheckedChange={setMaintenanceMode}
          />
        </div>
      </div>

      {/* Upload Settings */}
      <div className="neu-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Cloud className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Upload Settings</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-upload">Max Upload Size (bytes)</Label>
          <Input
            id="max-upload"
            type="number"
            value={maxUploadSize}
            onChange={(e) => setMaxUploadSize(e.target.value)}
            min="0"
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            Current: {formatFileSize(parseInt(maxUploadSize) || 0)}.
            Default: 5MB (5242880 bytes).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allowed-types">Allowed File Types</Label>
          <Textarea
            id="allowed-types"
            value={allowedFileTypes}
            onChange={(e) => setAllowedFileTypes(e.target.value)}
            placeholder="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of allowed MIME types.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="neu-btn px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none text-sm font-semibold"
        >
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Save className="size-4 mr-2" />
          )}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
