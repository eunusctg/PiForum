'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { Category, Thread } from '@/lib/types';
import {
  MessageSquare,
  Eye,
  Clock,
  Pin,
  ImageIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import VerifiedBadge from '@/components/forum/VerifiedBadge';

/* ------------------------------------------------------------------ */
/*  Featured Posts Slider — Lightweight horizontal scroll with CSS     */
/*  snap. No external carousel library to keep bundle small.          */
/*  Shows 10 posts, filterable by category.                           */
/* ------------------------------------------------------------------ */

interface FeaturedThread extends Thread {
  thumbnail: string | null;
}

export default function FeaturedPostsSlider() {
  const { navigateTo, categories } = useAppStore();

  const [threads, setThreads] = useState<FeaturedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchFeatured = useCallback(async (categoryId?: string) => {
    try {
      setLoading(true);
      const url = categoryId
        ? `/api/threads/featured?limit=10&categoryId=${categoryId}`
        : '/api/threads/featured?limit=10';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setThreads(data.data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch featured threads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setDropdownOpen(false);
    fetchFeatured(categoryId || undefined);
  };

  const handleClearCategory = () => {
    setSelectedCategoryId('');
    setDropdownOpen(false);
    fetchFeatured();
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <section className="w-full">
      {/* Header with category filter */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          Featured Discussions
        </h2>

        {/* Category Dropdown Filter */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
            className="neu-btn px-3 py-2 text-sm font-medium flex items-center gap-2 transition-all hover:text-primary"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <FolderOpen className="size-4" />
            <span className="hidden sm:inline">
              {selectedCategory ? selectedCategory.name : 'All Categories'}
            </span>
            <span className="sm:hidden">
              {selectedCategory ? selectedCategory.name : 'All'}
            </span>
            <ChevronDown
              className={`size-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-1 neu-card-static p-2 min-w-[200px] max-h-64 overflow-y-auto z-50">
              <button
                onClick={handleClearCategory}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent/50 flex items-center gap-2 transition-colors ${
                  !selectedCategoryId ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <FolderOpen className="size-4" />
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent/50 flex items-center gap-2 transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="shrink-0" aria-hidden="true">
                    {cat.icon ? (
                      <span className="text-base leading-none">{cat.icon}</span>
                    ) : (
                      <FolderOpen className="size-4" />
                    )}
                  </span>
                  <span className="truncate">{cat.name}</span>
                  {cat.color && (
                    <span
                      className="ml-auto size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sliding Grid — Pure CSS scroll-snap */}
      {loading ? (
        <FeaturedSkeletons />
      ) : threads.length === 0 ? (
        <EmptyFeatured />
      ) : (
        <div className="relative group/slider">
          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="snap-start shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] xl:w-[28%]"
              >
                <FeaturedCard
                  thread={thread}
                  onClick={() => navigateTo('thread', { threadId: thread.id })}
                />
              </div>
            ))}
          </div>

          {/* Navigation arrows — appear on hover */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 neu-circle size-9 p-0 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 neu-circle size-9 p-0 flex items-center justify-center opacity-0 group-hover/slider:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Featured Card — Individual post card with thumbnail                */
/* ------------------------------------------------------------------ */

function FeaturedCard({
  thread,
  onClick,
}: {
  thread: FeaturedThread;
  onClick: () => void;
}) {
  const authorName =
    thread.author?.displayName || thread.author?.username || 'Unknown';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const replies = Math.max(0, (thread.postCount ?? 0) - 1);

  const placeholderColors = [
    'from-teal-500/20 to-cyan-500/20',
    'from-emerald-500/20 to-green-500/20',
    'from-amber-500/20 to-orange-500/20',
    'from-violet-500/20 to-purple-500/20',
    'from-rose-500/20 to-pink-500/20',
    'from-sky-500/20 to-blue-500/20',
  ];
  const colorIndex =
    thread.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    placeholderColors.length;

  return (
    <button
      onClick={onClick}
      className="neu-card neu-card-3d w-full text-left overflow-hidden group h-full flex flex-col"
    >
      {/* Thumbnail / Image Area */}
      <div className="relative w-full aspect-video overflow-hidden">
        {thread.thumbnail ? (
          <img
            src={thread.thumbnail}
            alt={thread.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className={`w-full h-full bg-gradient-to-br ${placeholderColors[colorIndex]} flex items-center justify-center ${thread.thumbnail ? 'hidden' : 'flex'}`}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
            <ImageIcon className="size-8" />
            <span className="text-xs font-medium">
              {thread.forum?.category?.icon
                ? thread.forum.category.icon
                : thread.forum?.icon || '💬'}
            </span>
          </div>
        </div>

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {thread.pinned && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-0.5 bg-background/80 backdrop-blur-sm">
              <Pin className="size-3" />
              Pinned
            </Badge>
          )}
          {thread.solved && (
            <Badge className="text-xs px-1.5 py-0 h-5 gap-0.5 bg-emerald-500/80 backdrop-blur-sm text-white hover:bg-emerald-500/80">
              Solved
            </Badge>
          )}
        </div>

        {/* Reply count overlay */}
        <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 text-xs font-medium">
          <MessageSquare className="size-3 text-primary" />
          {replies}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {thread.forum && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 truncate">
            {thread.forum.category ? (
              <>
                {thread.forum.category.icon && (
                  <span className="text-xs leading-none">{thread.forum.category.icon}</span>
                )}
                <span>{thread.forum.category.name}</span>
                <span className="opacity-50">→</span>
                <span>{thread.forum.name}</span>
              </>
            ) : (
              <>
                {thread.forum.icon && (
                  <span className="text-xs leading-none">{thread.forum.icon}</span>
                )}
                <span>{thread.forum.name}</span>
              </>
            )}
          </div>
        )}

        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {thread.title}
        </h3>

        <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="size-5 shrink-0">
              {thread.author?.avatarUrl ? (
                <AvatarImage src={thread.author.avatarUrl} alt={authorName} />
              ) : null}
              <AvatarFallback className="text-[9px] font-semibold">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
            <span className="truncate flex items-center gap-1">
              {authorName}
              {thread.author?.isVerified && <VerifiedBadge size="xs" />}
            </span>
          </div>
          <span className="flex items-center gap-1 shrink-0">
            <Clock className="size-3" />
            {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function FeaturedSkeletons() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[85%] sm:w-[45%] lg:w-[30%] neu-card overflow-hidden"
        >
          <Skeleton className="w-full aspect-video" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyFeatured() {
  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-3">
      <div className="neu-circle p-4 mx-auto w-fit">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">No discussions yet</h3>
      <p className="text-muted-foreground text-sm">
        Be the first to start a conversation!
      </p>
    </div>
  );
}
