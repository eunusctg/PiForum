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
  Mail,
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
  /** When true, render as an always-visible row of social buttons (no toggle) */
  expanded?: boolean;
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
  reddit: '#FF4500',
  email: '#6B7280',
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ShareButtons({
  url,
  title,
  className,
  expanded = false,
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

  const shareReddit = useCallback(() => {
    openShareWindow(
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
    );
  }, [url, title]);

  const shareEmail = useCallback(() => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`Check out this post: ${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [url, title]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ description: 'Link copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: 'Failed to copy link' });
    }
  }, [url, toast]);

  /* ---- individual share button (reused in both modes) ---- */
  const ShareIconButton = ({ onClick, label, icon, bgColor, size = 'sm' }: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
    bgColor: string;
    size?: 'sm' | 'md';
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'md' ? 'size-10 sm:size-11' : 'size-8'
      )}
      style={{ backgroundColor: bgColor }}
      title={label}
    >
      {icon}
    </button>
  );

  /* ---- EXPANDED MODE: always-visible row of share buttons ---- */
  if (expanded) {
    return (
      <div ref={containerRef} className={cn('flex flex-col gap-3', className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Share2 className="size-4" />
          <span>Share this post</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareIconButton
            onClick={shareFacebook}
            label="Share on Facebook"
            bgColor={BRAND.facebook}
            icon={<Facebook className="size-4" />}
            size="md"
          />
          <ShareIconButton
            onClick={shareTwitter}
            label="Share on X (Twitter)"
            bgColor={BRAND.twitter}
            icon={<Twitter className="size-4" />}
            size="md"
          />
          <ShareIconButton
            onClick={shareLinkedin}
            label="Share on LinkedIn"
            bgColor={BRAND.linkedin}
            icon={<Linkedin className="size-4" />}
            size="md"
          />
          <ShareIconButton
            onClick={shareWhatsapp}
            label="Share on WhatsApp"
            bgColor={BRAND.whatsapp}
            icon={<MessageCircle className="size-4" />}
            size="md"
          />
          <ShareIconButton
            onClick={shareReddit}
            label="Share on Reddit"
            bgColor={BRAND.reddit}
            icon={
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            }
            size="md"
          />
          <ShareIconButton
            onClick={shareEmail}
            label="Share via Email"
            bgColor={BRAND.email}
            icon={<Mail className="size-4" />}
            size="md"
          />
          {/* Copy link */}
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy link"
            className={cn(
              'flex items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring size-10 sm:size-11',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
            title="Copy link"
          >
            {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
          </button>
        </div>
      </div>
    );
  }

  /* ---- COMPACT MODE: toggle dropdown in action bar ---- */
  return (
    <div ref={containerRef} className={cn('relative inline-flex flex-col items-end gap-1', className)}>
      {/* Expanded share row — slides in above the toggle */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          open ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-1.5 pb-1">
          <ShareIconButton onClick={shareFacebook} label="Share on Facebook" bgColor={BRAND.facebook} icon={<Facebook className="size-3.5" />} />
          <ShareIconButton onClick={shareTwitter} label="Share on X (Twitter)" bgColor={BRAND.twitter} icon={<Twitter className="size-3.5" />} />
          <ShareIconButton onClick={shareLinkedin} label="Share on LinkedIn" bgColor={BRAND.linkedin} icon={<Linkedin className="size-3.5" />} />
          <ShareIconButton onClick={shareWhatsapp} label="Share on WhatsApp" bgColor={BRAND.whatsapp} icon={<MessageCircle className="size-3.5" />} />
          <ShareIconButton onClick={shareReddit} label="Share on Reddit" bgColor={BRAND.reddit} icon={
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
          } />
          <ShareIconButton onClick={shareEmail} label="Share via Email" bgColor={BRAND.email} icon={<Mail className="size-3.5" />} />
          {/* Copy link */}
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy link"
            className={cn(
              'flex items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="neu-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-label="Share"
      >
        <Share2 className="size-3.5" />
        <span>Share</span>
      </button>
    </div>
  );
}
