'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { Category, Forum } from '@/lib/types';
import {
  LayoutGrid,
  ArrowLeft,
  Shield,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------ */
/*  Admin Categories — Category & Forum management                     */
/* ------------------------------------------------------------------ */

const ACCESS_LABELS: Record<number, string> = {
  0: 'Public',
  1: 'Registered',
  2: 'Admin',
};

const ACCESS_COLORS: Record<number, string> = {
  0: 'bg-chart-2/20 text-chart-2',
  1: 'bg-chart-3/20 text-chart-3',
  2: 'bg-chart-1/20 text-chart-1',
};

export default function AdminCategories() {
  const { currentUser, isAdmin, navigateTo } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Category Dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catSort, setCatSort] = useState('0');
  const [catAccess, setCatAccess] = useState('0');
  const [savingCategory, setSavingCategory] = useState(false);

  // Forum Dialog
  const [forumDialogOpen, setForumDialogOpen] = useState(false);
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [forumCategoryId, setForumCategoryId] = useState('');
  const [forumName, setForumName] = useState('');
  const [forumDesc, setForumDesc] = useState('');
  const [forumIcon, setForumIcon] = useState('');
  const [forumSort, setForumSort] = useState('0');
  const [savingForum, setSavingForum] = useState(false);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'forum';
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userIsAdmin = isAdmin();

  // ---------- Fetch ----------
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.error || 'Failed to load categories');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userIsAdmin) return;
    fetchCategories();
  }, [fetchCategories, userIsAdmin]);

  // ---------- Category CRUD ----------
  const openNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setCatIcon('');
    setCatSort('0');
    setCatAccess('0');
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatIcon(cat.icon || '');
    setCatSort(String(cat.sortOrder));
    setCatAccess(String(cat.accessLevel));
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!currentUser || !catName.trim()) return;
    try {
      setSavingCategory(true);
      const body = {
        name: catName.trim(),
        description: catDesc.trim() || null,
        icon: catIcon.trim() || null,
        sortOrder: parseInt(catSort) || 0,
        accessLevel: parseInt(catAccess) || 0,
      };

      const url = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: editingCategory ? 'Category Updated' : 'Category Created',
          description: `${catName} has been ${editingCategory ? 'updated' : 'created'}`,
        });
        setCategoryDialogOpen(false);
        fetchCategories();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save category', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingCategory(false);
    }
  };

  // ---------- Forum CRUD ----------
  const openNewForum = (categoryId: string) => {
    setEditingForum(null);
    setForumCategoryId(categoryId);
    setForumName('');
    setForumDesc('');
    setForumIcon('');
    setForumSort('0');
    setForumDialogOpen(true);
  };

  const openEditForum = (forum: Forum, categoryId: string) => {
    setEditingForum(forum);
    setForumCategoryId(categoryId);
    setForumName(forum.name);
    setForumDesc(forum.description || '');
    setForumIcon(forum.icon || '');
    setForumSort(String(forum.sortOrder));
    setForumDialogOpen(true);
  };

  const handleSaveForum = async () => {
    if (!currentUser || !forumName.trim()) return;
    try {
      setSavingForum(true);
      const body = {
        categoryId: forumCategoryId,
        name: forumName.trim(),
        description: forumDesc.trim() || null,
        icon: forumIcon.trim() || null,
        sortOrder: parseInt(forumSort) || 0,
      };

      const url = editingForum
        ? `/api/forums/${editingForum.id}`
        : '/api/forums';
      const method = editingForum ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: editingForum ? 'Forum Updated' : 'Forum Created',
          description: `${forumName} has been ${editingForum ? 'updated' : 'created'}`,
        });
        setForumDialogOpen(false);
        fetchCategories();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save forum', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingForum(false);
    }
  };

  // ---------- Delete ----------
  const openDeleteDialog = (type: 'category' | 'forum', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    try {
      setDeleting(true);
      const url =
        deleteTarget.type === 'category'
          ? `/api/categories/${deleteTarget.id}`
          : `/api/forums/${deleteTarget.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id },
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Deleted',
          description: `${deleteTarget.name} has been deleted`,
        });
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchCategories();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setDeleting(false);
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
  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="neu-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
            {[1, 2].map((j) => (
              <div key={j} className="neu-card-inset p-3 flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ---------- Error ----------
  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="neu-card p-6 text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={fetchCategories} className="neu-btn px-6 py-2">Retry</Button>
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
            <LayoutGrid className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Categories & Forums
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage forum structure and organization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewCategory} className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none">
            <Plus className="size-4 mr-2" />
            New Category
          </Button>
          <Button
            onClick={() => navigateTo('admin-dashboard')}
            variant="ghost"
            className="neu-btn px-4 py-2 text-sm"
          >
            <ArrowLeft className="size-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>

      {/* Category List */}
      {categories.length === 0 ? (
        <div className="neu-card p-8 text-center">
          <LayoutGrid className="size-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No categories yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create your first category to organize forum discussions.
          </p>
          <Button onClick={openNewCategory} className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none">
            <Plus className="size-4 mr-2" />
            Create Category
          </Button>
        </div>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="neu-card overflow-hidden">
            {/* Category Header */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="neu-circle p-2.5 shrink-0">
                  {category.icon ? (
                    <span className="text-lg">{category.icon}</span>
                  ) : (
                    <LayoutGrid className="size-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-semibold truncate">
                      {category.name}
                    </h2>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 ${
                        ACCESS_COLORS[category.accessLevel] || ''
                      }`}
                    >
                      {ACCESS_LABELS[category.accessLevel] || 'Public'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Sort: {category.sortOrder}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => openNewForum(category.id)}
                  className="neu-btn px-3 py-1.5 text-xs"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add Forum
                </Button>
                <button
                  onClick={() => openEditCategory(category)}
                  className="neu-btn p-2 hover:text-primary transition-colors"
                  title="Edit Category"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => openDeleteDialog('category', category.id, category.name)}
                  className="neu-btn p-2 hover:text-destructive transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            {/* Forums List */}
            <div className="border-t border-border/20">
              {category.forums && category.forums.length > 0 ? (
                <div className="divide-y divide-border/20">
                  {category.forums.map((forum) => (
                    <div
                      key={forum.id}
                      className="neu-card-inset m-2 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="neu-circle p-2 shrink-0">
                          {forum.icon ? (
                            <span className="text-sm">{forum.icon}</span>
                          ) : (
                            <MessageSquare className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {forum.name}
                          </div>
                          {forum.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {forum.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-xs text-muted-foreground text-center">
                          <div className="font-semibold">{forum.threadCount}</div>
                          <div>Threads</div>
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          <div className="font-semibold">{forum.postCount}</div>
                          <div>Posts</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditForum(forum, category.id)}
                            className="neu-btn p-1.5 hover:text-primary transition-colors"
                            title="Edit Forum"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog('forum', forum.id, forum.name)}
                            className="neu-btn p-1.5 hover:text-destructive transition-colors"
                            title="Delete Forum"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No forums in this category
                </div>
              )}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="neu-card border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update category details below.'
                : 'Create a new category to organize your forums.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Enter category name"
                className="neu-input px-3 py-2.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Brief description of this category"
                className="neu-input px-3 py-2.5 min-h-[70px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <Input
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  placeholder="📋"
                  className="neu-input px-3 py-2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={catSort}
                  onChange={(e) => setCatSort(e.target.value)}
                  min="0"
                  className="neu-input px-3 py-2.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={catAccess} onValueChange={setCatAccess}>
                <SelectTrigger className="neu-input w-full px-3 py-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="neu-card border-0">
                  <SelectItem value="0">Public — Visible to everyone</SelectItem>
                  <SelectItem value="1">Registered — Logged-in users only</SelectItem>
                  <SelectItem value="2">Admin — Administrators only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCategoryDialogOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={savingCategory || !catName.trim()}
              className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              {savingCategory && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Forum Dialog */}
      <Dialog open={forumDialogOpen} onOpenChange={setForumDialogOpen}>
        <DialogContent className="neu-card border-0 max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingForum ? 'Edit Forum' : 'New Forum'}
            </DialogTitle>
            <DialogDescription>
              {editingForum
                ? 'Update forum details below.'
                : 'Add a new discussion forum to this category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Forum Name *</Label>
              <Input
                value={forumName}
                onChange={(e) => setForumName(e.target.value)}
                placeholder="Enter forum name"
                className="neu-input px-3 py-2.5"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={forumDesc}
                onChange={(e) => setForumDesc(e.target.value)}
                placeholder="Brief description of this forum"
                className="neu-input px-3 py-2.5 min-h-[70px] resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <Input
                  value={forumIcon}
                  onChange={(e) => setForumIcon(e.target.value)}
                  placeholder="💬"
                  className="neu-input px-3 py-2.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={forumSort}
                  onChange={(e) => setForumSort(e.target.value)}
                  min="0"
                  className="neu-input px-3 py-2.5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setForumDialogOpen(false)}
              variant="ghost"
              className="neu-btn px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveForum}
              disabled={savingForum || !forumName.trim()}
              className="neu-btn px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-none"
            >
              {savingForum && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingForum ? 'Update Forum' : 'Create Forum'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              {deleteTarget?.type === 'category' &&
                ' This will also delete all forums and threads within this category. '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-btn px-4 py-2">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="neu-btn px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-none"
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
