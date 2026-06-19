'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Category, ForumStats, Forum } from '@/lib/types';
import {
  MessageSquare,
  Users,
  FileText,
  Star,
  ChevronRight,
  Plus,
  Loader2,
  Pin,
  Clock,
  LayoutGrid,
  X,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/* ------------------------------------------------------------------ */
/*  Forum Home — Categories & Forums overview                         */
/* ------------------------------------------------------------------ */

interface ForumHomeProps {
  onNavigateForum?: (forumId: string) => void;
}

export default function ForumHome({ onNavigateForum }: ForumHomeProps) {
  const {
    categories,
    setCategories,
    currentUser,
    navigateTo,
    getSetting,
    settings,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---------- fetch categories ----------
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [setCategories]);

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
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  // ---------- handlers ----------
  const handleForumClick = (forumId: string) => {
    if (onNavigateForum) {
      onNavigateForum(forumId);
    } else {
      navigateTo('forum', { forumId });
    }
  };

  const [showForumPicker, setShowForumPicker] = useState(false);
  const [allForums, setAllForums] = useState<Forum[]>([]);
  const [forumPickerLoading, setForumPickerLoading] = useState(false);
  const [forumSearch, setForumSearch] = useState('');

  const handleNewThread = useCallback(async () => {
    // Fetch all forums so the user can pick one to post in.
    setForumPickerLoading(true);
    setShowForumPicker(true);
    try {
      const res = await fetch('/api/forums?categoryId=all');
      const data = await res.json();
      if (data.success) {
        setAllForums(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch forums for picker:', err);
    } finally {
      setForumPickerLoading(false);
    }
  }, []);

  const handlePickForum = (forumId: string) => {
    setShowForumPicker(false);
    setForumSearch('');
    navigateTo('new-thread', { forumId });
  };

  const filteredForums = forumSearch.trim()
    ? allForums.filter(
        (f) =>
          f.name.toLowerCase().includes(forumSearch.toLowerCase()) ||
          (f.description ?? '').toLowerCase().includes(forumSearch.toLowerCase())
      )
    : allForums;

  // ---------- derived ----------
  const forumName = getSetting('forum_name', 'PiForum');
  const forumDescription = getSetting('forum_description', 'Welcome to the community forum');

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* ---- Hero Section ---- */}
      <section className="neu-card p-6 sm:p-8 text-center space-y-4">
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
        {currentUser && (
          <button
            onClick={handleNewThread}
            className="neu-btn inline-flex items-center gap-2 px-5 py-2.5 text-primary hover:text-primary/80 font-semibold text-sm transition-all"
            aria-label="Create new thread"
          >
            <Plus className="size-4" />
            New Thread
          </button>
        )}
      </section>

      {/* ---- Category Sections ---- */}
      {loading ? (
        <CategorySkeletons />
      ) : categories.length === 0 ? (
        <section className="neu-card p-8 text-center">
          <LayoutGrid className="size-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No categories yet</h3>
          <p className="text-muted-foreground text-sm">
            The forum is being set up. Check back soon!
          </p>
        </section>
      ) : (
        categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            onForumClick={handleForumClick}
          />
        ))
      )}

      {/* ---- Forum Statistics ---- */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="size-5 text-primary" />
          Forum Statistics
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

      {/* ---- Forum Picker Dialog (for "New Thread" from home) ---- */}
      <Dialog open={showForumPicker} onOpenChange={setShowForumPicker}>
        <DialogContent className="neu-card-static border-0 sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Plus className="size-5 text-primary" />
              Choose a Forum
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select which forum you&apos;d like to post your new thread in.
            </p>
          </DialogHeader>

          {/* Search */}
          <div className="px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search forums..."
                value={forumSearch}
                onChange={(e) => setForumSearch(e.target.value)}
                className="neu-input w-full h-10 pl-9 pr-9 text-sm placeholder:text-muted-foreground"
              />
              {forumSearch && (
                <button
                  onClick={() => setForumSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Forum list */}
          <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto">
            {forumPickerLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredForums.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No forums found. Try a different search.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredForums.map((forum) => {
                  const cat = categories.find((c) => c.id === forum.categoryId);
                  return (
                    <button
                      key={forum.id}
                      onClick={() => handlePickForum(forum.id)}
                      className="neu-btn p-3 flex items-center gap-3 text-left hover:text-primary transition-all"
                    >
                      <span className="text-xl shrink-0">{forum.icon || '💬'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{forum.name}</span>
                          {cat && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                              {cat.icon} {cat.name}
                            </span>
                          )}
                        </div>
                        {forum.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {forum.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Section                                                   */
/* ------------------------------------------------------------------ */

function CategorySection({
  category,
  onForumClick,
}: {
  category: Category;
  onForumClick: (forumId: string) => void;
}) {
  return (
    <section>
      {/* Category Header */}
      <div className="neu-card p-4 sm:p-5 mb-1">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5">
            {category.icon ? (
              <span className="text-lg">{category.icon}</span>
            ) : (
              <LayoutGrid className="size-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {category.name}
            </h2>
            {category.description && (
              <p className="text-muted-foreground text-xs sm:text-sm truncate">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Forum List */}
      <div className="space-y-2 mt-2">
        {category.forums && category.forums.length > 0 ? (
          category.forums.map((forum) => (
            <ForumRow
              key={forum.id}
              forum={forum}
              onClick={() => onForumClick(forum.id)}
            />
          ))
        ) : (
          <div className="neu-card-inset p-4 text-center text-muted-foreground text-sm">
            No forums in this category
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Forum Row                                                          */
/* ------------------------------------------------------------------ */

interface ForumRowData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  threadCount: number;
  postCount: number;
  lastPostAt: string | null;
}

function ForumRow({ forum, onClick }: { forum: ForumRowData; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="neu-card w-full text-left p-4 sm:p-5 flex items-center gap-4 group"
    >
      {/* Icon */}
      <div className="neu-circle p-2.5 shrink-0">
        {forum.icon ? (
          <span className="text-base">{forum.icon}</span>
        ) : (
          <MessageSquare className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </div>

      {/* Name + Description */}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors truncate">
          {forum.name}
        </h3>
        {forum.description && (
          <p className="text-muted-foreground text-xs sm:text-sm truncate mt-0.5">
            {forum.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
        <div>
          <div className="text-sm font-semibold">{forum.threadCount}</div>
          <div className="text-xs text-muted-foreground">Threads</div>
        </div>
        <div>
          <div className="text-sm font-semibold">{forum.postCount}</div>
          <div className="text-xs text-muted-foreground">Posts</div>
        </div>
        <div className="min-w-[80px]">
          {forum.lastPostAt ? (
            <>
              <Clock className="size-3.5 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(forum.lastPostAt), { addSuffix: true })}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">No posts</div>
          )}
        </div>
      </div>

      {/* Mobile stats (compact) */}
      <div className="flex sm:hidden items-center gap-2 shrink-0 text-xs text-muted-foreground">
        <span>{forum.threadCount}T</span>
        <span>{forum.postCount}P</span>
      </div>

      {/* Chevron */}
      <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
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
          <span className="text-base sm:text-lg truncate max-w-full">{value}</span>
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

function CategorySkeletons() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <section key={i}>
          <div className="neu-card p-4 sm:p-5 mb-1">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="neu-card p-4 sm:p-5 flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-12 hidden sm:block" />
                <Skeleton className="h-4 w-12 hidden sm:block" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
