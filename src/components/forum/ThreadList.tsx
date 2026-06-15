'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Thread, Forum, Category } from '@/lib/types';
import {
  MessageSquare,
  Eye,
  Pin,
  Lock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  Clock,
  User,
  FileText,
  Hash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/* ------------------------------------------------------------------ */
/*  Thread List — Shows threads within a specific forum               */
/* ------------------------------------------------------------------ */

interface ThreadListProps {
  forumId: string;
  onNavigateThread?: (threadId: string) => void;
  onNavigateHome?: () => void;
}

interface ThreadPageData {
  threads: Thread[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ThreadList({
  forumId,
  onNavigateThread,
  onNavigateHome,
}: ThreadListProps) {
  const {
    currentForum,
    setCurrentForum,
    categories,
    currentUser,
    navigateTo,
    threads,
    setThreads,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<ThreadPageData | null>(null);
  const [page, setPage] = useState(1);
  const [forumInfo, setForumInfo] = useState<Forum | null>(currentForum);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  // ---------- fetch threads ----------
  const fetchThreads = useCallback(async () => {
    if (!forumId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/threads?forumId=${forumId}&page=${page}&limit=25`);
      const data = await res.json();
      if (data.success) {
        setPageData(data.data);
        setThreads(data.data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, [forumId, page, setThreads]);

  // ---------- fetch forum details ----------
  const fetchForumDetails = useCallback(async () => {
    if (!forumId) return;
    // If we already have the forum from the store, find its category
    if (currentForum && currentForum.id === forumId) {
      setForumInfo(currentForum);
      const cat = categories.find((c) => c.id === currentForum.categoryId);
      setParentCategory(cat ?? null);
      return;
    }

    try {
      const res = await fetch('/api/forums?categoryId=all');
      const data = await res.json();
      if (data.success) {
        const allForums: (Forum & { category?: { id: string; name: string; icon: string | null } })[] = data.data;
        const found = allForums.find((f) => f.id === forumId);
        if (found) {
          const forum: Forum = {
            id: found.id,
            categoryId: found.categoryId,
            name: found.name,
            description: found.description,
            icon: found.icon,
            sortOrder: found.sortOrder,
            lastPostAt: found.lastPostAt,
            threadCount: found.threadCount,
            postCount: found.postCount,
            createdAt: found.createdAt,
            updatedAt: found.updatedAt,
          };
          setForumInfo(forum);
          setCurrentForum(forum);

          // Find parent category from store or from the included data
          if (found.category) {
            const cat = categories.find((c) => c.id === found.category!.id);
            if (cat) {
              setParentCategory(cat);
            } else {
              setParentCategory({
                id: found.category.id,
                name: found.category.name,
                description: null,
                icon: found.category.icon,
                sortOrder: 0,
                accessLevel: 0,
                createdAt: '',
                updatedAt: '',
                forums: [],
              });
            }
          } else {
            const cat = categories.find((c) => c.id === forum.categoryId);
            setParentCategory(cat ?? null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch forum details:', err);
    }
  }, [forumId, currentForum, categories, setCurrentForum]);

  useEffect(() => {
    fetchForumDetails();
  }, [fetchForumDetails]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // ---------- handlers ----------
  const handleThreadClick = (threadId: string) => {
    if (onNavigateThread) {
      onNavigateThread(threadId);
    } else {
      navigateTo('thread', { threadId });
    }
  };

  const handleNewThread = () => {
    navigateTo('new-thread', { forumId });
  };

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigateTo('home');
    }
  };

  const handleCategoryClick = () => {
    navigateTo('home');
  };

  // ================================================================
  //  RENDER
  // ================================================================

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ---- Breadcrumb ---- */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={handleHomeClick}
            >
              <Home className="size-3.5 inline-block mr-1 -mt-0.5" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {parentCategory && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={handleCategoryClick}
                >
                  {parentCategory.icon && (
                    <span className="mr-1">{parentCategory.icon}</span>
                  )}
                  {parentCategory.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">
              {forumInfo?.name ?? 'Forum'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ---- Forum Header ---- */}
      <div className="neu-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="neu-circle p-2.5 shrink-0">
              {forumInfo?.icon ? (
                <span className="text-lg">{forumInfo.icon}</span>
              ) : (
                <MessageSquare className="size-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {forumInfo?.name ?? 'Loading...'}
              </h1>
              {forumInfo?.description && (
                <p className="text-muted-foreground text-sm mt-0.5 truncate">
                  {forumInfo.description}
                </p>
              )}
            </div>
          </div>
          {currentUser && (
            <button
              onClick={handleNewThread}
              className="neu-btn px-4 py-2.5 text-sm font-medium text-primary flex items-center gap-2 shrink-0"
            >
              <Plus className="size-4" />
              New Thread
            </button>
          )}
        </div>

        {/* Forum mini-stats */}
        {forumInfo && (
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="size-3.5" />
              {forumInfo.threadCount} Threads
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {forumInfo.postCount} Posts
            </span>
            {forumInfo.lastPostAt && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                Last post {formatDistanceToNow(new Date(forumInfo.lastPostAt), { addSuffix: true })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---- Thread List ---- */}
      {loading ? (
        <ThreadListSkeletons />
      ) : !pageData || pageData.threads.length === 0 ? (
        <EmptyThreadState forumId={forumId} />
      ) : (
        <div className="space-y-3">
          {pageData.threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              onClick={() => handleThreadClick(thread.id)}
            />
          ))}
        </div>
      )}

      {/* ---- Pagination ---- */}
      {pageData && pageData.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="neu-btn p-2.5 flex items-center gap-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="neu-card-inset px-4 py-2 text-sm font-medium">
            Page {page} of {pageData.totalPages}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pageData.totalPages, p + 1))}
            disabled={page >= pageData.totalPages}
            className="neu-btn p-2.5 flex items-center gap-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thread Row                                                         */
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
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors leading-snug">
              {thread.title}
            </h3>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {authorName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {(thread.postCount ?? 0) > 0 ? (thread.postCount! - 1) : 0} replies
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

function EmptyThreadState({ forumId }: { forumId: string }) {
  const { currentUser, navigateTo } = useAppStore();

  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-4">
      <div className="neu-circle p-4 mx-auto w-fit">
        <FileText className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No threads yet</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        This forum doesn&apos;t have any threads yet. Be the first to start a
        conversation!
      </p>
      {currentUser && (
        <button
          onClick={() => navigateTo('new-thread', { forumId })}
          className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
        >
          <Plus className="size-4" />
          Start a New Thread
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
        <div key={i} className="neu-card p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
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
