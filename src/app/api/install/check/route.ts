import { db } from '@/lib/db';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';

export async function GET() {
  try {
    // Check if the forum has been installed (InstallConfig exists with installed=true)
    const config = await db.installConfig.findFirst({ where: { installed: true } });
    return successResponse({ installed: !!config });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to check installation status');
  }
}
