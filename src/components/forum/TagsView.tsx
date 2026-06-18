'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { Tag } from '@/lib/types';
import {
  Hash,
  Loader2,
  ArrowLeft,
  ArrowDownAZ,
  TrendingUp,
  Search,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Tags View — browse all tags as a cloud/grid                        */
/* ------------------------------------------------------------------ */

type SortMode = 'popular' | 'alphabetical';

export default function TagsView() {
  const { navigateTo } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sort, setSort] = useState<SortMode>('popular');
  const [searchInput, setSearchInput] = useState('');

  // ---------- Fetch tags ----------
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.success) {
        setTags((data.data || []) as Tag[]);
      } else {
        setError(data.error || 'Failed to load tags');
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // ---------- Derived (sorted + filtered) ----------
  const filteredTags = useMemo(() => {
    let list = [...tags];
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    if (sort === 'popular') {
      list.sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [tags, sort, searchInput]);

  const totalUsage = useMemo(
    () => tags.reduce((sum, t) => sum + (t.usageCount ?? 0), 0),
    [tags]
  );

  // ---------- Handlers ----------
  const handleTagClick = (tag: Tag) => {
    navigateTo('search', { q: tag.name });
    toast({
      title: 'Searching',
      description: `Showing threads tagged #${tag.name}`,
    });
  };

  const handleBack = () => navigateTo('home');

  // ================================================================
  //  RENDER
  // ================================================================
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between gap-3">
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
              <Hash className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
              <p className="text-xs text-muted-foreground">
                {tags.length} tag{tags.length === 1 ? '' : 's'} ·{' '}
                {totalUsage} total uses
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Toolbar (search + sort) ---- */}
      <div className="neu-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter tags..."
            className="neu-input w-full pl-10 pr-3 py-2.5 text-sm"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(v) => setSort(v as SortMode)}
        >
          <SelectTrigger className="neu-input sm:w-[180px] py-2.5">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">
              <span className="flex items-center gap-2">
                <TrendingUp className="size-3.5" />
                Popular
              </span>
            </SelectItem>
            <SelectItem value="alphabetical">
              <span className="flex items-center gap-2">
                <ArrowDownAZ className="size-3.5" />
                Alphabetical
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---- Error ---- */}
      {error && !loading && (
        <div className="neu-card p-6 sm:p-8 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={fetchTags}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <Loader2 className="size-4" />
            Retry
          </button>
        </div>
      )}

      {/* ---- Loading ---- */}
      {loading && <TagsSkeleton />}

      {/* ---- Empty State ---- */}
      {!loading && !error && filteredTags.length === 0 && (
        <div className="neu-card p-8 sm:p-12 text-center space-y-4">
          <div className="neu-circle p-5 mx-auto w-fit">
            <Hash className="size-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {searchInput ? 'No tags match your filter' : 'No tags yet'}
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {searchInput
              ? 'Try a different keyword or clear the filter.'
              : 'Tags are created automatically when threads are tagged. Browse the forums to see tagged content.'}
          </p>
          {searchInput && (
            <Button
              onClick={() => setSearchInput('')}
              variant="ghost"
              className="neu-btn px-5 py-2.5 text-sm font-medium shadow-none"
            >
              Clear Filter
            </Button>
          )}
        </div>
      )}

      {/* ---- Tags Cloud/Grid ---- */}
      {!loading && !error && filteredTags.length > 0 && (
        <div className="neu-card p-5 sm:p-6">
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {filteredTags.map((tag) => (
              <TagCard key={tag.id} tag={tag} onClick={() => handleTagClick(tag)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Card                                                           */
/* ------------------------------------------------------------------ */

function TagCard({ tag, onClick }: { tag: Tag; onClick: () => void }) {
  const color = tag.color || undefined;

  // Vary pill size based on usage for a "cloud" effect
  const usage = tag.usageCount ?? 0;
  const sizeClass =
    usage > 50
      ? 'text-base px-4 py-2'
      : usage > 10
      ? 'text-sm px-3.5 py-1.5'
      : 'text-sm px-3 py-1.5';

  return (
    <button
      onClick={onClick}
      className={`neu-badge ${sizeClass} flex items-center gap-2 hover:text-primary hover:-translate-y-0.5 transition-all`}
      style={
        color
          ? {
              borderColor: color,
              borderWidth: '1px',
              borderStyle: 'solid',
            }
          : undefined
      }
      title={`${usage} thread${usage === 1 ? '' : 's'} tagged`}
    >
      {color && (
        <span
          className="size-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <Hash className="size-3 text-muted-foreground shrink-0" />
      <span className="font-medium">{tag.name}</span>
      <span className="text-xs text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded">
        {usage}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function TagsSkeleton() {
  return (
    <div className="neu-card p-5 sm:p-6">
      <div className="flex flex-wrap gap-2.5 sm:gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 rounded-full"
            style={{ width: `${60 + ((i * 13) % 80)}px` }}
          />
        ))}
      </div>
    </div>
  );
}
