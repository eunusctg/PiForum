# Task ROUTES-1 — Routes Builder

## Task
Create Next.js App Router pages for all PiForum routes so visiting `/admin` (and every other view) returns a real page instead of 404, while preserving the existing Zustand SPA architecture.

## Context Reviewed
- `/home/z/my-project/worklog.md` — previous agents built the SPA, all view components, API routes
- `/home/z/my-project/src/app/page.tsx` — SPA home with `navigateTo('home')` init that would override any view we set
- `/home/z/my-project/src/lib/store.ts` — Zustand store with `navigateTo(view, params)`, `viewParams`, `currentUser`
- `/home/z/my-project/src/lib/types.ts` — `AppView` union type (17 views)
- `/home/z/my-project/src/components/forum/Header.tsx` — used `navigateTo()` for all clicks
- `/home/z/my-project/src/app/layout.tsx` — root layout (left untouched)

## Prop Reading Verification
- `ProfileView` → reads `viewParams.userId` (falls back to `currentUser.id`)
- `SearchView` → reads `viewParams.q`
- `ThreadList` → takes `forumId` prop directly
- `ThreadView` → takes `threadId` prop directly
- `NewThread` → takes `forumId` prop directly
- All other views (MembersView, BookmarksView, NotificationsView, TagsView, AdminDashboard, AdminUsers, AdminCategories, AdminSettings, AdminSecurity, AdminReports) → take no props

## Files Created (16)
1. `src/components/forum/ForumShell.tsx` — shared client shell with init logic + SPA view switch
2. `src/app/admin/page.tsx` → `<ForumShell initialView="admin-dashboard" />`
3. `src/app/admin/users/page.tsx` → `<ForumShell initialView="admin-users" />`
4. `src/app/admin/categories/page.tsx` → `<ForumShell initialView="admin-categories" />`
5. `src/app/admin/settings/page.tsx` → `<ForumShell initialView="admin-settings" />`
6. `src/app/admin/security/page.tsx` → `<ForumShell initialView="admin-security" />`
7. `src/app/admin/reports/page.tsx` → `<ForumShell initialView="admin-reports" />`
8. `src/app/forum/[id]/page.tsx` → unwraps `params.id` with `use()`, passes `{ forumId: id }`
9. `src/app/thread/[id]/page.tsx` → unwraps `params.id`, passes `{ threadId: id }`
10. `src/app/profile/[id]/page.tsx` → unwraps `params.id`, passes `{ userId: id }`
11. `src/app/new-thread/page.tsx` → unwraps `searchParams.forumId`, passes `{ forumId }`
12. `src/app/search/page.tsx` → unwraps `searchParams.q`, passes `{ q }`
13. `src/app/members/page.tsx` → `<ForumShell initialView="members" />`
14. `src/app/tags/page.tsx` → `<ForumShell initialView="tags" />`
15. `src/app/bookmarks/page.tsx` → `<ForumShell initialView="bookmarks" />`
16. `src/app/notifications/page.tsx` → `<ForumShell initialView="notifications" />`

## Files Modified (1)
- `src/components/forum/Header.tsx`:
  - Added `useRouter` from `next/navigation`
  - Added `viewToUrl(view, params, currentUser)` helper that maps every `AppView` to a real URL (or `null` for install/login/register which have no dedicated route)
  - `handleNavigate` now calls `router.push(url)` when a URL exists; falls back to `navigateTo(view, params)` for views without a route
  - `handleLogout` now calls `router.push('/')` instead of `navigateTo('home')`

## Key Decisions
1. **Created a shared `ForumShell`** instead of importing the root `Home` from `src/app/page.tsx`. This avoids the root page's `navigateTo('home')` init override (which would clobber any view we set on a non-root route) and keeps the new routes self-contained.

2. **ForumShell renders based on the store's `currentView`** (same SPA switch as the root page) — so existing in-app `navigateTo()` calls in deep components continue to switch views without modification. The trade-off: clicking a forum card from `/members` would switch the view but not update the URL. This is acceptable for now since the user's primary complaint (404 on direct URL visits) is fixed.

3. **Skipped the loading screen when `isInstalled` is already true in the store**, so client-side navigation between routes doesn't flash a loader. The first visit (or hard refresh) still shows the loader.

4. **Used React 19's `use()` hook** to unwrap Next.js 16's Promise-based `params` and `searchParams` in dynamic route pages.

5. **Did NOT touch `src/app/page.tsx`, `src/app/layout.tsx`, or any existing view component** (per task constraints). The original `/` route continues to work unchanged as the SPA entry point.

## Verification
- `bun run lint` → 0 errors, 0 warnings
- curl-tested all 15 new routes against http://localhost:3000 — all return HTTP 200 (no 404)
- Dev log shows `/admin` correctly triggers `/api/install/check` + `/api/settings` + `/api/categories` + `/api/stats`, confirming ForumShell's init logic runs end-to-end on direct URL visits
- No errors in the dev log related to the new routes
