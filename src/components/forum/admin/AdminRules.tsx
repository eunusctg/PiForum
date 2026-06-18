'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ScrollText, Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { AdminGate } from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';
import type { Rule } from '@/lib/types';

export default function AdminRules() {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', icon: '', category: '', sortOrder: 0, active: true });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rules?all=1');
      const data = await res.json();
      if (data.success) setRules(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin()) fetchRules();
  }, [fetchRules, isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', icon: '', category: '', sortOrder: rules.length, active: true });
    setDialogOpen(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description, icon: r.icon || '', category: r.category || '', sortOrder: r.sortOrder, active: r.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentUser) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: 'Title and description are required', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const res = editing
        ? await fetch(`/api/rules/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify(form) })
        : await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) {
        toast({ title: editing ? 'Rule Updated' : 'Rule Created' });
        setDialogOpen(false);
        fetchRules();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Rule) => {
    if (!currentUser) return;
    if (!confirm(`Delete rule "${r.title}"?`)) return;
    const res = await fetch(`/api/rules/${r.id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } });
    const data = await res.json();
    if (data.success) { toast({ title: 'Rule Deleted' }); fetchRules(); }
    else toast({ title: 'Error', description: data.error || 'Failed', variant: 'destructive' });
  };

  if (!isAdmin()) return <AdminGate />;

  // Group by category
  const grouped = rules.reduce<Record<string, Rule[]>>((acc, r) => {
    const cat = r.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neu-circle p-2.5"><ScrollText className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Rules</h1>
            <p className="text-xs text-muted-foreground">Community rules shown to members.</p>
          </div>
        </div>
        <Button onClick={openCreate} className="neu-btn px-4 py-2 text-sm font-medium bg-primary text-primary-foreground">
          <Plus className="size-4 mr-1.5" /> New Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="neu-card p-10 text-center text-sm text-muted-foreground">
          <ScrollText className="size-10 mx-auto mb-3 opacity-40" />
          No rules yet. Add rules like "Be respectful", "No spam", "Stay on topic".
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-1">{cat}</h3>
              {list.map((r, idx) => (
                <div key={r.id} className="neu-card p-4 flex items-start gap-3">
                  <div className="neu-circle p-2 shrink-0 mt-0.5">
                    {r.icon ? <span className="text-base">{r.icon}</span> : <span className="text-xs font-bold text-primary">{idx + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {r.title}
                      {!r.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Hidden</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(r)} className="neu-btn p-2" title="Edit"><Pencil className="size-3.5" /></button>
                    <button onClick={() => handleDelete(r)} className="neu-btn p-2 text-destructive" title="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="neu-card-static max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Rule' : 'New Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ru-title">Title</Label>
              <Input id="ru-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="neu-input px-3 py-2.5" placeholder="Be respectful" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ru-desc">Description</Label>
              <Textarea id="ru-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="neu-input px-3 py-2.5 min-h-[80px] resize-none" placeholder="Treat all members with respect..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ru-icon">Icon (emoji)</Label>
                <Input id="ru-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="neu-input px-3 py-2.5" placeholder="🤝" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ru-cat">Category</Label>
                <Input id="ru-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="neu-input px-3 py-2.5" placeholder="Conduct" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ru-order">Sort Order</Label>
                <Input id="ru-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="neu-input px-3 py-2.5" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} /> Active
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><button className="neu-btn px-4 py-2 text-sm">Cancel</button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="neu-btn px-4 py-2 text-sm bg-primary text-primary-foreground">
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
