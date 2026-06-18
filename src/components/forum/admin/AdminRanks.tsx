'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Award, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { AdminGate } from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';

interface Rank {
  id: string;
  name: string;
  title: string;
  color: string | null;
  icon: string | null;
  minPosts: number;
  minReputation: number;
  isStaff: boolean;
  sortOrder: number;
  _count?: { users: number };
}

export default function AdminRanks() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rank | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', color: '#D4AF37', icon: '', minPosts: 0, minReputation: 0, isStaff: false, sortOrder: 0 });

  const fetchRanks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ranks');
      const data = await res.json();
      if (data.success) setRanks(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) fetchRanks();
  }, [fetchRanks, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', title: '', color: '#D4AF37', icon: '', minPosts: 0, minReputation: 0, isStaff: false, sortOrder: ranks.length });
    setDialogOpen(true);
  };
  const openEdit = (r: Rank) => {
    setEditing(r);
    setForm({ name: r.name, title: r.title, color: r.color || '#D4AF37', icon: r.icon || '', minPosts: r.minPosts, minReputation: r.minReputation, isStaff: r.isStaff, sortOrder: r.sortOrder });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!form.name.trim() || !form.title.trim()) {
      toast({ title: 'Name and title are required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const res = editing
        ? await fetch(`/api/ranks/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify(form) })
        : await fetch('/api/ranks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        toast({ title: editing ? 'Rank Updated' : 'Rank Created' });
        setDialogOpen(false);
        fetchRanks();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Rank) => {
    if (!currentUser) return;
    if (!confirm(`Delete rank "${r.name}"? Users with this rank will be unassigned.`)) return;
    const res = await fetch(`/api/ranks/${r.id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } });
    const data = await res.json();
    if (data.success) { toast({ title: 'Rank Deleted' }); fetchRanks(); }
    else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
  };

  if (!isAdmin()) return <AdminGate />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5"><Award className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Ranks</h1>
            <p className="text-xs text-muted-foreground">User titles & badges shown under usernames.</p>
          </div>
        </div>
        <Button onClick={openCreate} className="neu-btn px-4 py-2 text-sm font-medium bg-primary text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New Rank
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : ranks.length === 0 ? (
        <div className="neu-card p-10 text-center text-sm text-muted-foreground">
          <Award className="size-10 mx-auto mb-3 opacity-40" />
          No ranks yet. Create ranks like "Newcomer", "Regular", "Veteran", "Staff".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ranks.map((r) => (
            <div key={r.id} className="neu-card p-4 flex items-center gap-3">
              <div className="neu-circle p-2.5 shrink-0" style={r.color ? { color: r.color } : undefined}>
                {r.icon ? <span className="text-lg">{r.icon}</span> : <Star className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold flex items-center gap-2">
                  {r.title}
                  {r.isStaff && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Staff</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.name} · {r._count?.users ?? 0} users · ≥{r.minPosts} posts
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(r)} className="neu-btn p-2" title="Edit"><Pencil className="size-3.5" /></button>
                <button onClick={() => handleDelete(r)} className="neu-btn p-2 text-destructive" title="Delete"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neu-card-static max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Rank' : 'New Rank'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-name">Name (unique key)</Label>
                <Input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="neu-input px-3 py-2.5" placeholder="veteran" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-title">Display Title</Label>
                <Input id="r-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="neu-input px-3 py-2.5" placeholder="Veteran Member" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-color">Badge Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="neu-input h-10 w-14 p-1 rounded-xl" />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="neu-input px-3 py-2.5 flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-icon">Icon (emoji)</Label>
                <Input id="r-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="neu-input px-3 py-2.5" placeholder="⭐" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-minposts">Min Posts (auto-assign)</Label>
                <Input id="r-minposts" type="number" value={form.minPosts} onChange={(e) => setForm({ ...form, minPosts: Number(e.target.value) })} className="neu-input px-3 py-2.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-minrep">Min Reputation</Label>
                <Input id="r-minrep" type="number" value={form.minReputation} onChange={(e) => setForm({ ...form, minReputation: Number(e.target.value) })} className="neu-input px-3 py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-order">Sort Order</Label>
                <Input id="r-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="neu-input px-3 py-2.5" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.isStaff} onCheckedChange={(c) => setForm({ ...form, isStaff: c })} /> Staff rank
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><button className="neu-btn px-4 py-2 text-sm">Cancel</button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="neu-btn px-4 py-2 text-sm bg-primary text-primary-foreground">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Rank'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
