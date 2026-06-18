'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { Forum, Category } from '@/lib/types';
import {
  Home,
  Loader2,
  Paperclip,
  X,
  FileText,
  ArrowLeft,
  Send,
  Type,
  AlignLeft,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/* ------------------------------------------------------------------ */
/*  NewThread — Form to create a new thread                            */
/* ------------------------------------------------------------------ */

interface NewThreadProps {
  forumId: string;
}

const MAX_TITLE_LENGTH = 200;

export default function NewThread({ forumId }: NewThreadProps) {
  const { currentUser, navigateTo, categories, currentForum, setCurrentForum } = useAppStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forum info for breadcrumb
  const [parentForum, setParentForum] = useState<Forum | null>(currentForum?.id === forumId ? currentForum : null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  // ---------- fetch forum details ----------
  useEffect(() => {
    if (currentForum && currentForum.id === forumId) {
      setParentForum(currentForum);
      const cat = categories.find((c) => c.id === currentForum.categoryId);
      setParentCategory(cat ?? null);
      return;
    }

    const fetchForum = async () => {
      try {
        const res = await fetch(`/api/forums/${forumId}`);
        const data = await res.json();
        if (data.success) {
          const forum: Forum = data.data;
          setParentForum(forum);
          setCurrentForum(forum);
          const cat = categories.find((c) => c.id === forum.categoryId);
          setParentCategory(cat ?? null);
        }
      } catch (err) {
        console.error('Failed to fetch forum details:', err);
      }
    };

    fetchForum();
  }, [forumId, currentForum, categories, setCurrentForum]);

  // ---------- handlers ----------
  const handleHomeClick = () => navigateTo('home');

  const handleCategoryClick = () => navigateTo('home');

  const handleForumClick = () => {
    if (parentForum) {
      navigateTo('forum', { forumId: parentForum.id });
    }
  };

  const handleCancel = () => {
    if (parentForum) {
      navigateTo('forum', { forumId: parentForum.id });
    } else {
      navigateTo('home');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      setError(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
      return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Upload files first if any
      const uploadedAttachments: string[] = [];
      for (const file of files) {
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

      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          forumId,
          title: title.trim(),
          content: content.trim(),
          authorId: currentUser.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        navigateTo('thread', { threadId: data.data.id });
      } else {
        setError(data.error || 'Failed to create thread');
      }
    } catch (err) {
      console.error('Failed to create thread:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- derived ----------
  const titleCharsRemaining = MAX_TITLE_LENGTH - title.length;
  const isTitleOverLimit = title.length > MAX_TITLE_LENGTH;
  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !isTitleOverLimit && !submitting;

  // ================================================================
  //  RENDER
  // ================================================================

  // Not logged in
  if (!currentUser) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="neu-card p-8 text-center space-y-3">
          <AlertCircle className="size-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground text-sm">You must be logged in to create a new thread.</p>
          <button
            onClick={() => navigateTo('login')}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary"
          >
            Log In
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
            <BreadcrumbPage className="font-medium">New Thread</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ---- Form Container ---- */}
      <div className="neu-card p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5 shrink-0">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Create New Thread</h1>
            <p className="text-sm text-muted-foreground">
              in {parentForum?.name ?? 'Forum'}
            </p>
          </div>
        </div>

        <div className="neu-divider" />

        {/* Error message */}
        {error && (
          <div className="neu-card-inset rounded-lg p-4 flex items-start gap-3 text-destructive">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Title Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Type className="size-4 text-primary" />
            Thread Title
          </label>
          <div className="neu-input p-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your thread..."
              maxLength={MAX_TITLE_LENGTH + 10}
              className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Make it clear and descriptive</span>
            <span
              className={`font-medium ${
                isTitleOverLimit
                  ? 'text-destructive'
                  : titleCharsRemaining <= 20
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
              }`}
            >
              {title.length}/{MAX_TITLE_LENGTH}
            </span>
          </div>
        </div>

        {/* Content Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <AlignLeft className="size-4 text-primary" />
            Content
          </label>
          <div className="neu-input p-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thread content here...&#10;&#10;Supports basic formatting:&#10;**bold**, *italic*, `inline code`, ```code blocks```, > blockquotes, [links](url)"
              rows={10}
              className="w-full bg-transparent resize-y min-h-[200px] p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Supports **bold**, *italic*, `code`, &gt; quotes, and [links](url)
            </span>
            {content.length > 0 && (
              <span className="text-muted-foreground">{content.length} characters</span>
            )}
          </div>
        </div>

        {/* File Attachments */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="size-4 text-primary" />
            Attachments
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="neu-btn px-4 py-2 text-sm font-medium cursor-pointer flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
              <Paperclip className="size-4" />
              Choose Files
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              />
            </label>
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground">{files.length} file(s) selected</span>
            )}
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="neu-card-inset rounded-lg px-3 py-2 flex items-center gap-2 text-xs"
                >
                  <Paperclip className="size-3 text-muted-foreground" />
                  <span className="max-w-[140px] truncate">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)}KB)
                  </span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="neu-divider" />

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleCancel}
            className="neu-btn px-4 py-2.5 text-sm font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors"
            disabled={submitting}
          >
            <ArrowLeft className="size-4" />
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="neu-btn px-6 py-2.5 text-sm font-medium text-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Create Thread
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
