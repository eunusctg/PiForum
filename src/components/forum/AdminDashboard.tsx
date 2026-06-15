'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { ForumStats } from '@/lib/types';
import {
  Users,
  MessageSquare,
  FileText,
  HardDrive,
  Settings,
  ArrowLeft,
  Shield,
  Loader2,
  Clock,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Admin Dashboard — Analytics overview                               */
/* ------------------------------------------------------------------ */

// Generate fake chart data for demo purposes
function generateActivityData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    posts: Math.floor(Math.random() * 40) + 5,
  }));
}

function generateUserGrowthData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let cumulative = Math.floor(Math.random() * 50) + 20;
  return days.map((day) => {
    cumulative += Math.floor(Math.random() * 8) + 1;
    return { day, users: cumulative };
  });
}

export default function AdminDashboard() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [activityData] = useState(generateActivityData);
  const [userGrowthData] = useState(generateUserGrowthData);

  // Admin guard
  const userIsAdmin = isAdmin();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchStats();
  }, [fetchStats, userIsAdmin]);

  // Not admin
  if (!userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Shield className="size-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm text-center">
          You need administrator privileges to access this page.
        </p>
        <Button
          onClick={() => navigateTo('home')}
          className="neu-btn px-6 py-2"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <DashboardHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="neu-card p-5 space-y-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="neu-card p-6 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="neu-card p-6 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchStats} className="neu-btn px-6 py-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const recentUsersCount = stats?.recentUsers?.length ?? 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-3">
            <Settings className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Forum overview and analytics
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigateTo('home')}
          variant="ghost"
          className="neu-btn px-4 py-2 text-sm"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Admin Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Users', view: 'admin-users' as const, icon: Users },
          { label: 'Categories', view: 'admin-categories' as const, icon: Settings },
          { label: 'Settings', view: 'admin-settings' as const, icon: Settings },
          { label: 'Security', view: 'admin-security' as const, icon: Shield },
        ].map((item) => (
          <button
            key={item.view}
            onClick={() => navigateTo(item.view)}
            className="neu-btn p-3 sm:p-4 flex flex-col items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            <item.icon className="size-5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="size-5 text-primary" />}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          subtext={`+${recentUsersCount} new this week`}
        />
        <StatCard
          icon={<MessageSquare className="size-5 text-primary" />}
          label="Active Threads"
          value={stats?.totalThreads ?? 0}
          subtext={`${stats?.totalForums ?? 0} forums`}
        />
        <StatCard
          icon={<FileText className="size-5 text-primary" />}
          label="Total Posts"
          value={stats?.totalPosts ?? 0}
          subtext={`${stats?.totalCategories ?? 0} categories`}
        />
        <StatCard
          icon={<HardDrive className="size-5 text-primary" />}
          label="Storage Used"
          value={formatBytes(stats?.storageUsed ?? 0)}
          subtext="Estimated content size"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="neu-card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            Activity (Last 7 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--neu-bg)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: 'var(--neu-shadow)',
                  }}
                />
                <Bar dataKey="posts" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="neu-card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            User Growth
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--neu-bg)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: 'var(--neu-shadow)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--chart-2)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="neu-card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Recent Users
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats?.recentUsers && stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="neu-card-inset p-3 flex items-center gap-3"
                >
                  <Avatar className="size-9 neu-circle">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.username} />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                No users yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Threads */}
        <div className="neu-card p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            Recent Threads
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats?.recentThreads && stats.recentThreads.length > 0 ? (
              stats.recentThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="neu-card-inset p-3 flex items-start gap-3"
                >
                  <div className="neu-circle p-2 shrink-0">
                    <MessageSquare className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {thread.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {thread.author?.displayName || thread.author?.username || 'Unknown'}
                      {' · '}
                      {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                No threads yet
              </div>
            )}
          </div>
        </div>
      </div>
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
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext: string;
}) {
  return (
    <div className="neu-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5">{icon}</div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/* ------------------------------------------------------------------ */
/*  Loading Skeletons                                                  */
/* ------------------------------------------------------------------ */

function DashboardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}
