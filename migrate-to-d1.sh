# ============================================================
# PiForum — D1 Migration Helper
# ============================================================
# Migrates your existing SQLite database (db/custom.db) to Cloudflare D1.
#
# Prerequisites:
#   1. npm install -g wrangler
#   2. wrangler login
#   3. wrangler d1 create piforum
#      → paste the database_id into wrangler.toml
#   4. Place this script at the project root
#
# Usage:
#   chmod +x migrate-to-d1.sh
#   ./migrate-to-d1.sh
# ============================================================

#!/usr/bin/env bash
set -euo pipefail

DB_NAME="piforum"
LOCAL_DB="db/custom.db"
MIGRATIONS_DIR="migrations_d1"
SCHEMA="prisma/schema.prisma"

echo "=== PiForum → Cloudflare D1 Migration ==="
echo ""

# Step 1: Check prerequisites
command -v wrangler >/dev/null 2>&1 || {
  echo "❌ wrangler not installed. Run: npm install -g wrangler"
  exit 1
}
[ -f "$LOCAL_DB" ] || {
  echo "❌ Local SQLite DB not found at $LOCAL_DB"
  echo "   Run your app locally first to create it: bun run dev"
  exit 1
}

# Step 2: Generate D1-compatible SQL from Prisma schema
echo "📦 [1/4] Generating D1 SQL from Prisma schema..."
mkdir -p "$MIGRATIONS_DIR"
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel "$SCHEMA" \
  --script \
  > "$MIGRATIONS_DIR/0001_init.sql"
echo "   ✓ Wrote $MIGRATIONS_DIR/0001_init.sql"

# Step 3: Apply schema to D1 (creates tables)
echo "📦 [2/4] Applying schema to D1 database '$DB_NAME'..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$MIGRATIONS_DIR/0001_init.sql"
echo "   ✓ D1 schema created"

# Step 4: Export data from local SQLite and import to D1
echo "📦 [3/4] Exporting data from local SQLite..."
TABLES=$(sqlite3 "$LOCAL_DB" ".tables" | tr -s ' ' '\n' | grep -v '^$' | sort)
EXPORT_FILE="$MIGRATIONS_DIR/seed_data.sql"
> "$EXPORT_FILE"

for table in $TABLES; do
  echo "   → Exporting $table..."
  # D1 doesn't support Prisma's _prisma_migrations table — skip it
  [ "$table" = "_prisma_migrations" ] && continue
  # Dump as INSERT statements
  sqlite3 "$LOCAL_DB" ".mode insert $table" "SELECT * FROM $table" >> "$EXPORT_FILE"
done
echo "   ✓ Wrote $EXPORT_FILE"

# Step 5: Import data to D1
echo "📦 [4/4] Importing data to D1..."
npx wrangler d1 execute "$DB_NAME" --remote --file="$EXPORT_FILE"
echo "   ✓ Data imported"

echo ""
echo "🎉 Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Verify data in D1 dashboard: https://dash.cloudflare.com → Workers & Pages → D1"
echo "  2. Update wrangler.toml with your database_id (if not done already)"
echo "  3. Build for Pages: npx @cloudflare/next-on-pages"
echo "  4. Deploy: npx wrangler pages deploy .vercel/output/static"
