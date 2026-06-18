import { db } from '@/lib/db';
import {
  errorResponse,
  serverErrorResponse,
  requireAdmin,
} from '@/lib/api-helpers';

/* GET /api/backup — export the full database as a JSON file (admin only).
   This is a simple, portable snapshot suitable for small SQLite-backed
   forums. For large datasets a streaming/SQL dump would be preferable. */
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const [
      users,
      categories,
      forums,
      threads,
      posts,
      tags,
      pages,
      rules,
      ranks,
      settings,
      reports,
      notifications,
      bookmarks,
      polls,
    ] = await Promise.all([
      db.user.findMany({ select: { id: true, username: true, email: true, displayName: true, role: true, isVerified: true, postCount: true, threadCount: true, reputation: true, createdAt: true } }),
      db.category.findMany(),
      db.forum.findMany(),
      db.thread.findMany({ select: { id: true, forumId: true, authorId: true, title: true, content: true, views: true, pinned: true, locked: true, featured: true, solved: true, createdAt: true, updatedAt: true } }),
      db.post.findMany({ select: { id: true, threadId: true, authorId: true, content: true, editedAt: true, createdAt: true, updatedAt: true } }),
      db.tag.findMany(),
      db.page.findMany(),
      db.rule.findMany(),
      db.rank.findMany(),
      db.setting.findMany({ where: { NOT: { key: { startsWith: 'password_' } } } }),
      db.report.findMany(),
      db.notification.findMany(),
      db.bookmark.findMany(),
      db.poll.findMany({ include: { options: true } }),
    ]);

    const snapshot = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: 1,
        tool: 'PiForum',
        counts: {
          users: users.length,
          categories: categories.length,
          forums: forums.length,
          threads: threads.length,
          posts: posts.length,
          tags: tags.length,
          pages: pages.length,
        },
      },
      users,
      categories,
      forums,
      threads,
      posts,
      tags,
      pages,
      rules,
      ranks,
      settings,
      reports,
      notifications,
      bookmarks,
      polls,
    };

    const json = JSON.stringify(snapshot, null, 2);
    const filename = `piforum-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Backup failed');
  }
}
