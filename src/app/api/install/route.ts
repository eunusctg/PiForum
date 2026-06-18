import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, parseBody } from '@/lib/api-helpers';

export async function GET() {
  try {
    const config = await db.installConfig.findFirst({ where: { installed: true } });
    return successResponse({ installed: !!config, config });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to check installation status');
  }
}

export async function POST(request: Request) {
  try {
    // Check if already installed
    const existing = await db.installConfig.findFirst({ where: { installed: true } });
    if (existing) {
      return errorResponse('Forum is already installed', 400);
    }

    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const {
      // Database selection
      dbType,
      mysqlHost,
      mysqlPort,
      mysqlDatabase,
      mysqlUsername,
      mysqlPassword,
      // Cloudflare
      cloudflareAccountId,
      cloudflareD1Id,
      cloudflareApiToken,
      cloudflareR2Bucket,
      cloudflareR2AccessKey,
      cloudflareR2SecretKey,
      // Firebase
      firebaseApiKey,
      firebaseAuthDomain,
      firebaseProjectId,
      firebaseStorageBucket,
      firebaseMessagingSenderId,
      firebaseAppId,
      // Site branding
      forumName,
      forumDescription,
      logoUrl,
      // Admin
      adminUsername,
      adminEmail,
      adminPassword,
    } = body;

    if (!adminUsername || !adminEmail || !adminPassword) {
      return errorResponse('Admin username, email, and password are required');
    }

    // Validate MySQL fields if MySQL was chosen
    // NOTE: We persist the database choice + credentials here for documentation
    // and deployment purposes. The actual Prisma datasource provider is set at
    // build time in prisma/schema.prisma (currently "sqlite"). Switching to
    // MySQL at runtime is not possible — to deploy on MySQL the operator must:
    //   1. Set DATABASE_URL env var to a MySQL connection string
    //      (e.g. mysql://user:pass@host:port/dbname)
    //   2. Change the `provider` in prisma/schema.prisma to "mysql"
    //   3. Regenerate the Prisma client (`bun run db:push`)
    // The MySQL credentials captured here are stored in InstallConfig so a
    // deployment script can read them and apply the migration automatically.
    if (dbType === 'mysql') {
      if (!mysqlHost || !mysqlDatabase || !mysqlUsername) {
        return errorResponse('MySQL host, database name, and username are required when MySQL is selected');
      }
    }

    const adminFirebaseUid = generateUUID();

    // Normalize database selection
    const normalizedDbType = dbType === 'mysql' ? 'mysql' : 'sqlite';

    // Create InstallConfig record
    const installConfig = await db.installConfig.create({
      data: {
        installed: true,
        cloudflareAccountId: cloudflareAccountId || null,
        cloudflareD1Id: cloudflareD1Id || null,
        cloudflareApiToken: cloudflareApiToken || null,
        cloudflareR2Bucket: cloudflareR2Bucket || null,
        cloudflareR2AccessKey: cloudflareR2AccessKey || null,
        cloudflareR2SecretKey: cloudflareR2SecretKey || null,
        firebaseApiKey: firebaseApiKey || null,
        firebaseAuthDomain: firebaseAuthDomain || null,
        firebaseProjectId: firebaseProjectId || null,
        firebaseStorageBucket: firebaseStorageBucket || null,
        firebaseMessagingSenderId: firebaseMessagingSenderId || null,
        firebaseAppId: firebaseAppId || null,
        adminFirebaseUid,
        forumName: forumName || 'PiForum',
        forumDescription: forumDescription || 'A modern neumorphic forum',
        dbType: normalizedDbType,
        mysqlHost: normalizedDbType === 'mysql' ? (mysqlHost || null) : null,
        mysqlPort: normalizedDbType === 'mysql' ? (mysqlPort || '3306') : null,
        mysqlDatabase: normalizedDbType === 'mysql' ? (mysqlDatabase || null) : null,
        mysqlUsername: normalizedDbType === 'mysql' ? (mysqlUsername || null) : null,
        mysqlPassword: normalizedDbType === 'mysql' ? (mysqlPassword || null) : null,
        logoUrl: logoUrl || null,
      },
    });

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        firebaseUid: adminFirebaseUid,
        username: adminUsername,
        email: adminEmail,
        displayName: adminUsername,
        role: 3, // SuperAdmin
        avatarUrl: null,
      },
    });

    // Update password as a setting (simple demo approach)
    await db.setting.create({
      data: {
        key: `password_${adminUser.id}`,
        value: hashPassword(adminPassword),
      },
    });

    // Create default settings
    await db.setting.createMany({
      data: [
        { key: 'forum_name', value: forumName || 'PiForum' },
        { key: 'forum_description', value: forumDescription || 'A modern neumorphic forum' },
        { key: 'maintenance_mode', value: 'false' },
        { key: 'open_registration', value: 'true' },
        { key: 'logo_url', value: logoUrl || '/logo.svg' },
        { key: 'favicon_url', value: '/favicon.ico' },
        { key: 'posts_per_page', value: '20' },
        { key: 'threads_per_page', value: '25' },
        { key: 'max_upload_size', value: '5242880' },
        { key: 'allowed_file_types', value: 'image/jpeg,image/png,image/gif,image/webp' },
      ],
    });

    // Create sample categories and forums
    const generalCategory = await db.category.create({
      data: {
        name: 'General',
        description: 'General discussion topics',
        icon: '💬',
        sortOrder: 0,
        accessLevel: 0,
      },
    });

    const techCategory = await db.category.create({
      data: {
        name: 'Technology',
        description: 'Tech news and discussions',
        icon: '💻',
        sortOrder: 1,
        accessLevel: 0,
      },
    });

    const communityCategory = await db.category.create({
      data: {
        name: 'Community',
        description: 'Community events and announcements',
        icon: '🌟',
        sortOrder: 2,
        accessLevel: 0,
      },
    });

    // Create forums under General
    await db.forum.createMany({
      data: [
        {
          categoryId: generalCategory.id,
          name: 'Welcome & Introductions',
          description: 'New here? Introduce yourself to the community!',
          icon: '👋',
          sortOrder: 0,
        },
        {
          categoryId: generalCategory.id,
          name: 'Off-Topic Discussion',
          description: 'Chat about anything not covered by other forums',
          icon: '🎲',
          sortOrder: 1,
        },
      ],
    });

    // Create forums under Technology
    await db.forum.createMany({
      data: [
        {
          categoryId: techCategory.id,
          name: 'Programming',
          description: 'Discuss programming languages, frameworks, and best practices',
          icon: '⌨️',
          sortOrder: 0,
        },
        {
          categoryId: techCategory.id,
          name: 'Hardware',
          description: 'Hardware reviews, recommendations, and troubleshooting',
          icon: '🔧',
          sortOrder: 1,
        },
        {
          categoryId: techCategory.id,
          name: 'Software & Apps',
          description: 'Software recommendations and reviews',
          icon: '📱',
          sortOrder: 2,
        },
      ],
    });

    // Create forums under Community
    await db.forum.createMany({
      data: [
        {
          categoryId: communityCategory.id,
          name: 'Announcements',
          description: 'Official announcements and updates',
          icon: '📢',
          sortOrder: 0,
        },
        {
          categoryId: communityCategory.id,
          name: 'Feedback & Suggestions',
          description: 'Share your ideas to improve the forum',
          icon: '💡',
          sortOrder: 1,
        },
      ],
    });

    return successResponse({
      message: 'Installation completed successfully',
      installConfig,
      adminUser: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
      },
    }, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Installation failed');
  }
}
