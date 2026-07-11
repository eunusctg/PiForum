'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Thread, ForumStats, Tag } from '@/lib/types';
import {
  MessageSquare,
  Users,
  FileText,
  Star,
  Plus,
  Loader2,
  Pin,
  Lock,
  Clock,
  Eye,
  User,
  Home as HomeIcon,
  Hash,
  X,
  Flame,
  TrendingUp,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import VerifiedBadge from '@/components/forum/VerifiedBadge';

/* ------------------------------------------------------------------ */
/*  Forum Home — Flat "All Discussions" view (Flarum/Discourse style)  */
/*                                                                    */
/*  No category/forum nesting. Every thread across the site is shown   */
/*  in one flat list. Tags act as filters (pills above the list).      */
/* ------------------------------------------------------------------ */

type SortMode = 'recent' | 'top' | 'pinned';

export default function ForumHome() {
  const { currentUser, navigateTo, getSetting } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---------- fetch threads (flat, global) ----------
  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: '1', limit: '30' });
      if (activeTag) params.set('tag', activeTag);
      const res = await fetch(`/api/threads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setThreads(data.data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTag]);

  // ---------- fetch tags ----------
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.success) {
        setTags(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, []);

  // ---------- fetch stats ----------
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
    fetchStats();
  }, [fetchTags, fetchStats]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // ---------- derived ----------
  const forumName = getSetting('forum_name', 'PiForum');
  const forumDescription = getSetting(
    'forum_description',
    'A community for thoughtful discussions.',
  );

  const sortedThreads = useMemo(() => {
    const list = [...threads];
    if (sort === 'top') {
      list.sort(
        (a, b) =>
          (b.postCount ?? 0) - (a.postCount ?? 0) || b.views - a.views,
      );
    } else if (sort === 'pinned') {
      list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    }
    // 'recent' already comes sorted by updatedAt desc from the API
    return list;
  }, [threads, sort]);

  // ---------- handlers ----------
  const handleNewThread = () => navigateTo('new-thread');
  const handleThreadClick = (threadId: string) =>
    navigateTo('thread', { threadId });

  const handleTagClick = (slug: string) => {
    setActiveTag((prev) => (prev === slug ? null : slug));
  };

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ---- Hero Section ---- */}
      <section className="neu-card p-6 sm:p-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="neu-circle p-3">
            <MessageSquare className="size-7 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {forumName}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {forumDescription}
        </p>
      </section>

      {/* ---- Toolbar: sort tabs + New Thread button ---- */}
      <section className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <SortTab
            active={sort === 'recent'}
            onClick={() => setSort('recent')}
            icon={<Clock className="size-3.5" />}
            label="Recent"
          />
          <SortTab
            active={sort === 'top'}
            onClick={() => setSort('top')}
            icon={<TrendingUp className="size-3.5" />}
            label="Top"
          />
          <SortTab
            active={sort === 'pinned'}
            onClick={() => setSort('pinned')}
            icon={<Pin className="size-3.5" />}
            label="Pinned"
          />
        </div>

        {currentUser && (
          <button
            onClick={handleNewThread}
            className="neu-btn px-4 py-2.5 text-sm font-medium text-primary flex items-center gap-2"
          >
            <Plus className="size-4" />
            New Thread
          </button>
        )}
      </section>

      {/* ---- Tag filter pills (only if there are tags) ---- */}
      {tags.length > 0 && (
        <section className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Hash className="size-3" />
            Tags
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.slice(0, 12).map((tag) => (
              <TagPill
                key={tag.id}
                tag={tag}
                active={activeTag === tag.slug}
                onClick={() => handleTagClick(tag.slug)}
              />
            ))}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="size-3" />
                Clear
              </button>
            )}
          </div>
        </section>
      )}

      {/* ---- Flat Thread List ---- */}
      {loading ? (
        <ThreadListSkeletons />
      ) : sortedThreads.length === 0 ? (
        <EmptyThreadState
          hasFilter={!!activeTag}
          canPost={!!currentUser}
          onNewThread={handleNewThread}
        />
      ) : (
        <div className="space-y-3">
          {sortedThreads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread.id)}
            />
          ))}
        </div>
      )}

      {/* ---- Forum Statistics ---- */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Community Stats
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="size-5 text-primary" />}
            label="Total Members"
            value={statsLoading ? null : stats?.totalUsers ?? 0}
          />
          <StatCard
            icon={<FileText className="size-5 text-primary" />}
            label="Total Threads"
            value={statsLoading ? null : stats?.totalThreads ?? 0}
          />
          <StatCard
            icon={<MessageSquare className="size-5 text-primary" />}
            label="Total Posts"
            value={statsLoading ? null : stats?.totalPosts ?? 0}
          />
          <StatCard
            icon={<Star className="size-5 text-primary" />}
            label="Newest Member"
            value={
              statsLoading
                ? null
                : stats?.recentUsers?.[0]?.displayName ||
                  stats?.recentUsers?.[0]?.username ||
                  '—'
            }
            isText
          />
        </div>
      </section>

      {/* ---- Floating New Thread Button (mobile) ---- */}
      {currentUser && (
        <button
          onClick={handleNewThread}
          className="fixed bottom-6 right-6 neu-btn p-4 text-primary hover:text-primary/80 z-50 sm:hidden"
          aria-label="Create new thread"
        >
          <Plus className="size-6" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort Tab                                                           */
/* ------------------------------------------------------------------ */

function SortTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`neu-btn px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-all ${
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Pill                                                           */
/* ------------------------------------------------------------------ */

function TagPill({
  tag,
  active,
  onClick,
}: {
  tag: Tag;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        active
          ? 'neu-btn text-primary'
          : 'neu-card-inset text-muted-foreground hover:text-foreground'
      }`}
      style={
        tag.color && !active
          ? { color: tag.color }
          : undefined
      }
    >
      <Hash className="size-3" />
      {tag.name}
      <span className="text-[10px] opacity-60">{tag.usageCount}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Thread Row (flat, tag-aware)                                       */
/* ------------------------------------------------------------------ */

function ThreadRow({
  thread,
  onClick,
}: {
  thread: Thread;
  onClick: () => void;
}) {
  const authorName =
    thread.author?.displayName || thread.author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const replies = Math.max(0, (thread.postCount ?? 0) - 1);

  return (
    <button
      onClick={onClick}
      className="neu-card w-full text-left p-4 sm:p-5 group"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          <div className="neu-circle p-0.5">
            <Avatar className="size-9 sm:size-10">
              {thread.author?.avatarUrl ? (
                <AvatarImage
                  src={thread.author.avatarUrl}
                  alt={authorName}
                />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 flex-wrap">
            {/* Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {thread.pinned && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 h-5 gap-0.5"
                >
                  <Pin className="size-3" />
                  Pinned
                </Badge>
              )}
              {thread.locked && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-5 gap-0.5"
                >
                  <Lock className="size-3" />
                  Locked
                </Badge>
              )}
              {thread.solved && (
                <Badge className="text-xs px-1.5 py-0 h-5 gap-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20">
                  Solved
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors leading-snug">
              {thread.title}
            </h3>
          </div>

          {/* Tags row */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {thread.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
                  style={tag.color ? { color: tag.color } : undefined}
                >
                  <Hash className="size-2.5" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {authorName}
              {thread.author?.isVerified && <VerifiedBadge size="xs" />}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDistanceToNow(new Date(thread.createdAt), {
                addSuffix: true,
              })}
            </span>
            {thread.forum ? (
              <span
                className="inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to the forum
                }}
              >
                <FolderOpen className="size-3" />
                {thread.forum.name}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="size-3" />
                Uncategorized
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {replies} replies
            </span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {thread.views} views
            </span>
          </div>
        </div>

        {/* Right-side stats (desktop) */}
        <div className="hidden md:flex items-center gap-4 shrink-0 text-center">
          <div>
            <div className="text-sm font-semibold">{thread.postCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div>
            <div className="text-sm font-semibold">{thread.views}</div>
            <div className="text-xs text-muted-foreground">Views</div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyThreadState({
  hasFilter,
  canPost,
  onNewThread,
}: {
  hasFilter: boolean;
  canPost: boolean;
  onNewThread: () => void;
}) {
  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-4">
      <div className="neu-circle p-4 mx-auto w-fit">
        {hasFilter ? (
          <Hash className="size-10 text-muted-foreground" />
        ) : (
          <FileText className="size-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-semibold">
        {hasFilter ? 'No threads with this tag' : 'No discussions yet'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {hasFilter
          ? 'Try a different tag or clear the filter to see all discussions.'
          : 'Be the first to start a conversation in the community!'}
      </p>
      {canPost && !hasFilter && (
        <button
          onClick={onNewThread}
          className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
        >
          <Plus className="size-4" />
          Start a Discussion
        </button>
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
  value: number | string | null;
  isText?: boolean;
}) {
  return (
    <div className="neu-card p-4 sm:p-5 flex flex-col items-center text-center gap-2">
      <div className="neu-circle p-2">{icon}</div>
      <div className="text-xl sm:text-2xl font-bold">
        {value === null ? (
          <Skeleton className="h-7 w-16 mx-auto" />
        ) : isText ? (
          <span className="text-base sm:text-lg truncate max-w-full">
            {value}
          </span>
        ) : (
          value.toLocaleString()
        )}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function ThreadListSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
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
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}
