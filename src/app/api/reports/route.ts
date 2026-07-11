import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  requireAdmin,
  parseBody,
  getQueryParam,
  getPagination,
} from '@/lib/api-helpers';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const ALLOWED_REASONS = ['spam', 'harassment', 'off-topic', 'inappropriate', 'other'] as const;
const ALLOWED_TARGET_TYPES = ['thread', 'post', 'user'] as const;
const ALLOWED_STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'] as const;
const MAX_DETAILS_LENGTH = 2000;

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export async function POST(request: Request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) return authCheck.error;
    const user = authCheck.user!;

    // Rate limit: 10 reports per user per hour
    const rl = rateLimit(`report:${user.id}`, 10, 60 * 60 * 1000);
    if (!rl.success) return rateLimitResponse();

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { targetType, targetId, reason, details, targetUserId } = body;

    if (!targetType || !targetId || !reason) {
      return errorResponse('targetType, targetId, and reason are required');
    }
    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      return errorResponse('Invalid targetType. Must be one of: thread, post, user');
    }
    if (!ALLOWED_REASONS.includes(reason)) {
      return errorResponse('Invalid reason. Must be one of: spam, harassment, off-topic, inappropriate, other');
    }
    if (targetType === 'user' && !targetUserId) {
      return errorResponse('targetUserId is required when reporting a user');
    }
    if (details !== undefined && details !== null && typeof details === 'string' && details.length > MAX_DETAILS_LENGTH) {
      return errorResponse(`Details must be ${MAX_DETAILS_LENGTH} characters or less`);
    }

    const report = await db.report.create({
      data: {
        reporterId: user.id,
        reason,
        targetType,
        targetId,
        ...(details !== undefined && details !== null && { details }),
        ...(targetUserId && { targetUserId }),
      },
      include: {
        reporter: { select: userSelect },
        targetUser: { select: userSelect },
      },
    });

    return successResponse(report, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create report');
  }
}

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const { page, limit, skip } = getPagination(request);
    const status = getQueryParam(request, 'status');

    if (status && !ALLOWED_STATUSES.includes(status as any)) {
      return errorResponse('Invalid status filter. Must be one of: pending, reviewing, resolved, dismissed');
    }

    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      db.report.findMany({
        where,
        include: {
          reporter: { select: userSelect },
          targetUser: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.report.count({ where }),
    ]);

    return successResponse({
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch reports');
  }
}
