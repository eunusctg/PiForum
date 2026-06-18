'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { FileText, Plus, Pencil, Trash2, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AdminGate } from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';
import type { Page } from '@/lib/types';

export default function AdminPages() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const { toast } = useToast();

  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [showInFooter, setShowInFooter] = useState(false);
  const [showInHeader, setShowInHeader] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pages?all=1');
      const data = await res.json();
      if (data.success) setPages(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) fetchPages();
  }, [fetchPages, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setTitle(''); setSlug(''); setContent(''); setExcerpt('');
    setStatus('published'); setShowInFooter(false); setShowInHeader(false); setSortOrder(0);
    setDialogOpen(true);
  };

  const openEdit = (p: Page) => {
    setEditing(p);
    setTitle(p.title); setSlug(p.slug); setContent(p.content); setExcerpt(p.excerpt || '');
    setStatus(p.status === 'draft' ? 'draft' : 'published');
    setShowInFooter(p.showInFooter); setShowInHeader(p.showInHeader); setSortOrder(p.sortOrder);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Title and content are required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const body = { title, slug, content, excerpt, status, showInFooter, showInHeader, sortOrder };
      const res = editing
        ? await fetch(`/api/pages/${encodeURIComponent(editing.slug)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
            body: JSON.stringify(body),
          })
        : await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (data.success) {
        toast({ title: editing ? 'Page Updated' : 'Page Created' });
        setDialogOpen(false);
        fetchPages();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !deleteTarget) return;
    try {
      const res = await fetch(`/api/pages/${encodeURIComponent(deleteTarget.slug)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Page Deleted' });
        setDeleteTarget(null);
        fetchPages();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
  };

  if (!isAdmin()) return <AdminGate />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5"><FileText className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Pages</h1>
            <p className="text-xs text-muted-foreground">Static content pages & header/footer nav links.</p>
          </div>
        </div>
        <Button onClick={openCreate} className="neu-btn px-4 py-2 text-sm font-medium bg-primary text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New Page
        </Button>
      </div>

      <div className="neu-card-inset p-3 text-xs text-muted-foreground">
        Toggle <strong>Show in Header</strong> or <strong>Show in Footer</strong> on any page to add it to the site header/footer navigation. The footer also shows a configurable copyright line (Branding → Header & Footer).
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : pages.length === 0 ? (
        <div className="neu-card p-10 text-center text-sm text-muted-foreground">
          <FileText className="size-10 mx-auto mb-3 opacity-40" />
          No pages yet. Create your first page (e.g. About, Privacy, Terms).
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="neu-card p-4 flex items-center gap-3 flex-wrap">
              <div className="neu-circle p-2 shrink-0"><FileText className="size-4 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {p.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.status === 'published' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {p.status === 'published' ? <Eye className="size-2.5 inline mr-0.5" /> : <EyeOff className="size-2.5 inline mr-0.5" />}
                    {p.status}
                  </span>
                  {p.showInHeader && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Header</span>}
                  {p.showInFooter && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Footer</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">/page/{p.slug}</div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => navigateTo('page', { pageSlug: p.slug })} className="neu-btn p-2" title="View"><ExternalLink className="size-3.5" /></button>
                <button onClick={() => openEdit(p)} className="neu-btn p-2" title="Edit"><Pencil className="size-3.5" /></button>
                <button onClick={() => setDeleteTarget(p)} className="neu-btn p-2 text-destructive" title="Delete"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neu-card-static max-w-2xl max-h-[85vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Page' : 'New Page'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-title">Title</Label>
                <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} className="neu-input px-3 py-2.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-slug">Slug (URL)</Label>
                <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="about, privacy, terms" className="neu-input px-3 py-2.5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-excerpt">Excerpt (optional)</Label>
              <Input id="p-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="neu-input px-3 py-2.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-content">Content (Markdown)</Label>
              <Textarea id="p-content" value={content} onChange={(e) => setContent(e.target.value)} className="neu-input px-3 py-2.5 min-h-[220px] resize-y font-mono text-sm" placeholder="# About Us&#10;&#10;Write your page content in Markdown..." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-status">Status</Label>
                <select id="p-status" value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')} className="neu-input px-3 py-2.5 w-full rounded-xl bg-transparent">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-order">Sort Order</Label>
                <Input id="p-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="neu-input px-3 py-2.5" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={showInHeader} onCheckedChange={setShowInHeader} /> Header
                </label>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={showInFooter} onCheckedChange={setShowInFooter} /> Footer
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><button className="neu-btn px-4 py-2 text-sm">Cancel</button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="neu-btn px-4 py-2 text-sm bg-primary text-primary-foreground">
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="neu-card-static">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The page will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-btn px-4 py-2 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="neu-btn px-4 py-2 text-sm bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
