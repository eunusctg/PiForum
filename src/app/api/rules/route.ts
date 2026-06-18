import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAdmin,
  parseBody,
} from '@/lib/api-helpers';

/* GET /api/rules — list all active rules (?all=1 for admins to see inactive too) */
export async function GET(request: Request) {
  try {
    const all = new URL(request.url).searchParams.get('all') === '1';
    const where: any = all ? {} : { active: true };
    const rules = await db.rule.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return successResponse(rules);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch rules');
  }
}

/* POST /api/rules — create a rule (admin only) */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { title, description, icon, category, sortOrder, active } = body;
    if (!title || !description) return errorResponse('Title and description are required');

    const rule = await db.rule.create({
      data: {
        title,
        description,
        icon: icon || null,
        category: category || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        active: active !== undefined ? !!active : true,
      },
    });

    return successResponse(rule, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to create rule');
  }
}
