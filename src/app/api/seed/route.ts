import { db } from '@/lib/db';
import { successResponse, errorResponse, serverErrorResponse, hashPassword, generateUUID, requireAdmin, parseBody } from '@/lib/api-helpers';

/* ------------------------------------------------------------------ */
/*  POST /api/seed — populate the forum with dummy data                */
/*  Admin-only. Idempotent: clears existing threads/posts/users first. */
/*  Bootstrap mode: if no admin user exists, accepts { bootstrap: true }*/
/*  to create the initial admin + seed data without requiring auth.    */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    const force = body?.force === true;
    const bootstrap = body?.bootstrap === true;

    // Check if any admin exists
    const adminCount = await db.user.count({ where: { role: { gte: 2 } } });

    // Resolve admin user ID — either via auth or bootstrap
    let adminUserId: string;

    if (adminCount === 0 && bootstrap) {
      // Bootstrap mode: no admin exists, create one
      // This is the initial setup path (no auth required)
      const adminFirebaseUid = generateUUID();
      const adminUser = await db.user.create({
        data: {
          firebaseUid: adminFirebaseUid,
          username: 'admin',
          email: 'admin@piforum.dev',
          displayName: 'admin',
          role: 3, // SuperAdmin
          isVerified: true,
          verifiedAt: new Date(),
        },
      });
      await db.setting.create({
        data: {
          key: `password_${adminUser.id}`,
          value: hashPassword('admin123'),
        },
      });
      adminUserId = adminUser.id;
    } else if (adminCount === 0 && !bootstrap) {
      return errorResponse('No admin user exists. Send { "bootstrap": true } to create an admin and seed data.', 403);
    } else {
      // Normal mode: require admin auth
      const adminCheck = await requireAdmin(request);
      if (adminCheck.error) return adminCheck.error;
      adminUserId = adminCheck.user!.id;
    }

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
    const notifTypes = [
      { type: 'system', title: 'Welcome to PiForum!', body: 'Your forum is ready. Check out the admin dashboard to configure settings.', link: '/?view=admin-dashboard' },
      { type: 'system', title: 'Dummy data seeded', body: "We've added sample users, threads, and posts to get you started.", link: '/' },
      { type: 'mention', title: 'New member joined', body: 'Kenji Sato just introduced themselves in the Introductions forum.', link: '/?view=forum' },
    ];
    for (const n of notifTypes) {
      await db.notification.create({
        data: {
          userId: adminUserId,
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
      { key: 'forum_description', value: 'Stop scrolling dead forums. Piforum delivers battle-tested tutorials and raw expert knowledge. Post your guides, crush doubts, and own the conversation.' },
      { key: 'forum_tagline', value: 'Dominate Tech: Elite Tutorials & Expert Intel' },
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
      { key: 'seo_keywords', value: 'tech forum,developer community,programming forum,web development,AI discussion,coding help,tech community,PiForum,software engineering,open source,dev forum,hardware forum,gaming community' },
      { key: 'seo_meta_description', value: 'Stop scrolling dead forums. Piforum delivers battle-tested tutorials and raw expert knowledge. Post your guides, crush doubts, and own the conversation.' },
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

    /* ---------- Seed default static pages (if missing) ---------- */
    const defaultPages = [
      {
        slug: 'about',
        title: 'About Us',
        content: `<h2>About PiForum</h2>
<p>PiForum is a battle-tested, community-driven technology forum built for enthusiasts, developers, creators, and curious minds from around the world. Our mission is to deliver elite tutorials and raw expert knowledge — a space where you can post your guides, crush doubts, and own the conversation.</p>

<h3>Our Story</h3>
<p>PiForum was born out of a simple frustration: existing forums often feel outdated, cluttered, and unwelcoming. We believed that online communities deserve better — a platform that combines the depth of traditional forums with the polish and usability of modern web applications. So we built one.</p>
<p>From its inception, PiForum has been designed with three core principles in mind:</p>
<ul>
<li><strong>Community First</strong> — Every feature, every design decision, and every policy is guided by what's best for the community. We listen to our members and evolve together.</li>
<li><strong>Craft & Quality</strong> — We sweat the details. From our signature design language to our carefully tuned notification system, PiForum is built with care and intention.</li>
<li><strong>Open Dialogue</strong> — We believe the best ideas emerge from open, respectful conversation. PiForum is a place where diverse perspectives are valued and every voice matters.</li>
</ul>

<h3>What Makes PiForum Different</h3>
<p>Unlike generic social platforms, PiForum is purpose-built for long-form discussions and knowledge sharing. Here's what sets us apart:</p>
<ul>
<li><strong>Organized Categories &amp; Forums</strong> — Topics are neatly categorized so you can find exactly what you're looking for, from programming tutorials to travel stories.</li>
<li><strong>Rich Profiles &amp; Reputation</strong> — Your contributions build your reputation. Earn recognition through helpful posts, insightful replies, and community engagement.</li>
<li><strong>Tags &amp; Bookmarks</strong> — Tag threads for easy discovery, and bookmark the ones you want to revisit.</li>
<li><strong>Polls &amp; Surveys</strong> — Gauge community opinion with built-in polling on any thread.</li>
<li><strong>Follow System</strong> — Follow other members and stay updated on their latest contributions.</li>
<li><strong>Beautiful Design</strong> — Our signature multi-theme design isn't just eye candy — it's designed for readability, accessibility, and a premium user experience.</li>
</ul>

<h3>Our Community</h3>
<p>PiForum is home to a vibrant and growing community of:</p>
<ul>
<li>Software developers and engineers</li>
<li>Hardware tinkerers and makers</li>
<li>Artists, writers, and musicians</li>
<li>Gamers and speedrunners</li>
<li>Chefs, travelers, and hobbyists</li>
<li>And anyone who loves a good conversation</li>
</ul>
<p>Whether you're a seasoned expert or a complete beginner, there's a place for you here.</p>

<h3>Join Us</h3>
<p>Ready to become part of the PiForum community? Registration is free and takes just a minute. Come say hello in our <strong>Introductions</strong> forum — we'd love to meet you!</p>`,
        excerpt: 'Learn about PiForum — our mission, story, and the community that makes us special.',
        status: 'published',
        showInFooter: true,
        showInHeader: false,
        sortOrder: 0,
      },
      {
        slug: 'contact',
        title: 'Contact Us',
        content: `<h2>Get in Touch</h2>
<p>We'd love to hear from you! Whether you have a question, suggestion, partnership inquiry, or just want to say hello, here's how you can reach the PiForum team.</p>

<h3>General Inquiries</h3>
<p>For general questions about PiForum, our features, or how things work:</p>
<ul>
<li><strong>Email:</strong> hello@piforum.dev</li>
<li><strong>Response Time:</strong> We typically respond within 24–48 hours during business days.</li>
</ul>

<h3>Technical Support</h3>
<p>Experiencing a bug, account issue, or technical difficulty? The fastest way to get help is to:</p>
<ol>
<li>Check our <strong>Feedback &amp; Suggestions</strong> forum — your question may already be answered there.</li>
<li>If not, create a new thread with the <em>help</em> tag and our community or moderators will assist you.</li>
<li>For urgent account issues (e.g., locked account, security concerns), email us directly at <strong>support@piforum.dev</strong>.</li>
</ol>

<h3>Report Abuse or Policy Violations</h3>
<p>If you encounter content that violates our community guidelines:</p>
<ol>
<li>Use the built-in <strong>Report</strong> button found on every thread, post, and user profile.</li>
<li>Our moderation team reviews every report promptly.</li>
<li>For severe or time-sensitive issues, email <strong>abuse@piforum.dev</strong>.</li>
</ol>

<h3>Partnerships &amp; Business</h3>
<p>Interested in partnering with PiForum, sponsoring a category, or advertising on our platform?</p>
<ul>
<li><strong>Email:</strong> partnerships@piforum.dev</li>
<li>Please include details about your organization and the type of collaboration you have in mind.</li>
</ul>

<h3>Press &amp; Media</h3>
<p>For press inquiries, interviews, or media kits:</p>
<ul>
<li><strong>Email:</strong> press@piforum.dev</li>
</ul>

<h3>Stay Connected</h3>
<p>Follow PiForum on social media for the latest updates, feature announcements, and community highlights:</p>
<ul>
<li><strong>Twitter / X:</strong> @PiForum</li>
<li><strong>GitHub:</strong> github.com/piforum</li>
<li><strong>Discord:</strong> Join our community server for real-time chat</li>
</ul>

<h3>Office Location</h3>
<p>PiForum is a distributed team. We operate remotely across multiple time zones, which helps us provide timely support to our global community.</p>

<p><em>We value every message we receive and will do our best to respond as quickly as possible. Thank you for being part of PiForum!</em></p>`,
        excerpt: 'Reach out to the PiForum team — support, partnerships, feedback, and more.',
        status: 'published',
        showInFooter: true,
        showInHeader: false,
        sortOrder: 1,
      },
      {
        slug: 'privacy',
        title: 'Privacy Policy',
        content: `<h2>Privacy Policy</h2>
<p><em>Last updated: March 2025</em></p>
<p>This Privacy Policy describes how PiForum ("we," "us," or "our") collects, uses, and protects your personal information when you use our platform. By using PiForum, you agree to the practices described in this policy.</p>

<h3>1. Information We Collect</h3>
<h4>1.1 Information You Provide</h4>
<ul>
<li><strong>Account Information:</strong> When you register, we collect your username, email address, display name, and password (stored in hashed form). You may optionally provide a bio, location, website URL, avatar, and signature.</li>
<li><strong>Content You Post:</strong> Threads, posts, replies, polls, tags, and any other content you create on the platform.</li>
<li><strong>Communications:</strong> If you contact us via email or our contact forms, we retain those communications to resolve your inquiry.</li>
</ul>

<h4>1.2 Information Collected Automatically</h4>
<ul>
<li><strong>Usage Data:</strong> We log page views, thread views, and general navigation patterns to improve the platform.</li>
<li><strong>Device Information:</strong> Browser type, operating system, and screen resolution for optimizing display and functionality.</li>
<li><strong>IP Address:</strong> Collected for security purposes, including spam prevention, abuse detection, and rate limiting.</li>
<li><strong>Cookies &amp; Local Storage:</strong> We use essential cookies for authentication, session management, and preference storage (e.g., theme selection). We do not use third-party tracking cookies by default.</li>
</ul>

<h3>2. How We Use Your Information</h3>
<p>We use the information we collect to:</p>
<ul>
<li>Provide, maintain, and improve the PiForum platform</li>
<li>Authenticate your identity and secure your account</li>
<li>Display your profile and content to other users as intended</li>
<li>Send notifications you've opted into (replies, mentions, system announcements)</li>
<li>Detect, prevent, and address fraud, abuse, and policy violations</li>
<li>Analyze aggregate usage patterns to improve user experience</li>
<li>Comply with legal obligations</li>
</ul>

<h3>3. How We Share Your Information</h3>
<p>We do <strong>not</strong> sell your personal information. We may share data in the following limited circumstances:</p>
<ul>
<li><strong>Public Content:</strong> Your posts, profile information, and threads are visible to other users and, where applicable, to guests browsing the forum.</li>
<li><strong>Service Providers:</strong> We may use third-party services for email delivery, file storage, or analytics. These providers are contractually obligated to process data only as instructed and to maintain appropriate security measures.</li>
<li><strong>Legal Requirements:</strong> We may disclose information when required by law, subpoena, or legal process, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
<li><strong>Moderation:</strong> Our moderation team may access account information and content to enforce community guidelines and handle reports.</li>
</ul>

<h3>4. Data Security</h3>
<p>We take reasonable measures to protect your personal information, including:</p>
<ul>
<li>Password hashing using industry-standard algorithms</li>
<li>Encrypted data transmission via HTTPS/TLS</li>
<li>Access controls limiting data access to authorized personnel</li>
<li>Regular security reviews and logging of security-related events</li>
<li>Optional two-factor authentication (TOTP) for enhanced account security</li>
</ul>
<p>While we strive to protect your data, no system is completely secure. We encourage you to use strong, unique passwords and enable two-factor authentication.</p>

<h3>5. Your Rights and Choices</h3>
<ul>
<li><strong>Account Settings:</strong> You can edit your profile, change your email, and update your preferences at any time from your account settings.</li>
<li><strong>Content Deletion:</strong> You may request deletion of your account and associated content by contacting us. Some content may be retained in anonymized form for community continuity.</li>
<li><strong>Notification Preferences:</strong> You can control which notifications you receive through your user settings.</li>
<li><strong>Data Access:</strong> You may request a copy of your personal data by contacting us at privacy@piforum.dev.</li>
</ul>

<h3>6. Data Retention</h3>
<p>We retain your account information for as long as your account is active. If you request account deletion, we will remove or anonymize your personal data within 30 days, except where retention is required by law or for legitimate purposes (e.g., resolving disputes, enforcing agreements). Content you've posted in public forums may be retained for community continuity but disassociated from your identity.</p>

<h3>7. Children's Privacy</h3>
<p>PiForum is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.</p>

<h3>8. International Users</h3>
<p>PiForum is accessible globally. If you are using PiForum from outside our primary jurisdiction, please be aware that your data may be transferred to and processed in servers located in different countries. By using PiForum, you consent to such transfers.</p>

<h3>9. Changes to This Policy</h3>
<p>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email or a prominent notice on the platform. Your continued use of PiForum after any changes constitutes acceptance of the updated policy.</p>

<h3>10. Contact Us</h3>
<p>If you have questions or concerns about this Privacy Policy, please contact us at:</p>
<ul>
<li><strong>Email:</strong> privacy@piforum.dev</li>
<li><strong>Address:</strong> Available upon request</li>
</ul>`,
        excerpt: 'How PiForum collects, uses, and protects your personal information.',
        status: 'published',
        showInFooter: true,
        showInHeader: false,
        sortOrder: 2,
      },
      {
        slug: 'terms',
        title: 'Terms and Conditions',
        content: `<h2>Terms and Conditions</h2>
<p><em>Last updated: March 2025</em></p>
<p>These Terms and Conditions ("Terms") govern your use of PiForum ("the Platform," "the Service"). By accessing or using PiForum, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.</p>

<h3>1. Account Registration</h3>
<ol>
<li><strong>Eligibility:</strong> You must be at least 13 years of age to create an account on PiForum. By registering, you represent that you meet this requirement.</li>
<li><strong>Account Accuracy:</strong> You agree to provide accurate, current, and complete information during registration and to keep your profile information updated.</li>
<li><strong>Account Security:</strong> You are responsible for safeguarding your account credentials. You must not share your password with anyone. You agree to notify us immediately of any unauthorized use of your account.</li>
<li><strong>One Account Per Person:</strong> Each individual may maintain only one account. Duplicate accounts may be merged or removed at our discretion.</li>
<li><strong>Username Policy:</strong> Usernames must not impersonate others, contain offensive language, or violate intellectual property rights. We reserve the right to require a username change if it violates these guidelines.</li>
</ol>

<h3>2. Acceptable Use</h3>
<p>When using PiForum, you agree <strong>not</strong> to:</p>
<ul>
<li>Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
<li>Post spam, chain letters, pyramid schemes, or unsolicited commercial content</li>
<li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity</li>
<li>Distribute malware, viruses, or any code designed to disrupt the Platform</li>
<li>Attempt to gain unauthorized access to any part of the Platform, other users' accounts, or our systems</li>
<li>Use automated scripts (bots, scrapers) to access the Platform without our express permission</li>
<li>Circumvent any security measures, rate limits, or access restrictions</li>
<li>Post content that infringes on the intellectual property rights of others</li>
<li>Share another user's personal information without their consent (doxxing)</li>
<li>Manipulate reputation, votes, or engagement metrics through artificial means</li>
<li>Create posts or threads intended to disrupt the community (trolling, flame wars)</li>
</ul>

<h3>3. Content Ownership &amp; Licensing</h3>
<ol>
<li><strong>Your Content:</strong> You retain ownership of the content you post on PiForum. By posting, you grant us a non-exclusive, worldwide, royalty-free license to display, distribute, and reproduce your content on the Platform for the purpose of operating and promoting the service.</li>
<li><strong>Community Content:</strong> Content posted by other users is subject to the same license. You may not reproduce, distribute, or create derivative works from others' content without their permission.</li>
<li><strong>Platform Content:</strong> The PiForum platform itself — including its design, code, logos, and branding — is our intellectual property and may not be copied or imitated without written permission.</li>
</ol>

<h3>4. Moderation &amp; Enforcement</h3>
<ol>
<li><strong>Content Review:</strong> Our moderation team may review, edit, move, or remove any content that violates these Terms or our Community Guidelines, without prior notice.</li>
<li><strong>Warnings &amp; Bans:</strong> Violations may result in warnings, temporary suspension, or permanent banning of your account. The severity of the action will correspond to the nature and frequency of the violation.</li>
<li><strong>Appeals:</strong> If you believe a moderation action was taken in error, you may appeal by contacting us at support@piforum.dev. We will review appeals in good faith.</li>
<li><strong>Reports:</strong> We encourage users to report content that violates these Terms. Abuse of the reporting system (e.g., false or retaliatory reports) may result in action against the reporter.</li>
</ol>

<h3>5. Privacy</h3>
<p>Your use of PiForum is also governed by our <a href="/pages/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference. Please review it to understand how we collect and handle your personal information.</p>

<h3>6. Disclaimers</h3>
<ol>
<li><strong>As-Is Service:</strong> PiForum is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the reliability, availability, or fitness of the Platform for any particular purpose.</li>
<li><strong>User Content:</strong> We do not endorse, verify, or guarantee the accuracy, quality, or legality of content posted by users. You access and rely on user content at your own risk.</li>
<li><strong>No Liability for Third Parties:</strong> We are not responsible for the actions, content, or policies of third-party websites or services linked from PiForum.</li>
</ol>

<h3>7. Limitation of Liability</h3>
<p>To the maximum extent permitted by law, PiForum and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of (or inability to use) the Platform, including but not limited to loss of data, reputation, or profits. Our total liability shall not exceed the amount you have paid to use the Platform, if any.</p>

<h3>8. Termination</h3>
<ol>
<li><strong>By You:</strong> You may deactivate your account at any time by contacting us. Upon deactivation, your profile will be hidden, but your posted content will remain for community continuity unless you request its removal.</li>
<li><strong>By Us:</strong> We may suspend or terminate your account if you violate these Terms, with or without notice. We may also terminate accounts that are inactive for an extended period, with reasonable notice.</li>
<li><strong>Survival:</strong> Provisions regarding content licensing, disclaimers, limitation of liability, and general provisions shall survive termination.</li>
</ol>

<h3>9. Changes to These Terms</h3>
<p>We may revise these Terms from time to time. Material changes will be communicated via email or a prominent notice on the Platform. Your continued use of PiForum after changes become effective constitutes acceptance of the revised Terms.</p>

<h3>10. General Provisions</h3>
<ul>
<li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and PiForum regarding the use of the Platform.</li>
<li><strong>Severability:</strong> If any provision of these Terms is found unenforceable, the remaining provisions will remain in full effect.</li>
<li><strong>Waiver:</strong> Our failure to enforce any right under these Terms does not constitute a waiver of that right.</li>
<li><strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict-of-law principles.</li>
</ul>

<h3>11. Contact</h3>
<p>If you have questions about these Terms, please contact us at:</p>
<ul>
<li><strong>Email:</strong> legal@piforum.dev</li>
</ul>

<p><em>Thank you for being a valued member of the PiForum community. We're committed to providing a safe, respectful, and engaging space for everyone.</em></p>`,
        excerpt: 'Terms and conditions governing your use of PiForum.',
        status: 'published',
        showInFooter: true,
        showInHeader: false,
        sortOrder: 3,
      },
    ];

    let pagesCreated = 0;
    for (const p of defaultPages) {
      const result = await db.page.upsert({
        where: { slug: p.slug },
        update: {},
        create: {
          slug: p.slug,
          title: p.title,
          content: p.content,
          excerpt: p.excerpt,
          status: p.status,
          showInFooter: p.showInFooter,
          showInHeader: p.showInHeader,
          sortOrder: p.sortOrder,
          authorId: adminUserId,
          publishedAt: new Date(),
        },
      });
      if (result) pagesCreated++;
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
      pagesSeeded: pagesCreated,
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
