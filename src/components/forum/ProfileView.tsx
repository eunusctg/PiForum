'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { ForumUser, Thread } from '@/lib/types';
import {
  User as UserIcon,
  Loader2,
  MapPin,
  Globe,
  Calendar,
  FileText,
  MessageSquare,
  Star,
  Clock,
  ArrowLeft,
  Pencil,
  Save,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Profile View — view a user's full profile                          */
/* ------------------------------------------------------------------ */

interface ProfileData extends ForumUser {
  recentThreads?: Thread[];
}

export default function ProfileView() {
  const { viewParams, currentUser, navigateTo, setCurrentUser } = useAppStore();
  const { toast } = useToast();

  const userId = viewParams.userId || currentUser?.id || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile =
    !!currentUser && !!profile && currentUser.id === profile.id;

  // ---------- Fetch profile ----------
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const headers: Record<string, string> = {};
      if (currentUser) headers['x-user-id'] = currentUser.id;

      const res = await fetch(`/api/profile/${userId}`, { headers });
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        const profileData = {
          ...(d.user || d),
          recentThreads: d.recentThreads || [],
        } as ProfileData;
        setProfile(profileData);
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ---------- Handlers ----------
  const handleBack = () => navigateTo('home');

  const handleThreadClick = (threadId: string) => {
    navigateTo('thread', { threadId });
  };

  const handleEditSaved = (updated: ProfileData) => {
    setProfile(updated);
    if (currentUser && updated.id === currentUser.id) {
      setCurrentUser(updated);
    }
  };

  // ================================================================
  //  RENDER — Not Found
  // ================================================================
  if (notFound) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="neu-btn p-2.5"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        </div>
        <div className="neu-card p-8 sm:p-12 text-center space-y-4">
          <div className="neu-circle p-5 mx-auto w-fit">
            <UserX className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">User not found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            This profile doesn&apos;t exist or may have been removed. The user
            ID might be invalid.
          </p>
          <button
            onClick={handleBack}
            className="neu-btn px-6 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  //  RENDER — Error
  // ================================================================
  if (error && !loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="neu-btn p-2.5"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        </div>
        <div className="neu-card p-6 sm:p-8 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={fetchProfile}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <Loader2 className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  //  RENDER — Loading
  // ================================================================
  if (loading || !profile) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-7 w-24" />
        </div>
        <ProfileSkeleton />
      </div>
    );
  }

  const name = profile.displayName || profile.username;
  const initial = name.charAt(0).toUpperCase();
  const roleLabel = getRoleLabel(profile.role);

  // ================================================================
  //  RENDER — Profile
  // ================================================================
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="neu-btn p-2.5"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        </div>
        {isOwnProfile && (
          <Button
            onClick={() => setEditOpen(true)}
            className="neu-btn px-4 py-2 text-sm font-medium shadow-none"
            variant="ghost"
          >
            <Pencil className="size-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* ---- Profile Header ---- */}
      <section className="neu-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="neu-circle p-1 shrink-0">
            <Avatar className="size-24 sm:size-28">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="text-3xl font-bold">
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {name}
              </h2>
              {profile.role > 0 && (
                <Badge
                  variant={profile.role >= 2 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {roleLabel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              @{profile.username}
            </p>

            {profile.bio && (
              <p className="text-sm mt-3 leading-relaxed max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 text-xs text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={normalizeUrl(profile.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="size-3.5" />
                  {displayUrl(profile.website)}
                  <ExternalLink className="size-3" />
                </a>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Joined {format(new Date(profile.createdAt), 'MMM yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                Last seen{' '}
                {formatDistanceToNow(new Date(profile.lastSeenAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Signature */}
        {profile.signature && (
          <div className="mt-6 pt-5 border-t border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Signature
            </p>
            <p className="text-sm italic text-muted-foreground">
              {profile.signature}
            </p>
          </div>
        )}
      </section>

      {/* ---- Stats Grid ---- */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Statistics
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<FileText className="size-5 text-primary" />}
            label="Threads"
            value={profile.threadCount ?? 0}
          />
          <StatCard
            icon={<MessageSquare className="size-5 text-primary" />}
            label="Posts"
            value={profile.postCount ?? 0}
          />
          <StatCard
            icon={<Star className="size-5 text-primary" />}
            label="Reputation"
            value={profile.reputation ?? 0}
          />
          <StatCard
            icon={<Clock className="size-5 text-primary" />}
            label="Last Seen"
            value={formatDistanceToNow(new Date(profile.lastSeenAt))}
            isText
          />
        </div>
      </section>

      {/* ---- Recent Threads ---- */}
      <section>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Recent Threads
        </h3>
        {!profile.recentThreads || profile.recentThreads.length === 0 ? (
          <div className="neu-card p-6 text-center text-sm text-muted-foreground">
            {isOwnProfile
              ? "You haven't started any threads yet."
              : 'This user has not started any threads yet.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.recentThreads.slice(0, 5).map((thread) => (
              <RecentThreadRow
                key={thread.id}
                thread={thread}
                onClick={() => handleThreadClick(thread.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Edit Profile Dialog ---- */}
      {isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onSaved={handleEditSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="neu-card p-4 sm:p-5 flex flex-col items-center text-center gap-2">
      <div className="neu-circle p-2">{icon}</div>
      <div className="text-xl sm:text-2xl font-bold">
        {isText ? (
          <span className="text-sm sm:text-base">{value}</span>
        ) : (
          (value as number).toLocaleString()
        )}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent Thread Row                                                  */
/* ------------------------------------------------------------------ */

function RecentThreadRow({
  thread,
  onClick,
}: {
  thread: Thread;
  onClick: () => void;
}) {
  // Try to derive forum name from any attached forum object
  const forumName = (thread as Thread & { forum?: { name: string } }).forum
    ?.name;

  return (
    <button
      onClick={onClick}
      className="neu-card w-full text-left p-4 group flex items-center gap-3"
    >
      <div className="neu-circle p-2 shrink-0">
        <FileText className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
          {thread.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {forumName && <span>{forumName}</span>}
          {forumName && <span>·</span>}
          <span>
            {formatDistanceToNow(new Date(thread.createdAt), {
              addSuffix: true,
            })}
          </span>
          <span>·</span>
          <span>{thread.postCount ?? 0} posts</span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit Profile Dialog                                                */
/* ------------------------------------------------------------------ */

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  onSaved: (updated: ProfileData) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    displayName: profile.displayName || '',
    bio: profile.bio || '',
    location: profile.location || '',
    website: profile.website || '',
    signature: profile.signature || '',
    avatarUrl: profile.avatarUrl || '',
  });

  // Reset form when profile changes
  useEffect(() => {
    setForm({
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      signature: profile.signature || '',
      avatarUrl: profile.avatarUrl || '',
    });
  }, [profile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/profile/${profile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.id,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...profile, ...form } as ProfileData;
        if (data.data) {
          Object.assign(updated, data.data);
        }
        onSaved(updated);
        onOpenChange(false);
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been saved successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information. All fields are optional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-displayName">Display Name</Label>
            <Input
              id="edit-displayName"
              value={form.displayName}
              onChange={(e) =>
                setForm((f) => ({ ...f, displayName: e.target.value }))
              }
              placeholder="Your display name"
              className="neu-input px-3 py-2.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-avatarUrl">Avatar URL</Label>
            <Input
              id="edit-avatarUrl"
              value={form.avatarUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, avatarUrl: e.target.value }))
              }
              placeholder="https://example.com/avatar.png"
              className="neu-input px-3 py-2.5"
            />
            {form.avatarUrl && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="size-10">
                  <AvatarImage src={form.avatarUrl} alt="Preview" />
                  <AvatarFallback className="text-xs">?</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className="neu-input px-3 py-2.5 min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="City, Country"
                className="neu-input px-3 py-2.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={form.website}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
                placeholder="https://yoursite.com"
                className="neu-input px-3 py-2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-signature">Signature</Label>
            <Textarea
              id="edit-signature"
              value={form.signature}
              onChange={(e) =>
                setForm((f) => ({ ...f, signature: e.target.value }))
              }
              placeholder="A short tagline that appears under your posts..."
              className="neu-input px-3 py-2.5 min-h-[60px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="neu-btn px-4 py-2 text-sm shadow-none"
              disabled={saving}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="neu-btn px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
          >
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ProfileSkeleton() {
  return (
    <>
      <div className="neu-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Skeleton className="size-24 sm:size-28 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-40 mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-24 mx-auto sm:mx-0" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-3 justify-center sm:justify-start">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="neu-card p-4 sm:p-5 flex flex-col items-center gap-2"
          >
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neu-card p-4 flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRoleLabel(role: number): string {
  switch (role) {
    case 3:
      return 'Super Admin';
    case 2:
      return 'Admin';
    case 1:
      return 'Moderator';
    default:
      return 'Member';
  }
}

function normalizeUrl(url: string): string {
  if (!url) return '#';
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}
