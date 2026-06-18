# 🚀 PiForum — Deploy on Serv00.com

Complete step-by-step guide to deploy PiForum on **serv00.com** free hosting, accessible at **https://piforum.eu.org** and **https://piforum.eu.cc**.

---

## 📋 What you need

| Item | Notes |
|------|-------|
| Serv00 account | Sign up free at https://www.serv00.com |
| Your serv00 username | e.g. `piforum` — we'll call this `YOUR_USERNAME` |
| SSH access enabled | Enable in serv00 panel: **Panel → SSH → Enable** |
| Your two domains | `piforum.eu.org` and `piforum.eu.cc` |
| Local copy of this repo | With a successful build (`bun run build`) |

> **Why serv00?** FreeBSD-based free hosting with SSH, Node.js, Apache, free Let's Encrypt SSL, cron, and 5GB storage. Perfect for SQLite-based Next.js apps like PiForum.

---

## ⚙️ Serv00 specifics you should know

- **OS:** FreeBSD (not Linux — `sed -i` and some flags differ)
- **Home:** `/home/YOUR_USERNAME/`
- **Domains folder:** `~/domains/YOURDOMAIN/public_html/` (Apache serves from here)
- **Apache + .htaccess** is the web server; we'll reverse-proxy to Node.js
- **Node.js:** available via `pkg` or serv00's module system — typically v18 or v20
- **You pick the port:** any port ≥ 1024 is allowed (we'll use `3000`)
- **Process manager:** install `pm2` yourself via npm global
- **Free SSL:** serv00 panel has a one-click Let's Encrypt button per domain

---

## 🗺️ Architecture on serv00

```
                  ┌────────────────────────────────────┐
   visitor ──https──▶  Apache (port 443)               │
                      │  ~/domains/piforum.eu.org/      │
                      │  public_html/.htaccess          │
                      │  → mod_proxy reverse            │
                      └────────────┬───────────────────┘
                                   ▼  http://127.0.0.1:3000
                      ┌────────────────────────────────────┐
                      │  Node.js (Next.js standalone)      │
                      │  PM2-managed, auto-restart         │
                      │  ~/piforum/.next/standalone/       │
                      │  server.js                         │
                      └────────────┬───────────────────┘
                                   ▼
                      ┌────────────────────────────────────┐
                      │  SQLite file                       │
                      │  ~/piforum/db/custom.db            │
                      └────────────────────────────────────┘
```

---

## 📦 Step 1 — Build locally (recommended)

Serv00 has limited RAM (≈512MB free tier). Building Next.js there often OOMs. **Build on your local machine and upload the standalone bundle.**

```bash
# On your local machine, in the project root:
bun install
bun run lint               # confirm clean
bun run build              # creates .next/standalone/ with server.js + deps
```

After a successful build you should see:
```
.next/standalone/server.js
.next/standalone/.next/static/...
.next/standalone/public/...
.next/standalone/node_modules/...
.next/standalone/package.json
```

> 💡 If you don't have bun locally, use `npm install && npm run build` — same result.

---

## 📁 Step 2 — Prepare the upload bundle

Create a clean folder locally called `piforum-deploy/`:

```bash
mkdir -p piforum-deploy/db
cp -r .next/standalone/. piforum-deploy/
cp -r .next/standalone/.next/static piforum-deploy/.next/  # already copied by build script
cp ecosystem.config.cjs piforum-deploy/
cp start-serv00.sh piforum-deploy/
cp .env.serv00.example piforum-deploy/.env
cp prisma/schema.prisma piforum-deploy/prisma/schema.prisma  # for db:push if needed
```

Final local structure:
```
piforum-deploy/
├── .next/
│   └── (static + server chunks)
├── node_modules/        (only the production deps Next.js traced — small)
├── public/
├── db/                  (empty — SQLite will be created here)
├── prisma/
│   └── schema.prisma
├── server.js            (the standalone Next.js server)
├── package.json
├── ecosystem.config.cjs
├── start-serv00.sh
└── .env                 (edited — see Step 5)
```

---

## 🌐 Step 3 — Add your domains in serv00 panel

1. Log in to **https://panel.serv00.com**
2. Go to **WWW Websites → Add new website**
3. Add `piforum.eu.org`:
   - Type: **domain**
   - Domain: `piforum.eu.org`
   - Path: `~/domains/piforum.eu.org/public_html` (auto-created)
4. Repeat for `piforum.eu.cc`
5. For each domain, click **SSL → Let's Encrypt → Issue** (free, auto-renews)

> 🔗 At your domain registrar (Cloudflare, etc.), point both domains to serv00's IP (shown in panel under **Account Info → IP address**). Use A records, NOT proxy (grey cloud).

---

## 🔑 Step 4 — SSH into serv00

```bash
ssh YOUR_USERNAME@YOUR_USERNAME.serv00.net
# enter your serv00 password (set in panel)
```

You'll land in `/home/YOUR_USERNAME/`. Verify Node.js:

```bash
node -v       # should show v18 or v20
npm -v
```

If Node.js is missing or old, install it via serv00's module system:
```bash
# In panel: Additional services → DevServ00 → install nodejs (latest LTS)
# Then reopen SSH.
```

Install PM2 globally to your home directory (no root needed):
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
npm install -g pm2
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
pm2 --version
```

---

## 📤 Step 5 — Upload the bundle to serv00

From your **local** machine (in the parent folder of `piforum-deploy/`):

```bash
# Upload everything (skip node_modules to save time — see note below)
rsync -avz --exclude 'node_modules' \
  -e "ssh YOUR_USERNAME@YOUR_USERNAME.serv00.net" \
  piforum-deploy/ \
  YOUR_USERNAME@YOUR_USERNAME.serv00.net:~/piforum/

# Then install only production deps on serv00 (faster + correct FreeBSD binaries)
ssh YOUR_USERNAME@YOUR_USERNAME.serv00.net << 'EOF'
cd ~/piforum
npm install --omit=dev --no-package-lock
EOF
```

> 💡 **Why reinstall on serv00?** Some npm packages ship platform-specific binaries (e.g. `sharp`, `@prisma/client`). Built on Linux/macOS, they may fail on FreeBSD. Installing on serv00 ensures correct binaries.

Alternatively, just `scp -r piforum-deploy YOUR_USERNAME@...serv00.net:~/piforum` if rsync isn't available.

---

## ⚙️ Step 6 — Configure `.env` on serv00

SSH in and edit the env file:

```bash
cd ~/piforum
cp .env.serv00.example .env
nano .env
```

Set these critical values:

```ini
DATABASE_URL=file:/home/YOUR_USERNAME/piforum/db/custom.db
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=PASTE_GENERATED_SECRET_HERE
NEXTAUTH_URL=https://piforum.eu.org
NEXT_PUBLIC_SITE_URL=https://piforum.eu.org
NEXT_PUBLIC_SITE_NAME=PiForum
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## 🛠️ Step 7 — Initialize the database

```bash
cd ~/piforum
# Ensure the db folder exists
mkdir -p db
# Create the SQLite file + tables
npx prisma db push
# (Optional) seed admin user if you have a seed script
# npx prisma db seed
```

Verify the DB file exists:
```bash
ls -la db/   # should show custom.db
```

---

## ▶️ Step 8 — Start the app with PM2

```bash
cd ~/piforum
chmod +x start-serv00.sh
./start-serv00.sh start
```

Verify it's listening on port 3000:
```bash
curl -I http://127.0.0.1:3000/
# HTTP/1.1 200 OK
```

Save the PM2 process list so it restarts after server reboot:
```bash
pm2 save
```

---

## 🔄 Step 9 — Make PiForum auto-start on reboot (cron)

Serv00 doesn't run `pm2 startup` as root for you, so use a cron job instead:

```bash
crontab -e
```

Add this line (runs every minute — PM2 will detect if it's already running and skip):

```cron
* * * * * /home/YOUR_USERNAME/.npm-global/bin/pm2 resurrect 2>/dev/null
```

Or, more robust, use the start script:

```cron
@reboot /home/YOUR_USERNAME/piforum/start-serv00.sh start >> /home/YOUR_USERNAME/piforum/logs/cron.log 2>&1
* * * * * /home/YOUR_USERNAME/piforum/start-serv00.sh start >> /home/YOUR_USERNAME/piforum/logs/cron.log 2>&1
```

---

## 🌍 Step 10 — Configure `.htaccess` for both domains

SSH in and create the `.htaccess` file in each domain's `public_html`:

```bash
# For piforum.eu.org
cp ~/piforum/.htaccess ~/domains/piforum.eu.org/public_html/.htaccess

# For piforum.eu.cc
cp ~/piforum/.htaccess ~/domains/piforum.eu.cc/public_html/.htaccess
```

> The `.htaccess` is in the project root (also in this repo). It does:
> 1. Force HTTPS redirect
> 2. Reverse-proxy all requests to `http://127.0.0.1:3000`
> 3. Preserve Host header + set X-Forwarded-Proto
> 4. Add caching + security headers
> 5. Gzip compress responses

Verify the proxy works — visit `https://piforum.eu.org` in your browser. You should see PiForum! 🎉

---

## 🔀 Step 11 — Run both domains on the same app

Both `piforum.eu.org` and `piforum.eu.cc` point to the **same** Node.js app (port 3000). That's perfectly fine — Next.js will serve both. The `NEXTAUTH_URL` should be your **primary** domain (`piforum.eu.org`).

If you want `piforum.eu.cc` to 301-redirect to `piforum.eu.org` (recommended for SEO — avoids duplicate content), use this `.htaccess` for `piforum.eu.cc` instead:

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^piforum\.eu\.cc$ [NC]
RewriteRule ^(.*)$ https://piforum.eu.org/$1 [R=301,L]
```

---

## ✅ Step 12 — Final verification

| Check | Command / URL |
|-------|---------------|
| App running | `pm2 status` → piforum: online |
| App responds locally | `curl -I http://127.0.0.1:3000/` → 200 |
| HTTPS works | Visit https://piforum.eu.org |
| SSL valid | Browser shows 🔒 padlock |
| Admin login | https://piforum.eu.org → log in with admin@piforum.com / password123 |
| DB persistent | Create a post → refresh → still there |

---

## 🔄 Updating PiForum later

When you push new code to your repo:

```bash
# 1. Local: rebuild
bun run build

# 2. Upload the new .next/standalone bundle (rsync)
rsync -avz --exclude 'node_modules' --exclude 'db' \
  -e ssh piforum-deploy/ \
  YOUR_USERNAME@YOUR_USERNAME.serv00.net:~/piforum/

# 3. SSH in and restart
ssh YOUR_USERNAME@YOUR_USERNAME.serv00.net
cd ~/piforum && ./start-serv00.sh restart
```

> ⚠️ **Never overwrite `~/piforum/db/`** — that's your live SQLite database with all users/posts.

---

## 🧰 Common commands on serv00

```bash
cd ~/piforum

./start-serv00.sh start      # start the app
./start-serv00.sh stop       # stop
./start-serv00.sh restart    # restart
./start-serv00.sh status     # is it running?
./start-serv00.sh logs       # tail logs

pm2 logs piforum             # live logs
pm2 monit                    # CPU/memory monitor
pm2 restart piforum          # manual restart
pm2 reload piforum           # zero-downtime reload

# Database operations
npx prisma db push           # apply schema changes
npx prisma studio            # (only if you can port-forward — otherwise skip)
sqlite3 db/custom.db         # raw SQL access
```

---

## 🐛 Troubleshooting

### Blank page / 502 / 500
```bash
pm2 logs piforum --lines 50
```
Most common cause: `.env` not loaded, or `DATABASE_URL` path is wrong. Fix the path and `./start-serv00.sh restart`.

### `EADDRINUSE: address already in use :::3000`
Another process is using port 3000.
```bash
sockstat | grep 3000
pkill -f "server.js"
./start-serv00.sh start
```

### `.htaccess` not being applied
- Make sure the file is named exactly `.htaccess` (with the leading dot)
- Make sure Apache's `AllowOverride All` is set (it is by default on serv00)
- Check `tail -f /var/log/apache2/YOUR_USERNAME-error.log` if you can

### SSL not issuing
- DNS must point to serv00's IP first (A record, not CNAME, not proxied)
- Wait for DNS propagation (5–60 min)
- Retry in panel → SSL → Issue

### Build OOMs on serv00
Don't build on serv00. Build locally and upload `.next/standalone/`. See Step 1.

### `prisma` command not found
```bash
cd ~/piforum
npm install prisma@^6 --save
npx prisma db push
```

### Process dies after SSH disconnect
Use PM2 (not raw `node &`). PM2 detaches properly. If PM2 isn't an option, use `nohup`:
```bash
nohup node .next/standalone/server.js > logs/out.log 2>&1 &
disown
```

### Serv00 suspended my account for CPU usage
Free tier is shared. Mitigations:
- Set `max_memory_restart: '400M'` in `ecosystem.config.cjs` (already set)
- Disable heavy features (AI image gen, video gen) in admin panel
- Consider a paid VPS (Hetzner CX11 ≈ $4/mo) for production traffic

---

## 📊 Serv00 limits to be aware of

| Limit | Free tier |
|-------|-----------|
| Storage | 5 GB |
| RAM (per process) | ~512 MB |
| CPU | Shared, throttled |
| Processes | Limited (PM2 with 1 instance is fine) |
| MySQL DBs | 5 (you don't need them — using SQLite) |
| Bandwidth | Fair use, ~unmetered |
| Cron jobs | Yes (every minute minimum) |
| SSH | Yes |
| SSL | Free Let's Encrypt |

> 💡 For a busy forum (>50 concurrent users), graduate to a cheap VPS. For a personal/small community forum, serv00 is plenty.

---

## 🎯 Quick TL;DR

```bash
# LOCAL
bun run build
rsync -avz --exclude node_modules --exclude db \
  piforum-deploy/ YOUR_USERNAME@YOUR_USERNAME.serv00.net:~/piforum/

# SERV00 (SSH in)
ssh YOUR_USERNAME@YOUR_USERNAME.serv00.net
cd ~/piforum
cp .env.serv00.example .env && nano .env       # set DATABASE_URL + NEXTAUTH_SECRET
npm install --omit=dev
mkdir -p db && npx prisma db push
chmod +x start-serv00.sh && ./start-serv00.sh start
pm2 save
crontab -e   # add: * * * * * /home/YOUR_USERNAME/.npm-global/bin/pm2 resurrect 2>/dev/null

# Configure each domain's public_html/.htaccess
cp .htaccess ~/domains/piforum.eu.org/public_html/.htaccess
cp .htaccess ~/domains/piforum.eu.cc/public_html/.htaccess

# Issue SSL in panel → visit https://piforum.eu.org 🎉
```

---

## 📞 Need help?

- **Serv00 docs:** https://docs.serv00.com
- **Serv00 Discord:** https://discord.gg/serv00
- **PiForum repo:** https://github.com/eunusctg/PiForum

Happy hosting! 🚀
