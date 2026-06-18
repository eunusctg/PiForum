'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import type { Page } from '@/lib/types';

interface StaticPageViewProps {
  slug: string;
}

/* Renders a single static page (About, Privacy, Terms, etc.) managed via  */
/* Content → Pages in the admin panel.                                     */
export default function StaticPageView({ slug }: StaticPageViewProps) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!slug) {
        setError('Page not found');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/pages/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (active) {
          if (data.success && data.data) {
            setPage(data.data);
          } else {
            setError(data.error || 'Page not found');
          }
        }
      } catch {
        if (active) setError('Failed to load page');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="neu-card p-8 text-center space-y-4">
          <FileText className="size-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Page Not Found</h1>
          <p className="text-sm text-muted-foreground">{error || 'The page you are looking for does not exist.'}</p>
          <button onClick={() => navigateTo('home')} className="neu-btn px-4 py-2 text-sm">
            <ArrowLeft className="size-4 mr-2 inline" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigateTo('home')}
        className="neu-btn px-3 py-2 text-xs font-medium mb-5"
      >
        <ArrowLeft className="size-3.5 mr-1.5 inline" />
        Back
      </button>
      <article className="neu-card p-6 sm:p-8 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{page.title}</h1>
          {page.excerpt && <p className="text-sm text-muted-foreground">{page.excerpt}</p>}
        </header>
        <div className="neu-divider" />
        <div
          className="prose prose-sm max-w-none dark:prose-invert leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: simpleMarkdown(page.content) }}
        />
      </article>
    </div>
  );
}

/* Minimal, safe-ish markdown → HTML renderer (headings, bold, italic,   */
/* links, lists, paragraphs). The admin Pages editor stores markdown; we  */
/* render it here without pulling in a full markdown library.             */
function simpleMarkdown(md: string): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const lines = esc(md).split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const inline = line
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');
    if (/^#{1,3}\s/.test(line)) {
      closeList();
      const level = (line.match(/^#+/) || ['#'])[0].length;
      const text = inline.replace(/^#{1,3}\s/, '');
      html.push(`<h${level} class="font-bold mt-4 mb-2">${text}</h${level}>`);
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) {
        html.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      html.push(`<li>${inline.replace(/^[-*]\s/, '')}</li>`);
    } else {
      closeList();
      html.push(`<p class="mb-3">${inline}</p>`);
    }
  }
  closeList();
  return html.join('\n');
}
