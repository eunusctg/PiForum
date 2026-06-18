'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Shield, ArrowLeft, AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  useAdminSettings — shared hook for loading & saving key-value      */
/*  settings. Every settings-based admin panel uses this so there is   */
/*  exactly ONE way to read/write the Setting table (no duplicates).   */
/* ------------------------------------------------------------------ */

export function useAdminSettings() {
  const { currentUser, isAdmin, setSettings: setStoreSettings } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const initialRef = useRef<Record<string, string>>({});

  const userIsAdmin = isAdmin();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setValues(data.data || {});
        initialRef.current = { ...(data.data || {}) };
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchSettings();
  }, [fetchSettings, userIsAdmin]);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setMany = useCallback((patch: Record<string, string>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(
    async (keys?: string[]) => {
      if (!currentUser) return false;
      try {
        setSaving(true);
        // If keys provided, only save those; otherwise save everything.
        const entries = keys
          ? keys.map((k) => ({ key: k, value: String(values[k] ?? '') }))
          : Object.entries(values).map(([key, value]) => ({ key, value: String(value) }));

        if (entries.length === 0) {
          toast({ title: 'Nothing to save' });
          return true;
        }

        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify({ settings: entries }),
        });
        const data = await res.json();
        if (data.success) {
          initialRef.current = { ...values };
          // Sync global store so header/footer/forum name update instantly.
          setStoreSettings(data.data || {});
          toast({ title: 'Settings Saved', description: 'Your changes have been applied.' });
          return true;
        } else {
          toast({
            title: 'Save Failed',
            description: data.error || 'Unknown error',
            variant: 'destructive',
          });
          return false;
        }
      } catch {
        toast({ title: 'Save Failed', description: 'Network error', variant: 'destructive' });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [currentUser, values, toast, setStoreSettings]
  );

  return {
    loading,
    error,
    saving,
    values,
    setValue,
    setMany,
    save,
    refetch: fetchSettings,
    userIsAdmin,
    currentUser,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared shells so every panel looks consistent.                     */
/* ------------------------------------------------------------------ */

export function AdminGate({ children }: { children: React.ReactNode }) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isAdmin = useAppStore((s) => s.isAdmin);
  if (isAdmin()) return <>{children}</>;
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

export function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="neu-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SettingsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="neu-card p-6 text-center space-y-3">
      <AlertTriangle className="size-8 text-destructive mx-auto" />
      <p className="text-destructive font-medium">{message}</p>
      <Button onClick={onRetry} className="neu-btn px-6 py-2">
        Retry
      </Button>
    </div>
  );
}

/** Standard save bar shown at the bottom of every settings panel. */
export function SaveBar({
  saving,
  onSave,
  saveLabel = 'Save Settings',
}: {
  saving: boolean;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex justify-end pt-2">
      <Button
        onClick={onSave}
        disabled={saving}
        className="neu-btn px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none text-sm font-semibold"
      >
        {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
        {saveLabel}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flaws callout — used to surface the known limitations of each      */
/*  system honestly to the operator (the user asked for "flaws").      */
/* ------------------------------------------------------------------ */

export function FlawsCallout({ flaws }: { flaws: string[] }) {
  if (!flaws.length) return null;
  return (
    <div className="neu-card-inset p-4 space-y-2" role="note" aria-label="Known limitations">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="size-4 text-amber-500" />
        Known limitations of this system
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
        {flaws.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionHeader — reusable header for a settings card.              */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
