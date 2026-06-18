import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin, parseBody } from '@/lib/api-helpers';

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: {
        NOT: {
          key: {
            startsWith: 'password_',
          },
        },
      },
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return successResponse(settingsMap);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to fetch settings');
  }
}

export async function PUT(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const { settings } = body as { settings: Array<{ key: string; value: string }> };

    if (!settings || !Array.isArray(settings)) {
      return errorResponse('Settings array is required');
    }

    // Update each setting using upsert
    const updates = settings.map(({ key, value }) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(updates);

    // Log settings change
    await db.securityLog.create({
      data: {
        userId: adminCheck.user!.id,
        eventType: 'SETTINGS_UPDATED',
        details: `Updated settings: ${settings.map((s) => s.key).join(', ')}`,
      },
    });

    // Return updated settings
    const updatedSettings = await db.setting.findMany({
      where: {
        NOT: {
          key: {
            startsWith: 'password_',
          },
        },
      },
      orderBy: { key: 'asc' },
    });

    const settingsMap: Record<string, string> = {};
    updatedSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return successResponse(settingsMap);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to update settings');
  }
}
