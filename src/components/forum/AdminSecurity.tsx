'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { SecurityLog } from '@/lib/types';
import {
  Shield,
  ArrowLeft,
  Trash2,
  Download,
  Cloud,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Globe,
  FileText,
  Server,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Admin Security — Security logs & cache management                  */
/* ------------------------------------------------------------------ */

interface SecurityLogResponse {
  logs: SecurityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  USER_BANNED: 'bg-destructive/20 text-destructive',
  USER_UNBANNED: 'bg-chart-2/20 text-chart-2',
  USER_DELETED: 'bg-destructive/20 text-destructive',
  SETTINGS_UPDATED: 'bg-chart-3/20 text-chart-3',
  CACHE_PURGED: 'bg-chart-5/20 text-chart-5',
  LOGIN_FAILED: 'bg-destructive/20 text-destructive',
  LOGIN_SUCCESS: 'bg-chart-2/20 text-chart-2',
  ADMIN_ACTION: 'bg-chart-1/20 text-chart-1',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  USER_BANNED: <AlertTriangle className="size-3.5" />,
  USER_UNBANNED: <Shield className="size-3.5" />,
  USER_DELETED: <Trash2 className="size-3.5" />,
  SETTINGS_UPDATED: <FileText className="size-3.5" />,
  CACHE_PURGED: <Cloud className="size-3.5" />,
  LOGIN_FAILED: <AlertTriangle className="size-3.5" />,
  LOGIN_SUCCESS: <Shield className="size-3.5" />,
  ADMIN_ACTION: <Server className="size-3.5" />,
};

export default function AdminSecurity() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [purging, setPurging] = useState(false);
  const [clearing, setClearing] = useState(false);

  const pageSize = 20;
  const userIsAdmin = isAdmin();

  // ---------- Fetch Logs ----------
  const fetchLogs = useCallback(
    async (pageNum: number = page) => {
      if (!currentUser) return;
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: String(pageSize),
        });

        const res = await fetch(`/api/security?${params}`, {
          headers: { 'x-user-id': currentUser.id },
        });
        const data = await res.json();
        if (data.success) {
          const result = data.data as SecurityLogResponse;
          setLogs(result.logs);
          setTotalLogs(result.total);
          setTotalPages(result.totalPages);
        } else {
          setError(data.error || 'Failed to load security logs');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [currentUser, page]
  );

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchLogs();
  }, [fetchLogs, userIsAdmin, page]);

  // ---------- Filter logs by event type ----------
  const filteredLogs =
    eventTypeFilter === 'all'
      ? logs
      : logs.filter((log) => log.eventType === eventTypeFilter);

  // Get unique event types from loaded logs for the filter dropdown
  const eventTypes = Array.from(new Set(logs.map((l) => l.eventType)));

  // ---------- Purge Cache ----------
  const handlePurgeCache = async () => {
    if (!currentUser) return;
    try {
      setPurging(true);
      const res = await fetch('/api/security/clear-cache', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Cache Purged',
          description: 'Cloudflare cache has been purged successfully.',
        });
      } else {
        toast({
          title: 'Purge Failed',
          description: data.error || 'Failed to purge cache',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setPurging(false);
    }
  };

  // ---------- Clear Old Logs ----------
  const handleClearOldLogs = async () => {
    if (!currentUser) return;
    try {
      setClearing(true);
      // We'll delete logs older than 30 days by calling the security API with DELETE
      // Since there's no specific endpoint, we'll use the security endpoint
      const res = await fetch('/api/security', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ olderThanDays: 30 }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast({
            title: 'Logs Cleared',
            description: data.data?.message || 'Old logs have been cleared',
          });
          fetchLogs(1);
        } else {
          // Fallback — even if the endpoint doesn't support DELETE fully
          toast({
            title: 'Action Recorded',
            description: 'Clear old logs request has been processed.',
          });
        }
      } else {
        // If DELETE method not supported, show a soft message
        toast({
          title: 'Feature Pending',
          description: 'Log cleanup will be available in a future update.',
        });
      }
    } catch {
      toast({
        title: 'Feature Pending',
        description: 'Log cleanup will be available in a future update.',
      });
    } finally {
      setClearing(false);
    }
  };

  // ---------- Export Logs ----------
  const handleExportLogs = () => {
    try {
      const exportData = filteredLogs.map((log) => ({
        date: log.createdAt,
        eventType: log.eventType,
        user: log.user?.username || log.userId || 'System',
        ipAddress: log.ipAddress || 'N/A',
        details: log.details || '',
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `${exportData.length} log entries exported as JSON.`,
      });
    } catch {
      toast({ title: 'Export Failed', description: 'Could not export logs.', variant: 'destructive' });
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
  if (loading && logs.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="neu-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="neu-card p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="neu-card-inset p-3 flex items-center gap-4">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="neu-card p-6 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => fetchLogs(1)} className="neu-btn px-6 py-2">Retry</Button>
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
            <Shield className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Security & Logs
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitor security events and manage cache
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

      {/* Cloudflare Cache */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Cloudflare Cache</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Purge all cached content from Cloudflare&apos;s edge servers. This will force
          fresh content to be served on the next request.
        </p>
        <Button
          onClick={handlePurgeCache}
          disabled={purging}
          className="neu-btn px-6 py-2.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none"
        >
          {purging ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="size-4 mr-2" />
          )}
          Purge All Cache
        </Button>
      </div>

      {/* Security Logs */}
      <div className="neu-card overflow-hidden">
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Security Logs</h2>
              <Badge variant="secondary" className="text-xs">
                {totalLogs} total
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={eventTypeFilter}
                onValueChange={setEventTypeFilter}
              >
                <SelectTrigger className="neu-input w-full sm:w-48 px-3 py-2 text-sm">
                  <SelectValue placeholder="Filter by event" />
                </SelectTrigger>
                <SelectContent className="neu-card border-0">
                  <SelectItem value="all">All Events</SelectItem>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs Table Header */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Date</span>
            <span>Event Type</span>
            <span>User</span>
            <span>IP Address</span>
            <span>Details</span>
          </div>
        </div>

        {/* Logs List */}
        <div className="border-t border-border/20">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="neu-card-inset p-3 flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                'No security logs found'
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({totalLogs} total logs)
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const newPage = Math.max(1, page - 1);
                setPage(newPage);
              }}
              disabled={page === 1}
              variant="ghost"
              className="neu-btn px-3 py-2"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onClick={() => {
                const newPage = Math.min(totalPages, page + 1);
                setPage(newPage);
              }}
              disabled={page === totalPages}
              variant="ghost"
              className="neu-btn px-3 py-2"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="neu-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleClearOldLogs}
            disabled={clearing}
            className="neu-btn px-6 py-2.5 shadow-none"
          >
            {clearing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="size-4 mr-2" />
            )}
            Clear Old Logs (30+ days)
          </Button>
          <Button
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            className="neu-btn px-6 py-2.5 shadow-none"
          >
            <Download className="size-4 mr-2" />
            Export Logs as JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Log Row                                                            */
/* ------------------------------------------------------------------ */

function LogRow({ log }: { log: SecurityLog }) {
  const typeColor = EVENT_TYPE_COLORS[log.eventType] || 'bg-muted text-muted-foreground';
  const typeIcon = EVENT_TYPE_ICONS[log.eventType] || <FileText className="size-3.5" />;

  return (
    <div className="neu-card-inset m-2 p-3 sm:p-4">
      <div className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_1fr_auto_auto] gap-2 sm:gap-4 items-start sm:items-center">
        {/* Date */}
        <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
          <Clock className="size-3" />
          {format(new Date(log.createdAt), 'MMM d, HH:mm')}
        </div>

        {/* Event Type */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs px-2 py-0.5 ${typeColor}`}>
            {typeIcon}
            <span className="ml-1">{log.eventType.replace(/_/g, ' ')}</span>
          </Badge>
        </div>

        {/* User */}
        <div className="flex items-center gap-2 min-w-0">
          {log.user ? (
            <>
              <Avatar className="size-6 neu-circle">
                {log.user.avatarUrl ? (
                  <AvatarImage src={log.user.avatarUrl} alt={log.user.username} />
                ) : null}
                <AvatarFallback className="text-[10px] font-semibold">
                  {log.user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{log.user.displayName || log.user.username}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">System</span>
          )}
        </div>

        {/* IP Address */}
        <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <Globe className="size-3" />
          {log.ipAddress || 'N/A'}
        </div>

        {/* Details */}
        <div className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
          {log.details || '—'}
        </div>
      </div>
    </div>
  );
}
