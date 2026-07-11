# 🪟 Windows Deploy Fix — OpenNext Symlink Error

You hit this error during `npx opennextjs-cloudflare build`:

```
Error: EPERM: operation not permitted, symlink
'C:\Users\Eunus\Desktop\PiForum\node_modules\@prisma\client' ->
'C:\Users\Eunus\Desktop\PiForum\.open-next\server-functions\default\.next\node_modules\@prisma\client-2c3a283f134fdcb6'
errno: -4048, code: 'EPERM', syscall: 'symlink'
```

This is **not a bug in your code or in OpenNext** — it is a Windows security policy. Windows (unlike Linux/macOS) **does not allow non-administrator users to create symbolic links** by default. OpenNext's bundler uses `fs.symlinkSync()` to wire `@prisma/client` into the server function bundle, and Windows blocks it.

You have **three working solutions**, ranked from fastest to most reliable.

---

## ✅ Solution 1 — Enable Windows Developer Mode (FASTEST, one-time setup)

This is the cleanest fix. Developer Mode is a built-in Windows feature that lets any user create symlinks without admin rights. You only do this **once** and it works forever.

### Steps (Windows 11)
1. Press **Win + I** to open Settings
2. Go to **Privacy & security → For developers**
3. Toggle **Developer Mode** to **On**
4. Click **Yes** on the warning prompt
5. **Close your current CMD window** and open a new one (so the new permission takes effect)

### Steps (Windows 10)
1. Press **Win + I** → **Update & Security → For developers**
2. Under "Use developer features" → select **Developer mode**
3. Click **Yes** on the warning
4. Open a new CMD window

### Then re-run the build
```cmd
cd C:\Users\Eunus\Desktop\PiForum
npx opennextjs-cloudflare build
```

The symlink error will be gone. ✅

---

## ✅ Solution 2 — Run CMD as Administrator (no system change)

If you can't enable Developer Mode (corporate laptop, etc.), you can grant symlink permission just for this session by running CMD as admin.

### Steps
1. Press **Win** → type `cmd`
2. **Right-click** "Command Prompt" → **Run as administrator**
3. Click **Yes** on the UAC prompt
4. In the admin CMD window:
```cmd
cd C:\Users\Eunus\Desktop\PiForum
npx opennextjs-cloudflare build
```

> ⚠️ You must use the **admin** CMD window for *every* `opennextjs-cloudflare build` and `wrangler deploy` command. A normal CMD window will still fail.

---

## ✅ Solution 3 — Cloudflare Pages Git Integration (MOST RELIABLE, recommended long-term)

This approach **completely avoids Windows** by letting Cloudflare build your project on Linux. You just `git push` and Cloudflare does everything. This is the production-recommended way to deploy Next.js on Cloudflare.

### Why this is best
- ✅ No Windows symlink/permission issues ever
- ✅ No local Node.js / OpenNext / wrangler setup needed
- ✅ Auto-deploys on every `git push` to `main`
- ✅ Builds run on Cloudflare's Linux build servers (fast, reliable)
- ✅ Rollback to any previous commit in one click

### Setup steps

1. **Push your latest code to GitHub** (you already have `eunusctg/PiForum`):
```cmd
cd C:\Users\Eunus\Desktop\PiForum
git add -A
git commit -m "chore: cross-platform build scripts for Cloudflare"
git push origin main
```

2. **Go to Cloudflare dashboard:**
   - https://dash.cloudflare.com → **Workers & Pages**
   - Click **Create** → **Pages** → **Connect to Git**

3. **Connect GitHub:**
   - Click **Connect to Git** → authorize Cloudflare on GitHub
   - Select the `eunusctg/PiForum` repository

4. **Configure the build** (these exact settings):
   - **Project name:** `piforum` (this matches your existing project — Cloudflare will ask if you want to use the existing one, say yes)
   - **Production branch:** `main`
   - **Framework preset:** `Next.js (OpenNext)`
   - **Build command:**
     ```
     npx opennextjs-cloudflare@latest build
     ```
   - **Build output directory:** `.open-next`
   - **Environment variables** (click "Add" for each):
     | Variable | Value |
     |----------|-------|
     | `NODE_VERSION` | `22` |
     | `NEXTAUTH_SECRET` | (your secret, e.g. from `openssl rand -base64 32`) |
     | `NEXTAUTH_URL` | `https://piforum.eu.org` |
     | `NEXT_PUBLIC_SITE_URL` | `https://piforum.eu.org` |
     | `NEXT_PUBLIC_SITE_NAME` | `PiForum` |
     | `CLOUDFLARE_D1_DATABASE_ID` | `25923490-eba7-4e98-b9f0-34c9c183c0b9` |

   - Under **Settings → Functions → Compatibility flags**, add: `nodejs_compat`

5. **Click "Save and Deploy"** — Cloudflare will:
   - Clone your repo
   - Run `npm install` (or `bun install`)
   - Run `npx opennextjs-cloudflare build`
   - Deploy to `https://piforum.pages.dev`

6. **Watch the build logs** in the Cloudflare dashboard. First build takes ~3-5 minutes. If it fails, the logs tell you exactly why (no Windows noise, just clean Linux output).

7. **Future updates:** just `git push origin main` — Cloudflare auto-rebuilds and deploys. No local commands needed.

### Bindings for Git-integrated projects

After the first successful deploy, set up your D1/R2/KV bindings in the dashboard:

- **Workers & Pages → piforum → Settings → Bindings**
  - **Add binding → D1 database:**
    - Variable name: `DB`
    - D1 database: `piforum`
  - **Add binding → R2 bucket:**
    - Variable name: `UPLOADS`
    - R2 bucket: `piforum-uploads`
  - **Add binding → KV namespace:**
    - Variable name: `SESSIONS`
    - KV namespace: `piforum-sessions`

These must match the binding names in your `wrangler.toml`. Redeploy after adding them.

---

## ✅ Solution 4 — WSL (recommended by OpenNext maintainers)

If you want to keep building locally but Windows is fighting you, use WSL (Windows Subsystem for Linux). OpenNext's own warning recommends this:

```
WARN OpenNext is not fully compatible with Windows.
WARN For optimal performance, it is recommended to use Windows Subsystem for Linux (WSL).
```

### One-time WSL setup
```cmd
wsl --install -d Ubuntu
```
Restart, set a Linux username/password, then:

### Build inside WSL
```cmd
wsl
```
Now you're in Linux. Mount your Windows project:
```bash
cd /mnt/c/Users/Eunus/Desktop/PiForum

# Install Node.js inside WSL (one-time)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install bun (one-time)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install deps fresh inside WSL (Linux node_modules, not Windows ones)
rm -rf node_modules
bun install

# Generate Prisma client
npx prisma generate

# Set env var for deploy
export CLOUDFLARE_API_TOKEN=cfut_n7UfYQiy0bt0LCNEU7qH7NQ57SWpy1Ji3q29cQZI359becd1

# Build — symlinks work natively in Linux ✅
npx opennextjs-cloudflare build

# Deploy
npx wrangler deploy
```

---

## 🏆 Which solution should I pick?

| Solution | Setup time | Reliability | Best for |
|----------|-----------|-------------|----------|
| 1. Developer Mode | 1 min | High | Quick local builds |
| 2. Admin CMD | 0 min | Medium | One-off builds |
| 3. Git Integration | 10 min | **Highest** | Production deploys |
| 4. WSL | 15 min | High | Local dev parity with prod |

### My recommendation for your case
You've been fighting Windows for a while. **Go with Solution 3 (Git Integration)** — it's the industry-standard way to deploy on Cloudflare, removes Windows from the equation entirely, and gives you auto-deploys on every `git push`. You can still use Solutions 1 or 2 for occasional local previews.

---

## 🔧 What I've already fixed in your repo

### `package.json` — cross-platform build scripts
The old `build` script used Unix-only `cp -r` which broke Windows CMD. I changed it to:

```json
"build": "next build",
"build:standalone": "next build && node ./scripts/copy-standalone.cjs",
"cf:build": "npx opennextjs-cloudflare build",
"cf:deploy": "npx opennextjs-cloudflare build && npx wrangler deploy",
"cf:preview": "npx opennextjs-cloudflare build && npx wrangler dev"
```

- `build` is now plain `next build` (works everywhere) — this is what OpenNext calls.
- `build:standalone` uses a new cross-platform Node script `scripts/copy-standalone.cjs` instead of `cp -r`, for when you deploy to serv00/VPS.
- `cf:build` / `cf:deploy` are convenient shortcuts for OpenNext.

### `scripts/copy-standalone.cjs` — cross-platform copy helper
Uses `fs.cpSync({ recursive: true })` instead of `cp -r`. Works identically on Windows, macOS, and Linux.

### Pull these changes locally
```cmd
cd C:\Users\Eunus\Desktop\PiForum
git pull origin main
```

Then apply Solution 1 (Developer Mode) and re-run:
```cmd
npx opennextjs-cloudflare build
```

---

## 🚀 Full deploy command sequence (after applying Solution 1 or 2)

```cmd
:: 1. Make sure Prisma client is generated
cd C:\Users\Eunus\Desktop\PiForum
npx prisma generate

:: 2. Build with OpenNext (this is where the symlink error was)
npx opennextjs-cloudflare build

:: 3. Set your Cloudflare API token (use your real token)
set CLOUDFLARE_API_TOKEN=cfut_n7UfYQiy0bt0LCNEU7qH7NQ57SWpy1Ji3q29cQZI359becd1

:: 4. Deploy to Cloudflare Workers
npx wrangler deploy

:: 5. Push D1 schema to the remote database (only first time, or after schema changes)
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql

:: 6. Set secrets (interactive — will prompt for value)
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put ZAI_API_KEY
:: ... add more as needed
```

After step 4 succeeds, your site is live at `https://piforum.<your-subdomain>.workers.dev` (or `piforum.pages.dev` depending on how it was created). Then add custom domains in the Cloudflare dashboard.

---

## 🆘 Still stuck?

If after enabling Developer Mode you still see `EPERM: symlink`:

1. **Reboot Windows** (Developer Mode sometimes needs a reboot to fully activate)
2. Verify it's actually on: `Settings → Privacy & security → For developers → Developer Mode = On`
3. Open a **brand new** CMD window (don't reuse the old one)
4. Check your user has the privilege:
   ```cmd
   whoami /priv
   ```
   Look for `SeCreateSymbolicLinkPrivilege` in the output. If missing, Developer Mode didn't apply — try Solution 2 (Admin CMD) or Solution 4 (WSL).

If you see a *different* error after the symlink one is fixed, paste it and we'll keep going. You're very close — the Next.js build itself already succeeds (77/77 pages compiled), so it's just the OpenNext bundling step that needs the symlink permission.
