import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, requireAdmin, parseBody } from '@/lib/api-helpers';

/* ------------------------------------------------------------------ */
/*  POST /api/seed — populate the forum with dummy data                */
/*  Admin-only. Idempotent: clears existing threads/posts/users first. */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return adminCheck.error;

    const body = await parseBody(request);
    const force = body?.force === true;

    // If already seeded (more than 3 non-admin users exist), require force=true
    const existingUsers = await db.user.count({ where: { role: 0 } });
    if (existingUsers > 3 && !force) {
      return errorResponse('Database already seeded. Send { "force": true } to re-seed.', 409);
    }

    if (force) {
      // Wipe all dummy data (preserve admin user & install config)
      await db.postVote.deleteMany();
      await db.attachment.deleteMany();
      await db.pollVote.deleteMany();
      await db.pollOption.deleteMany();
      await db.poll.deleteMany();
      await db.threadTag.deleteMany();
      await db.bookmark.deleteMany();
      await db.subscription.deleteMany();
      await db.notification.deleteMany();
      await db.report.deleteMany();
      await db.userSetting.deleteMany();
      await db.post.deleteMany();
      await db.thread.deleteMany();
      await db.tag.deleteMany();
      await db.forum.deleteMany();
      await db.category.deleteMany();
      // Delete non-admin users
      await db.user.deleteMany({ where: { role: { lt: 2 } } });
      // Delete password settings for old users
      await db.setting.deleteMany({ where: { key: { startsWith: 'password_' } } });
    }

    /* ---------- Create dummy users ---------- */
    const dummyUsers = [
      { username: 'alex_writer', email: 'alex@piforum.dev', displayName: 'Alex Writer', bio: 'Novelist and tea enthusiast. Writing my way through life.', location: 'London, UK', website: 'https://alexwrites.example', signature: '— Alex | Pen is mightier than the pi' },
      { username: 'maria_dev', email: 'maria@piforum.dev', displayName: 'Maria Dev', bio: 'Full-stack engineer. TypeScript believer. Coffee-powered.', location: 'Lisbon, PT', website: 'https://maria.dev', signature: 'console.log("Hello, world!")' },
      { username: 'kenji_artist', email: 'kenji@piforum.dev', displayName: 'Kenji Sato', bio: 'Illustrator & character designer. Loves ink and pixels.', location: 'Osaka, JP', website: 'https://kenjiart.example', signature: 'Art is never finished, only abandoned.' },
      { username: 'sara_mod', email: 'sara@piforum.dev', displayName: 'Sara (Mod)', bio: 'Community moderator. Here to keep things tidy.', location: 'Berlin, DE', website: null, signature: 'Be excellent to each other.' },
      { username: 'lucas_gamer', email: 'lucas@piforum.dev', displayName: 'Lucas_Gamer', bio: 'Speedrunner. Indie dev. Pixel art appreciator.', location: 'São Paulo, BR', website: 'https://lucasplays.example', signature: 'GG WP' },
      { username: 'priya_reader', email: 'priya@piforum.dev', displayName: 'Priya Rao', bio: 'Bookworm. Philosophy student. Cat person.', location: 'Bengaluru, IN', website: null, signature: '"We are what we repeatedly read."' },
      { username: 'tom_tinker', email: 'tom@piforum.dev', displayName: 'Tom Tinker', bio: 'Hardware hacker. Raspberry Pi aficionado. Robot builder.', location: 'Austin, TX', website: 'https://tinkertom.example', signature: "If it ain't broke, take it apart anyway." },
      { username: 'amelia_chef', email: 'amelia@piforum.dev', displayName: 'Amelia Cooks', bio: 'Pastry chef. Recipe collector. Sourdough obsessed.', location: 'Paris, FR', website: 'https://amecooks.example', signature: 'Butter makes everything better.' },
      { username: 'noah_music', email: 'noah@piforum.dev', displayName: 'Noah Beats', bio: 'Producer. Synth nerd. Lo-fi addict.', location: 'Toronto, CA', website: 'https://noahbeats.example', signature: 'Music is the space between the notes.' },
      { username: 'yuki_travel', email: 'yuki@piforum.dev', displayName: 'Yuki Travels', bio: 'Globetrotter. Photographer. Mountain lover.', location: 'Kyoto, JP', website: 'https://yukitravels.example', signature: 'Collect moments, not things.' },
    ];

    const createdUsers = [];
    for (const u of dummyUsers) {
      const firebaseUid = generateUUID();
      const user = await db.user.create({
        data: {
          firebaseUid,
          username: u.username,
          email: u.email,
          displayName: u.displayName,
          bio: u.bio,
          location: u.location,
          website: u.website,
          signature: u.signature,
          role: u.username === 'sara_mod' ? 1 : 0, // Sara is a moderator
          postCount: 0,
          threadCount: 0,
          reputation: Math.floor(Math.random() * 200) + 10,
          lastSeenAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        },
      });

      // Set password (all dummy users: "password123")
      await db.setting.create({
        data: {
          key: `password_${user.id}`,
          value: hashPassword('password123'),
        },
      });

      createdUsers.push(user);
    }

    /* ---------- Create categories ---------- */
    const categories = [
      { name: 'General', description: 'General discussions, welcomes, and announcements', icon: '💬', color: '#6366f1', sortOrder: 0 },
      { name: 'Technology', description: 'Tech news, programming, hardware, and gadgets', icon: '💻', color: '#10b981', sortOrder: 1 },
      { name: 'Creative', description: 'Art, writing, music, design — share your craft', icon: '🎨', color: '#ec4899', sortOrder: 2 },
      { name: 'Lifestyle', description: 'Travel, food, hobbies, and daily life', icon: '🌍', color: '#f59e0b', sortOrder: 3 },
      { name: 'Gaming', description: 'Video games, board games, tabletop — all things playable', icon: '🎮', color: '#8b5cf6', sortOrder: 4 },
    ];

    const createdCategories = [];
    for (const c of categories) {
      const cat = await db.category.create({ data: c });
      createdCategories.push(cat);
    }

    /* ---------- Create forums ---------- */
    const forumsDef = [
      { cat: 0, name: 'Announcements', description: 'Official news from the PiForum team', icon: '📢' },
      { cat: 0, name: 'Introductions', description: 'New here? Say hello!', icon: '👋' },
      { cat: 0, name: 'Feedback & Suggestions', description: 'Help us improve the forum', icon: '💡' },
      { cat: 1, name: 'Programming', description: 'Code, languages, frameworks, and best practices', icon: '⌨️' },
      { cat: 1, name: 'Hardware', description: 'PCs, single-board computers, peripherals', icon: '🔌' },
      { cat: 1, name: 'Web Development', description: 'Frontend, backend, full-stack discussions', icon: '🌐' },
      { cat: 2, name: 'Writing', description: 'Stories, poetry, novels, and prose', icon: '✍️' },
      { cat: 2, name: 'Visual Art', description: 'Drawing, painting, illustration, design', icon: '🖼️' },
      { cat: 2, name: 'Music Production', description: 'Compose, produce, mix, and master', icon: '🎵' },
      { cat: 3, name: 'Travel', description: 'Destinations, itineraries, and stories', icon: '✈️' },
      { cat: 3, name: 'Food & Cooking', description: 'Recipes, restaurants, kitchen tips', icon: '🍳' },
      { cat: 3, name: 'Hobbies & Crafts', description: 'Knitting, woodworking, gardening, and more', icon: '🧶' },
      { cat: 4, name: 'PC Gaming', description: 'RPGs, FPS, indies, and AAA on PC', icon: '🖥️' },
      { cat: 4, name: 'Consoles', description: 'PlayStation, Xbox, Nintendo, and beyond', icon: '🎮' },
      { cat: 4, name: 'Tabletop & Board Games', description: 'D&D, board games, card games', icon: '🎲' },
    ];

    const createdForums = [];
    for (let i = 0; i < forumsDef.length; i++) {
      const f = forumsDef[i];
      const forum = await db.forum.create({
        data: {
          categoryId: createdCategories[f.cat].id,
          name: f.name,
          description: f.description,
          icon: f.icon,
          sortOrder: i,
        },
      });
      createdForums.push(forum);
    }

    /* ---------- Create tags ---------- */
    const tagsDef = [
      'welcome', 'discussion', 'question', 'tutorial', 'showcase',
      'help', 'beginner', 'advanced', 'guide', 'news',
      'review', 'opinion', 'feedback', 'wip', 'challenge',
    ];
    const createdTags = [];
    for (const t of tagsDef) {
      const tag = await db.tag.create({
        data: {
          name: t,
          slug: t.toLowerCase().replace(/\s+/g, '-'),
          color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 6)],
          usageCount: 0,
        },
      });
      createdTags.push(tag);
    }

    /* ---------- Create threads & posts ---------- */
    const threadTemplates = [
      { forum: 0, author: 0, title: 'Welcome to PiForum — Read This First!', content: '# Welcome to PiForum! 👋\n\nWe are thrilled to have you here. PiForum is a community-driven space built with a passion for great design and great conversations.\n\n## Getting Started\n\n1. **Introduce yourself** in the Introductions forum\n2. **Read the rules** in the Announcements\n3. **Pick a topic** that interests you and join a discussion\n\n## House Rules\n\n- Be kind and respectful\n- No spam or self-promotion in unrelated threads\n- Use descriptive thread titles\n- Tag your posts appropriately\n\nHave fun, and welcome aboard! 🚀', pinned: true, featured: true, tags: ['welcome', 'guide'] },
      { forum: 0, author: 1, title: "PiForum 2.0 is here — what's new", content: 'We just shipped a major update!\n\n## Highlights\n\n- **3 themes**: Day, Night, and the new Golden neumorphism\n- **Tags & bookmarks** for organising content\n- **Notifications** so you never miss a reply\n- **Search** across threads, posts, and members\n\nLet us know what you think below 👇', pinned: true, featured: true, tags: ['news', 'discussion'] },
      { forum: 1, author: 2, title: 'New here from Osaka — call me Kenji!', content: "Hey everyone! I'm Kenji, an illustrator from Osaka. I stumbled on this forum last week and the design is *gorgeous* — that golden theme is a chef's kiss. 🤌\n\nI draw characters, mostly indie-game style. Looking forward to sharing WIPs and getting feedback!", tags: ['welcome'] },
      { forum: 3, author: 3, title: 'Why I switched from VS Code to Zed (and back)', content: "I tried Zed for two weeks. The speed is unreal — instant file opens, buttery scrolling. But the extension ecosystem just isn't there yet for my workflow.\n\n## TL;DR\n\n- **Pros**: Speed, multi-buffer editing, collaboration built-in\n- **Cons**: Fewer extensions, no proper remote dev yet\n\nAnyone else made the jump?", tags: ['discussion', 'opinion'] },
      { forum: 4, author: 4, title: 'Best single-board computer for a home lab in 2025?', content: "I want to set up a small home lab — Pi-hole, Jellyfin, maybe Home Assistant.\n\nOptions I'm considering:\n- Raspberry Pi 5 (8GB)\n- Orange Pi 5 Plus\n- Intel N100 mini PC\n\nBudget is around $150. What would you pick?", tags: ['question', 'help', 'beginner'] },
      { forum: 5, author: 5, title: 'Next.js 16 App Router — lessons learned after 6 months', content: 'I\'ve been building a SaaS on Next.js 16 for half a year. Here are the lessons I wish I knew on day one.\n\n## 1. Server Components by default\nMost of your components should be server components. Only add `"use client"` when you actually need interactivity.\n\n## 2. Route handlers > API routes\nThe new `route.ts` convention is cleaner. Use them.\n\n## 3. Cache aggressively\n`unstable_cache` and `revalidatePath` are your friends.\n\nFull write-up in the comments.', tags: ['tutorial', 'advanced', 'guide'] },
      { forum: 6, author: 6, title: 'Chapter 1 of my novel — feedback welcome', content: "Working on a sci-fi novel. Here's chapter 1, about 2000 words. Looking for feedback on pacing and character voice.\n\n> The morning the sky broke, Lina was already awake.\n>\n> She had been awake since 4 a.m., unable to shake the feeling that something was wrong...\n\n(Full text in attached file — let me know if you can't open it.)", tags: ['showcase', 'feedback', 'wip'] },
      { forum: 7, author: 7, title: '30-day ink drawing challenge — Day 1', content: "Starting a 30-day ink drawing challenge today. I'll post one drawing every day.\n\nDay 1: a koi fish. Used a brush pen on Bristol board. Took about 45 minutes.\n\nCritique welcome — I want to get better at negative space.", tags: ['challenge', 'showcase', 'wip'] },
      { forum: 8, author: 8, title: 'My lo-fi hip-hop workflow in FL Studio', content: 'Sharing my workflow for making lo-fi beats. Hope it helps someone starting out.\n\n1. **Sample selection**: I dig through old jazz records on YouTube\n2. **Chopping**: 4-bar loops, pitched down -3 semitones\n3. **Drums**: Vinyl crackle layer + boom-bap pattern at 75 BPM\n4. **Mix**: Sidechain everything to the kick\n\nProject file linked below.', tags: ['tutorial', 'guide'] },
      { forum: 9, author: 9, title: 'Kyoto in autumn — a photo essay', content: "Just got back from two weeks in Kyoto during peak momiji (red maple) season. Sharing my favourite shots and the spots where I took them.\n\n## Top 3 temples for autumn colours\n\n1. **Kiyomizu-dera** — go at sunrise to beat the crowds\n2. **Eikan-do** — the tunnel of maples is unreal\n3. **Tofuku-ji** — the view from Tsuten-kyo bridge\n\nPhotos in the thread.", tags: ['showcase', 'review'] },
      { forum: 10, author: 0, title: 'My foolproof sourdough recipe (after 50 failed loaves)', content: "After 50 sad, flat loaves, I finally cracked it. Sharing the recipe that works for me every time.\n\n## Ingredients\n- 500g bread flour\n- 350g water (70% hydration)\n- 100g active starter\n- 10g salt\n\n## Method\n1. Autolyse 1 hour\n2. Mix starter + salt, 4 sets of stretch & folds 30 min apart\n3. Bulk ferment 4-6 hours at 24°C\n4. Shape, cold proof overnight\n5. Bake 250°C covered 20 min, then 230°C uncovered 25 min\n\nTag me if you try it!", tags: ['tutorial', 'guide'] },
      { forum: 12, author: 4, title: 'Hollow Knight Silksong — any news?', content: "It's been *years*. Has anyone heard anything credible about Silksong lately? I'm trying not to get my hopes up but here we are.\n\nDrop any leaks, interviews, or speculation below.", tags: ['discussion', 'news'] },
      { forum: 13, author: 3, title: 'PS5 Pro — worth it for 4K gaming?', content: 'Considering the PS5 Pro but the price is steep. Anyone here upgraded? Is the upscaling actually noticeable on a 4K TV?\n\nMainly playing RPGs and the occasional racing game.', tags: ['question', 'review'] },
      { forum: 14, author: 5, title: 'First time DM-ing D&D — send help', content: "I'm DM-ing my first campaign next month (Curse of Strahd). I've read the module twice but I'm terrified of improvising when players go off-script.\n\nAny tips from veteran DMs? Especially on:\n- Voice acting (I'm bad at voices)\n- Pacing\n- Handling rules lawyers", tags: ['question', 'help', 'beginner'] },
    ];

    let postCounter = 0;
    for (const t of threadTemplates) {
      const author = createdUsers[t.author];
      const forum = createdForums[t.forum];

      const thread = await db.thread.create({
        data: {
          forumId: forum.id,
          authorId: author.id,
          title: t.title,
          content: t.content,
          pinned: t.pinned ?? false,
          featured: t.featured ?? false,
          views: Math.floor(Math.random() * 500) + 10,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
        },
      });

      // Add tags
      if (t.tags) {
        for (const tagName of t.tags) {
          const tag = createdTags.find((tg) => tg.name === tagName);
          if (tag) {
            await db.threadTag.create({
              data: { threadId: thread.id, tagId: tag.id },
            });
            await db.tag.update({
              where: { id: tag.id },
              data: { usageCount: { increment: 1 } },
            });
          }
        }
      }

      // Add 2-5 replies per thread
      const replyCount = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < replyCount; i++) {
        const replier = createdUsers[(t.author + i + 1) % createdUsers.length];
        const replies = [
          'Great post! Really enjoyed reading this. Thanks for sharing.',
          'I had a similar experience. The part about pacing really resonated with me.',
          'Have you tried the alternative approach? Curious what you think.',
          'Bookmarking this for later. Super helpful breakdown.',
          'I disagree slightly — I think context matters here. But solid write-up overall.',
          'This is exactly what I was looking for. You saved me hours of trial and error.',
          'Following this thread. Would love to see an update in a few weeks.',
          'Photos would be amazing if you have them. The description sounds beautiful.',
          'I tried your recipe last night and it turned out perfectly! Thank you!',
          'Sounds like an awesome trip. Adding Kyoto to my bucket list now.',
        ];
        await db.post.create({
          data: {
            threadId: thread.id,
            authorId: replier.id,
            content: replies[i % replies.length],
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
          },
        });
        postCounter++;
      }

      // Update forum counters
      await db.forum.update({
        where: { id: forum.id },
        data: {
          threadCount: { increment: 1 },
          postCount: { increment: replyCount },
          lastPostAt: new Date(),
        },
      });

      // Update author thread count
      await db.user.update({
        where: { id: author.id },
        data: { threadCount: { increment: 1 } },
      });
    }

    // Update post counts for users
    const usersWithPosts = await db.post.groupBy({
      by: ['authorId'],
      _count: { _all: true },
    });
    for (const u of usersWithPosts) {
      await db.user.update({
        where: { id: u.authorId },
        data: { postCount: u._count._all },
      });
    }

    /* ---------- Create notifications for admin ---------- */
    const admin = adminCheck.user!;
    const notifTypes = [
      { type: 'system', title: 'Welcome to PiForum!', body: 'Your forum is ready. Check out the admin dashboard to configure settings.', link: '/?view=admin-dashboard' },
      { type: 'system', title: 'Dummy data seeded', body: "We've added sample users, threads, and posts to get you started.", link: '/' },
      { type: 'mention', title: 'New member joined', body: 'Kenji Sato just introduced themselves in the Introductions forum.', link: '/?view=forum' },
    ];
    for (const n of notifTypes) {
      await db.notification.create({
        data: {
          userId: admin.id,
          type: n.type,
          title: n.title,
          body: n.body,
          link: n.link,
        },
      });
    }

    /* ---------- Seed default settings (if missing) ---------- */
    const defaultSettings = [
      { key: 'forum_name', value: 'PiForum' },
      { key: 'forum_description', value: 'A modern, neumorphic forum CMS with a luxurious golden theme.' },
      { key: 'forum_tagline', value: 'Where conversations find their form.' },
      { key: 'open_registration', value: 'true' },
      { key: 'maintenance_mode', value: 'false' },
      { key: 'maintenance_message', value: "We'll be right back. PiForum is undergoing scheduled maintenance." },
      { key: 'max_upload_size', value: '10485760' },
      { key: 'allowed_file_types', value: 'image/jpeg,image/png,image/gif,image/webp,application/pdf' },
      { key: 'posts_per_page', value: '25' },
      { key: 'threads_per_page', value: '25' },
      { key: 'min_username_length', value: '3' },
      { key: 'max_username_length', value: '30' },
      { key: 'min_password_length', value: '6' },
      { key: 'allow_guest_viewing', value: 'true' },
      { key: 'allow_thread_voting', value: 'true' },
      { key: 'allow_post_voting', value: 'true' },
      { key: 'allow_bookmarks', value: 'true' },
      { key: 'allow_tags', value: 'true' },
      { key: 'allow_polls', value: 'true' },
      { key: 'allow_signatures', value: 'true' },
      { key: 'allow_avatars', value: 'true' },
      { key: 'require_email_verification', value: 'false' },
      { key: 'seo_keywords', value: 'forum, community, discussion, neumorphism, piforum' },
      { key: 'seo_meta_description', value: 'PiForum — a modern neumorphic forum CMS. Join the conversation today.' },
      { key: 'analytics_enabled', value: 'false' },
      { key: 'analytics_id', value: '' },
      { key: 'smtp_enabled', value: 'false' },
      { key: 'smtp_host', value: '' },
      { key: 'smtp_port', value: '587' },
      { key: 'smtp_username', value: '' },
      { key: 'smtp_from_email', value: '' },
      { key: 'smtp_from_name', value: 'PiForum' },
      { key: 'footer_text', value: 'Powered by PiForum' },
      { key: 'show_online_users', value: 'true' },
      { key: 'show_statistics', value: 'true' },
      { key: 'show_birthdays', value: 'false' },
      { key: 'rate_limit_posts', value: '30' },
      { key: 'rate_limit_threads', value: '10' },
      { key: 'word_censorship', value: '' },
      { key: 'banned_words', value: '' },
    ];

    for (const s of defaultSettings) {
      await db.setting.upsert({
        where: { key: s.key },
        update: {},
        create: s,
      });
    }

    /* ---------- Return summary ---------- */
    const stats = {
      usersCreated: createdUsers.length,
      categoriesCreated: createdCategories.length,
      forumsCreated: createdForums.length,
      tagsCreated: createdTags.length,
      threadsCreated: threadTemplates.length,
      postsCreated: postCounter,
      notificationsCreated: notifTypes.length,
      settingsSeeded: defaultSettings.length,
    };

    return successResponse(stats, 201);
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Seeding failed');
  }
}

/* GET — check seed status */
export async function GET() {
  try {
    const userCount = await db.user.count({ where: { role: { lt: 2 } } });
    const threadCount = await db.thread.count();
    const postCount = await db.post.count();
    return successResponse({
      seeded: userCount > 1 || threadCount > 0,
      userCount,
      threadCount,
      postCount,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to check seed status');
  }
}
