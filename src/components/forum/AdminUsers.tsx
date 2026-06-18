'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { UserRole, ROLE_LABELS } from '@/lib/types';
import type { ForumUser } from '@/lib/types';
import {
  Users,
  ArrowLeft,
  Shield,
  Search,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Unlock,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Admin Users — User management matrix                               */
/* ------------------------------------------------------------------ */

interface UserWithCounts extends ForumUser {
  threadCount?: number;
  postCount?: number;
}

export default function AdminUsers() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Edit Role Dialog
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithCounts | null>(null);
  const [newRole, setNewRole] = useState<string>('0');
  const [savingRole, setSavingRole] = useState(false);

  // Ban Dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banUser, setBanUser] = useState<UserWithCounts | null>(null);
  const [banReason, setBanReason] = useState('');
  const [savingBan, setSavingBan] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const userIsAdmin = isAdmin();

  // ---------- Fetch Users ----------
  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/users', {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchUsers();
  }, [fetchUsers, userIsAdmin]);

  // ---------- Filtered Users ----------
  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.displayName && u.displayName.toLowerCase().includes(q))
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === parseInt(roleFilter));
    }

    return result;
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ---------- Edit Role ----------
  const handleEditRole = (user: UserWithCounts) => {
    setEditUser(user);
    setNewRole(String(user.role));
    setEditRoleOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editUser || !currentUser) return;
    try {
      setSavingRole(true);
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ role: parseInt(newRole) }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Role Updated', description: `${editUser.username} is now ${ROLE_LABELS[parseInt(newRole) as UserRole]}` });
        setEditRoleOpen(false);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingRole(false);
    }
  };

  // ---------- Ban/Unban ----------
  const handleBanClick = (user: UserWithCounts) => {
    if (user.banned) {
      // Unban directly
      handleUnban(user);
    } else {
      setBanUser(user);
      setBanReason('');
      setBanDialogOpen(true);
    }
  };

  const handleUnban = async (user: UserWithCounts) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ banned: false, banReason: null }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'User Unbanned', description: `${user.username} has been unbanned` });
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to unban user', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  const handleConfirmBan = async () => {
    if (!banUser || !currentUser) return;
    try {
      setSavingBan(true);
      const res = await fetch(`/api/users/${banUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ banned: true, banReason: banReason || 'No reason provided' }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'User Banned', description: `${banUser.username} has been banned` });
        setBanDialogOpen(false);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to ban user', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingBan(false);
    }
  };

  // ---------- Not Admin ----------
  if (!userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Shield className="size-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm text-center">
          You need administrator privileges to access this page.
        </p>
        <Button onClick={() => navigateTo('home')} className="neu-btn px-6 py-2">
          <ArrowLeft className="size-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="neu-card p-4 flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="neu-card p-6 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchUsers} className="neu-btn px-6 py-2">Retry</Button>
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-3">
            <Users className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-muted-foreground text-sm">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigateTo('admin-dashboard')}
          variant="ghost"
          className="neu-btn px-4 py-2 text-sm"
        >
          <ArrowLeft className="size-4 mr-2" />
          Dashboard
        </Button>
      </div>

      {/* Search / Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="neu-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(val) => {
            setRoleFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="neu-input w-full sm:w-44 px-3 py-2.5 text-sm">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent className="neu-card-static border-0">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="0">User</SelectItem>
            <SelectItem value="1">Moderator</SelectItem>
            <SelectItem value="2">Admin</SelectItem>
            <SelectItem value="3">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* User Table */}
      <div className="neu-card overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
          <span className="w-10" />
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Joined</span>
          <span>Actions</span>
        </div>

        {/* Table Body */}
        {paginatedUsers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No users found matching your criteria
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {paginatedUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEditRole={handleEditRole}
                onBan={handleBanClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({filteredUsers.length} total)
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="ghost"
              className="neu-btn px-3 py-2"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="ghost"
              className="neu-btn px-3 py-2"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className="neu-card-static border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <div className="text-sm text-muted-foreground">
                {editUser ? ROLE_LABELS[editUser.role as UserRole] : ''}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="neu-input w-full px-3 py-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neu-card-static border-0">
                  <SelectItem value="0">User</SelectItem>
                  <SelectItem value="1">Moderator</SelectItem>
                  <SelectItem value="2">Admin</SelectItem>
                  <SelectItem value="3">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setEditRoleOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={savingRole}
              className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              {savingRole && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="neu-card-static border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              You are about to ban {banUser?.username}. This will prevent them from accessing the forum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ban Reason</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Provide a reason for banning this user..."
                className="neu-input min-h-[80px] px-3 py-2.5 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setBanDialogOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBan}
              disabled={savingBan}
              className="neu-btn px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none"
            >
              {savingBan && <Loader2 className="size-4 mr-2 animate-spin" />}
              <Ban className="size-4 mr-2" />
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  User Row                                                           */
/* ------------------------------------------------------------------ */

function UserRow({
  user,
  onEditRole,
  onBan,
}: {
  user: UserWithCounts;
  onEditRole: (user: UserWithCounts) => void;
  onBan: (user: UserWithCounts) => void;
}) {
  const roleColor: Record<number, string> = {
    0: 'bg-muted text-muted-foreground',
    1: 'bg-chart-3/20 text-chart-3',
    2: 'bg-chart-1/20 text-chart-1',
    3: 'bg-chart-4/20 text-chart-4',
  };

  return (
    <div className="neu-card-inset m-2 p-3 sm:p-4">
      <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-start sm:items-center">
        {/* Avatar */}
        <Avatar className="size-10 neu-circle shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.username} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Username */}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{user.username}</div>
          {user.displayName && user.displayName !== user.username && (
            <div className="text-xs text-muted-foreground truncate">
              {user.displayName}
            </div>
          )}
        </div>

        {/* Email */}
        <div className="text-sm text-muted-foreground truncate min-w-0">
          {user.email}
        </div>

        {/* Role Badge */}
        <Badge
          variant="secondary"
          className={`${roleColor[user.role] || ''} text-xs px-2 py-0.5 shrink-0`}
        >
          {ROLE_LABELS[user.role as UserRole] || 'User'}
        </Badge>

        {/* Status */}
        <div className="shrink-0">
          {user.banned ? (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              Banned
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-chart-2/20 text-chart-2">
              Active
            </Badge>
          )}
        </div>

        {/* Joined Date */}
        <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEditRole(user)}
            className="neu-btn p-2 hover:text-primary transition-colors"
            title="Edit Role"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => onBan(user)}
            className={`neu-btn p-2 transition-colors ${
              user.banned
                ? 'hover:text-chart-2'
                : 'hover:text-destructive'
            }`}
            title={user.banned ? 'Unban User' : 'Ban User'}
          >
            {user.banned ? (
              <Unlock className="size-3.5" />
            ) : (
              <Ban className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
