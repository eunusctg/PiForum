'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Shield,
  ArrowLeft,
  Flag,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Report } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500',
  reviewing: 'text-blue-500',
  resolved: 'text-emerald-500',
  dismissed: 'text-muted-foreground',
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  'off-topic': 'Off-topic',
  inappropriate: 'Inappropriate',
  other: 'Other',
};

export default function AdminReports() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  const userIsAdmin = isAdmin();

  const fetchReports = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const url = filter === 'all'
        ? '/api/reports'
        : `/api/reports?status=${filter}`;
      const res = await fetch(url, {
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data?.reports || data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, filter]);

  useEffect(() => {
    if (userIsAdmin) {
      fetchReports();
    }
  }, [fetchReports, userIsAdmin]);

  const handleUpdate = async (id: string, status: 'reviewing' | 'resolved' | 'dismissed') => {
    if (!currentUser) return;
    try {
      setUpdating(id);
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Report Updated',
          description: `Marked as ${STATUS_LABELS[status]}`,
        });
        fetchReports();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update report',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-3">
            <Flag className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Reports
            </h1>
            <p className="text-muted-foreground text-sm">
              Review and resolve user-submitted reports
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

      {/* Filter tabs */}
      <div className="neu-card p-2 flex flex-wrap gap-1">
        {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`neu-btn px-4 py-2 text-sm font-medium transition-all ${
              filter === f ? 'neu-btn-inset text-primary' : 'hover:text-primary'
            }`}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neu-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="neu-card p-12 text-center space-y-3">
          <Check className="size-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-semibold">All clear!</h3>
          <p className="text-muted-foreground text-sm">
            No reports matching this filter. The community is on its best behaviour.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="neu-card p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="neu-circle p-2 shrink-0">
                  <AlertTriangle className="size-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {REASON_LABELS[report.reason] || report.reason}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {report.targetType}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className={`text-xs font-semibold ${STATUS_COLORS[report.status]}`}>
                      {STATUS_LABELS[report.status] || report.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reported {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    {report.reporter && ` by @${report.reporter.username}`}
                  </p>
                  {report.details && (
                    <p className="text-sm mt-2 neu-card-inset p-3 rounded-lg">
                      {report.details}
                    </p>
                  )}
                  {report.targetUser && (
                    <div className="flex items-center gap-2 mt-3">
                      <Avatar className="size-6 neu-circle">
                        {report.targetUser.avatarUrl ? (
                          <AvatarImage src={report.targetUser.avatarUrl} alt={report.targetUser.username} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {report.targetUser.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">
                        Target user: <span className="font-medium">@{report.targetUser.username}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleUpdate(report.id, 'reviewing')}
                    disabled={updating === report.id}
                    className="neu-btn px-3 py-1.5 text-xs h-8"
                  >
                    <AlertTriangle className="size-3 mr-1" />
                    Mark Reviewing
                  </Button>
                  <Button
                    onClick={() => handleUpdate(report.id, 'resolved')}
                    disabled={updating === report.id}
                    className="neu-btn px-3 py-1.5 text-xs h-8 text-emerald-600"
                  >
                    {updating === report.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Check className="size-3 mr-1" />}
                    Resolve
                  </Button>
                  <Button
                    onClick={() => handleUpdate(report.id, 'dismissed')}
                    disabled={updating === report.id}
                    className="neu-btn px-3 py-1.5 text-xs h-8 text-muted-foreground"
                  >
                    <X className="size-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
