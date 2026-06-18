'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  MessageSquare, Search, Pin, PinOff, Lock, Unlock, Trash2, Loader2,
  FileText, ExternalLink, RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AdminGate } from '@/components/forum/admin/shared';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface TopicThread {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  locked: boolean;
  views: number;
  createdAt: string;
  postCount: number;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null; role: number };
  forum: { id: string; name: string };
}

interface TopicPost {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null; role: number };
  thread: { id: string; title: string };
}

export default function AdminTopics() {
  const currentUser = useAppStore((s) => s.currentUser);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const isAdmin = useAppStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [tab, setTab] = useState<'threads' | 'posts'>('threads');
  const [q, setQ] = useState('');
  const [threads, setThreads] = useState<TopicThread[]>([]);
  const [posts, setPosts] = useState<TopicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/admin/topics?type=${tab}${q.trim() ? `&q=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        if (tab === 'threads') setThreads(data.data.threads || []);
        else setPosts(data.data.posts || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => {
    if (isAdmin()) fetchTopics();
  }, [fetchTopics, isAdmin]);

  const togglePin = async (t: TopicThread) => {
    if (!currentUser) return;
    try {
      setActing(t.id);
      const res = await fetch(`/api/threads/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify({ pinned: !t.pinned }) });
      const data = await res.json();
      if (data.success) {
        toast({ title: t.pinned ? 'Thread Unpinned' : 'Thread Pinned' });
        setThreads((prev) => prev.map((x) => x.id === t.id ? { ...x, pinned: !x.pinned } : x));
      } else toast({ title: 'Failed', description: data.error, variant: 'destructive' });
    } catch { toast({ title: 'Network error', variant: 'destructive' }); } finally { setActing(null); }
  };

  const toggleLock = async (t: TopicThread) => {
    if (!currentUser) return;
    try {
      setActing(t.id);
      const res = await fetch(`/api/threads/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id }, body: JSON.stringify({ locked: !t.locked }) });
      const data = await res.json();
      if (data.success) {
        toast({ title: t.locked ? 'Thread Unlocked' : 'Thread Locked' });
        setThreads((prev) => prev.map((x) => x.id === t.id ? { ...x, locked: !x.locked } : x));
      } else toast({ title: 'Failed', description: data.error, variant: 'destructive' });
    } catch { toast({ title: 'Network error', variant: 'destructive' }); } finally { setActing(null); }
  };

  const deleteThread = async (t: TopicThread) => {
    if (!currentUser) return;
    if (!confirm(`Delete thread "${t.title}"? This cannot be undone.`)) return;
    try {
      setActing(t.id);
      const res = await fetch(`/api/threads/${t.id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Thread Deleted' });
        setThreads((prev) => prev.filter((x) => x.id !== t.id));
      } else toast({ title: 'Failed', description: data.error, variant: 'destructive' });
    } catch { toast({ title: 'Network error', variant: 'destructive' }); } finally { setActing(null); }
  };

  const deletePost = async (p: TopicPost) => {
    if (!currentUser) return;
    if (!confirm('Delete this post?')) return;
    try {
      setActing(p.id);
      const res = await fetch(`/api/posts/${p.id}`, { method: 'DELETE', headers: { 'x-user-id': currentUser.id } });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Post Deleted' });
        setPosts((prev) => prev.filter((x) => x.id !== p.id));
      } else toast({ title: 'Failed', description: data.error, variant: 'destructive' });
    } catch { toast({ title: 'Network error', variant: 'destructive' }); } finally { setActing(null); }
  };

  if (!isAdmin()) return <AdminGate />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="neu-circle p-2.5"><MessageSquare className="size-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Topics</h1>
          <p className="text-xs text-muted-foreground">Moderate threads & posts — pin, lock, delete.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="neu-well p-1 flex">
          <button onClick={() => setTab('threads')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'threads' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>Threads</button>
          <button onClick={() => setTab('posts')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'posts' ? 'neu-card-inset text-primary' : 'text-muted-foreground'}`}>Posts</button>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab}...`} className="neu-input pl-9 pr-3 py-2 h-9" onKeyDown={(e) => e.key === 'Enter' && fetchTopics()} />
        </div>
        <Button onClick={fetchTopics} className="neu-btn px-3 py-2 text-xs"><RefreshCw className="size-3.5 mr-1.5" /> Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : tab === 'threads' ? (
        threads.length === 0 ? (
          <div className="neu-card p-10 text-center text-sm text-muted-foreground"><MessageSquare className="size-10 mx-auto mb-3 opacity-40" />No threads found.</div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <div key={t.id} className="neu-card p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 neu-circle shrink-0">
                    {t.author.avatarUrl ? <AvatarImage src={t.author.avatarUrl} alt={t.author.username} /> : null}
                    <AvatarFallback className="text-xs">{t.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex items-center gap-0.5"><Pin className="size-2.5" />Pinned</span>}
                      {t.locked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-0.5"><Lock className="size-2.5" />Locked</span>}
                      <button onClick={() => navigateTo('thread', { threadId: t.id })} className="text-sm font-semibold hover:text-primary text-left truncate">{t.title}</button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {t.author.displayName || t.author.username} · {t.forum.name} · {t.postCount} replies · {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => togglePin(t)} disabled={acting === t.id} className="neu-btn p-2" title={t.pinned ? 'Unpin' : 'Pin'}>{t.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button>
                    <button onClick={() => toggleLock(t)} disabled={acting === t.id} className="neu-btn p-2" title={t.locked ? 'Unlock' : 'Lock'}>{t.locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}</button>
                    <button onClick={() => navigateTo('thread', { threadId: t.id })} className="neu-btn p-2" title="View"><ExternalLink className="size-3.5" /></button>
                    <button onClick={() => deleteThread(t)} disabled={acting === t.id} className="neu-btn p-2 text-destructive" title="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div className="neu-card p-10 text-center text-sm text-muted-foreground"><FileText className="size-10 mx-auto mb-3 opacity-40" />No posts found.</div>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="neu-card p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-9 neu-circle shrink-0">
                    {p.author.avatarUrl ? <AvatarImage src={p.author.avatarUrl} alt={p.author.username} /> : null}
                    <AvatarFallback className="text-xs">{p.author.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground mb-1">
                      {p.author.displayName || p.author.username} replied to <button onClick={() => navigateTo('thread', { threadId: p.thread.id })} className="font-medium hover:text-primary">"{p.thread.title}"</button> · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                    </div>
                    <p className="text-sm line-clamp-2">{p.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => navigateTo('thread', { threadId: p.thread.id })} className="neu-btn p-2" title="View"><ExternalLink className="size-3.5" /></button>
                    <button onClick={() => deletePost(p)} disabled={acting === p.id} className="neu-btn p-2 text-destructive" title="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
