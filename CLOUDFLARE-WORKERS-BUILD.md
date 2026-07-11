# ☁️ PiForum — Cloudflare Workers Builds (Git Integration)

This is the **correct** Cloudflare deploy path for OpenNext. (You previously tried Pages Git Integration — that's the wrong target for OpenNext. Use **Workers Builds** instead.)

> **Why Workers, not Pages?** OpenNext for Cloudflare bundles your Next.js app as a **Cloudflare Worker** (server code in `.open-next/worker.js`) plus **static assets** (in `.open-next/assets/`). Pages is for static-only sites or edge functions. Workers is for full server-side apps — which is what PiForum is.

---

## 🩹 Fix the lockfile first (this is what just failed)

Cloudflare ran `npm ci` (strict mode) and failed because your `package-lock.json` is stale — it doesn't list `@emnapi/runtime` which the current `sharp@0.34.x` needs.

Run these commands **on your Windows CMD**:

```cmd
cd C:\Users\Eunus\Desktop\PiForum

:: 1. Pull the .npmrc + updated wrangler.toml I just created
git pull origin master

:: 2. If pull says "no remote changes" — that's fine, just create .npmrc manually:
::    Open Notepad, paste these 4 lines, save as .npmrc (no extension):
::       legacy-peer-deps=true
::       fund=false
::       audit=false

:: 3. Delete the stale lockfile
del package-lock.json

:: 4. Regenerate it fresh with the new .npmrc settings
npm install --legacy-peer-deps

:: 5. Commit + push
git add .npmrc package-lock.json
git commit -m "fix: add .npmrc and regenerate package-lock.json for Cloudflare build"
git push origin master
```

After this, the `npm ci` step on Cloudflare will succeed.

---

## 🚀 Set up Workers Builds (the correct Cloudflare target)

### Step 1 — Delete the failed Pages project

The Pages project you created (`piforum` on `piforum.pages.dev`) is the wrong type. Clean slate:

1. https://dash.cloudflare.com → **Workers & Pages**
2. Click the `piforum` project → **Settings → Delete project** (bottom of page)
3. Confirm deletion

> ⚠️ This does NOT delete your D1/R2/KV resources — only the Pages project. Your data is safe.

### Step 2 — Create a new Worker with Git Integration

1. https://dash.cloudflare.com → **Workers & Pages**
2. Click **Create** → **Workers** tab (NOT Pages) → **Connect to Git**
3. Authorize Cloudflare on GitHub if prompted
4. Select the `eunusctg/PiForum` repository

### Step 3 — Configure the build (use these EXACT settings)

| Field | Value |
|-------|-------|
| **Name** | `piforum` |
| **Production branch** | `master` ⚠️ (NOT `main` — your code is on `master`) |
| **Build command** | `npx opennextjs-cloudflare@latest build` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | `/` (leave default) |

> 💡 If the dashboard doesn't show a "Deploy command" field, don't worry — Cloudflare auto-detects `wrangler deploy` from your `wrangler.toml`.

### Step 4 — Add environment variables

In the **Environment variables** section before clicking "Save and Deploy":

| Variable | Value | Type |
|----------|-------|------|
| `NODE_VERSION` | `22` | Plain text |
| `NEXTAUTH_SECRET` | (use the same one you generated before — if lost, generate new at https://generate-secret.now.sh/32) | Plain text |
| `NEXTAUTH_URL` | `https://piforum.eu.org` | Plain text |
| `NEXT_PUBLIC_SITE_URL` | `https://piforum.eu.org` | Plain text |
| `NEXT_PUBLIC_SITE_NAME` | `PiForum` | Plain text |

### Step 5 — Click "Save and Deploy"

Cloudflare will now:
1. Clone your `master` branch
2. Run `npm ci` (✅ now works with the regenerated lockfile)
3. Run `npx opennextjs-cloudflare build` (✅ on Linux, no Windows symlink errors)
4. Run `npx wrangler deploy` (✅ reads your `wrangler.toml` with D1/R2/KV bindings)

First build takes ~3-5 minutes. Watch the live logs.

---

## 🔧 After the first successful deploy

### Verify bindings are wired in

Your `wrangler.toml` already declares D1/R2/KV bindings, and `wrangler deploy` reads them automatically. But verify:

1. **Workers & Pages → piforum → Settings → Bindings**
2. You should see:
   - `DB` → D1 database `piforum`
   - `UPLOADS` → R2 bucket `piforum-uploads`
   - `SESSIONS` → KV namespace `piforum-sessions`
   - `ASSETS` → (auto-created by OpenNext)

If any are missing, add them manually via "Add binding" — but they should be picked up from `wrangler.toml`.

### Push the D1 schema to your database

Run this from your Windows CMD (the D1 API call works fine on Windows, no symlink issues):

```cmd
cd C:\Users\Eunus\Desktop\PiForum
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
```

Verify tables exist:
```cmd
npx wrangler d1 execute piforum --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Set secrets (still from CMD — these go to the Worker, not Pages)

```cmd
set CLOUDFLARE_API_TOKEN=cfut_n7UfYQiy0bt0LCNEU7qH7NQ57SWpy1Ji3q29cQZI359becd1

npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put ZAI_API_KEY
:: Add more as needed (SMTP_*, WHATSAPP_*, TELEGRAM_*)
```

> Note: If you set `NEXTAUTH_SECRET` as an env var in Step 4 AND as a secret here, the secret wins. Use one or the other — secret is recommended for production.

---

## 🌐 Add custom domains

1. **Workers & Pages → piforum → Settings → Domains & Routes → Add Custom Domain**
2. Add `piforum.eu.org` → Continue → Add domain
3. Repeat for `piforum.eu.cc`
4. Cloudflare auto-provisions SSL (~2 min) and adds the DNS records (since your domains are on Cloudflare DNS)

> If your domains aren't on Cloudflare DNS yet, add them first: **dash.cloudflare.com → Add a site → enter piforum.eu.org → Free plan → update nameservers at your registrar**.

---

## 🔄 Future updates

From now on, every `git push origin master` from your Windows CMD triggers:
1. Cloudflare clones your repo
2. `npm ci` installs deps (fast, lockfile-based)
3. `npx opennextjs-cloudflare build` bundles your app
4. `npx wrangler deploy` ships to production
5. Live in ~5 minutes worldwide

You can watch build progress at: **Workers & Pages → piforum → Deployments**

Rollback to any previous deploy in one click from the same page.

---

## 🐛 Troubleshooting

### Build still fails with `npm ci` lockfile error
The lockfile regeneration didn't take effect. Verify on your Windows machine:
```cmd
git pull origin master
del package-lock.json
npm install --legacy-peer-deps
git status
:: Should show: modified: package-lock.json, new file: .npmrc
git add -A
git commit -m "regen lockfile"
git push origin master
```

### Build fails with "Cannot find module 'open-next.config.ts'"
The OpenNext config is in the repo. Verify: `git log --oneline | head -5` shows your latest commit. If not, push again.

### Build fails with `EPERM: symlink`
This shouldn't happen because Cloudflare builds on Linux. If you see this, you're somehow running the build locally — make sure the build command is `npx opennextjs-cloudflare@latest build` (Cloudflare runs it, not you).

### Deploy fails with "wrangler.toml not found"
Your `wrangler.toml` is at the repo root. Verify it was pushed: `git ls-files | findstr wrangler.toml` should show it.

### Build succeeds but site shows 404
- Check `wrangler tail` (live logs) for runtime errors
- Verify D1 schema is applied (see "Push the D1 schema" above)
- Verify `NEXTAUTH_SECRET` is set (either as env var or secret)
- Click the latest deployment in dashboard → check "Real-time Logs"

### "D1_ERROR: no such table: User"
Schema wasn't pushed. Re-run:
```cmd
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
```

### Uploads (avatars/images) fail with 401 or 500
R2 binding missing. Verify in dashboard that `UPLOADS` binding is wired to `piforum-uploads` bucket.

---

## 📞 Quick reference

| What | Where |
|------|-------|
| Project URL (auto) | `https://piforum.<your-subdomain>.workers.dev` |
| Custom domain | `https://piforum.eu.org` (after Step "Add custom domains") |
| Dashboard | https://dash.cloudflare.com → Workers & Pages → piforum |
| Live logs | `npx wrangler tail` (from your CMD) |
| D1 query | `npx wrangler d1 execute piforum --remote --command="..."` |
| Build settings | Workers & Pages → piforum → Settings → Builds & deployments |
| Env vars | Workers & Pages → piforum → Settings → Variables and Secrets |
| Bindings | Workers & Pages → piforum → Settings → Bindings |

---

## 🆘 Still stuck?

Paste the **build log** output from the Cloudflare dashboard (last ~30 lines) here. Common things to watch for:
- `npm ci` error → lockfile still out of sync → repeat the regen steps
- `Cannot find module` → missing dep in package.json → add it, commit, push
- OpenNext bundle error → usually a code issue, paste the error
- `wrangler deploy` error → usually a binding/secret issue, check dashboard
