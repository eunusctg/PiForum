'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Link2,
  Check,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function openShareWindow(href: string) {
  window.open(
    href,
    '_blank',
    'width=600,height=400,menubar=no,toolbar=no,status=no,scrollbars=yes'
  );
}

/* ------------------------------------------------------------------ */
/*  Brand colours                                                      */
/* ------------------------------------------------------------------ */

const BRAND = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  whatsapp: '#25D366',
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShareButtons({
  url,
  title,
  className,
}: ShareButtonsProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  /* ---- close on outside click ---- */
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  /* ---- share handlers ---- */
  const shareFacebook = useCallback(() => {
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    );
  }, [url]);

  const shareTwitter = useCallback(() => {
    openShareWindow(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    );
  }, [url, title]);

  const shareLinkedin = useCallback(() => {
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    );
  }, [url]);

  const shareWhatsapp = useCallback(() => {
    openShareWindow(
      `https://wa.me/?text=${encodeURIComponent(title)}%20${encodeURIComponent(url)}`
    );
  }, [url, title]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ description: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: 'Failed to copy link' });
    }
  }, [url, toast]);

  /* ---- render ---- */
  return (
    <div ref={containerRef} className={cn('relative inline-flex flex-col items-end gap-1', className)}>
      {/* Expanded share row — slides in above the toggle */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          open ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-1.5 pb-1">
          {/* Facebook */}
          <button
            type="button"
            onClick={shareFacebook}
            aria-label="Share on Facebook"
            className="flex size-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: BRAND.facebook }}
          >
            <Facebook className="size-3.5" />
          </button>

          {/* Twitter / X */}
          <button
            type="button"
            onClick={shareTwitter}
            aria-label="Share on Twitter"
            className="flex size-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: BRAND.twitter }}
          >
            <Twitter className="size-3.5" />
          </button>

          {/* LinkedIn */}
          <button
            type="button"
            onClick={shareLinkedin}
            aria-label="Share on LinkedIn"
            className="flex size-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: BRAND.linkedin }}
          >
            <Linkedin className="size-3.5" />
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            onClick={shareWhatsapp}
            aria-label="Share on WhatsApp"
            className="flex size-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ backgroundColor: BRAND.whatsapp }}
          >
            <MessageCircle className="size-3.5" />
          </button>

          {/* Copy link */}
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy link"
            className={cn(
              'flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Link2 className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="neu-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-label="Share"
      >
        <Share2 className="size-3.5" />
        <span>Share</span>
      </button>
    </div>
  );
}
