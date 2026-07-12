'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
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
  Hash,
  Plus,
  FolderOpen,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/* ------------------------------------------------------------------ */
/*  NewThread — Create a new discussion (Flarum/Discourse style)       */
/*                                                                    */
/*  Category picker lets users choose a forum within a category.       */
/*  If no forum is selected, the thread is created as "uncategorized"  */
/*  and appears in the global flat thread list on the home page.       */
/* ------------------------------------------------------------------ */

const MAX_TITLE_LENGTH = 200;
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;

interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  forums: Forum[];
}

interface Forum {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  categoryId: string;
}

interface NewThreadProps {
  forumId?: string;
}

export default function NewThread({ forumId: propForumId }: NewThreadProps) {
  const { currentUser, navigateTo } = useAppStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Category picker state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedForumId, setSelectedForumId] = useState<string | null>(propForumId || null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  // Fetch categories with forums on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setCategoriesLoading(true);
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.data) {
          setCategories(data.data);
        }
      } catch {
        // Non-critical — category picker will just be empty
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Close category picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) {
        setCategoryPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find the selected forum and category for display
  const selectedForum = categories
    .flatMap((c) => c.forums.map((f) => ({ ...f, categoryName: c.name, categoryId: c.id })))
    .find((f) => f.id === selectedForumId);
  const effectiveForumId = selectedForumId || propForumId;

  // ---------- handlers ----------
  const handleHomeClick = () => navigateTo('home');
  const handleCancel = () => navigateTo('home');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- tag handlers ----------
  const addTag = useCallback(
    (raw: string) => {
      const value = raw.trim().toLowerCase();
      if (!value) return;
      if (value.length > MAX_TAG_LENGTH) return;
      if (tags.includes(value)) return;
      if (tags.length >= MAX_TAGS) return;
      setTags((prev) => [...prev, value]);
      setTagInput('');
    },
    [tags],
  );

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      e.preventDefault();
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleTagInputBlur = () => {
    if (tagInput.trim()) addTag(tagInput);
  };

  // ---------- submit ----------
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
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch('/api/upload', {
          method: 'POST',
          headers: { 'x-user-id': currentUser.id },
          body: formData,
        });
      }

      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          ...(effectiveForumId ? { forumId: effectiveForumId } : {}),
          title: title.trim(),
          content: content.trim(),
          tags,
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
  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !isTitleOverLimit &&
    !submitting;

  // All forums flat list for counting
  const totalForums = categories.reduce((sum, c) => sum + c.forums.length, 0);

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
          <p className="text-muted-foreground text-sm">
            You must be logged in to start a discussion.
          </p>
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
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">
              New Discussion
            </BreadcrumbPage>
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
            <h1 className="text-xl sm:text-2xl font-bold">
              Start a Discussion
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedForum
                ? `Posting in ${selectedForum.categoryName} → ${selectedForum.name}`
                : 'Share your thoughts with the community'}
            </p>
          </div>
        </div>

        <div className="neu-divider" />

        {/* Category / Forum Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="size-4 text-primary" />
            Category
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>

          <div className="relative" ref={categoryPickerRef}>
            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setCategoryPickerOpen(!categoryPickerOpen)}
              className="w-full neu-input p-0 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 p-3 flex-1 min-w-0 text-left">
                {selectedForum ? (
                  <>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {selectedForum.categoryName}
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="text-sm truncate">{selectedForum.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Select a category (optional)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 px-3 shrink-0">
                {selectedForumId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedForumId(null);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Clear category"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${categoryPickerOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown */}
            {categoryPickerOpen && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 neu-card p-2 max-h-72 overflow-y-auto animate-stagger-in custom-scrollbar">
                {/* Uncategorized option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedForumId(null);
                    setCategoryPickerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    !selectedForumId
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <FolderOpen className="size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">No Category</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Your discussion will appear in the global thread list and can be found via tags.
                    </div>
                  </div>
                  {!selectedForumId && <Check className="size-4 shrink-0 text-primary" />}
                </button>

                {categoriesLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin inline mr-2" />
                    Loading categories...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No categories available yet.
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category.id} className="mt-1">
                      {/* Category header */}
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        {category.name}
                        <span className="text-[0.65rem] font-normal">
                          ({category.forums.length})
                        </span>
                      </div>
                      {/* Forums within category */}
                      {category.forums.length > 0 ? (
                        category.forums.map((forum) => (
                          <button
                            key={forum.id}
                            type="button"
                            onClick={() => {
                              setSelectedForumId(forum.id);
                              setCategoryPickerOpen(false);
                            }}
                            className={`w-full text-left pl-7 pr-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                              selectedForumId === forum.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {forum.icon && <span className="shrink-0">{forum.icon}</span>}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate">{forum.name}</div>
                              {forum.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {forum.description}
                                </div>
                              )}
                            </div>
                            {selectedForumId === forum.id && (
                              <Check className="size-4 shrink-0 text-primary" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="pl-7 pr-3 py-1.5 text-xs text-muted-foreground italic">
                          No forums in this category
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Info text when no category selected */}
          {!selectedForumId && (
            <div className="neu-card-inset rounded-lg p-3 flex items-center gap-3">
              <FolderOpen className="size-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                No category selected. Your discussion will appear in the global thread list and can be found via tags.
              </p>
            </div>
          )}
        </div>

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
            Title
          </label>
          <div className="neu-input p-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your discussion about?"
              maxLength={MAX_TITLE_LENGTH + 10}
              className="w-full bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Make it clear and descriptive
            </span>
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
              placeholder={'Write your discussion here...\n\nSupports basic formatting:\n**bold**, *italic*, `inline code`, ```code blocks```, > blockquotes, [links](url)'}
              rows={10}
              className="w-full bg-transparent resize-y min-h-[200px] p-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Supports **bold**, *italic*, `code`, &gt; quotes, and [links](url)
            </span>
            {content.length > 0 && (
              <span className="text-muted-foreground">
                {content.length} characters
              </span>
            )}
          </div>
        </div>

        {/* Tags Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Hash className="size-4 text-primary" />
            Tags
            <span className="text-muted-foreground font-normal">
              (optional, up to {MAX_TAGS})
            </span>
          </label>
          <div
            className="neu-input p-1.5 flex flex-wrap items-center gap-1.5 min-h-[44px] cursor-text"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 neu-card-inset px-2 py-0.5 rounded-full text-xs font-medium text-primary"
              >
                <Hash className="size-2.5" />
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleTagInputBlur}
                placeholder={
                  tags.length === 0
                    ? 'Add tags (press Enter to add)'
                    : 'Add another tag...'
                }
                maxLength={MAX_TAG_LENGTH}
                className="flex-1 min-w-[120px] bg-transparent p-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Tags help others find your discussion
            </span>
            <span className="text-muted-foreground">
              {tags.length}/{MAX_TAGS}
            </span>
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
              <span className="text-xs text-muted-foreground">
                {files.length} file(s) selected
              </span>
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
                Post Discussion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
