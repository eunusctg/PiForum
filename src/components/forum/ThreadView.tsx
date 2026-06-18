'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Thread, Post, ForumUser, Forum, Category } from '@/lib/types';
import { UserRole, ROLE_LABELS } from '@/lib/types';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Eye,
  Pin,
  Lock,
  Unlock,
  Home,
  Loader2,
  Clock,
  User,
  Paperclip,
  Send,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  Quote,
  FileText,
  Hash,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
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
import VerifiedBadge from '@/components/forum/VerifiedBadge';

/* ------------------------------------------------------------------ */
/*  Post data with extra fields from API                               */
/* ------------------------------------------------------------------ */

interface PostWithMeta extends Post {
  voteScore: number;
  userVote: number;
}

interface PostsPageData {
  posts: PostWithMeta[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Simple Markdown Renderer                                           */
/* ------------------------------------------------------------------ */

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block: ```...```
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      result.push(
        <div key={keyIdx++} className="neu-card-inset rounded-lg p-4 my-3 overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Blockquote: > text
    if (line.trimStart().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      result.push(
        <blockquote key={keyIdx++} className="neu-card-inset rounded-lg p-4 my-3 border-l-4 border-primary/50">
          <div className="flex items-start gap-2">
            <Quote className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              {quoteLines.map((ql, qi) => (
                <p key={qi}>{renderInline(ql)}</p>
              ))}
            </div>
          </div>
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      result.push(<div key={keyIdx++} className="h-3" />);
      i++;
      continue;
    }

    // Regular paragraph line
    result.push(<p key={keyIdx++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return result;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let inlineKey = 0;

  while (remaining.length > 0) {
    // Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    if (codeMatch) {
      if (codeMatch[1]) nodes.push(...renderInlineBoldItalic(codeMatch[1]));
      nodes.push(
        <code
          key={`ic-${inlineKey++}`}
          className="neu-card-inset rounded px-1.5 py-0.5 text-xs font-mono"
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);
    if (linkMatch) {
      if (linkMatch[1]) nodes.push(...renderInlineBoldItalic(linkMatch[1]));
      nodes.push(
        <a
          key={`lk-${inlineKey++}`}
          href={linkMatch[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
      continue;
    }

    // Fallback: render bold/italic and break
    nodes.push(...renderInlineBoldItalic(remaining));
    break;
  }

  return nodes;
}

function renderInlineBoldItalic(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let biKey = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) nodes.push(boldMatch[1]);
      nodes.push(<strong key={`b-${biKey++}`} className="font-semibold">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    if (italicMatch) {
      if (italicMatch[1]) nodes.push(italicMatch[1]);
      nodes.push(<em key={`i-${biKey++}`} className="italic">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }

    nodes.push(remaining);
    break;
  }

  return nodes;
}

/* ------------------------------------------------------------------ */
/*  Role Badge Color Helper                                            */
/* ------------------------------------------------------------------ */

function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (role) {
    case UserRole.SuperAdmin:
      return 'destructive';
    case UserRole.Admin:
      return 'default';
    case UserRole.Moderator:
      return 'secondary';
    default:
      return 'outline';
  }
}

/* ------------------------------------------------------------------ */
/*  ThreadView Component                                               */
/* ------------------------------------------------------------------ */

interface ThreadViewProps {
  threadId: string;
}

export default function ThreadView({ threadId }: ThreadViewProps) {
  const {
    currentThread,
    setCurrentThread,
    currentForum,
    setCurrentForum,
    categories,
    currentUser,
    navigateTo,
    posts,
    setPosts,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [threadData, setThreadData] = useState<Thread | null>(null);
  const [postsPageData, setPostsPageData] = useState<PostsPageData | null>(null);
  const [page, setPage] = useState(1);
  const [parentForum, setParentForum] = useState<Forum | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  // Reply form state
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);

  // Edit state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Vote loading state
  const [votingPostIds, setVotingPostIds] = useState<Set<string>>(new Set());

  // Local vote state to immediately reflect changes
  const [localVotes, setLocalVotes] = useState<Record<string, { voteScore: number; userVote: number }>>({});

  // ---------- fetch thread ----------
  const fetchThread = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/threads/${threadId}`);
      const data = await res.json();
      if (data.success) {
        const thread: Thread = data.data;
        setThreadData(thread);
        setCurrentThread(thread);

        // Fetch forum details for breadcrumb
        const forumRes = await fetch(`/api/forums/${thread.forumId}`);
        const forumData = await forumRes.json();
        if (forumData.success) {
          const forum: Forum = forumData.data;
          setParentForum(forum);
          setCurrentForum(forum);

          const cat = categories.find((c) => c.id === forum.categoryId);
          setParentCategory(cat ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId, setCurrentThread, setCurrentForum, categories]);

  // ---------- fetch posts ----------
  const fetchPosts = useCallback(async () => {
    try {
      const userIdParam = currentUser ? `&userId=${currentUser.id}` : '';
      const res = await fetch(`/api/posts?threadId=${threadId}&page=${page}&limit=10${userIdParam}`);
      const data = await res.json();
      if (data.success) {
        setPostsPageData(data.data);
        setPosts(data.data.posts);
        // Reset local votes on fresh fetch
        setLocalVotes({});
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  }, [threadId, page, currentUser, setPosts]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    if (threadData) {
      fetchPosts();
    }
  }, [fetchPosts, threadData]);

  // ---------- handlers ----------
  const handleHomeClick = () => navigateTo('home');

  const handleCategoryClick = () => navigateTo('home');

  const handleForumClick = () => {
    if (parentForum) {
      navigateTo('forum', { forumId: parentForum.id });
    }
  };

  const handlePinToggle = async () => {
    if (!threadData || !currentUser) return;
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ pinned: !threadData.pinned }),
      });
      const data = await res.json();
      if (data.success) {
        setThreadData(data.data);
        setCurrentThread(data.data);
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleLockToggle = async () => {
    if (!threadData || !currentUser) return;
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ locked: !threadData.locked }),
      });
      const data = await res.json();
      if (data.success) {
        setThreadData(data.data);
        setCurrentThread(data.data);
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  const handleVote = async (postId: string, voteType: 1 | -1) => {
    if (!currentUser) return;

    // Optimistic update
    const currentLocal = localVotes[postId];
    const currentPost = postsPageData?.posts.find((p) => p.id === postId);
    const currentUserVote = currentLocal?.userVote ?? currentPost?.userVote ?? 0;
    const currentScore = currentLocal?.voteScore ?? currentPost?.voteScore ?? 0;

    // Toggle: if clicking same vote, remove it (voteType 0 effectively)
    let effectiveVoteType = voteType;
    let newScore = currentScore;
    let newUserVote = voteType;

    if (currentUserVote === voteType) {
      // Remove the vote
      effectiveVoteType = 0 as any;
      newScore = currentScore - voteType;
      newUserVote = 0;
    } else if (currentUserVote !== 0) {
      // Switching vote
      newScore = currentScore - currentUserVote + voteType;
      newUserVote = voteType;
    } else {
      // New vote
      newScore = currentScore + voteType;
      newUserVote = voteType;
    }

    setLocalVotes((prev) => ({
      ...prev,
      [postId]: { voteScore: newScore, userVote: newUserVote },
    }));

    if (effectiveVoteType === 0) return; // No API call for removing vote

    setVotingPostIds((prev) => new Set(prev).add(postId));

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ userId: currentUser.id, voteType: effectiveVoteType }),
      });
      const data = await res.json();
      if (data.success) {
        setLocalVotes((prev) => ({
          ...prev,
          [postId]: { voteScore: data.data.voteScore, userVote: effectiveVoteType },
        }));
      }
    } catch (err) {
      console.error('Failed to vote:', err);
      // Revert on failure
      setLocalVotes((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    } finally {
      setVotingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleReply = async () => {
    if (!currentUser || !replyContent.trim()) return;
    setReplySubmitting(true);
    try {
      // Upload files first if any
      const uploadedAttachments: string[] = [];
      for (const file of replyFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-user-id': currentUser.id },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedAttachments.push(uploadData.data.url);
        }
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          threadId,
          content: replyContent.trim(),
          authorId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent('');
        setReplyFiles([]);
        // Refresh posts
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!currentUser || !editContent.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingPostId(null);
        setEditContent('');
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to edit post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReplyFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- derived ----------
  const isAdminOrMod = currentUser && currentUser.role >= UserRole.Moderator;
  const canReply = currentUser && !threadData?.locked;

  const getPostVoteData = (post: PostWithMeta) => {
    const local = localVotes[post.id];
    return {
      voteScore: local?.voteScore ?? post.voteScore,
      userVote: local?.userVote ?? post.userVote,
    };
  };

  // ================================================================
  //  RENDER
  // ================================================================

  if (loading) {
    return <ThreadViewSkeleton />;
  }

  if (!threadData) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="neu-card p-8 text-center space-y-3">
          <AlertTriangle className="size-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Thread not found</h2>
          <p className="text-muted-foreground text-sm">The thread you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <button onClick={handleHomeClick} className="neu-btn px-4 py-2 text-sm text-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

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
                  {parentCategory.icon && <span className="mr-1">{parentCategory.icon}</span>}
                  {parentCategory.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          {parentForum && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={handleForumClick}
                >
                  {parentForum.icon && <span className="mr-1">{parentForum.icon}</span>}
                  {parentForum.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
              {threadData.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ---- Thread Header ---- */}
      <div className="neu-card p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Title row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {threadData.pinned && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-0.5">
                    <Pin className="size-3" />
                    Pinned
                  </Badge>
                )}
                {threadData.locked && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 gap-0.5">
                    <Lock className="size-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                {threadData.title}
              </h1>
            </div>
          </div>

          {/* Author and meta row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="neu-circle p-0.5 shrink-0">
                <Avatar className="size-9">
                  {threadData.author?.avatarUrl ? (
                    <AvatarImage src={threadData.author.avatarUrl} alt={threadData.author?.displayName || threadData.author?.username || ''} />
                  ) : null}
                  <AvatarFallback className="text-xs font-semibold">
                    {(threadData.author?.displayName || threadData.author?.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {threadData.author?.displayName || threadData.author?.username || 'Unknown'}
                  </span>
                  {threadData.author?.isVerified && <VerifiedBadge size="sm" />}
                  {threadData.author && (
                    <Badge variant={getRoleBadgeVariant(threadData.author.role)} className="text-xs px-1.5 py-0 h-4">
                      {ROLE_LABELS[threadData.author.role as UserRole]}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {formatDistanceToNow(new Date(threadData.createdAt), { addSuffix: true })}
                </div>
              </div>
            </div>

            {/* Stats and actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" />
                {threadData.views} views
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" />
                {(threadData.postCount ?? 0) - 1} replies
              </span>

              {isAdminOrMod && (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={handlePinToggle}
                    className={`neu-btn px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${
                      threadData.pinned ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Pin className="size-3" />
                    {threadData.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={handleLockToggle}
                    className={`neu-btn px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${
                      threadData.locked ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {threadData.locked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                    {threadData.locked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Original Post (Thread Content) ---- */}
      {threadData.content && (
        <PostCard
          content={threadData.content}
          author={threadData.author}
          createdAt={threadData.createdAt}
          updatedAt={threadData.updatedAt}
          attachments={[]}
          isOriginalPost
          postId={`thread-${threadData.id}`}
          voteScore={0}
          userVote={0}
          isVoting={false}
          onUpvote={() => {}}
          onDownvote={() => {}}
          replyNumber={0}
          canEdit={false}
          canDelete={false}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      )}

      {/* ---- Replies ---- */}
      {postsPageData && postsPageData.posts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Replies ({postsPageData.total})
          </h2>
          {postsPageData.posts.map((post, idx) => {
            const voteData = getPostVoteData(post);
            const isAuthor = currentUser && currentUser.id === post.authorId;
            const isAdminUser = currentUser && currentUser.role >= UserRole.Admin;

            return (
              <PostCard
                key={post.id}
                content={editingPostId === post.id ? editContent : post.content}
                author={post.author ?? null}
                createdAt={post.createdAt}
                updatedAt={post.updatedAt}
                attachments={post.attachments ?? []}
                isOriginalPost={false}
                postId={post.id}
                voteScore={voteData.voteScore}
                userVote={voteData.userVote}
                isVoting={votingPostIds.has(post.id)}
                onUpvote={() => handleVote(post.id, 1)}
                onDownvote={() => handleVote(post.id, -1)}
                replyNumber={(page - 1) * postsPageData.limit + idx + 1}
                canEdit={!!isAuthor || !!isAdminUser}
                canDelete={!!isAuthor || !!isAdminUser}
                onEdit={() => {
                  setEditingPostId(post.id);
                  setEditContent(post.content);
                }}
                onDelete={() => handleDeletePost(post.id)}
                isEditing={editingPostId === post.id}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onSaveEdit={() => handleEditPost(post.id)}
                onCancelEdit={() => {
                  setEditingPostId(null);
                  setEditContent('');
                }}
              />
            );
          })}
        </div>
      )}

      {/* ---- Pagination ---- */}
      {postsPageData && postsPageData.totalPages > 1 && (
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
            Page {page} of {postsPageData.totalPages}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(postsPageData.totalPages, p + 1))}
            disabled={page >= postsPageData.totalPages}
            className="neu-btn p-2.5 flex items-center gap-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ---- Reply Form ---- */}
      {canReply && (
        <div className="neu-card p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Send className="size-4 text-primary" />
            Post a Reply
          </h3>

          <div className="neu-input p-1">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply... (supports **bold**, *italic*, `code`, > quotes)"
              rows={5}
              className="w-full bg-transparent resize-y min-h-[100px] p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* File attachments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="neu-btn px-3 py-1.5 text-xs font-medium cursor-pointer flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                <Paperclip className="size-3.5" />
                Attach Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                />
              </label>
              {replyFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">{replyFiles.length} file(s)</span>
              )}
            </div>

            {replyFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {replyFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="neu-card-inset rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs"
                  >
                    <Paperclip className="size-3 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {replyContent.length > 0 && `${replyContent.length} characters`}
            </span>
            <button
              onClick={handleReply}
              disabled={!replyContent.trim() || replySubmitting}
              className="neu-btn px-5 py-2.5 text-sm font-medium text-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {replySubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {replySubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Locked Notice ---- */}
      {threadData.locked && currentUser && (
        <div className="neu-card p-5 sm:p-6 text-center space-y-2">
          <Lock className="size-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">This thread is locked and cannot receive new replies.</p>
        </div>
      )}

      {/* ---- Login Prompt ---- */}
      {!currentUser && !threadData.locked && (
        <div className="neu-card p-5 sm:p-6 text-center space-y-3">
          <User className="size-6 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Please log in to reply to this thread.</p>
          <button
            onClick={() => navigateTo('login')}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary"
          >
            Log In
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post Card Component                                                */
/* ------------------------------------------------------------------ */

interface PostCardProps {
  content: string;
  author: ForumUser | null | undefined;
  createdAt: string;
  updatedAt: string;
  attachments: { id: string; url: string; filename: string; size: number; mimeType: string }[];
  isOriginalPost: boolean;
  postId: string;
  voteScore: number;
  userVote: number;
  isVoting: boolean;
  onUpvote: () => void;
  onDownvote: () => void;
  replyNumber: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}

function PostCard({
  content,
  author,
  createdAt,
  updatedAt,
  attachments,
  isOriginalPost,
  postId,
  voteScore,
  userVote,
  isVoting,
  onUpvote,
  onDownvote,
  replyNumber,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  isEditing = false,
  editContent = '',
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
}: PostCardProps) {
  const authorName = author?.displayName || author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div className="neu-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* ---- Author Sidebar ---- */}
        <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 sm:w-36 shrink-0">
          <div className="neu-circle p-0.5">
            <Avatar className="size-10 sm:size-14">
              {author?.avatarUrl ? (
                <AvatarImage src={author.avatarUrl} alt={authorName} />
              ) : null}
              <AvatarFallback className="text-sm font-semibold">{authorInitial}</AvatarFallback>
            </Avatar>
          </div>
          <div className="sm:text-center">
            <div className="text-sm font-medium truncate max-w-[120px] flex items-center gap-1 justify-center">
              <span className="truncate">{authorName}</span>
              {author?.isVerified && <VerifiedBadge size="xs" />}
            </div>
            {author && (
              <Badge variant={getRoleBadgeVariant(author.role)} className="text-xs px-1 py-0 h-4 mt-0.5">
                {ROLE_LABELS[author.role as UserRole]}
              </Badge>
            )}
          </div>
        </div>

        {/* ---- Content Area ---- */}
        <div className="flex-1 min-w-0">
          {/* Post header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {!isOriginalPost && (
                <span className="neu-card-inset rounded-md px-2 py-0.5 text-xs font-medium">
                  #{replyNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
              </span>
              {updatedAt !== createdAt && (
                <span className="text-muted-foreground/60">(edited)</span>
              )}
            </div>

            {/* Edit/Delete buttons */}
            {(canEdit || canDelete) && !isEditing && (
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button
                    onClick={onEdit}
                    className="neu-btn p-1.5 text-muted-foreground hover:text-primary transition-colors"
                    title="Edit post"
                  >
                    <Edit3 className="size-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    className="neu-btn p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="neu-divider mb-3" />

          {/* Post content or editing textarea */}
          {isEditing ? (
            <div className="space-y-3">
              <div className="neu-input p-1">
                <textarea
                  value={editContent}
                  onChange={(e) => onEditContentChange?.(e.target.value)}
                  rows={8}
                  className="w-full bg-transparent resize-y min-h-[120px] p-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="neu-btn px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={onSaveEdit}
                  className="neu-btn px-4 py-1.5 text-xs font-medium text-primary"
                >
                  Save Edit
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">{renderMarkdown(content)}</div>
          )}

          {/* Attachments */}
          {!isEditing && attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Paperclip className="size-3" />
                Attachments
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neu-btn px-3 py-1.5 text-xs flex items-center gap-1.5 text-primary hover:text-primary/80"
                  >
                    <Paperclip className="size-3" />
                    {att.filename}
                    <span className="text-muted-foreground">
                      ({(att.size / 1024).toFixed(1)}KB)
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Vote bar */}
          {!isEditing && !isOriginalPost && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={onUpvote}
                  disabled={isVoting}
                  className={`neu-btn p-1.5 transition-colors ${
                    userVote === 1
                      ? 'text-green-500 neu-btn-inset'
                      : 'text-muted-foreground hover:text-green-500'
                  } disabled:opacity-40`}
                  title="Upvote"
                >
                  <ChevronUp className="size-4" />
                </button>
                <span
                  className={`text-sm font-medium min-w-[2rem] text-center ${
                    voteScore > 0
                      ? 'text-green-500'
                      : voteScore < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {voteScore}
                </span>
                <button
                  onClick={onDownvote}
                  disabled={isVoting}
                  className={`neu-btn p-1.5 transition-colors ${
                    userVote === -1
                      ? 'text-destructive neu-btn-inset'
                      : 'text-muted-foreground hover:text-destructive'
                  } disabled:opacity-40`}
                  title="Downvote"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ThreadViewSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="neu-card p-5 sm:p-6 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      <div className="neu-card p-5 space-y-3">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2 w-36 shrink-0">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>

      <div className="neu-card p-5 space-y-3">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2 w-36 shrink-0">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
