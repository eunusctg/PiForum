#!/usr/bin/env bash
# ============================================================
# PiForum — One-shot Cloudflare Workers Deployment Script
# ============================================================
# Run this on YOUR machine (not in sandbox) to deploy PiForum
# to Cloudflare Workers via OpenNext.
#
# Prerequisites:
#   - Node.js 18+ and npm
#   - Cloudflare account
#   - Your Cloudflare API token (the one starting with cfut_...)
#
# What this script does:
#   1. Installs wrangler + @opennextjs/cloudflare
#   2. Creates the D1 database (needs D1 Edit token permission)
#   3. Applies Prisma schema to D1
#   4. Sets required secrets
#   5. Builds & deploys the Next.js app as a Cloudflare Worker
#   6. Adds custom domain (piforum.eu.org)
#
# Usage:
#   chmod +x deploy-cloudflare.sh
#   CLOUDFLARE_API_TOKEN=cfut_xxx ./deploy-cloudflare.sh
# ============================================================

set -euo pipefail

# ---- Colors ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== PiForum — Cloudflare Workers Deployment ===${NC}"
echo ""

# ---- Verify token ----
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo -e "${RED}Error: CLOUDFLARE_API_TOKEN env var is not set${NC}"
  echo "Get a token at: https://dash.cloudflare.com/profile/api-tokens"
  echo "Required permissions:"
  echo "  - Account → D1 → Edit"
  echo "  - Account → Workers Scripts → Edit"
  echo "  - Account → Workers KV Storage → Edit"
  echo "  - Account → Workers R2 Storage → Edit"
  echo "  - Zone → Workers Routes → Edit"
  echo ""
  echo "Then run:"
  echo "  export CLOUDFLARE_API_TOKEN=cfut_your_token_here"
  echo "  ./deploy-cloudflare.sh"
  exit 1
fi

# ---- Verify token works ----
echo -e "${YELLOW}[1/8] Verifying Cloudflare API token...${NC}"
VERIFY=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

if ! echo "$VERIFY" | grep -q '"status":"active"'; then
  echo -e "${RED}Token verification failed:${NC}"
  echo "$VERIFY"
  exit 1
fi
echo -e "${GREEN}  ✓ Token is valid and active${NC}"

# ---- Get account ID ----
ACCOUNT_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result'][0]['id'])")
echo -e "${GREEN}  ✓ Account ID: $ACCOUNT_ID${NC}"

# ---- Install dependencies ----
echo ""
echo -e "${YELLOW}[2/8] Installing wrangler and OpenNext...${NC}"
cd "$(dirname "$0")"
npm install --save-dev wrangler @opennextjs/cloudflare @prisma/adapter-d1
npm install --save-dev prisma @prisma/client
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ---- Create D1 database ----
echo ""
echo -e "${YELLOW}[3/8] Creating D1 database 'piforum'...${NC}"
D1_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"piforum"}')

if echo "$D1_RESPONSE" | grep -q '"success":true'; then
  D1_UUID=$(echo "$D1_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['uuid'])")
  echo -e "${GREEN}  ✓ D1 database created: $D1_UUID${NC}"

  # Update wrangler.toml with the real D1 UUID
  sed -i.bak "s/PASTE_D1_DATABASE_UUID_HERE/$D1_UUID/" wrangler.toml
  echo -e "${GREEN}  ✓ Updated wrangler.toml with D1 UUID${NC}"
else
  echo -e "${YELLOW}  ! D1 creation failed (maybe already exists or token lacks D1 Edit permission)${NC}"
  echo "  Response: $D1_RESPONSE"
  echo -e "${YELLOW}  ! Trying to find existing 'piforum' D1 database...${NC}"
  D1_UUID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); [print(db['uuid']) for db in d.get('result',[]) if db['name']=='piforum']")
  if [ -n "$D1_UUID" ]; then
    echo -e "${GREEN}  ✓ Found existing D1: $D1_UUID${NC}"
    sed -i.bak "s/PASTE_D1_DATABASE_UUID_HERE/$D1_UUID/" wrangler.toml
  else
    echo -e "${RED}  ✗ Could not create or find D1 database. Aborting.${NC}"
    echo "  Fix: Create a token with 'D1 Edit' permission at:"
    echo "  https://dash.cloudflare.com/profile/api-tokens"
    exit 1
  fi
fi

# ---- Apply schema to D1 ----
echo ""
echo -e "${YELLOW}[4/8] Applying Prisma schema to D1...${NC}"
mkdir -p migrations_d1
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > migrations_d1/0001_init.sql
echo -e "${GREEN}  ✓ Generated migrations_d1/0001_init.sql${NC}"

npx wrangler d1 execute piforum --remote --file=migrations_d1/0001_init.sql
echo -e "${GREEN}  ✓ Schema applied to D1${NC}"

# ---- Set secrets ----
echo ""
echo -e "${YELLOW}[5/8] Setting secrets...${NC}"
if [ -z "${NEXTAUTH_SECRET:-}" ]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo "  Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
fi

echo "$NEXTAUTH_SECRET" | npx wrangler secret put NEXTAUTH_SECRET
echo -e "${GREEN}  ✓ NEXTAUTH_SECRET set${NC}"

# Optional secrets — set if env var exists
for SECRET in ZAI_API_KEY SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM \
              WHATSAPP_TOKEN WHATSAPP_PHONE_NUMBER_ID WHATSAPP_VERIFY_TOKEN \
              TELEGRAM_BOT_TOKEN; do
  if [ -n "${!SECRET:-}" ]; then
    echo "${!SECRET}" | npx wrangler secret put "$SECRET"
    echo -e "${GREEN}  ✓ $SECRET set${NC}"
  fi
done

# ---- Build with OpenNext ----
echo ""
echo -e "${YELLOW}[6/8] Building Next.js app for Cloudflare (OpenNext)...${NC}"
npx opennextjs-cloudflare build
echo -e "${GREEN}  ✓ Build complete (.open-next/worker.js)${NC}"

# ---- Deploy ----
echo ""
echo -e "${YELLOW}[7/8] Deploying to Cloudflare Workers...${NC}"
npx wrangler deploy
echo -e "${GREEN}  ✓ Deployed!${NC}"

# ---- Custom domain ----
echo ""
echo -e "${YELLOW}[8/8] Adding custom domain piforum.eu.org...${NC}"
echo "  (This adds a custom domain route to the Worker)"
npx wrangler deploy --route "piforum.eu.org/*"
echo -e "${GREEN}  ✓ Custom domain configured${NC}"

echo ""
echo -e "${GREEN}=== 🎉 Deployment complete! ===${NC}"
echo ""
echo "Your PiForum is live at:"
echo "  - https://piforum.workers.dev (or piforum.pages.dev)"
echo "  - https://piforum.eu.org (after DNS propagates, ~2 min)"
echo ""
echo "Next steps:"
echo "  1. Visit https://piforum.eu.org to verify"
echo "  2. Log in with admin@piforum.com / password123"
echo "  3. (Optional) Add piforum.eu.cc as another custom domain"
echo ""
echo "Useful commands:"
echo "  npx wrangler tail                  # live logs"
echo "  npx wrangler deploy                # redeploy after changes"
echo "  npx wrangler d1 execute piforum --remote --command='SELECT * FROM User LIMIT 5'"
