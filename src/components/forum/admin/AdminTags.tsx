'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Tag as TagIcon, Plus, Trash2, Loader2, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { AdminGate } from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  usageCount: number;
}

export default function AdminTags() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { toast } = useToast();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TagItem | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#D4AF37');
  const [saving, setSaving] = useState(false);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.success) setTags(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) fetchTags();
  }, [fetchTags, isAdmin]);

  const openCreate = () => { setEditTarget(null); setName(''); setColor('#D4AF37'); setDialogOpen(true); };
  const openEdit = (t: TagItem) => { setEditTarget(t); setName(t.name); setColor(t.color || '#D4AF37'); setDialogOpen(true); };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    try {
      setSaving(true);
      const res = editTarget
        ? await fetch(`/api/tags/${editTarget.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify({ name, color }) })
        : await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify({ name, color }) });
      const data = await res.json();
      if (data.success) {
        toast({ title: editTarget ? 'Tag Updated' : 'Tag Created' });
        setDialogOpen(false);
        fetchTags();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: TagItem) => {
    if (!currentUser) return;
    if (!confirm(`Delete tag "${t.name}"? It will be removed from all threads.`)) return;
    const res = await fetch(`/api/tags/${t.id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } });
    const data = await res.json();
    if (data.success) { toast({ title: 'Tag Deleted' }); fetchTags(); }
    else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
  };

  if (!isAdmin()) return <AdminGate />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5"><TagIcon className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Tags</h1>
            <p className="text-xs text-muted-foreground">Manage the tag taxonomy.</p>
          </div>
        </div>
        <Button onClick={openCreate} className="neu-btn px-4 py-2 text-sm font-medium bg-primary text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New Tag
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : tags.length === 0 ? (
        <div className="neu-card p-10 text-center text-sm text-muted-foreground">
          <TagIcon className="size-10 mx-auto mb-3 opacity-40" />
          No tags yet.
        </div>
      ) : (
        <div className="neu-card p-5">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <div key={t.id} className="neu-card-inset px-3 py-2 flex items-center gap-2 group">
                <button onClick={() => navigateTo('tags')} className="flex items-center gap-1.5 text-sm">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color || 'var(--primary)' }} />
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.usageCount}</span>
                </button>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(t)} className="p-1 hover:text-primary"><Pencil className="size-3" /></button>
                  <button onClick={() => handleDelete(t)} className="p-1 hover:text-destructive"><Trash2 className="size-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neu-card-static max-w-sm">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Tag' : 'New Tag'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} className="neu-input px-3 py-2.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-color">Color</Label>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="neu-input h-10 w-14 p-1 rounded-xl" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="neu-input px-3 py-2.5 flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><button className="neu-btn px-4 py-2 text-sm">Cancel</button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="neu-btn px-4 py-2 text-sm bg-primary text-primary-foreground">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editTarget ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
