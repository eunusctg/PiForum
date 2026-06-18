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
  SlidersHorizontal,
  ListChecks,
  Search,
  Mail,
  BarChart3,
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
/*  9 sections: General, Appearance, Features, Posting Rules,         */
/*  Registration & Access, SEO, Email (SMTP), Analytics, Upload        */
/* ------------------------------------------------------------------ */

const SEO_META_MAX = 160;

export default function AdminSettings() {
  const { currentUser, isAdmin, navigateTo, setSettings, themeMode, setThemeMode } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---------- General ---------- */
  const [forumName, setForumName] = useState('');
  const [forumDescription, setForumDescription] = useState('');
  const [forumTagline, setForumTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');

  /* ---------- Features ---------- */
  const [allowGuestViewing, setAllowGuestViewing] = useState(true);
  const [allowThreadVoting, setAllowThreadVoting] = useState(true);
  const [allowPostVoting, setAllowPostVoting] = useState(true);
  const [allowBookmarks, setAllowBookmarks] = useState(true);
  const [allowTags, setAllowTags] = useState(true);
  const [allowPolls, setAllowPolls] = useState(true);
  const [allowSignatures, setAllowSignatures] = useState(true);
  const [allowAvatars, setAllowAvatars] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);

  /* ---------- Posting Rules ---------- */
  const [postsPerPage, setPostsPerPage] = useState('25');
  const [threadsPerPage, setThreadsPerPage] = useState('25');
  const [minUsernameLength, setMinUsernameLength] = useState('3');
  const [maxUsernameLength, setMaxUsernameLength] = useState('30');
  const [minPasswordLength, setMinPasswordLength] = useState('6');
  const [rateLimitPosts, setRateLimitPosts] = useState('30');
  const [rateLimitThreads, setRateLimitThreads] = useState('10');
  const [bannedWords, setBannedWords] = useState('');

  /* ---------- Registration & Access ---------- */
  const [openRegistration, setOpenRegistration] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  /* ---------- SEO ---------- */
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoMetaDescription, setSeoMetaDescription] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showOnlineUsers, setShowOnlineUsers] = useState(true);
  const [showStatistics, setShowStatistics] = useState(true);
  const [showBirthdays, setShowBirthdays] = useState(false);

  /* ---------- Email (SMTP) ---------- */
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('PiForum');

  /* ---------- Analytics ---------- */
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsId, setAnalyticsId] = useState('');

  /* ---------- Upload ---------- */
  const [maxUploadSize, setMaxUploadSize] = useState('5242880');
  const [allowedFileTypes, setAllowedFileTypes] = useState(
    'image/jpeg,image/png,image/gif,image/webp,application/pdf'
  );

  const userIsAdmin = isAdmin();

  /* ---------- Helpers for boolean parsing ---------- */
  const parseBool = (val: string | undefined, fallback: boolean): boolean => {
    if (val === undefined || val === null || val === '') return fallback;
    return val === 'true';
  };

  /* ---------- Fetch Settings ---------- */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        const s: Record<string, string> = data.data || {};

        // General
        setForumName(s.forum_name || '');
        setForumDescription(s.forum_description || '');
        setForumTagline(s.forum_tagline || '');
        setLogoUrl(s.logo_url || '');
        setFaviconUrl(s.favicon_url || '');

        // Features
        setAllowGuestViewing(parseBool(s.allow_guest_viewing, true));
        setAllowThreadVoting(parseBool(s.allow_thread_voting, true));
        setAllowPostVoting(parseBool(s.allow_post_voting, true));
        setAllowBookmarks(parseBool(s.allow_bookmarks, true));
        setAllowTags(parseBool(s.allow_tags, true));
        setAllowPolls(parseBool(s.allow_polls, true));
        setAllowSignatures(parseBool(s.allow_signatures, true));
        setAllowAvatars(parseBool(s.allow_avatars, true));
        setRequireEmailVerification(parseBool(s.require_email_verification, false));

        // Posting Rules
        setPostsPerPage(s.posts_per_page || '25');
        setThreadsPerPage(s.threads_per_page || '25');
        setMinUsernameLength(s.min_username_length || '3');
        setMaxUsernameLength(s.max_username_length || '30');
        setMinPasswordLength(s.min_password_length || '6');
        setRateLimitPosts(s.rate_limit_posts || '30');
        setRateLimitThreads(s.rate_limit_threads || '10');
        setBannedWords(s.banned_words || '');

        // Registration & Access
        setOpenRegistration(parseBool(s.open_registration, true));
        setMaintenanceMode(parseBool(s.maintenance_mode, false));
        setMaintenanceMessage(s.maintenance_message || '');

        // SEO
        setSeoKeywords(s.seo_keywords || '');
        setSeoMetaDescription(s.seo_meta_description || '');
        setFooterText(s.footer_text || '');
        setShowOnlineUsers(parseBool(s.show_online_users, true));
        setShowStatistics(parseBool(s.show_statistics, true));
        setShowBirthdays(parseBool(s.show_birthdays, false));

        // Email (SMTP)
        setSmtpEnabled(parseBool(s.smtp_enabled, false));
        setSmtpHost(s.smtp_host || '');
        setSmtpPort(s.smtp_port || '587');
        setSmtpUsername(s.smtp_username || '');
        setSmtpFromEmail(s.smtp_from_email || '');
        setSmtpFromName(s.smtp_from_name || 'PiForum');

        // Analytics
        setAnalyticsEnabled(parseBool(s.analytics_enabled, false));
        setAnalyticsId(s.analytics_id || '');

        // Upload
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

  /* ---------- File Upload ---------- */
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

  /* ---------- Save All ---------- */
  const handleSaveAll = async () => {
    if (!currentUser) return;
    try {
      setSaving(true);
      const settings = [
        // General
        { key: 'forum_name', value: forumName },
        { key: 'forum_description', value: forumDescription },
        { key: 'forum_tagline', value: forumTagline },
        { key: 'logo_url', value: logoUrl },
        { key: 'favicon_url', value: faviconUrl },
        // Features
        { key: 'allow_guest_viewing', value: String(allowGuestViewing) },
        { key: 'allow_thread_voting', value: String(allowThreadVoting) },
        { key: 'allow_post_voting', value: String(allowPostVoting) },
        { key: 'allow_bookmarks', value: String(allowBookmarks) },
        { key: 'allow_tags', value: String(allowTags) },
        { key: 'allow_polls', value: String(allowPolls) },
        { key: 'allow_signatures', value: String(allowSignatures) },
        { key: 'allow_avatars', value: String(allowAvatars) },
        { key: 'require_email_verification', value: String(requireEmailVerification) },
        // Posting Rules
        { key: 'posts_per_page', value: postsPerPage },
        { key: 'threads_per_page', value: threadsPerPage },
        { key: 'min_username_length', value: minUsernameLength },
        { key: 'max_username_length', value: maxUsernameLength },
        { key: 'min_password_length', value: minPasswordLength },
        { key: 'rate_limit_posts', value: rateLimitPosts },
        { key: 'rate_limit_threads', value: rateLimitThreads },
        { key: 'banned_words', value: bannedWords },
        // Registration & Access
        { key: 'open_registration', value: String(openRegistration) },
        { key: 'maintenance_mode', value: String(maintenanceMode) },
        { key: 'maintenance_message', value: maintenanceMessage },
        // SEO
        { key: 'seo_keywords', value: seoKeywords },
        { key: 'seo_meta_description', value: seoMetaDescription },
        { key: 'footer_text', value: footerText },
        { key: 'show_online_users', value: String(showOnlineUsers) },
        { key: 'show_statistics', value: String(showStatistics) },
        { key: 'show_birthdays', value: String(showBirthdays) },
        // Email (SMTP)
        { key: 'smtp_enabled', value: String(smtpEnabled) },
        { key: 'smtp_host', value: smtpHost },
        { key: 'smtp_port', value: smtpPort },
        { key: 'smtp_username', value: smtpUsername },
        { key: 'smtp_from_email', value: smtpFromEmail },
        { key: 'smtp_from_name', value: smtpFromName },
        // Analytics
        { key: 'analytics_enabled', value: String(analyticsEnabled) },
        { key: 'analytics_id', value: analyticsId },
        // Upload
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
        // Update store with new settings so global UI (e.g. Header forum name) updates instantly
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

  /* ---------- Not Admin ---------- */
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

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
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

  /* ---------- Error ---------- */
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

  /* ---------- Main Render ---------- */
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

      {/* 1. General Settings */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Globe}
          title="General Settings"
          description="Basic information about your forum."
        />

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
          <Label htmlFor="forum-desc">Forum Description</Label>
          <Textarea
            id="forum-desc"
            value={forumDescription}
            onChange={(e) => setForumDescription(e.target.value)}
            placeholder="A brief description of your forum for SEO purposes..."
            className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This description appears in search engine results.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="forum-tagline">Forum Tagline</Label>
          <Input
            id="forum-tagline"
            value={forumTagline}
            onChange={(e) => setForumTagline(e.target.value)}
            placeholder="Where conversations find their form."
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            A short, catchy phrase shown alongside the forum name.
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

      {/* 2. Appearance / Theme Selector */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Palette}
          title="Appearance"
          description="Choose the visual theme for the forum. The selection is stored locally on this device."
        />

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

      {/* 3. Features */}
      <div className="neu-card p-6 space-y-1">
        <SectionHeader
          icon={SlidersHorizontal}
          title="Features"
          description="Enable or disable community features across the forum."
        />

        <ToggleRow
          label="Guest Viewing"
          description="Allow visitors without an account to read threads and posts."
          checked={allowGuestViewing}
          onCheckedChange={setAllowGuestViewing}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Thread Voting"
          description="Let users upvote or downvote threads."
          checked={allowThreadVoting}
          onCheckedChange={setAllowThreadVoting}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Post Voting"
          description="Let users upvote or downvote individual replies."
          checked={allowPostVoting}
          onCheckedChange={setAllowPostVoting}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Bookmarks"
          description="Allow users to bookmark threads for later."
          checked={allowBookmarks}
          onCheckedChange={setAllowBookmarks}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Tags"
          description="Allow threads to be tagged and browsed by tag."
          checked={allowTags}
          onCheckedChange={setAllowTags}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Polls"
          description="Allow users to attach polls to threads."
          checked={allowPolls}
          onCheckedChange={setAllowPolls}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Signatures"
          description="Allow users to set a signature shown beneath their posts."
          checked={allowSignatures}
          onCheckedChange={setAllowSignatures}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Avatars"
          description="Allow users to upload and display avatars."
          checked={allowAvatars}
          onCheckedChange={setAllowAvatars}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Require Email Verification"
          description="New users must verify their email before they can post."
          checked={requireEmailVerification}
          onCheckedChange={setRequireEmailVerification}
        />
      </div>

      {/* 4. Posting Rules */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={ListChecks}
          title="Posting Rules"
          description="Tune pagination, validation limits, and rate limits."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="posts-per-page">Posts Per Page</Label>
            <Input
              id="posts-per-page"
              type="number"
              min="1"
              value={postsPerPage}
              onChange={(e) => setPostsPerPage(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 25.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="threads-per-page">Threads Per Page</Label>
            <Input
              id="threads-per-page"
              type="number"
              min="1"
              value={threadsPerPage}
              onChange={(e) => setThreadsPerPage(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 25.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-username">Min Username Length</Label>
            <Input
              id="min-username"
              type="number"
              min="1"
              value={minUsernameLength}
              onChange={(e) => setMinUsernameLength(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 3 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-username">Max Username Length</Label>
            <Input
              id="max-username"
              type="number"
              min="1"
              value={maxUsernameLength}
              onChange={(e) => setMaxUsernameLength(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 30 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="min-password">Min Password Length</Label>
            <Input
              id="min-password"
              type="number"
              min="1"
              value={minPasswordLength}
              onChange={(e) => setMinPasswordLength(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 6 characters.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-limit-posts">Post Rate Limit (per hour)</Label>
            <Input
              id="rate-limit-posts"
              type="number"
              min="0"
              value={rateLimitPosts}
              onChange={(e) => setRateLimitPosts(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 30 posts/hour per user.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate-limit-threads">Thread Rate Limit (per hour)</Label>
            <Input
              id="rate-limit-threads"
              type="number"
              min="0"
              value={rateLimitThreads}
              onChange={(e) => setRateLimitThreads(e.target.value)}
              className="neu-input px-3 py-2.5"
            />
            <p className="text-xs text-muted-foreground">Default: 10 threads/hour per user.</p>
          </div>
        </div>

        <Separator className="my-1" />

        <div className="space-y-2">
          <Label htmlFor="banned-words">Banned Words</Label>
          <Textarea
            id="banned-words"
            value={bannedWords}
            onChange={(e) => setBannedWords(e.target.value)}
            placeholder="spam, abuse, scam"
            className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated list of words that will be censored in posts.
          </p>
        </div>
      </div>

      {/* 5. Registration & Access */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Lock}
          title="Registration & Access"
          description="Control who can join and what visitors see."
        />

        <ToggleRow
          label="Open Registration"
          description="Allow new users to register accounts on the forum."
          checked={openRegistration}
          onCheckedChange={setOpenRegistration}
        />

        <div className="neu-divider" />

        <ToggleRow
          label="Maintenance Mode"
          description="Enable to show a maintenance page to all non-admin visitors."
          checked={maintenanceMode}
          onCheckedChange={setMaintenanceMode}
        />

        {maintenanceMode && (
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="We'll be right back. PiForum is undergoing scheduled maintenance."
              className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message is shown to non-admin visitors while maintenance mode is on.
            </p>
          </div>
        )}
      </div>

      {/* 6. SEO */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Search}
          title="SEO"
          description="Search engine metadata and footer customization."
        />

        <div className="space-y-2">
          <Label htmlFor="seo-keywords">SEO Keywords</Label>
          <Input
            id="seo-keywords"
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
            placeholder="forum, community, discussion, neumorphism, piforum"
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated keywords for the meta keywords tag.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="seo-meta-desc">SEO Meta Description</Label>
            <span className={`text-xs ${seoMetaDescription.length > SEO_META_MAX ? 'text-destructive' : 'text-muted-foreground'}`}>
              {seoMetaDescription.length}/{SEO_META_MAX}
            </span>
          </div>
          <Textarea
            id="seo-meta-desc"
            value={seoMetaDescription}
            onChange={(e) => setSeoMetaDescription(e.target.value.slice(0, SEO_META_MAX))}
            maxLength={SEO_META_MAX}
            placeholder="PiForum — a modern neumorphic forum CMS. Join the conversation today."
            className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Search engines typically display up to {SEO_META_MAX} characters.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="footer-text">Footer Text</Label>
          <Input
            id="footer-text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Powered by PiForum"
            className="neu-input px-3 py-2.5"
          />
          <p className="text-xs text-muted-foreground">
            Shown in the footer of every page.
          </p>
        </div>

        <div className="neu-divider" />

        <ToggleRow
          label="Show Online Users"
          description="Display the list of currently online users."
          checked={showOnlineUsers}
          onCheckedChange={setShowOnlineUsers}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Show Statistics"
          description="Display forum statistics (threads, posts, members) on the home page."
          checked={showStatistics}
          onCheckedChange={setShowStatistics}
        />
        <div className="neu-divider my-1" />
        <ToggleRow
          label="Show Birthdays"
          description="Highlight today's birthdays on the home page."
          checked={showBirthdays}
          onCheckedChange={setShowBirthdays}
        />
      </div>

      {/* 7. Email (SMTP) */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Mail}
          title="Email (SMTP)"
          description="Configure outbound email for notifications, verification, and password resets."
        />

        <ToggleRow
          label="Enable SMTP"
          description="Use a custom SMTP server for sending email."
          checked={smtpEnabled}
          onCheckedChange={setSmtpEnabled}
        />

        {smtpEnabled && (
          <>
            <div className="neu-divider" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                  className="neu-input px-3 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  min="1"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="neu-input px-3 py-2.5"
                />
                <p className="text-xs text-muted-foreground">Common: 25, 465, 587, 2525.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">SMTP Username</Label>
                <Input
                  id="smtp-username"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="apikey or username"
                  className="neu-input px-3 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from-email">From Email</Label>
                <Input
                  id="smtp-from-email"
                  type="email"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                  className="neu-input px-3 py-2.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-from-name">From Name</Label>
                <Input
                  id="smtp-from-name"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder="PiForum"
                  className="neu-input px-3 py-2.5"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 8. Analytics */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={BarChart3}
          title="Analytics"
          description="Integrate an analytics provider to track forum traffic."
        />

        <ToggleRow
          label="Enable Analytics"
          description="Inject the analytics script across all pages."
          checked={analyticsEnabled}
          onCheckedChange={setAnalyticsEnabled}
        />

        {analyticsEnabled && (
          <>
            <div className="neu-divider" />
            <div className="space-y-2">
              <Label htmlFor="analytics-id">Analytics ID</Label>
              <Input
                id="analytics-id"
                value={analyticsId}
                onChange={(e) => setAnalyticsId(e.target.value)}
                placeholder="G-XXXXXXXXXX or UA-XXXXXXXX-X"
                className="neu-input px-3 py-2.5"
              />
              <p className="text-xs text-muted-foreground">
                Your Google Analytics measurement ID or equivalent tracking ID.
              </p>
            </div>
          </>
        )}
      </div>

      {/* 9. Upload Settings */}
      <div className="neu-card p-6 space-y-5">
        <SectionHeader
          icon={Cloud}
          title="Upload Settings"
          description="Configure attachment upload limits and allowed types."
        />

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
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
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
  onCheckedChange: (value: boolean) => void;
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
