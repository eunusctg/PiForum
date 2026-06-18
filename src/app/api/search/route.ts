import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  getQueryParam,
  serializeUser,
} from '@/lib/api-helpers';

const VALID_TYPES = ['all', 'threads', 'posts', 'users', 'tags'] as const;
type SearchType = (typeof VALID_TYPES)[number];
const PER_CATEGORY = 25;

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
} as const;

export async function GET(request: Request) {
  try {
    const q = (getQueryParam(request, 'q') || '').trim();
    const typeParam = getQueryParam(request, 'type') || 'all';

    if (!q) {
      return errorResponse('Query parameter q is required');
    }
    if (!VALID_TYPES.includes(typeParam as SearchType)) {
      return errorResponse('Invalid type. Must be one of: all, threads, posts, users, tags');
    }
    const type = typeParam as SearchType;

    const [threads, posts, users, tags] = await Promise.all([
      (type === 'all' || type === 'threads')
        ? db.thread.findMany({
            where: {
              OR: [
                { title: { contains: q } },
                { content: { contains: q } },
              ],
            },
            include: {
              author: { select: authorSelect },
              forum: { select: { id: true, name: true, icon: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: PER_CATEGORY,
          })
        : Promise.resolve([]),
      (type === 'all' || type === 'posts')
        ? db.post.findMany({
            where: { content: { contains: q } },
            include: {
              author: { select: authorSelect },
              thread: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: PER_CATEGORY,
          })
        : Promise.resolve([]),
      (type === 'all' || type === 'users')
        ? db.user.findMany({
            where: {
              OR: [
                { username: { contains: q } },
                { displayName: { contains: q } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: PER_CATEGORY,
          })
        : Promise.resolve([]),
      (type === 'all' || type === 'tags')
        ? db.tag.findMany({
            where: {
              OR: [
                { name: { contains: q } },
                { slug: { contains: q } },
              ],
            },
            orderBy: { usageCount: 'desc' },
            take: PER_CATEGORY,
          })
        : Promise.resolve([]),
    ]);

    const publicUsers = users.map((u) => {
      const serialized = serializeUser(u);
      const { email: _email, ...publicFields } = serialized;
      return publicFields;
    });

    const total = threads.length + posts.length + publicUsers.length + tags.length;

    return successResponse({
      threads,
      posts,
      users: publicUsers,
      tags,
      total,
      q,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Search failed');
  }
}
