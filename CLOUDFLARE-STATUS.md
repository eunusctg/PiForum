# PiForum — Cloudflare Deployment Status

**Last updated:** Auto-generated from sandbox deployment attempt

## ✅ Cloudflare Resources Created (Account: Techctg24 Inc)

| Resource | Status | ID |
|----------|--------|-----|
| **D1 Database** | ✅ Created | `piforum` (UUID: `25923490-eba7-4e98-b9f0-34c9c183c0b9`) |
| **R2 Bucket** | ✅ Created | `piforum-uploads` |
| **KV Namespace** | ✅ Created | `piforum-sessions` (ID: `c36268abac2d4fe3bd426a92a060e2fb`) |
| **Pages Project** | ✅ Exists | `piforum` (URL: `piforum.pages.dev`) |
| **Schema Applied** | ✅ 27 tables | All Prisma models migrated to D1 |
| **Env Vars Set** | ✅ | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` |
| **D1 Tables** | ✅ 27 | User, Post, Thread, Forum, Category, Setting, etc. |

## 📋 Configuration Files in Repo

| File | Purpose |
|------|---------|
| `wrangler.toml` | Pre-configured with all resource IDs |
| `open-next.config.ts` | OpenNext adapter config |
| `deploy-cloudflare.sh` | One-shot deploy script |

## ⚠️ Why I Couldn't Build in the Sandbox

The sandbox environment has network restrictions that prevented:
1. Installing `@opennextjs/cloudflare` via npm (timeouts)
2. Downloading `next@16.2.9` (required by OpenNext peer dep — current is `16.1.3`)
3. Downloading `@cloudflare/workerd-linux-64` binary

The token permission issue was solved (D1 was created after token upgrade), but the sandbox's network can't download the large Next.js + workerd binaries needed for the OpenNext build.

## 🚀 What You Need To Do (5 min on your machine)

### Step 1: Upgrade Next.js to 16.2.9+ (OpenNext peer requirement)

```bash
git clone https://github.com/eunusctg/PiForum.git
cd PiForum
npm install --legacy-peer-deps
npm install next@latest  # upgrades to 16.2.9+
```

### Step 2: Set your Cloudflare token (with D1 Edit permission)

```bash
export CLOUDFLARE_API_TOKEN=cfut_your_new_token
```

### Step 3: Run the deploy script

```bash
chmod +x deploy-cloudflare.sh
./deploy-cloudflare.sh
```

The script will:
1. ✅ Verify your token
2. ✅ Install dependencies (including OpenNext + wrangler)
3. ✅ Verify D1 database exists (creates if missing — already created)
4. ✅ Apply Prisma schema (already applied — will re-apply idempotently)
5. ✅ Set secrets (NEXTAUTH_SECRET etc.)
6. ✅ Build with OpenNext for Cloudflare Workers
7. ✅ Deploy as a Cloudflare Worker
8. ✅ Add custom domain route

### Step 4: Add custom domain (piforum.eu.org)

After deploy, in Cloudflare dashboard:
1. Go to **Workers & Pages → piforum → Settings → Triggers → Custom Domains**
2. Click **Add Custom Domain** → enter `piforum.eu.org`
3. Cloudflare auto-provisions SSL + DNS

For `piforum.eu.cc`, repeat with that domain (must be on Cloudflare DNS first).

## 📊 Resource IDs (for reference)

```toml
# Already in wrangler.toml — these are real:
account_id   = "704489378006d2bed6a45de180f6679f"     # Techctg24 Inc
database_id  = "25923490-eba7-4e98-b9f0-34c9c183c0b9" # D1: piforum
bucket_name  = "piforum-uploads"                       # R2
id (KV)      = "c36268abac2d4fe3bd426a92a060e2fb"      # KV: piforum-sessions
```

## 🧰 Useful Commands After Deploy

```bash
# Live logs
npx wrangler tail

# Redeploy after code changes
npx wrangler deploy

# Query D1
npx wrangler d1 execute piforum --remote --command="SELECT COUNT(*) FROM User"

# List all deployed workers
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback

# Delete the deployment (keeps the resources)
npx wrangler delete --name piforum
```

## 🔗 Useful Links

- **Cloudflare Dashboard:** https://dash.cloudflare.com → Workers & Pages → piforum
- **D1 Console:** https://dash.cloudflare.com → Workers & Pages → D1 → piforum → Console
- **GitHub Repo:** https://github.com/eunusctg/PiForum
- **OpenNext docs:** https://opennext.js.org/cloudflare
- **Wrangler docs:** https://developers.cloudflare.com/workers/wrangler/

## 🆘 Troubleshooting

### "Authentication error [code: 10000]" on D1
Your token lacks D1 Edit permission. Create a new token at
https://dash.cloudflare.com/profile/api-tokens with:
- Account → D1 → Edit
- Account → Workers Scripts → Edit
- Account → Workers KV Storage → Edit
- Account → Workers R2 Storage → Edit
- Zone → Workers Routes → Edit

### "peer next >=15.5.18 <16 || >=16.2.6"
Upgrade Next.js: `npm install next@latest`

### "Cannot find package @cloudflare/workerd-linux-64"
Run `npm install` again — it's an optional dep that npm installs based on platform.

### Build fails with esbuild version mismatch
Delete node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Deploy succeeds but site shows 404
Wait 2-5 minutes for global propagation. Check `npx wrangler tail` for runtime errors.

### Custom domain not working
Verify DNS: `piforum.eu.org` must be on Cloudflare DNS (it already is per our zone list).
In dashboard, ensure the custom domain is added to the Worker's Triggers.
