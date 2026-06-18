'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import type { ForumUser } from '@/lib/types';
import {
  Users,
  Loader2,
  Search,
  MapPin,
  MessageSquare,
  FileText,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import VerifiedBadge from '@/components/forum/VerifiedBadge';

/* ------------------------------------------------------------------ */
/*  Members View — directory of community members                      */
/* ------------------------------------------------------------------ */

type SortMode = 'newest' | 'oldest' | 'posts' | 'reputation';

interface MemberPageData {
  users?: ForumUser[];
  members?: ForumUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 12;

export default function MembersView() {
  const { navigateTo, currentUser } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<ForumUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');

  // ---------- Debounce search ----------
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ---------- Fetch members ----------
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      if (currentUser) headers['x-user-id'] = currentUser.id;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`/api/members?${params.toString()}`, {
        headers,
      });
      const data = await res.json();
      if (data.success) {
        const pageData = data.data as MemberPageData;
        setMembers(pageData.users || pageData.members || []);
        setTotal(pageData.total || 0);
      } else {
        // Fallback: try /api/users endpoint (admin-only)
        const fallbackRes = await fetch('/api/users', { headers });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success) {
          const allUsers = fallbackData.data as ForumUser[];
          let filtered = allUsers;
          if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            filtered = allUsers.filter(
              (u) =>
                u.username?.toLowerCase().includes(q) ||
                u.displayName?.toLowerCase().includes(q)
            );
          }
          filtered = sortMembers(filtered, sort);
          setMembers(filtered);
          setTotal(filtered.length);
        } else {
          setError(data.error || fallbackData.error || 'Failed to load members');
        }
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, currentUser]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------- Handlers ----------
  const handleMemberClick = (userId: string) => {
    navigateTo('profile', { userId });
  };

  const handleBack = () => navigateTo('home');

  const handleSortChange = (value: string) => {
    setSort(value as SortMode);
    setPage(1);
  };

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
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Members</h1>
            <p className="text-xs text-muted-foreground">
              {total} member{total === 1 ? '' : 's'} in the community
            </p>
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
            placeholder="Search by username or name..."
            className="neu-input w-full pl-10 pr-3 py-2.5 text-sm"
          />
        </div>
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="neu-input sm:w-[200px] py-2.5">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="posts">Most posts</SelectItem>
            <SelectItem value="reputation">Top reputation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ---- Error ---- */}
      {error && !loading && (
        <div className="neu-card p-6 sm:p-8 text-center space-y-3">
          <div className="neu-circle p-4 mx-auto w-fit">
            <Shield className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Couldn&apos;t load members</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchMembers}
            className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
          >
            <Loader2 className="size-4" />
            Retry
          </button>
        </div>
      )}

      {/* ---- Members Grid ---- */}
      {loading ? (
        <MembersGridSkeleton />
      ) : !error && members.length === 0 ? (
        <EmptyMembersState
          hasSearch={!!debouncedSearch}
          onClear={() => setSearchInput('')}
        />
      ) : (
        !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onClick={() => handleMemberClick(member.id)}
                />
              ))}
            </div>

            {/* ---- Pagination ---- */}
            {totalPages > 1 && (
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
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="neu-btn p-2.5 flex items-center gap-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Member Card                                                        */
/* ------------------------------------------------------------------ */

function MemberCard({
  member,
  onClick,
}: {
  member: ForumUser;
  onClick: () => void;
}) {
  const name = member.displayName || member.username;
  const initial = name.charAt(0).toUpperCase();
  const roleLabel = getRoleLabel(member.role);

  return (
    <button
      onClick={onClick}
      className="neu-card p-5 text-left group flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="neu-circle p-0.5 shrink-0">
          <Avatar className="size-14 sm:size-16">
            {member.avatarUrl ? (
              <AvatarImage src={member.avatarUrl} alt={name} />
            ) : null}
            <AvatarFallback className="text-base font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors truncate flex items-center gap-1.5">
            <span className="truncate">{name}</span>
            {member.isVerified && <VerifiedBadge size="sm" />}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            @{member.username}
          </p>
          {member.role > 0 && (
            <Badge
              variant={member.role >= 2 ? 'default' : 'secondary'}
              className="mt-1.5 text-xs"
            >
              {roleLabel}
            </Badge>
          )}
        </div>
      </div>

      {member.bio && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {member.bio}
        </p>
      )}

      {member.location && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          <span className="truncate">{member.location}</span>
        </div>
      )}

      <div className="neu-divider" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-1">
            <FileText className="size-3 text-muted-foreground" />
            {member.threadCount ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Threads</div>
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-1">
            <MessageSquare className="size-3 text-muted-foreground" />
            {member.postCount ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Posts</div>
        </div>
        <div>
          <div className="text-sm font-semibold flex items-center justify-center gap-1">
            <Star className="size-3 text-muted-foreground" />
            {member.reputation ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Rep</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-1">
        Joined {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyMembersState({
  hasSearch,
  onClear,
}: {
  hasSearch: boolean;
  onClear: () => void;
}) {
  return (
    <div className="neu-card p-8 sm:p-12 text-center space-y-4">
      <div className="neu-circle p-4 mx-auto w-fit">
        <Users className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {hasSearch ? 'No members found' : 'No members yet'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto">
        {hasSearch
          ? 'Try a different search term or clear your filters.'
          : 'There are no registered members yet. Be the first to join!'}
      </p>
      {hasSearch && (
        <button
          onClick={onClear}
          className="neu-btn px-5 py-2.5 text-sm font-medium text-primary inline-flex items-center gap-2 mx-auto"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function MembersGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="neu-card p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRoleLabel(role: number): string {
  switch (role) {
    case 3:
      return 'Super Admin';
    case 2:
      return 'Admin';
    case 1:
      return 'Moderator';
    default:
      return 'Member';
  }
}

function sortMembers(list: ForumUser[], mode: SortMode): ForumUser[] {
  const copy = [...list];
  switch (mode) {
    case 'newest':
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'oldest':
      return copy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case 'posts':
      return copy.sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0));
    case 'reputation':
      return copy.sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0));
    default:
      return copy;
  }
}
