'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Thread } from '@/lib/types';
import {
  MessageSquare,
  Pin,
  Lock,
  Clock,
  Eye,
  User,
  TrendingUp,
  FolderOpen,
  ChevronRight,
  FileText,
  Plus,
  Edit3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import VerifiedBadge from '@/components/forum/VerifiedBadge';
import FeaturedPostsSlider from '@/components/forum/FeaturedPostsSlider';

/* ------------------------------------------------------------------ */
/*  Forum Home — Flat "All Discussions" view (Flarum/Discourse style)  */
/*                                                                    */
/*  No category/forum nesting. Every thread across the site is shown   */
/*  in one flat list sorted by Recent / Top / Pinned.                  */
/*  Community Stats removed per design request.                        */
/* ------------------------------------------------------------------ */

type SortMode = 'recent' | 'top' | 'pinned';

export default function ForumHome() {
  const { currentUser, navigateTo, getSetting } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);

  const [sort, setSort] = useState<SortMode>('recent');

  // ---------- fetch threads (flat, global) ----------
  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/threads?page=1&limit=30');
      const data = await res.json();
      if (data.success) {
        setThreads(data.data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchThreads();
  }, [fetchThreads]);

  // ---------- derived ----------
  const forumName = getSetting('forum_name', 'PiForum');
  const forumDescription = getSetting(
    'forum_description',
    'Stop scrolling dead forums. Piforum delivers battle-tested tutorials and raw expert knowledge. Post your guides, crush doubts, and own the conversation.',
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

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="relative w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* ---- Toolbar: sort tabs ---- */}
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
      </section>

      {/* ---- Featured Posts Slider ---- */}
      <FeaturedPostsSlider />

      {/* ---- Flat Thread List ---- */}
      {loading ? (
        <ThreadListSkeletons />
      ) : sortedThreads.length === 0 ? (
        <EmptyThreadState
          canPost={!!currentUser}
          onNewThread={handleNewThread}
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {sortedThreads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread.id)}
            />
          ))}
        </div>
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
/*  Thread Row (flat) — No user avatar, neumorphic soft UI, responsive */
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
  const replies = Math.max(0, (thread.postCount ?? 0) - 1);
  const isEdited = thread.updatedAt !== thread.createdAt;

  return (
    <button
      onClick={onClick}
      className="neu-card neu-card-3d w-full text-left p-3 sm:p-4 lg:p-5 group"
    >
      <div className="flex flex-col gap-2">
        {/* Top row: Badges + Title */}
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
            {/* Edited text beside lock badge */}
            {isEdited && !thread.locked && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 h-5 gap-0.5 text-muted-foreground"
              >
                <Edit3 className="size-3" />
                Edited
              </Badge>
            )}
            {isEdited && thread.locked && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 h-5 gap-0.5 text-muted-foreground"
              >
                <Edit3 className="size-3" />
                Edited
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

        {/* Meta row — compact, responsive */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
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
              }}
            >
              <FolderOpen className="size-3" />
              {thread.forum.category ? (
                <>
                  {thread.forum.category.icon && (
                    <span className="text-xs leading-none">{thread.forum.category.icon}</span>
                  )}
                  <span className="hidden sm:inline hover:text-primary transition-colors">{thread.forum.category.name}</span>
                  <ChevronRight className="size-2.5 opacity-50" />
                  <span>{thread.forum.name}</span>
                </>
              ) : (
                thread.forum.name
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <FolderOpen className="size-3" />
              Uncategorized
            </span>
          )}
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {replies}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="size-3" />
            {thread.views}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyThreadState({
  canPost,
  onNewThread,
}: {
  canPost: boolean;
  onNewThread: () => void;
}) {
  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-4">
      <div className="neu-circle p-4 mx-auto w-fit">
        <FileText className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        No discussions yet
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        Be the first to start a conversation on PiForum!
      </p>
      {canPost && (
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
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function ThreadListSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="neu-card p-3 sm:p-5"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
