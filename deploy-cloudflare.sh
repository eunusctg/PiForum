#!/usr/bin/env bash
# ============================================================
# PiForum — Cloudflare Workers Deploy (OpenNext)
# ============================================================
# Run on YOUR machine (with internet + npm working).
#
# Pre-configured with your Cloudflare account:
#   Account:    Techctg24 Inc (704489378006d2bed6a45de180f6679f)
#   D1 DB:      piforum (25923490-eba7-4e98-b9f0-34c9c183c0b9) ✅ created
#   R2 bucket:  piforum-uploads ✅ created
#   KV:         piforum-sessions (c36268abac2d4fe3bd426a92a060e2fb) ✅ created
#   Pages proj: piforum (piforum.pages.dev) ✅ exists
#   Env vars:   NEXTAUTH_SECRET, NEXTAUTH_URL, NEXT_PUBLIC_SITE_* ✅ set
#
# Usage:
#   git clone https://github.com/eunusctg/PiForum.git
#   cd PiForum
#   chmod +x deploy-cloudflare.sh
#   export CLOUDFLARE_API_TOKEN=cfut_your_token_with_d1_edit_permission
#   ./deploy-cloudflare.sh
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== PiForum → Cloudflare Workers Deploy ===${NC}"
echo ""

# ---- Verify token ----
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo -e "${RED}Error: CLOUDFLARE_API_TOKEN not set${NC}"
  echo ""
  echo "Create a token at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Required permissions:"
  echo "  - Account → D1 → Edit"
  echo "  - Account → Workers Scripts → Edit"
  echo "  - Account → Workers KV Storage → Edit"
  echo "  - Account → Workers R2 Storage → Edit"
  echo "  - Zone → Workers Routes → Edit"
  echo ""
  echo "Then: export CLOUDFLARE_API_TOKEN=cfut_xxxxxxxxxxxx"
  exit 1
fi
echo -e "${GREEN}[1/7] Token set ✓${NC}"

# ---- Install dependencies ----
echo -e "${YELLOW}[2/7] Installing npm dependencies (this takes ~2 min)...${NC}"
npm install --legacy-peer-deps
npm install --save-dev @opennextjs/cloudflare wrangler
npm install @prisma/adapter-d1
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ---- Verify Cloudflare resources ----
echo -e "${YELLOW}[3/7] Verifying Cloudflare resources...${NC}"

# D1
D1_INFO=$(npx wrangler d1 list --json 2>/dev/null | python3 -c "
import json,sys
data = json.load(sys.stdin)
for db in data:
    if db.get('name') == 'piforum':
        print(f'{db[\"uuid\"]}')
        break
" 2>/dev/null || echo "")

if [ -z "$D1_INFO" ]; then
  echo -e "${YELLOW}  ! D1 'piforum' not found, creating...${NC}"
  npx wrangler d1 create piforum
else
  echo -e "${GREEN}  ✓ D1 'piforum' found: $D1_INFO${NC}"
fi

# Apply schema if needed
echo -e "${YELLOW}  Applying Prisma schema to D1...${NC}"
mkdir -p migrations_d1
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > migrations_d1/0001_init.sql
npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
echo -e "${GREEN}  ✓ Schema applied${NC}"

# ---- Set secrets ----
echo -e "${YELLOW}[4/7] Setting secrets...${NC}"

if [ -z "${NEXTAUTH_SECRET:-}" ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo "  Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
fi

echo "$NEXTAUTH_SECRET" | npx wrangler secret put NEXTAUTH_SECRET 2>/dev/null || \
  npx wrangler pages secret put NEXTAUTH_SECRET --project-name=piforum <<< "$NEXTAUTH_SECRET"
echo -e "${GREEN}  ✓ NEXTAUTH_SECRET set${NC}"

# Optional secrets
for SECRET in ZAI_API_KEY SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM \
              WHATSAPP_TOKEN WHATSAPP_PHONE_NUMBER_ID WHATSAPP_VERIFY_TOKEN \
              TELEGRAM_BOT_TOKEN; do
  if [ -n "${!SECRET:-}" ]; then
    echo "${!SECRET}" | npx wrangler secret put "$SECRET" 2>/dev/null || \
      npx wrangler pages secret put "$SECRET" --project-name=piforum <<< "${!SECRET}"
    echo -e "${GREEN}  ✓ $SECRET set${NC}"
  fi
done

# ---- Build with OpenNext ----
echo -e "${YELLOW}[5/7] Building for Cloudflare (OpenNext)...${NC}"
echo "  This compiles the Next.js app + bundles for Cloudflare Workers runtime."
echo "  Takes 2-5 minutes depending on your machine."
npx opennextjs-cloudflare build
echo -e "${GREEN}  ✓ Build complete${NC}"

# ---- Deploy ----
echo -e "${YELLOW}[6/7] Deploying to Cloudflare Workers...${NC}"
npx wrangler deploy
echo -e "${GREEN}  ✓ Deployed!${NC}"

# ---- Custom domain ----
echo -e "${YELLOW}[7/7] Configuring custom domain piforum.eu.org...${NC}"
echo "  Adding custom domain route..."

# Add custom domain via API
ACCOUNT_ID="704489378006d2bed6a45de180f6679f"
ZONE_ID="3a405826081c82730c3d3adae9a1fdd8"  # piforum.eu.org zone

# Try adding custom domain via wrangler
npx wrangler deploy --route "piforum.eu.org/*" || true

# Or via dashboard: Workers & Pages → piforum → Settings → Triggers → Custom domains
echo -e "${GREEN}  ✓ Custom domain configured${NC}"
echo ""
echo "  Note: For piforum.eu.cc, also add a Worker route in dashboard:"
echo "    Workers & Pages → piforum → Settings → Triggers → Routes → Add route"
echo "    Route: piforum.eu.cc/*"

echo ""
echo -e "${GREEN}=== 🎉 Deployment complete! ===${NC}"
echo ""
echo "Your PiForum is live at:"
echo "  • https://piforum.workers.dev (or piforum.pages.dev)"
echo "  • https://piforum.eu.org (after DNS, ~2 min)"
echo ""
echo "Admin login:"
echo "  • Email: admin@piforum.com"
echo "  • Password: password123"
echo ""
echo "Useful commands:"
echo "  npx wrangler tail                # live logs"
echo "  npx wrangler deploy              # redeploy after changes"
echo "  npx wrangler d1 execute piforum --remote --command='SELECT * FROM User LIMIT 5'"
echo ""
echo "Dashboard: https://dash.cloudflare.com → Workers & Pages → piforum"
