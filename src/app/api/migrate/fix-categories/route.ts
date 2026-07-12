import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, requireAdmin } from '@/lib/api-helpers';

/**
 * POST /api/migrate/fix-categories
 *
 * Fixes duplicate categories on production D1 database.
 * Uses a one-time secret key for authorization (set via wrangler secret).
 * After successful run, the migration is marked complete and can't run again.
 * 
 * Call: POST /api/migrate/fix-categories
 * Body: { "key": "value_of_MIGRATE_KEY_secret" }
 * 
 * If MIGRATE_KEY secret is not set, falls back to requireAdmin.
 */
export async function POST(request: Request) {
  try {
    // Check authorization: either migrate key or admin auth
    const migrateKey = process.env.MIGRATE_KEY;
    let authorized = false;

    if (migrateKey) {
      try {
        const body = await request.clone().json();
        if (body?.key === migrateKey) {
          authorized = true;
        }
      } catch {
        // Body parse failed, try admin auth
      }
    }

    if (!authorized) {
      const adminCheck = await requireAdmin(request);
      if (adminCheck.error) {
        return errorResponse('Unauthorized. Provide valid migrate key or admin auth.', 401);
      }
      authorized = true;
    }

    // Check if already migrated
    const migratedFlag = await db.setting.findUnique({ where: { key: 'migration_categories_v1' } });
    if (migratedFlag?.value === 'done') {
      return successResponse({ message: 'Categories already migrated. No changes made.' });
    }

    const results: string[] = [];

    // Step 1: Find all categories
    const allCats = await db.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const catNames = allCats.map(c => c.name);
    const duplicates = catNames.filter((name, i) => catNames.indexOf(name) !== i);
    const uniqueDuplicates = [...new Set(duplicates)];

    results.push(`Found ${allCats.length} categories, ${uniqueDuplicates.length} duplicates: ${uniqueDuplicates.join(', ')}`);

    // Step 2: For each duplicate name, keep the one with color (newer), merge forums from old one
    for (const dupName of uniqueDuplicates) {
      const cats = allCats.filter(c => c.name === dupName);
      // Sort: prefer the one with a color (newer seeded), then by id (keep later one)
      cats.sort((a, b) => {
        if (a.color && !b.color) return 1;
        if (!a.color && b.color) return -1;
        return a.id.localeCompare(b.id);
      });
      const toRemove = cats.slice(0, -1);
      const toKeep = cats[cats.length - 1];

      for (const oldCat of toRemove) {
        const forums = await db.forum.findMany({ where: { categoryId: oldCat.id } });
        for (const forum of forums) {
          const existing = await db.forum.findFirst({
            where: { categoryId: toKeep.id, name: forum.name },
          });
          if (existing) {
            await db.thread.updateMany({
              where: { forumId: forum.id },
              data: { forumId: existing.id },
            });
            await db.forum.delete({ where: { id: forum.id } });
            results.push(`Merged forum "${forum.name}" threads into existing, deleted duplicate forum`);
          } else {
            await db.forum.update({
              where: { id: forum.id },
              data: { categoryId: toKeep.id },
            });
            results.push(`Moved forum "${forum.name}" from old ${dupName} to kept ${dupName}`);
          }
        }
        await db.category.delete({ where: { id: oldCat.id } });
        results.push(`Deleted old duplicate category: ${dupName} (${oldCat.id})`);
      }
    }

    // Step 3: Create additional tech categories if they don't exist
    const newCategories = [
      { name: 'AI & Machine Learning', icon: '🤖', color: '#06b6d4', sortOrder: 5 },
      { name: 'Cybersecurity', icon: '🔒', color: '#ef4444', sortOrder: 6 },
      { name: 'Cloud & DevOps', icon: '☁️', color: '#3b82f6', sortOrder: 7 },
      { name: 'Mobile Development', icon: '📱', color: '#8b5cf6', sortOrder: 8 },
      { name: 'Science & Research', icon: '🔬', color: '#14b8a6', sortOrder: 9 },
      { name: 'Career & Jobs', icon: '💼', color: '#f97316', sortOrder: 10 },
    ];

    for (const cat of newCategories) {
      const existing = await db.category.findFirst({ where: { name: cat.name } });
      if (!existing) {
        const id = `cat_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await db.category.create({
          data: {
            id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            sortOrder: cat.sortOrder,
          },
        });
        results.push(`Created category: ${cat.icon} ${cat.name}`);

        const forumMap: Record<string, Array<{ name: string }>> = {
          'AI & Machine Learning': [
            { name: 'AI Chat & Discussion' },
            { name: 'ML Projects & Models' },
            { name: 'Prompt Engineering' },
          ],
          'Cybersecurity': [
            { name: 'Security News & Alerts' },
            { name: 'Ethical Hacking' },
            { name: 'Privacy Tools & Tips' },
          ],
          'Cloud & DevOps': [
            { name: 'AWS / Azure / GCP' },
            { name: 'Docker & Kubernetes' },
            { name: 'CI/CD & Automation' },
          ],
          'Mobile Development': [
            { name: 'Android Development' },
            { name: 'iOS Development' },
            { name: 'React Native & Flutter' },
          ],
          'Science & Research': [
            { name: 'Physics & Space' },
            { name: 'Data Science & Analytics' },
            { name: 'Mathematics & Algorithms' },
          ],
          'Career & Jobs': [
            { name: 'Job Board' },
            { name: 'Interview Prep' },
            { name: 'Freelancing & Side Projects' },
          ],
        };

        const forums = forumMap[cat.name] || [];
        for (let i = 0; i < forums.length; i++) {
          const f = forums[i];
          const fId = `${id}_forum_${i}`;
          await db.forum.create({
            data: {
              id: fId,
              name: f.name,
              description: '',
              categoryId: id,
              sortOrder: i,
              threadCount: 0,
              postCount: 0,
            },
          });
          results.push(`  Created forum: ${f.name}`);
        }
      } else {
        results.push(`Category already exists: ${cat.icon} ${cat.name}`);
      }
    }

    const finalCats = await db.category.findMany({ orderBy: { sortOrder: 'asc' } });
    results.push(`\nFinal: ${finalCats.length} categories`);
    finalCats.forEach(c => results.push(`  ${c.icon} ${c.name} (${c.color || 'no color'})`));

    // Mark migration as complete
    await db.setting.upsert({
      where: { key: 'migration_categories_v1' },
      update: { value: 'done' },
      create: { key: 'migration_categories_v1', value: 'done' },
    });

    return successResponse({ results, categoryCount: finalCats.length });
  } catch (e: any) {
    console.error('[migrate/fix-categories] Error:', e);
    return serverErrorResponse(e.message || 'Migration failed');
  }
}
