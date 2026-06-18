import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

const ALLOWED_STATUSES = ['reviewing', 'resolved', 'dismissed'] as const;

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;
    const { id } = await params;

    const report = await db.report.findUnique({
      where: { id },
      include: {
        reporter: { select: userSelect },
        targetUser: { select: userSelect },
      },
    });
    if (!report) return errorResponse('Report not found', 404);

    return successResponse(report);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch report');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;
    const admin = adminCheck.user!;
    const { id } = await params;

    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) return errorResponse('Report not found', 404);

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { status, resolution } = body;
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return errorResponse('Invalid status. Must be one of: reviewing, resolved, dismissed');
    }

    const report = await db.report.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedBy: admin.id,
        ...(resolution !== undefined && { resolution }),
      },
      include: {
        reporter: { select: userSelect },
        targetUser: { select: userSelect },
      },
    });

    return successResponse(report);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update report');
  }
}
