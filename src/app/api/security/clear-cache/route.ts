import { successResponse, serverErrorResponse, requireAdmin } from '@/lib/api-helpers';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    // Simulate Cloudflare cache purge
    // In a real implementation, this would call the Cloudflare API
    // For demo purposes, just log and return success

    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'CACHE_PURGED',
        details: 'Cloudflare cache purge initiated',
      },
    });

    return successResponse({
      message: 'Cache purge initiated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to purge cache');
  }
}
