'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: 'thread' | 'post' | 'user';
  targetId: string;
  targetTitle?: string; // e.g. thread title or "Post #5"
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REASON_OPTIONS = [
  { value: 'spam', label: 'Spam', icon: '🚫' },
  { value: 'harassment', label: 'Harassment', icon: '😠' },
  { value: 'off-topic', label: 'Off-topic', icon: '💬' },
  { value: 'inappropriate', label: 'Inappropriate', icon: '⛔' },
  { value: 'other', label: 'Other', icon: '📝' },
] as const;

const MAX_DETAILS_LENGTH = 500;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);

  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Reset & close ---------- */

  const resetForm = useCallback(() => {
    setReason('');
    setDetails('');
    setSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  /* ---------- Submit ---------- */

  const handleSubmit = useCallback(async () => {
    if (!currentUser) return;
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Please select a reason for your report.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      };

      // Only include targetUserId for user reports
      if (targetType === 'user') {
        body.targetUserId = targetId;
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      toast({
        title: 'Report submitted',
        description: 'Thank you. Our team will review your report shortly.',
      });

      handleClose();
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }, [currentUser, reason, details, targetType, targetId, toast, handleClose]);

  /* ---------- Unauthenticated state ---------- */

  if (!currentUser) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="neu-card-static sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Report {targetType}
            </DialogTitle>
            <DialogDescription>
              You must be logged in to submit a report.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Please log in to report this {targetType}
              {targetTitle ? (
                <span className="font-medium text-foreground">
                  {' '}
                  &ldquo;{targetTitle}&rdquo;
                </span>
              ) : null}
              .
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} className="neu-btn">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  /* ---------- Authenticated state ---------- */

  const targetLabel =
    targetTitle ||
    (targetType === 'thread'
      ? 'this thread'
      : targetType === 'post'
        ? 'this post'
        : 'this user');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="neu-card-static sm:max-w-lg backdrop-blur-sm"
        showCloseButton={false}
      >
        {/* Custom close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Report {targetType}
          </DialogTitle>
          <DialogDescription>
            You are reporting {targetLabel}. Please select a reason below.
          </DialogDescription>
        </DialogHeader>

        {/* Reason selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Reason *</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REASON_OPTIONS.map((opt) => {
              const selected = reason === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReason(opt.value)}
                  className={`neu-btn flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  aria-pressed={selected}
                >
                  <span aria-hidden="true">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Details textarea */}
        <div className="space-y-2">
          <Label htmlFor="report-details" className="text-sm font-medium">
            Additional details{' '}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="report-details"
            placeholder="Provide any additional context that might help us review this report..."
            value={details}
            onChange={(e) => {
              if (e.target.value.length <= MAX_DETAILS_LENGTH) {
                setDetails(e.target.value);
              }
            }}
            maxLength={MAX_DETAILS_LENGTH}
            rows={3}
            className="neu-input resize-none text-sm"
          />
          <div className="flex justify-end">
            <span
              className={`text-xs ${
                details.length >= MAX_DETAILS_LENGTH
                  ? 'text-destructive font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {details.length}/{MAX_DETAILS_LENGTH}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="neu-btn"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="neu-btn bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <AlertTriangle className="size-4" />
                Submit Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
