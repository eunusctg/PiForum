'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Bookmark, Thread, Forum, ForumUser } from '@/lib/types';
import {
  Bookmark as BookmarkIcon,
  Loader2,
  BookmarkX,
  MessageSquare,
  Clock,
  FileText,
  ArrowLeft,
  LogIn,
  LayoutGrid,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Bookmarks View — current user's bookmarked threads                 */
/* ------------------------------------------------------------------ */

interface BookmarkRow extends Bookmark {
  thread: Thread & {
    forum?: Pick<Forum, 'id' | 'name'>;
    author?: Pick<ForumUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  };
}

export default function BookmarksView() {
  const { currentUser, navigateTo, setAuthModalOpen } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ---------- Fetch bookmarks ----------
  const fetchBookmarks = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/bookmarks', {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data?.bookmarks || data.data || [];
        setBookmarks(list as BookmarkRow[]);
      } else {
        setError(data.error || 'Failed to load bookmarks');
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // ---------- Handlers ----------
  const handleThreadClick = (threadId: string) => {
    navigateTo('thread', { threadId });
  };

  const handleRemove = async (threadId: string) => {
    if (!currentUser) return;
    try {
      setRemovingId(threadId);
      const res = await fetch(`/api/bookmarks/${threadId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        setBookmarks((prev) => prev.filter((b) => b.threadId !== threadId));
        toast({
          title: 'Bookmark Removed',
          description: 'Thread removed from your bookmarks',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to remove bookmark',
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
      setRemovingId(null);
    }
  };

  const handleBrowse = () => navigateTo('home');
  const handleBack = () => navigateTo('home');
  const handleLogin = () => setAuthModalOpen(true);

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
              <BookmarkIcon className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
          </div>
        </div>
        <div className="neu-card p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="neu-circle p-5 mx-auto w-fit">
            <LogIn className="size-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Login required</h3>
          <p className="text-muted-foreground text-sm">
            Sign in to view and manage your bookmarked threads across the
            community.
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
            <BookmarkIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bookmarks</h1>
            <p className="text-xs text-muted-foreground">
              {bookmarks.length} saved thread{bookmarks.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Error ---- */}
      {error && !loading && (
        <div className="neu-card p-6 sm:p-8 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={fetchBookmarks}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <Loader2 className="size-4" />
            Retry
          </button>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading && <BookmarksSkeleton />}

      {/* ---- Empty State ---- */}
      {!loading && !error && bookmarks.length === 0 && (
        <div className="neu-card p-8 sm:p-12 text-center space-y-4">
          <div className="neu-circle p-5 mx-auto w-fit">
            <BookmarkX className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No bookmarks yet</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            You haven&apos;t saved any threads yet. Browse the forums and tap
            the bookmark icon on threads you want to revisit later.
          </p>
          <button
            onClick={handleBrowse}
            className="neu-btn px-6 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <LayoutGrid className="size-4" />
            Browse Forums
          </button>
        </div>
      )}

      {/* ---- Bookmark List ---- */}
      {!loading && !error && bookmarks.length > 0 && (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onThreadClick={() => handleThreadClick(bookmark.threadId)}
              onRemove={() => handleRemove(bookmark.threadId)}
              removing={removingId === bookmark.threadId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bookmark Card                                                      */
/* ------------------------------------------------------------------ */

function BookmarkCard({
  bookmark,
  onThreadClick,
  onRemove,
  removing,
}: {
  bookmark: BookmarkRow;
  onThreadClick: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  const thread = bookmark.thread;
  const authorName =
    thread?.author?.displayName || thread?.author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const replyCount = (thread?.postCount ?? 0) > 0 ? thread!.postCount! - 1 : 0;

  return (
    <div className="neu-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4 group">
      {/* Author avatar */}
      <div className="shrink-0 mt-0.5">
        <div className="neu-circle p-0.5">
          <Avatar className="size-9 sm:size-10">
            {thread?.author?.avatarUrl ? (
              <AvatarImage src={thread.author.avatarUrl} alt={authorName} />
            ) : null}
            <AvatarFallback className="text-xs font-semibold">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <button
        onClick={onThreadClick}
        className="min-w-0 flex-1 text-left"
      >
        <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors leading-snug line-clamp-2">
          {thread?.title || 'Unknown thread'}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {thread?.forum?.name && (
            <span className="flex items-center gap-1">
              <LayoutGrid className="size-3" />
              {thread.forum.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <FileText className="size-3" />
            {authorName}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {replyCount} replies
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Bookmarked{' '}
            {formatDistanceToNow(new Date(bookmark.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </button>

      {/* Unbookmark button */}
      <button
        onClick={onRemove}
        disabled={removing}
        className="neu-btn p-2.5 shrink-0 text-primary hover:text-destructive transition-colors disabled:opacity-50"
        aria-label="Remove bookmark"
        title="Remove bookmark"
      >
        {removing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BookmarkIcon className="size-4 fill-current" />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function BookmarksSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="neu-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4"
        >
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="size-9 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
