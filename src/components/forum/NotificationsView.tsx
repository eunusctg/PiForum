'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { NotificationItem, AppView } from '@/lib/types';
import {
  Bell,
  Loader2,
  Reply,
  AtSign,
  ThumbsUp,
  Bookmark as BookmarkIcon,
  Flag,
  Info,
  Trash2,
  CheckCheck,
  ArrowLeft,
  LogIn,
  ExternalLink,
  ShieldAlert,
  Heart,
  PartyPopper,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday, subDays, isAfter, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Notification type config — icon + color                            */
/* ------------------------------------------------------------------ */

const NOTIFICATION_TYPE_CONFIG: Record<string, { icon: typeof Bell; emoji: string; color: string }> = {
  reply:    { icon: Reply,   emoji: '💬', color: 'text-emerald-500' },
  mention:  { icon: AtSign,  emoji: '@',  color: 'text-amber-500' },
  like:     { icon: Heart,   emoji: '❤️', color: 'text-rose-500' },
  vote:     { icon: ThumbsUp,emoji: '👍',  color: 'text-emerald-500' },
  bookmark: { icon: BookmarkIcon, emoji: '🔖', color: 'text-violet-500' },
  login:    { icon: LogIn,   emoji: '🔐', color: 'text-orange-500' },
  system:   { icon: Info,    emoji: '📢', color: 'text-primary' },
  welcome:  { icon: PartyPopper, emoji: '🎉', color: 'text-pink-500' },
  report:   { icon: Flag,    emoji: '🚩',  color: 'text-red-500' },
  follow:   { icon: Heart,   emoji: '👥',  color: 'text-sky-500' },
};

/* ------------------------------------------------------------------ */
/*  Date grouping helper                                               */
/* ------------------------------------------------------------------ */

interface GroupedNotifications {
  label: string;
  notifications: NotificationItem[];
}

function groupByDate(notifications: NotificationItem[]): GroupedNotifications[] {
  const now = new Date();
  const thisWeekStart = subDays(now, 7);

  const groups: GroupedNotifications[] = [];
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  for (const n of notifications) {
    const date = new Date(n.createdAt);
    if (isToday(date)) {
      today.push(n);
    } else if (isYesterday(date)) {
      yesterday.push(n);
    } else if (isAfter(date, thisWeekStart)) {
      thisWeek.push(n);
    } else {
      earlier.push(n);
    }
  }

  if (today.length > 0) groups.push({ label: 'Today', notifications: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', notifications: thisWeek });
  if (earlier.length > 0) groups.push({ label: 'Earlier', notifications: earlier });

  return groups;
}

/* ------------------------------------------------------------------ */
/*  Notification sound                                                 */
/* ------------------------------------------------------------------ */

let _audioCtx: AudioContext | null = null;

function playNotificationSound() {
  try {
    if (!_audioCtx) {
      _audioCtx = new AudioContext();
    }
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.setValueAtTime(880, _audioCtx.currentTime);
    osc.frequency.setValueAtTime(660, _audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.3);
    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.3);
  } catch {
    // Audio not supported or blocked by browser policy
  }
}

/* ------------------------------------------------------------------ */
/*  Notifications View — current user's notifications                  */
/* ------------------------------------------------------------------ */

export default function NotificationsView() {
  const { currentUser, navigateTo, setAuthModalOpen } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const prevCountRef = useRef(0);

  // ---------- Fetch ----------
  const fetchNotifications = useCallback(async (p: number = 1) => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(p === 1);
      setError(null);
      const res = await fetch(`/api/notifications?page=${p}&limit=25`, {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data?.notifications || data.data || [];
        setNotifications(list as NotificationItem[]);
        setTotal(data.data?.total ?? list.length);
        setTotalPages(data.data?.totalPages ?? 1);
        setPage(p);

        // Play notification sound if new unread notifications appeared
        const newUnread = (list as NotificationItem[]).filter((n) => !n.read).length;
        if (newUnread > prevCountRef.current && prevCountRef.current > 0) {
          playNotificationSound();
        }
        prevCountRef.current = newUnread;
      } else {
        setError(data.error || 'Failed to load notifications');
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => fetchNotifications(page), 30000);
    return () => clearInterval(interval);
  }, [currentUser, page, fetchNotifications]);

  // ---------- Derived ----------
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---------- Handlers ----------
  const handleMarkAll = async () => {
    if (!currentUser) return;
    try {
      setMarkingAll(true);
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast({
          title: 'All Caught Up',
          description: 'All notifications marked as read',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to mark notifications as read',
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
      setMarkingAll(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!currentUser) return;
    try {
      setMarkingId(id);
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to mark as read',
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
      setMarkingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast({
          title: 'Notification Deleted',
          description: 'The notification has been removed',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete notification',
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
      setDeletingId(null);
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark as read when clicking
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    if (!notification.link) return;
    try {
      const url = new URL(notification.link, window.location.origin);
      // Check if it's an internal link (same origin or relative)
      if (url.origin === window.location.origin || notification.link.startsWith('/')) {
        // Parse path-based routes
        const path = url.pathname;
        const pathMatch = path.match(/^\/thread\/(.+)$/);
        if (pathMatch) {
          navigateTo('thread', { threadId: pathMatch[1] });
          return;
        }
        const forumMatch = path.match(/^\/forum\/(.+)$/);
        if (forumMatch) {
          navigateTo('forum', { forumId: forumMatch[1] });
          return;
        }
        const profileMatch = path.match(/^\/profile\/(.+)$/);
        if (profileMatch) {
          navigateTo('profile', { userId: profileMatch[1] });
          return;
        }
        // Fallback: check search params
        const view = url.searchParams.get('view') as AppView | null;
        if (view) {
          const params: Record<string, string> = {};
          url.searchParams.forEach((value, key) => {
            if (key !== 'view') params[key] = value;
          });
          navigateTo(view, params);
        }
      } else {
        // External link — open in new tab
        window.open(notification.link, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL — ignore
    }
  };

  const handleBack = () => navigateTo('home');
  const handleLogin = () => setAuthModalOpen(true);

  // Group notifications by date
  const grouped = groupByDate(notifications);

  // ================================================================
  //  RENDER — Login required
  // ================================================================
  if (!currentUser) {
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
          <div className="flex items-center gap-2">
            <div className="neu-circle p-2.5">
              <Bell className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          </div>
        </div>
        <div className="neu-card p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="neu-circle p-5 mx-auto w-fit">
            <LogIn className="size-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Login required</h3>
          <p className="text-muted-foreground text-sm">
            Sign in to see replies, mentions, votes, and other activity
            related to your account.
          </p>
          <button
            onClick={handleLogin}
            className="neu-btn px-6 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2"
          >
            <LogIn className="size-4" />
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  //  RENDER — Authenticated
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
          <div className="flex items-center gap-2">
            <div className="neu-circle p-2.5 relative">
              <Bell className="size-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'All caught up'}
              </p>
            </div>
          </div>
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="neu-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-primary inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            <span className="hidden sm:inline">Mark all as read</span>
            <span className="sm:hidden">Mark all</span>
          </button>
        )}
      </div>

      {/* ---- Error ---- */}
      {error && !loading && (
        <div className="neu-card p-6 sm:p-8 text-center space-y-3">
          <div className="neu-circle p-4 mx-auto w-fit">
            <ShieldAlert className="size-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={() => fetchNotifications(page)}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <Loader2 className="size-4" />
            Retry
          </button>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading && <NotificationsSkeleton />}

      {/* ---- Empty State ---- */}
      {!loading && !error && notifications.length === 0 && (
        <div className="neu-card p-8 sm:p-12 text-center space-y-4">
          <div className="neu-circle p-5 mx-auto w-fit">
            <Bell className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No notifications</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            You don&apos;t have any notifications yet. When someone replies to
            your posts, mentions you, or votes on your content, you&apos;ll see
            it here.
          </p>
        </div>
      )}

      {/* ---- Grouped Notifications List ---- */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              {/* Date group header */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">
                  {group.notifications.length}
                </span>
              </div>

              {/* Notification cards */}
              <div className="space-y-2">
                {group.notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onMarkRead={() => handleMarkAsRead(notification.id)}
                    onDelete={() => handleDelete(notification.id)}
                    markingRead={markingId === notification.id}
                    deleting={deletingId === notification.id}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => fetchNotifications(page - 1)}
                disabled={page <= 1}
                className="neu-btn p-2 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchNotifications(page + 1)}
                disabled={page >= totalPages}
                className="neu-btn p-2 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Notification Card                                                  */
/* ------------------------------------------------------------------ */

function NotificationCard({
  notification,
  onClick,
  onMarkRead,
  onDelete,
  markingRead,
  deleting,
}: {
  notification: NotificationItem;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  markingRead: boolean;
  deleting: boolean;
}) {
  const actorName =
    notification.actor?.displayName ||
    notification.actor?.username ||
    null;
  const actorInitial = actorName ? actorName.charAt(0).toUpperCase() : '?';
  const clickable = !!notification.link;
  const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type];
  const TypeIcon = typeConfig?.icon || Bell;
  const typeColor = typeConfig?.color || 'text-muted-foreground';

  return (
    <div
      className={`neu-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 group transition-colors ${
        !notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
      }`}
    >
      {/* Type icon */}
      <div className="neu-circle p-2.5 shrink-0 relative">
        <TypeIcon className={`size-4 ${notification.read ? 'text-muted-foreground' : typeColor}`} />
        {!notification.read && (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-primary rounded-full border-2 border-background" />
        )}
      </div>

      {/* Actor avatar + content */}
      <button
        onClick={onClick}
        disabled={!clickable}
        className={`min-w-0 flex-1 text-left ${
          clickable ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {notification.actor && (
            <div className="shrink-0 mt-0.5">
              <div className="neu-circle p-0.5">
                <Avatar className="size-7 sm:size-8">
                  {notification.actor.avatarUrl ? (
                    <AvatarImage
                      src={notification.actor.avatarUrl}
                      alt={actorName || 'User'}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs font-semibold">
                    {actorInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">
              {notification.title}
            </p>
            {notification.body && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.body}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {actorName && (
                <>
                  <span>·</span>
                  <span>by {actorName}</span>
                </>
              )}
              {clickable && (
                <ExternalLink className="size-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && (
          <button
            onClick={onMarkRead}
            disabled={markingRead}
            className="neu-btn p-2 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            aria-label="Mark as read"
            title="Mark as read"
          >
            {markingRead ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={deleting}
          className="neu-btn p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          aria-label="Delete notification"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((g) => (
        <div key={g}>
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="neu-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4"
              >
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="size-8 rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
