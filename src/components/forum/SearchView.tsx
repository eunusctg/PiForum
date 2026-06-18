'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { SearchResult, Thread, Post, ForumUser, Tag } from '@/lib/types';
import {
  Search,
  Loader2,
  MessageSquare,
  FileText,
  Users,
  Hash,
  Eye,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

/* ------------------------------------------------------------------ */
/*  Search View — full-text search across threads, posts, users, tags  */
/* ------------------------------------------------------------------ */

type SearchTab = 'all' | 'threads' | 'posts' | 'members' | 'tags';

export default function SearchView() {
  const { viewParams, navigateTo, currentUser } = useAppStore();

  const initialQuery = viewParams.q || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Debounce query ----------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // ---------- Fetch results ----------
  const fetchResults = useCallback(async (q: string) => {
    if (!q) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      if (currentUser) headers['x-user-id'] = currentUser.id;
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=20`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.data as SearchResult);
      } else {
        setError(data.error || 'Failed to search');
        setResults(null);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Network error. Please try again.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  // ---------- Handlers ----------
  const handleThreadClick = (thread: Thread) => {
    navigateTo('thread', { threadId: thread.id });
  };

  const handleUserClick = (user: ForumUser) => {
    navigateTo('profile', { userId: user.id });
  };

  const handleTagClick = (tag: Tag) => {
    setQuery(tag.name);
    navigateTo('search', { q: tag.name });
  };

  const handleBack = () => {
    navigateTo('home');
  };

  // ---------- Derived counts ----------
  const threadCount = results?.threads?.length ?? 0;
  const postCount = results?.posts?.length ?? 0;
  const memberCount = results?.users?.length ?? 0;
  const tagCount = results?.tags?.length ?? 0;
  const totalCount = results?.total ?? 0;

  // ================================================================
  //  RENDER
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
            <Search className="size-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        </div>
      </div>

      {/* ---- Search Input ---- */}
      <div className="neu-card p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads, posts, members, tags..."
            className="neu-input w-full pl-11 pr-11 py-3 text-sm"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
          )}
        </div>
        {debouncedQuery && !loading && results && (
          <p className="text-xs text-muted-foreground mt-2 px-1">
            {totalCount > 0
              ? `Found ${totalCount} result${totalCount === 1 ? '' : 's'} for "${debouncedQuery}"`
              : `No results found for "${debouncedQuery}"`}
          </p>
        )}
      </div>

      {/* ---- Tabs ---- */}
      {debouncedQuery && !error && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SearchTab)}
        >
          <TabsList className="w-full sm:w-auto flex-wrap h-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-initial">
              All
            </TabsTrigger>
            <TabsTrigger value="threads" className="flex-1 sm:flex-initial">
              <FileText className="size-3.5" />
              <span>Threads</span>
              {threadCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {threadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 sm:flex-initial">
              <MessageSquare className="size-3.5" />
              <span>Posts</span>
              {postCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {postCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 sm:flex-initial">
              <Users className="size-3.5" />
              <span>Members</span>
              {memberCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {memberCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex-1 sm:flex-initial">
              <Hash className="size-3.5" />
              <span>Tags</span>
              {tagCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {tagCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- Error ---- */}
          {error && (
            <div className="neu-card p-6 text-center text-destructive text-sm mt-4">
              {error}
            </div>
          )}

          {/* ---- All Tab ---- */}
          <TabsContent value="all" className="mt-4 space-y-6">
            {loading ? (
              <SearchSkeleton />
            ) : !results || totalCount === 0 ? (
              <EmptySearchState query={debouncedQuery} />
            ) : (
              <>
                {threadCount > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <FileText className="size-4" />
                      THREADS ({threadCount})
                    </h2>
                    {results.threads.slice(0, 5).map((thread) => (
                      <ThreadResultCard
                        key={thread.id}
                        thread={thread}
                        query={debouncedQuery}
                        onClick={() => handleThreadClick(thread)}
                      />
                    ))}
                  </section>
                )}
                {memberCount > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Users className="size-4" />
                      MEMBERS ({memberCount})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {results.users.slice(0, 4).map((user) => (
                        <UserResultCard
                          key={user.id}
                          user={user}
                          query={debouncedQuery}
                          onClick={() => handleUserClick(user)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {tagCount > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Hash className="size-4" />
                      TAGS ({tagCount})
                    </h2>
                    <div className="neu-card p-4 flex flex-wrap gap-2">
                      {results.tags.map((tag) => (
                        <TagPill
                          key={tag.id}
                          tag={tag}
                          onClick={() => handleTagClick(tag)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {postCount > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="size-4" />
                      POSTS ({postCount})
                    </h2>
                    {results.posts.slice(0, 5).map((post) => (
                      <PostResultCard
                        key={post.id}
                        post={post}
                        query={debouncedQuery}
                        onClick={() =>
                          post.threadId &&
                          navigateTo('thread', { threadId: post.threadId })
                        }
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* ---- Threads Tab ---- */}
          <TabsContent value="threads" className="mt-4 space-y-3">
            {loading ? (
              <SearchSkeleton />
            ) : !results || threadCount === 0 ? (
              <EmptySearchState query={debouncedQuery} kind="threads" />
            ) : (
              results.threads.map((thread) => (
                <ThreadResultCard
                  key={thread.id}
                  thread={thread}
                  query={debouncedQuery}
                  onClick={() => handleThreadClick(thread)}
                />
              ))
            )}
          </TabsContent>

          {/* ---- Posts Tab ---- */}
          <TabsContent value="posts" className="mt-4 space-y-3">
            {loading ? (
              <SearchSkeleton />
            ) : !results || postCount === 0 ? (
              <EmptySearchState query={debouncedQuery} kind="posts" />
            ) : (
              results.posts.map((post) => (
                <PostResultCard
                  key={post.id}
                  post={post}
                  query={debouncedQuery}
                  onClick={() =>
                    post.threadId &&
                    navigateTo('thread', { threadId: post.threadId })
                  }
                />
              ))
            )}
          </TabsContent>

          {/* ---- Members Tab ---- */}
          <TabsContent value="members" className="mt-4">
            {loading ? (
              <SearchSkeleton />
            ) : !results || memberCount === 0 ? (
              <EmptySearchState query={debouncedQuery} kind="members" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.users.map((user) => (
                  <UserResultCard
                    key={user.id}
                    user={user}
                    query={debouncedQuery}
                    onClick={() => handleUserClick(user)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---- Tags Tab ---- */}
          <TabsContent value="tags" className="mt-4">
            {loading ? (
              <SearchSkeleton />
            ) : !results || tagCount === 0 ? (
              <EmptySearchState query={debouncedQuery} kind="tags" />
            ) : (
              <div className="neu-card p-5 flex flex-wrap gap-2.5">
                {results.tags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    onClick={() => handleTagClick(tag)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ---- Initial Empty State (no query yet) ---- */}
      {!debouncedQuery && !error && (
        <div className="neu-card p-8 sm:p-12 text-center space-y-4">
          <div className="neu-circle p-5 mx-auto w-fit">
            <Sparkles className="size-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Search the community</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Find threads, posts, members, and tags by typing in the search box
            above. Results update as you type.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Thread Result Card                                                 */
/* ------------------------------------------------------------------ */

function ThreadResultCard({
  thread,
  query,
  onClick,
}: {
  thread: Thread;
  query: string;
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
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors leading-snug">
            <HighlightedText text={thread.title} query={query} />
          </h3>
          {thread.content && (
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2">
              <HighlightedText text={stripMarkdown(thread.content)} query={query} />
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {authorName}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              {(thread.postCount ?? 0) - 1} replies
            </span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {thread.views} views
            </span>
            <span>
              {formatDistanceToNow(new Date(thread.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Result Card                                                   */
/* ------------------------------------------------------------------ */

function PostResultCard({
  post,
  query,
  onClick,
}: {
  post: Post;
  query: string;
  onClick: () => void;
}) {
  const authorName =
    post.author?.displayName || post.author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="neu-card w-full text-left p-4 sm:p-5 group"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="neu-circle p-0.5">
            <Avatar className="size-8 sm:size-9">
              {post.author?.avatarUrl ? (
                <AvatarImage src={post.author.avatarUrl} alt={authorName} />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <MessageSquare className="size-3" />
            <span className="font-medium text-foreground">{authorName}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-sm line-clamp-3">
            <HighlightedText text={stripMarkdown(post.content)} query={query} />
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  User Result Card                                                   */
/* ------------------------------------------------------------------ */

function UserResultCard({
  user,
  query,
  onClick,
}: {
  user: ForumUser;
  query: string;
  onClick: () => void;
}) {
  const name = user.displayName || user.username;
  const initial = name.charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="neu-card p-4 sm:p-5 group flex items-start gap-3 text-left"
    >
      <div className="shrink-0">
        <div className="neu-circle p-0.5">
          <Avatar className="size-12 sm:size-14">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={name} />
            ) : null}
            <AvatarFallback className="text-sm font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors">
            <HighlightedText text={name} query={query} />
          </h3>
          {user.role > 0 && (
            <Badge variant="secondary" className="text-xs">
              {roleLabel(user.role)}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          @<HighlightedText text={user.username} query={query} />
        </p>
        {user.bio && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
            {user.bio}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{user.threadCount} threads</span>
          <span>·</span>
          <span>{user.postCount} posts</span>
          <span>·</span>
          <span>{user.reputation} rep</span>
        </div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Pill                                                           */
/* ------------------------------------------------------------------ */

function TagPill({ tag, onClick }: { tag: Tag; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="neu-badge px-3 py-1.5 text-sm flex items-center gap-2 hover:text-primary transition-colors"
      style={
        tag.color
          ? { borderColor: tag.color, borderWidth: '1px', borderStyle: 'solid' }
          : undefined
      }
    >
      {tag.color && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
      )}
      <span className="font-medium">#{tag.name}</span>
      <span className="text-xs text-muted-foreground">{tag.usageCount}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty Search State                                                 */
/* ------------------------------------------------------------------ */

function EmptySearchState({
  query,
  kind,
}: {
  query: string;
  kind?: string;
}) {
  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-3">
      <div className="neu-circle p-4 mx-auto w-fit">
        <Search className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {kind ? `No ${kind} found` : 'No results found'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        We couldn&apos;t find anything matching &quot;{query}&quot;.
        Try a different keyword or check your spelling.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="neu-card p-4 sm:p-5 flex items-start gap-3">
          <Skeleton className="size-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function roleLabel(role: number): string {
  switch (role) {
    case 3:
      return 'Super Admin';
    case 2:
      return 'Admin';
    case 1:
      return 'Moderator';
    default:
      return 'User';
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~#>|-]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-primary/20 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
