# Task ID: INSTALL-WIZARD — Install Wizard Enhancer

## Task
Add MySQL database option and site branding (site title, description, logo URL) to the PiForum installation wizard.

## Approach
Followed **Option A** from the task spec — keep the existing 4-step structure (System Check → Configurations → Admin Account → Complete), augment the existing "Configurations" step with a Database sub-section at the top, and augment the existing "Admin Account" step with a Site Branding sub-section at the top. This is the least disruptive approach and matches the user's original wording ("in database section" + "in admin creation step").

## Files Modified

### 1. `prisma/schema.prisma` — InstallConfig model
Added 7 new fields with explanatory comment block:
- `dbType` String @default("sqlite") — "sqlite" | "mysql"
- `mysqlHost` String?
- `mysqlPort` String?
- `mysqlDatabase` String?
- `mysqlUsername` String?
- `mysqlPassword` String?
- `logoUrl` String?

The comment block explains that switching the Prisma datasource provider at runtime is not possible — these fields are persisted for documentation/deployment purposes. Actual MySQL deployment requires setting `DATABASE_URL` env var, changing `provider` in schema.prisma to "mysql", and regenerating the client.

### 2. `src/components/forum/InstallWizard.tsx`
- **Imports**: added `Image as ImageIcon`, `Type`, `FileText` from lucide-react
- **FormData interface**: added dbType, mysqlHost/Port/Database/Username/Password, forumName, forumDescription, logoUrl (organized with comment groups)
- **initialFormData**: dbType='sqlite', mysqlPort='3306', branding fields default to ''
- **Step 2** (renderStep2): heading changed to "Database & Integrations". New "Database Configuration" card at the top with:
  - Two-button toggle (SQLite / MySQL) using neumorphic tab style
  - SQLite selected → info inset "Using local SQLite database. No configuration needed…"
  - MySQL selected → deployment note + Host (2/3 width) + Port (1/3 width) in grid + Database Name + Username + Password fields
- **validateStep2()** (new function): requires mysqlHost, mysqlDatabase, mysqlUsername when dbType === 'mysql'; clears MySQL errors when switching to sqlite
- **step2Valid()**: extended to also check MySQL fields are filled when MySQL is selected
- **goNext()**: now calls validateStep2() when leaving step 2
- **Step 3** (renderStep3): heading changed to "Branding & Admin Account". Wrapped in scrollable container. New "Site Branding" card at the top with:
  - Site Title input (required, placeholder "PiForum")
  - Site Description textarea (3 rows, optional, placeholder "A modern neumorphic forum community")
  - Site Logo URL input (with ImageIcon prefix, optional, placeholder "https://example.com/logo.png")
  - Helper note: "Paste a direct image URL… Leave empty to use the default `/logo.svg`. You can upload a logo file from Admin → Settings after installation."
  - Live logo preview using `<img>` with onError handler that hides the broken image
- **validateStep3()**: now requires forumName (min 2 chars)
- **submitInstallation()**: POST body now includes dbType, mysqlHost/Port/Database/Username/Password, forumName, forumDescription, logoUrl

### 3. `src/app/api/install/route.ts`
- Destructured new fields from body
- Added validation: if dbType === 'mysql', requires mysqlHost + mysqlDatabase + mysqlUsername (returns 400 otherwise)
- Added explanatory comment block about why runtime MySQL switching isn't possible and how to deploy on MySQL
- Persisted all new fields into InstallConfig.create() — only saves MySQL fields when dbType === 'mysql', normalized dbType
- Updated default settings: `logo_url` now uses `logoUrl || '/logo.svg'` instead of hardcoded '/logo.svg'

## Design Choices
- **Logo as URL input (not file upload)**: The `/api/upload` route requires authentication. During installation, there's no user yet. Solution: URL input + note directing admin to Admin → Settings for file upload post-install. This is the simplest robust approach.
- **MySQL toggle button pattern**: Uses the neumorphic tab style from the task spec (neu-well wrapper + neu-card active state + neu-flat inactive state).
- **Host + Port grid**: 3-column grid where Host spans 2 cols and Port spans 1 col (responsive — stacks on mobile via `grid-cols-1 sm:grid-cols-3`).
- **Scrollable Step 3**: Adding the branding section roughly doubled the step's height, so wrapped it in `max-h-[58vh] overflow-y-auto custom-scroll`.
- **dbType normalization**: Backend normalizes to 'sqlite' | 'mysql' to prevent arbitrary strings. MySQL fields are only persisted when dbType === 'mysql' (null otherwise) to keep the install config clean.

## Verification
- `bun run db:push` ✅ — Prisma client regenerated, database in sync
- `bun run lint` ✅ — 0 errors, 0 warnings (after removing an unused eslint-disable directive)
- Dev server compiled successfully (✓ Compiled in 141ms in dev.log)

## No Issues Encountered
All changes applied cleanly. The existing codebase's neumorphic design patterns (neu-card, neu-card-inset, neu-input, neu-well, neu-circle, neu-divider, NeuField component) made it straightforward to extend the wizard with consistent styling.
