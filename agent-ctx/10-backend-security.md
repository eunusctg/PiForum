---
Task ID: 10
Agent: backend-security
Task: Secure backend - audit & harden API routes

Work Log:
- Created /src/lib/rate-limit.ts with in-memory rate limiter (Map with TTL cleanup every 60s)
- Added rate limiting to login: 5 attempts per IP per 15 minutes
- Added rate limiting to register: 3 per IP per hour
- Added rate limiting to thread creation: 10 per user per hour
- Added rate limiting to post creation: 30 per user per hour
- Added rate limiting to report creation: 10 per user per hour
- Added input length validation to login (email max 254, password max 128)
- Added input length validation to register (username, email, password max lengths + type checks)
- Added content max length (50000) + empty string validation to thread creation (POST /api/threads)
- Added title/content max length + empty string validation to thread editing (PUT /api/threads/[id])
- Added content max length (50000) + empty string validation to post creation (POST /api/posts)
- Added content max length + empty string validation to post editing (PUT /api/posts/[id])
- Added profile input length validation (displayName 50, bio 500, signature 200, location 100)
- Added requireAuth to GET /api/members (members page now login-required)
- Added firebaseUid stripping from public member/search responses
- Added report details max length (2000) validation
- Added notification title/body/link length validation
- Added category name length validation (max 50, non-empty)
- Added forum name length validation (max 50, non-empty)
- Added tag name length validation (max 30)
- Added search query max length (200)
- Added protected settings blocking in PUT /api/settings (password_, oauth_state_, client secrets)
- Added requireAuth to POST /api/security (was previously unauthenticated)
- Removed email + banned fields from /api/stats public response
- Verified Google OAuth callback uses HttpOnly, Secure, SameSite=Lax cookies
- Verified serializeUser strips password hashes (passwords stored separately in Setting table)
- Verified email is only returned for own user or admin in all relevant routes
- Verified all mutation endpoints have proper auth checks
- Verified authorization checks: users can only edit/delete own content unless admin
- Verified no raw SQL queries (all use Prisma ORM — SQL injection protected)
- Verified no overly permissive CORS headers in responses
- All API route files pass lint (0 new errors introduced)

Stage Summary:
- Created in-memory rate limiter utility at /src/lib/rate-limit.ts
- Applied rate limiting to 5 sensitive endpoints (login, register, threads, posts, reports)
- Added input validation (length limits, type checks, empty string guards) to 12 API routes
- Made members page require authentication (requireAuth on GET /api/members)
- Protected settings API from writing password/secrets (PUT /api/settings blocked for protected keys)
- Fixed security log POST endpoint to require authentication
- Removed sensitive data (email, banned, firebaseUid) from public-facing API responses (stats, members, search)
- Verified cookie security attributes on Google OAuth callback
- Zero new lint errors in API routes
