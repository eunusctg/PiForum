# ☁️ PiForum — Deploy on Cloudflare Pages

Complete guide to deploy PiForum on **Cloudflare Pages** at **https://piforum.eu.org** and **https://piforum.eu.cc**.

---

## ⚠️ Read this first — architectural constraints

Cloudflare Pages is a **serverless edge platform** (V8 isolates). PiForum was built for **Node.js + SQLite**. To run on Pages, you must make the changes below. **This is NOT a one-click deploy** — it's a migration.

### What works on Cloudflare Pages as-is ✅
| Feature | Status |
|---------|--------|
| Next.js App Router pages | ✅ Static + edge-rendered |
| Tailwind / shadcn/ui components | ✅ Pure CSS, no runtime |
| React Server Components | ✅ Supported via edge runtime |
| NextAuth (JWT strategy) | ✅ With edge-compatible config |
| TOTP / OTP verification | ✅ Crypto API works on edge |
| Admin settings panel | ✅ Reads/writes via D1 |

### What needs migration ❌ → ✅
| Current (Node.js) | Cloudflare Pages equivalent | Effort |
|-------------------|----------------------------|--------|
| **SQLite file** (`db/custom.db`) | **Cloudflare D1** (SQL database) | Medium |
| **Prisma Client** (Node.js) | **Prisma D1 Adapter** (`@prisma/adapter-d1`) | Small |
| `fs.readFile`/`writeFile` for uploads | **R2 Storage** binding | Small |
| `output: "standalone"` in next.config | Remove — use `@cloudflare/next-on-pages` | Trivial |
| `sharp` (native image processing) | **Skip** or use Cloudflare Images | Optional |
| `z-ai-web-dev-sdk` (Node.js SDK) | Move to client-side API calls or external worker | Medium |
| `@mdxeditor/editor` SSR | Force client-only rendering | Small |

### What WILL NOT work on Cloudflare Pages 🚫
- ❌ Long-running background tasks (Workers CPU limits: 50ms free, 30s paid)
- ❌ WebSocket servers (Pages doesn't support long-lived connections — use **Durable Objects** on Workers Paid, or external service)
- ❌ Persistent local filesystem (no `/tmp` that survives between requests)
- ❌ Native Node.js modules (`better-sqlite3`, `sharp`, `bcrypt`)

> **If you need WebSocket real-time chat**, the recommended pattern is:
> - Static + API on **Cloudflare Pages**
> - WebSocket service on a tiny VPS (or serv00) proxied via **Cloudflare Tunnel**
> See `DEPLOY-SERV00.md` for the all-Node.js alternative (no migration needed).

---

## 📋 What you need

- A **Cloudflare account** (free) at https://dash.cloudflare.com
- Both domains (`piforum.eu.org`, `piforum.eu.cc`) added to Cloudflare DNS (free plan OK)
- Node.js 18+ locally
- Wrangler CLI: `npm install -g wrangler`
- 30–60 minutes for first deployment (including D1 migration)

---

## 🗺️ Architecture on Cloudflare Pages

```
                   ┌────────────────────────────────────────┐
   visitor ──https──▶  Cloudflare Global Network            │
                      │  • Auto SSL (Let's Encrypt)         │
                      │  • DDoS protection                  │
                      │  • CDN cache for static assets      │
                      │  • 300+ edge locations              │
                      └─────────────────┬────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
   │  Pages Functions │     │  D1 Database     │     │  R2 Storage      │
   │  (Next.js edge)  │────▶│  (SQL, free 5GB) │     │  (uploads, 10GB) │
   │  • API routes    │     │  • Users/Posts   │     │  • Avatars       │
   │  • SSR pages     │     │  • Settings      │     │  • Attachments   │
   └──────────────────┘     └──────────────────┘     └──────────────────┘
              │
              ▼
   ┌──────────────────┐
   │  KV Namespace    │
   │  • Sessions      │
   │  • Rate-limits   │
   └──────────────────┘
```

---

## 🚀 Quick start (TL;DR)

```bash
# 1. Install tools
npm install -g wrangler
wrangler login

# 2. Create Cloudflare resources
npx wrangler d1 create piforum                    # → paste database_id into wrangler.toml
npx wrangler r2 bucket create piforum-uploads
npx wrangler kv namespace create SESSIONS          # → paste id into wrangler.toml

# 3. Edit wrangler.toml — fill in database_id + kv id

# 4. Apply DB schema to D1
npx wrangler d1 execute piforum --remote \
  --file="$(npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output-to -)"

# 5. (Optional) Migrate existing data from SQLite
./migrate-to-d1.sh

# 6. Set secrets
npx wrangler pages secret put NEXTAUTH_SECRET      # paste: openssl rand -base64 32
npx wrangler pages secret put ZAI_API_KEY
# (add more as needed — see .env.cloudflare.example)

# 7. Build for Pages
npx @cloudflare/next-on-pages

# 8. Deploy!
npx wrangler pages deploy .vercel/output/static --project-name=piforum

# 9. Add custom domains in Cloudflare dashboard → Pages → piforum → Custom domains
```

Full walkthrough below 👇

---

## 📦 Step 1 — Install prerequisites

```bash
# Wrangler CLI (Cloudflare's deploy tool)
npm install -g wrangler

# Log in to your Cloudflare account
wrangler login
#   → opens browser → Authorize Wrangler

# Verify
wrangler whoami
```

Install the Cloudflare-Pages-aware Next.js builder:

```bash
cd /home/z/my-project
npm install --save-dev @cloudflare/next-on-pages
npm install @prisma/adapter-d1
```

---

## 🗄️ Step 2 — Create Cloudflare D1 database

```bash
cd /home/z/my-project
npx wrangler d1 create piforum
```

Output looks like:
```
✅ Successfully created DB 'piforum'
[[d1_databases]]
binding = "DB"
database_name = "piforum"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   ← copy this
```

**Paste the `database_id` into `wrangler.toml`** (already has a placeholder).

### Apply the schema to D1

```bash
# Generate SQL from Prisma schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > migrations_d1/0001_init.sql

# Apply to D1 (remote = real Cloudflare, --local = local dev copy)
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
```

Verify tables exist:
```bash
npx wrangler d1 execute piforum --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## 🔄 Step 3 — (Optional) Migrate existing SQLite data

If you've been running PiForum on serv00/local and want to bring your users/posts:

```bash
chmod +x migrate-to-d1.sh
./migrate-to-d1.sh
```

This script:
1. Reads your local `db/custom.db`
2. Exports all rows as INSERT statements
3. Imports them into D1

> ⚠️ Large datasets (>10k rows) should be batched. The script exports per-table; if a table is huge, split the SQL file before importing.

---

## 🪣 Step 4 — Create R2 bucket for file uploads

```bash
npx wrangler r2 bucket create piforum-uploads
```

The bucket name is already configured in `wrangler.toml` under `[[r2_buckets]]`.

### Update upload code to use R2

In `src/app/api/upload/route.ts`, replace `fs.writeFile` calls with R2:

```typescript
// BEFORE (Node.js):
import { writeFileSync } from 'fs'
writeFileSync(`public/uploads/${file.name}`, buffer)

// AFTER (Cloudflare):
import { getRequestContext } from '@cloudflare/next-on-pages'
const env = getRequestContext().env
await env.UPLOADS.put(file.name, buffer)
// To read back: const obj = await env.UPLOADS.get(file.name)
```

See **`src/lib/db-edge.ts`** for the pattern of accessing bindings via `getRequestContext()`.

---

## 🗃️ Step 5 — Create KV namespace (for sessions/cache)

```bash
npx wrangler kv namespace create SESSIONS
```

Copy the `id` from the output into `wrangler.toml` under `[[kv_namespaces]]`.

---

## ⚙️ Step 6 — Configure environment

### Non-secret vars
Already in `wrangler.toml` `[vars]` — edit `NEXT_PUBLIC_SITE_URL` etc. as needed.

### Secret vars
Set each secret with the interactive prompt:

```bash
# Generate a strong NEXTAUTH secret
openssl rand -base64 32

# Set secrets (prompts for value, encrypts at rest)
npx wrangler pages secret put NEXTAUTH_SECRET
npx wrangler pages secret put ZAI_API_KEY
npx wrangler pages secret put SMTP_HOST
npx wrangler pages secret put SMTP_PORT
npx wrangler pages secret put SMTP_USER
npx wrangler pages secret put SMTP_PASSWORD
npx wrangler pages secret put SMTP_FROM
npx wrangler pages secret put WHATSAPP_TOKEN
npx wrangler pages secret put WHATSAPP_PHONE_NUMBER_ID
npx wrangler pages secret put WHATSAPP_VERIFY_TOKEN
npx wrangler pages secret put TELEGRAM_BOT_TOKEN
```

> 💡 You only need to set the secrets for features you'll actually use. SMTP/WhatsApp/Telegram are optional.

---

## 🔧 Step 7 — Update code for edge runtime

### 7a. Switch database client on the edge

For each API route + page that imports `db`:

```typescript
// BEFORE
import { db } from '@/lib/db'

// AFTER (auto-detects environment)
import { db } from process.env.NEXT_RUNTIME === 'edge' ? '@/lib/db-edge' : '@/lib/db'
```

Or simpler — just swap to `db-edge` everywhere if Pages is your only production target:

```typescript
import { db } from '@/lib/db-edge'
```

> The `db-edge.ts` file (already in this repo) uses a Proxy to lazy-resolve the D1-bound Prisma client on first call, so the import signature stays identical.

### 7b. Add edge runtime to API routes

Add this line to the top of every `src/app/api/**/route.ts`:

```typescript
export const runtime = 'edge'
```

For pages that need DB access:

```typescript
export const runtime = 'edge'
```

> ⚠️ Routes that use `z-ai-web-dev-sdk`, `sharp`, or other Node-only packages CANNOT be edge. Move their logic to a separate Cloudflare Worker (deploy with `wrangler deploy`, not Pages).

### 7c. Update next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REMOVE output: "standalone" when deploying to Pages
  // output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  experimental: {
    // Required for @cloudflare/next-on-pages
    runtime: "edge",
  },
};

export default nextConfig;
```

> 💡 Keep both versions: use `next.config.ts` for Pages, `next.config.serv00.ts` for serv00/VPS. Or use an env flag to switch.

---

## 🏗️ Step 8 — Build for Cloudflare Pages

```bash
cd /home/z/my-project
npm run pages:build
# or: npx @cloudflare/next-on-pages
```

This produces `.vercel/output/static/` — a directory compatible with Cloudflare Pages.

### Preview locally before deploying

```bash
npm run pages:preview
# or: npx wrangler pages dev .vercel/output/static --compatibility-flag=nodejs_compat
```

Visit `http://localhost:8788`. Verify:
- Home page loads
- Login works
- Admin panel accessible
- Posts/threads render from D1

---

## 🚀 Step 9 — Deploy to Cloudflare Pages

```bash
npm run pages:deploy
# or: npx wrangler pages deploy .vercel/output/static --project-name=piforum
```

First run creates the project. Subsequent runs update it.

Output:
```
✨ Successfully deployed!
https://piforum-xxxxx.pages.dev    ← your *.pages.dev URL
```

Verify it loads before connecting your custom domains.

---

## 🌐 Step 10 — Add custom domains

1. Go to https://dash.cloudflare.com → **Workers & Pages → piforum**
2. Tab **Custom domains → Set up a custom domain**
3. Add `piforum.eu.org` → Continue → Activate
4. Repeat for `piforum.eu.cc`

Cloudflare will:
- Add the necessary DNS records automatically (since the domains are on CF DNS)
- Provision SSL automatically (Let's Encrypt, ~2 min)
- Route all traffic through the global CDN

### Optional: redirect .cc → .org for SEO

In Cloudflare dashboard → **Rules → Redirect Rules → Create**:
- When: `hostname eq "piforum.eu.cc"`
- Then: `redirect https://piforum.eu.org${http.request.uri.path}` with 301

---

## ✅ Step 11 — Verify deployment

| Check | How |
|-------|-----|
| Site loads | Visit `https://piforum.eu.org` |
| SSL valid | Browser shows 🔒 |
| Database works | Log in / create a post |
| Uploads work | Upload an avatar (uses R2) |
| Admin panel | `https://piforum.eu.org/admin` |
| Both domains work | Visit `https://piforum.eu.cc` |
| Edge location | `curl -I https://piforum.eu.org` shows `cf-ray` header |

---

## 🔄 Updating PiForum on Pages

```bash
# Pull latest code
git pull origin main

# Rebuild + redeploy
npm run pages:deploy
```

That's it. No SSH, no rsync, no PM2. Cloudflare handles everything.

### CI/CD via GitHub (recommended)

1. Cloudflare dashboard → **Workers & Pages → piforum → Settings → Builds & deployments**
2. Connect your GitHub repo `eunusctg/PiForum`
3. Set:
   - **Build command:** `npm run pages:build`
   - **Build output directory:** `.vercel/output/static`
4. Every `git push` to `main` now auto-deploys. 🎉

---

## 🧰 Common commands cheat sheet

```bash
# Build & deploy
npm run pages:build              # build for Pages
npm run pages:preview            # local preview
npm run pages:deploy             # deploy to Cloudflare

# D1 database
npx wrangler d1 execute piforum --remote --command="SELECT * FROM User LIMIT 5"
npx wrangler d1 execute piforum --remote --file=path/to/sql
npx wrangler d1 backup piforum --remote --output=backup.sql

# R2 storage
npx wrangler r2 object put piforum-uploads/test.txt --file=./test.txt
npx wrangler r2 object get piforum-uploads/test.txt

# KV
npx wrangler kv key list --binding=SESSIONS
npx wrangler kv key put --binding=SESSIONS mykey myvalue

# Secrets
npx wrangler pages secret list
npx wrangler pages secret put NEW_SECRET_NAME
npx wrangler pages secret delete OLD_SECRET

# Logs (real-time)
npx wrangler pages deployment tail
```

---

## 🐛 Troubleshooting

### Build fails: "Some modules are not compatible with the edge runtime"
The package uses Node.js APIs. Find which one:
```bash
npx @cloudflare/next-on-pages --experimental-minify
```
Common culprits in PiForum:
- `z-ai-web-dev-sdk` → Move AI features to a separate Worker
- `sharp` → Remove or use Cloudflare Images
- `@mdxeditor/editor` server-side → Add `'use client'` directive

### `Error: Cannot find module 'node:fs'`
You're using a Node.js API in an edge route. Either:
- Remove the `fs` usage (use R2 instead — see Step 4)
- Move that route to a separate Cloudflare Worker (`wrangler deploy`)

### D1 query returns `D1_ERROR: no such table`
Schema wasn't applied. Re-run:
```bash
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
```

### 502 / "Application failed to respond"
- Check `npx wrangler pages deployment tail` for runtime errors
- Common cause: missing secret (`NEXTAUTH_SECRET`)
- Or: route imports Node.js-only package — see "Build fails" above

### Uploads fail with 401
R2 bucket not bound. Verify `wrangler.toml` has the `[[r2_buckets]]` block and bucket name matches what you created.

### TOTP QR code doesn't render
QR code generation uses `qrcode` package which uses Canvas — works on edge but check:
```typescript
export const runtime = 'edge'
// ... in route:
const svg = await QRCode.toString(otpauthUrl, { type: 'svg' })
```

### Cold start slow on first request
Edge functions have ~5-50ms cold starts. First request after deploy may take 200ms. Subsequent requests are instant. Use `wrangler tail` to confirm.

### "CPU limit exceeded" error
Free tier = 50ms CPU per request. Upgrade to Workers Paid ($5/mo) for 30s limit. For PiForum this is rarely hit — most API calls complete in <10ms.

### WebSocket features don't work
Pages doesn't support WebSocket servers. Options:
1. Use a separate Worker with Durable Objects (Workers Paid, $5/mo)
2. Use Pusher / Ably / Liveblocks (managed, has free tier)
3. Run a tiny VPS/serv00 for WebSocket + Cloudflare Tunnel for routing (see `DEPLOY-SERV00.md`)

---

## 💰 Cloudflare Pages pricing (free tier)

| Resource | Free tier | Paid ($5/mo) |
|----------|-----------|--------------|
| Pages requests | 100,000/day | 10M/month |
| Pages builds | 500/month | 5,000/month |
| D1 reads | 5M/day | 25B/month |
| D1 writes | 100K/day | 50M/month |
| D1 storage | 5 GB | 50 GB |
| R2 storage | 10 GB | 10 GB free + $0.015/GB |
| R2 operations | 1M Class A / 10M Class B / month | same |
| KV reads | 100K/day | unlimited |
| Workers CPU | 10ms/request | 30s/request |
| Concurrent connections | 100 | unlimited |

> 💡 **For a small forum (<1000 users, <10k daily page views):** 100% free tier.
> 💡 **For a busy forum (10k+ users):** Workers Paid ($5/mo) is plenty.

---

## 🆚 Pages vs Tunnel — which should I use?

| Aspect | Cloudflare Pages | Cloudflare Tunnel + serv00/VPS |
|--------|------------------|-------------------------------|
| **Code changes required** | Many (D1, R2, edge runtime) | None |
| **Free SSL + CDN** | ✅ | ✅ |
| **DDoS protection** | ✅ | ✅ |
| **WebSocket support** | ❌ (use Durable Objects, paid) | ✅ |
| **Long-running tasks** | ❌ (50ms free / 30s paid) | ✅ |
| **Native Node.js packages** | ❌ | ✅ |
| **Cold starts** | ~5-50ms | None (always-on) |
| **Auto-scaling** | ✅ (infinite) | Limited by your server |
| **Cost at scale** | Free → $5/mo | Free (serv00) → $4/mo (VPS) |
| **Maintenance** | Zero (serverless) | You patch the OS |

### Recommendation
- **If PiForum is your main project and you'll add WebSocket chat later** → **Cloudflare Tunnel + serv00/VPS** (use `DEPLOY-SERV00.md`)
- **If you want zero maintenance, pure serverless, and don't need WebSockets** → **Cloudflare Pages** (this guide)

Both are valid. Both serve your domains on Cloudflare's global network with free SSL.

---

## 📞 Need help?

- **Cloudflare Pages docs:** https://developers.cloudflare.com/pages/
- **Next.js on Pages:** https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/
- **D1 docs:** https://developers.cloudflare.com/d1/
- **PiForum repo:** https://github.com/eunusctg/PiForum

Happy deploying! ☁️🚀
