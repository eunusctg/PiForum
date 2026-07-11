'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { UserRole, ROLE_LABELS } from '@/lib/types';
import type { ForumUser, Rank } from '@/lib/types';
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
  Trash2,
  UserPlus,
  BadgeCheck,
  Key,
  ChevronLeft,
  ChevronRight,
  Crown,
  User as UserIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserWithCounts extends ForumUser {
  threadCount?: number;
  postCount?: number;
}

interface EditFormState {
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  signature: string;
  location: string;
  website: string;
  role: string;
  rankId: string;
  isVerified: boolean;
  reputation: string;
}

interface CreateFormState {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: string;
  rankId: string;
  isVerified: boolean;
  bio: string;
}

const EMPTY_CREATE: CreateFormState = {
  username: '',
  email: '',
  password: '',
  displayName: '',
  role: '0',
  rankId: 'none',
  isVerified: false,
  bio: '',
};

const ROLE_BADGE_CLASS: Record<number, string> = {
  0: 'bg-muted text-muted-foreground',
  1: 'bg-chart-3/20 text-chart-3',
  2: 'bg-chart-1/20 text-chart-1',
  3: 'bg-chart-4/20 text-chart-4',
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminUsers() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithCounts[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Create Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  // Edit Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithCounts | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Password reset (inside Edit dialog Security tab)
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ban Dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banUser, setBanUser] = useState<UserWithCounts | null>(null);
  const [banReason, setBanReason] = useState('');
  const [savingBan, setSavingBan] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const userIsAdmin = isAdmin();
  const currentRole = currentUser?.role ?? 0;

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

  // ---------- Fetch Ranks ----------
  const fetchRanks = useCallback(async () => {
    try {
      const res = await fetch('/api/ranks');
      const data = await res.json();
      if (data.success) {
        setRanks(data.data);
      }
    } catch {
      // Silent failure for ranks — non-critical
    }
  }, []);

  useEffect(() => {
    if (!userIsAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    fetchRanks();
  }, [fetchUsers, fetchRanks, userIsAdmin]);

  // ---------- Ranks map for quick lookup ----------
  const rankMap = useMemo(() => {
    const m = new Map<string, Rank>();
    ranks.forEach((r) => m.set(r.id, r));
    return m;
  }, [ranks]);

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

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role >= 2).length;
    const moderators = users.filter((u) => u.role === 1).length;
    const banned = users.filter((u) => u.banned).length;
    return { total, admins, moderators, banned };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ---------- Create User ----------
  const handleOpenCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateOpen(true);
  };

  const handleCreateUser = async () => {
    if (!currentUser) return;
    if (!createForm.username.trim() || !createForm.email.trim() || !createForm.password) {
      toast({
        title: 'Validation Error',
        description: 'Username, email, and password are required',
        variant: 'destructive',
      });
      return;
    }
    if (createForm.password.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          username: createForm.username.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          displayName: createForm.displayName.trim() || undefined,
          role: parseInt(createForm.role, 10),
          rankId: createForm.rankId === 'none' ? null : createForm.rankId,
          isVerified: createForm.isVerified,
          bio: createForm.bio.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User Created',
          description: `${createForm.username} has been created successfully`,
        });
        setCreateOpen(false);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to create user',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  // ---------- Edit User ----------
  const handleOpenEdit = (user: UserWithCounts) => {
    setEditUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      displayName: user.displayName || '',
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      signature: user.signature || '',
      location: user.location || '',
      website: user.website || '',
      role: String(user.role),
      rankId: user.rankId || 'none',
      isVerified: !!user.isVerified,
      reputation: String(user.reputation ?? 0),
    });
    setResetPassword('');
    setResetPasswordConfirm('');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser || !editForm || !currentUser) return;

    if (!editForm.username.trim() || !editForm.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Username and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingEdit(true);
      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        displayName: editForm.displayName.trim() || null,
        avatarUrl: editForm.avatarUrl.trim() || null,
        bio: editForm.bio.trim() || null,
        signature: editForm.signature.trim() || null,
        location: editForm.location.trim() || null,
        website: editForm.website.trim() || null,
        role: parseInt(editForm.role, 10),
        rankId: editForm.rankId === 'none' ? null : editForm.rankId,
        isVerified: editForm.isVerified,
        reputation: parseInt(editForm.reputation, 10) || 0,
      };

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User Updated',
          description: `${editUser.username}'s profile has been updated`,
        });
        setEditOpen(false);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update user',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  // ---------- Reset Password ----------
  const handleResetPassword = async () => {
    if (!editUser || !currentUser) return;
    if (!resetPassword || resetPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    try {
      setResettingPassword(true);
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Password Reset',
          description: `Password for ${editUser.username} has been reset`,
        });
        setResetPassword('');
        setResetPasswordConfirm('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reset password',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  // ---------- Delete User ----------
  const handleDeleteClick = (user: UserWithCounts) => {
    setDeleteUser(user);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser || !currentUser) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/users/${deleteUser.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User Deleted',
          description: `${deleteUser.username} has been deleted`,
        });
        setDeleteOpen(false);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // ---------- Ban/Unban ----------
  const handleBanClick = (user: UserWithCounts) => {
    if (user.banned) {
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
        toast({
          title: 'User Unbanned',
          description: `${user.username} has been unbanned`,
        });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to unban user',
          variant: 'destructive',
        });
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
        body: JSON.stringify({
          banned: true,
          banReason: banReason.trim() || 'No reason provided',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'User Banned',
          description: `${banUser.username} has been banned`,
        });
        setBanDialogOpen(false);
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to ban user',
          variant: 'destructive',
        });
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="size-4 text-muted-foreground" />}
          label="Total Users"
          value={stats.total}
        />
        <StatCard
          icon={<Crown className="size-4 text-chart-4" />}
          label="Admins"
          value={stats.admins}
        />
        <StatCard
          icon={<ShieldCheck className="size-4 text-chart-3" />}
          label="Moderators"
          value={stats.moderators}
        />
        <StatCard
          icon={<Ban className="size-4 text-destructive" />}
          label="Banned"
          value={stats.banned}
        />
      </div>

      {/* Search / Filter / Create */}
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
        <Button
          onClick={handleOpenCreate}
          className="neu-btn px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none whitespace-nowrap"
        >
          <UserPlus className="size-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* User Table */}
      <div className="neu-card overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[auto_1.5fr_1.5fr_auto_auto_auto_auto] gap-4 p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
          <span className="w-10" />
          <span>User</span>
          <span>Email</span>
          <span>Role / Rank</span>
          <span>Status</span>
          <span>Last Seen</span>
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
                rankMap={rankMap}
                onEdit={handleOpenEdit}
                onBan={handleBanClick}
                onDelete={handleDeleteClick}
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

      {/* ============== Create User Dialog ============== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="neu-card-static border-0 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user with a specific role and rank.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cu-username">Username *</Label>
                <Input
                  id="cu-username"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  className="neu-input px-3 py-2"
                  placeholder="3–30 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-email">Email *</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="neu-input px-3 py-2"
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">Password *</Label>
              <Input
                id="cu-password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                className="neu-input px-3 py-2"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-displayname">Display Name (optional)</Label>
              <Input
                id="cu-displayname"
                value={createForm.displayName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, displayName: e.target.value })
                }
                className="neu-input px-3 py-2"
                placeholder="Shown on profile"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm({ ...createForm, role: v })}
                >
                  <SelectTrigger className="neu-input w-full px-3 py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="neu-card-static border-0">
                    <SelectItem value="0">Member</SelectItem>
                    <SelectItem value="1">Moderator</SelectItem>
                    <SelectItem value="2">Admin</SelectItem>
                    <SelectItem value="3" disabled={currentRole < 3}>
                      Super Admin {currentRole < 3 && '(requires Super Admin)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rank (optional)</Label>
                <Select
                  value={createForm.rankId}
                  onValueChange={(v) => setCreateForm({ ...createForm, rankId: v })}
                >
                  <SelectTrigger className="neu-input w-full px-3 py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="neu-card-static border-0">
                    <SelectItem value="none">None</SelectItem>
                    {ranks.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title || r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-bio">Bio (optional)</Label>
              <Textarea
                id="cu-bio"
                value={createForm.bio}
                onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                className="neu-input min-h-[70px] px-3 py-2 resize-none"
                placeholder="Short biography"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="cu-verified"
                checked={createForm.isVerified}
                onCheckedChange={(v) =>
                  setCreateForm({ ...createForm, isVerified: v === true })
                }
              />
              <Label htmlFor="cu-verified" className="text-sm cursor-pointer">
                Mark as verified user
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreateOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creating}
              className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              {creating && <Loader2 className="size-4 mr-2 animate-spin" />}
              <UserPlus className="size-4 mr-2" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== Edit User Dialog ============== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="neu-card-static border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit User
              {editUser && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {editUser.username}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Update profile details, roles, ranks, and security settings.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full flex-wrap h-auto">
                <TabsTrigger value="profile" className="flex-1">
                  Profile
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex-1">
                  Roles &amp; Rank
                </TabsTrigger>
                <TabsTrigger value="security" className="flex-1">
                  Security
                </TabsTrigger>
              </TabsList>

              {/* ---- Profile Tab ---- */}
              <TabsContent value="profile" className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-username">Username</Label>
                    <Input
                      id="eu-username"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm({ ...editForm, username: e.target.value })
                      }
                      className="neu-input px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-email">Email</Label>
                    <Input
                      id="eu-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      className="neu-input px-3 py-2"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-displayname">Display Name</Label>
                  <Input
                    id="eu-displayname"
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, displayName: e.target.value })
                    }
                    className="neu-input px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-avatar">Avatar URL</Label>
                  <Input
                    id="eu-avatar"
                    value={editForm.avatarUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, avatarUrl: e.target.value })
                    }
                    className="neu-input px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-bio">Bio</Label>
                  <Textarea
                    id="eu-bio"
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    className="neu-input min-h-[70px] px-3 py-2 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-sig">Signature</Label>
                  <Textarea
                    id="eu-sig"
                    value={editForm.signature}
                    onChange={(e) =>
                      setEditForm({ ...editForm, signature: e.target.value })
                    }
                    className="neu-input min-h-[60px] px-3 py-2 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-location">Location</Label>
                    <Input
                      id="eu-location"
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm({ ...editForm, location: e.target.value })
                      }
                      className="neu-input px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-website">Website</Label>
                    <Input
                      id="eu-website"
                      value={editForm.website}
                      onChange={(e) =>
                        setEditForm({ ...editForm, website: e.target.value })
                      }
                      className="neu-input px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ---- Roles & Rank Tab ---- */}
              <TabsContent value="roles" className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      value={editForm.role}
                      onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                    >
                      <SelectTrigger className="neu-input w-full px-3 py-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="neu-card-static border-0">
                        <SelectItem value="0">Member</SelectItem>
                        <SelectItem value="1">Moderator</SelectItem>
                        <SelectItem value="2">Admin</SelectItem>
                        <SelectItem value="3" disabled={currentRole < 3}>
                          Super Admin {currentRole < 3 && '(insufficient)'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rank</Label>
                    <Select
                      value={editForm.rankId}
                      onValueChange={(v) => setEditForm({ ...editForm, rankId: v })}
                    >
                      <SelectTrigger className="neu-input w-full px-3 py-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="neu-card-static border-0">
                        <SelectItem value="none">None</SelectItem>
                        {ranks.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title || r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eu-rep">Reputation</Label>
                  <Input
                    id="eu-rep"
                    type="number"
                    value={editForm.reputation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reputation: e.target.value })
                    }
                    className="neu-input px-3 py-2"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2 neu-card-inset p-3 rounded-lg">
                  <Checkbox
                    id="eu-verified"
                    checked={editForm.isVerified}
                    onCheckedChange={(v) =>
                      setEditForm({ ...editForm, isVerified: v === true })
                    }
                  />
                  <Label htmlFor="eu-verified" className="text-sm cursor-pointer flex-1">
                    Verified user
                  </Label>
                  <BadgeCheck
                    className={`size-4 ${
                      editForm.isVerified ? 'text-chart-1' : 'text-muted-foreground'
                    }`}
                  />
                </div>
              </TabsContent>

              {/* ---- Security Tab ---- */}
              <TabsContent value="security" className="space-y-4 py-4">
                <div className="neu-card-inset p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="size-4 text-primary" />
                    <h4 className="text-sm font-semibold">Reset Password</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set a new password for this user. They will need to use the new
                    password to sign in.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-newpass">New Password</Label>
                    <Input
                      id="eu-newpass"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      className="neu-input px-3 py-2"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eu-confirmpass">Confirm Password</Label>
                    <Input
                      id="eu-confirmpass"
                      type="password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      className="neu-input px-3 py-2"
                    />
                  </div>
                  <Button
                    onClick={handleResetPassword}
                    disabled={resettingPassword || !resetPassword}
                    className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none w-full sm:w-auto"
                  >
                    {resettingPassword && (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    )}
                    <Key className="size-4 mr-2" />
                    Reset Password
                  </Button>
                </div>

                {editUser?.banned ? (
                  <div className="neu-card-inset p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Ban className="size-4 text-destructive" />
                      <h4 className="text-sm font-semibold">Banned</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reason: {editUser.banReason || 'No reason provided'}
                    </p>
                  </div>
                ) : (
                  <div className="neu-card-inset p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-chart-2" />
                      <h4 className="text-sm font-semibold">Active</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This user is not banned.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              onClick={() => setEditOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              {savingEdit && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== Delete Confirmation Dialog ============== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="neu-card-static border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deleteUser?.username}
              </span>
              ? This will remove all their threads and posts. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setDeleteOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="neu-btn px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none"
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              <Trash2 className="size-4 mr-2" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== Ban Dialog ============== */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="neu-card-static border-0 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="size-5 text-destructive" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              You are about to ban{' '}
              <span className="font-semibold text-foreground">
                {banUser?.username}
              </span>
              . This will prevent them from accessing the forum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ban Reason</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Provide a reason for banning this user (or leave blank for permanent ban with default reason)..."
                className="neu-input min-h-[80px] px-3 py-2.5 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The reason will be stored and shown to the user.
              </p>
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
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="neu-card p-3 sm:p-4 flex items-center gap-3">
      <div className="neu-circle p-2 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-bold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  User Row                                                           */
/* ------------------------------------------------------------------ */

function UserRow({
  user,
  rankMap,
  onEdit,
  onBan,
  onDelete,
}: {
  user: UserWithCounts;
  rankMap: Map<string, Rank>;
  onEdit: (user: UserWithCounts) => void;
  onBan: (user: UserWithCounts) => void;
  onDelete: (user: UserWithCounts) => void;
}) {
  const rank = user.rankId ? rankMap.get(user.rankId) : null;

  return (
    <div className="neu-card-inset m-2 p-3 sm:p-4">
      <div className="flex flex-col lg:grid lg:grid-cols-[auto_1.5fr_1.5fr_auto_auto_auto_auto] gap-3 lg:gap-4 items-start lg:items-center">
        {/* Avatar */}
        <Avatar className="size-10 neu-circle shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.username} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Username + Reputation (mobile) + Display name */}
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">{user.username}</span>
            {user.isVerified && (
              <BadgeCheck className="size-3.5 text-chart-1 shrink-0" />
            )}
            {user.banned && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                BANNED
              </Badge>
            )}
          </div>
          {user.displayName && user.displayName !== user.username && (
            <div className="text-xs text-muted-foreground truncate">
              {user.displayName}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-0.5 lg:hidden">
            {user.email}
          </div>
          <div className="flex items-center gap-2 mt-1 lg:hidden">
            <Badge
              variant="secondary"
              className={`${ROLE_BADGE_CLASS[user.role] || ''} text-[10px] px-1.5 py-0 h-4`}
            >
              {ROLE_LABELS[user.role as UserRole] || 'User'}
            </Badge>
            {rank && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4"
                style={
                  rank.color
                    ? ({ ['--tw-border-opacity' as any]: 1, color: rank.color, borderColor: rank.color } as React.CSSProperties)
                    : undefined
                }
              >
                {rank.title || rank.name}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              {user.reputation ?? 0} rep
            </span>
          </div>
        </div>

        {/* Email (desktop) */}
        <div className="text-sm text-muted-foreground truncate min-w-0 hidden lg:block">
          {user.email}
        </div>

        {/* Role / Rank (desktop) */}
        <div className="hidden lg:flex flex-col gap-1 shrink-0">
          <Badge
            variant="secondary"
            className={`${ROLE_BADGE_CLASS[user.role] || ''} text-xs px-2 py-0.5`}
          >
            {ROLE_LABELS[user.role as UserRole] || 'User'}
          </Badge>
          {rank && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4"
              style={
                rank.color
                  ? ({ ['--tw-border-opacity' as any]: 1, color: rank.color, borderColor: rank.color } as React.CSSProperties)
                  : undefined
              }
            >
              {rank.title || rank.name}
            </Badge>
          )}
        </div>

        {/* Status + Last Seen (desktop) */}
        <div className="hidden lg:flex flex-col gap-1 shrink-0">
          {user.banned ? (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              Banned
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 bg-chart-2/20 text-chart-2"
            >
              Active
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            {user.reputation ?? 0} rep
          </span>
        </div>

        {/* Last Seen (desktop) */}
        <div className="text-xs text-muted-foreground shrink-0 hidden lg:block">
          {user.lastSeenAt
            ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })
            : 'Never'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-auto lg:ml-0">
          <button
            onClick={() => onEdit(user)}
            className="neu-btn p-2 hover:text-primary transition-colors"
            title="Edit User"
            aria-label={`Edit ${user.username}`}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => onBan(user)}
            className={`neu-btn p-2 transition-colors ${
              user.banned ? 'hover:text-chart-2' : 'hover:text-destructive'
            }`}
            title={user.banned ? 'Unban User' : 'Ban User'}
            aria-label={user.banned ? `Unban ${user.username}` : `Ban ${user.username}`}
          >
            {user.banned ? (
              <Unlock className="size-3.5" />
            ) : (
              <Ban className="size-3.5" />
            )}
          </button>
          <button
            onClick={() => onDelete(user)}
            className="neu-btn p-2 hover:text-destructive transition-colors"
            title="Delete User"
            aria-label={`Delete ${user.username}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
