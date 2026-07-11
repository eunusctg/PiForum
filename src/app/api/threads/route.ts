import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
  slugify,
} from '@/lib/api-helpers';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isUserAllowedToCreateThread } from '@/lib/verification-guard';

/* ------------------------------------------------------------------ */
/*  /api/threads                                                       */
/*                                                                    */
/*  Flarum/Discourse-style flat thread listing.                        */
/*                                                                    */
/*  GET  ?forumId=<id>   → threads in one forum (legacy, still works)  */
/*       ?tag=<slug>      → threads tagged with this tag               */
/*       (no params)      → ALL threads globally (flat home view)      */
/*       ?page=&limit=    → pagination                                 */
/*                                                                    */
/*  POST  { forumId?, title, content, tags?: string[] }                */
/*       If forumId is null/omitted, the thread is created WITHOUT     */
/*       any forum assignment — a true "uncategorized" discussion.     */
/*       This enables direct posting without any category/forum.       */
/* ------------------------------------------------------------------ */

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;

/** Find or create a catch-all "General" forum for direct posts. */
async function ensureGeneralForum(): Promise<{ id: string }> {
  // Reuse an existing General forum if one exists.
  const existing = await db.forum.findFirst({
    where: { name: 'General' },
    select: { id: true },
  });
  if (existing) return existing;

  // Otherwise, ensure a "General" category exists, then create the forum.
  let category = await db.category.findFirst({
    where: { name: 'General' },
    select: { id: true },
  });
  if (!category) {
    category = await db.category.create({
      data: {
        name: 'General',
        description: 'Default category for direct discussions.',
        icon: '💬',
        sortOrder: 0,
      },
      select: { id: true },
    });
  }

  const forum = await db.forum.create({
    data: {
      categoryId: category.id,
      name: 'General',
      description: 'Default discussion space for all topics.',
      icon: '💬',
      sortOrder: 0,
    },
    select: { id: true },
  });
  return forum;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forumId = searchParams.get('forumId');
    const tagSlug = searchParams.get('tag');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (forumId) where.forumId = forumId;
    if (tagSlug) {
      where.tags = {
        some: { tag: { slug: tagSlug } },
      };
    }

    // If a forumId was given, keep the legacy forum-exists check.
    if (forumId) {
      const forum = await db.forum.findUnique({ where: { id: forumId } });
      if (!forum) return errorResponse('Forum not found', 404);
    }

    const [threads, total] = await Promise.all([
      db.thread.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
              isVerified: true,
            },
          },
          forum: {
            select: {
              id: true,
              categoryId: true,
              name: true,
              description: true,
              icon: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                  color: true,
                },
              },
            },
          },
          tags: { include: { tag: true } },
          _count: {
            select: { posts: true },
          },
        },
        orderBy: [
          { pinned: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      db.thread.count({ where }),
    ]);

    const threadsWithPostCount = threads.map((thread) => ({
      ...thread,
      postCount: thread._count.posts,
      tags: thread.tags.map((tt) => tt.tag),
      _count: undefined,
    }));

    return successResponse({
      threads: threadsWithPostCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch threads');
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    // Check if unverified users are allowed to create threads
    const verifyCheck = await isUserAllowedToCreateThread(user.id);
    if (!verifyCheck.allowed) {
      return errorResponse(verifyCheck.reason || 'Email verification required', 403);
    }

    // Rate limit: 10 threads per user per hour
    const rl = rateLimit(`thread:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.success) return rateLimitResponse();

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { forumId, title, content, tags } = body as {
      forumId?: string;
      title?: string;
      content?: string;
      tags?: string[];
    };

    if (!title || !content) {
      return errorResponse('Title and content are required');
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
      return errorResponse('Title must not be empty');
    }
    if (typeof content !== 'string' || content.trim().length === 0) {
      return errorResponse('Content must not be empty');
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return errorResponse(
        `Title must be ${MAX_TITLE_LENGTH} characters or less`,
      );
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return errorResponse(
        `Content must be ${MAX_CONTENT_LENGTH} characters or less`,
      );
    }

    // Resolve the target forum: explicit forumId, or create uncategorized.
    let targetForumId = forumId || null;
    if (targetForumId) {
      const forum = await db.forum.findUnique({
        where: { id: targetForumId },
        select: { id: true },
      });
      if (!forum) return errorResponse('Forum not found', 404);
    }

    // Create thread and first post.
    // NOTE: db.$transaction(async cb) not supported on Workers async-proxy.
    // Use sequential awaits — D1 is serializable.
    const thread = await db.thread.create({
      data: {
        ...(targetForumId ? { forumId: targetForumId } : {}),
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    // Create the first post (same content as thread)
    await db.post.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        content: content.trim(),
      },
    });

    // Update forum counters (only if assigned to a forum)
    if (targetForumId) {
      await db.forum.update({
        where: { id: targetForumId },
        data: {
          threadCount: { increment: 1 },
          postCount: { increment: 1 },
          lastPostAt: new Date(),
        },
      });
    }

    // Associate tags (if provided). Tags are referenced by name or slug;
    // create them on demand if they don't exist yet.
    const tagNames = Array.isArray(tags)
      ? tags
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t) => t.length > 0 && t.length <= 30)
      : [];

    if (tagNames.length > 0) {
      // Limit to 5 tags per thread.
      const limitedTags = tagNames.slice(0, 5);
      for (const name of limitedTags) {
        const slug = slugify(name);
        if (!slug) continue;
        try {
          // upsert the tag
          const tag = await db.tag.upsert({
            where: { slug },
            update: { usageCount: { increment: 1 } },
            create: {
              name,
              slug,
              usageCount: 1,
            },
            select: { id: true },
          });
          // link to thread (ignore duplicates)
          await db.threadTag
            .create({
              data: { threadId: thread.id, tagId: tag.id },
            })
            .catch(() => {
              /* unique constraint — already linked */
            });
        } catch {
          /* skip on error */
        }
      }
    }

    return successResponse(
      {
        ...thread,
        postCount: 1,
      },
      201,
    );
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create thread');
  }
}
