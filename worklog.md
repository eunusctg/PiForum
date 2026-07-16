---
Task ID: 1
Agent: Main Agent
Task: Fix previously mentioned functions, add share buttons, add post actions (edit, delete, archive, report)

Work Log:
- Investigated live page state with Agent Browser - confirmed social icons, BackToTop, and NewThreadFAB are all working
- Added `archived` field to Thread model in Prisma schema, pushed to DB
- Added `archived: boolean` to Thread type in types.ts
- Updated thread PUT API to support `archived` field
- Created ReportModal component (src/components/forum/ReportModal.tsx)
  - Dialog with 5 reason options (Spam, Harassment, Off-topic, Inappropriate, Other)
  - Optional details textarea with 500 char limit
  - Auth guard - shows login prompt if not logged in
  - POSTs to /api/reports with proper body
- Created ShareButtons component (src/components/forum/ShareButtons.tsx)
  - Expandable share menu with Facebook, Twitter, LinkedIn, WhatsApp, Copy Link
  - Smooth slide animation, click-outside-to-close
  - aria-hidden when collapsed for accessibility
- Updated ThreadView PostCard with comprehensive action bar:
  - Vote (up/down) + Reply + Share + Report + Best Answer + Edit + Delete
  - All in a clearly visible inset card at the bottom of each post
- Added thread header actions: Bookmark, Share, Report (visible to all users)
- Added admin/mod actions: Pin, Lock, Archive (visible to admins/mods)
- Added Bookmark POST API to /api/bookmarks/[threadId] (toggle behavior)
- Fixed replies count bug (Math.max(0, ...) to prevent -1)
- Verified all features with Agent Browser - everything working

Stage Summary:
- All previously mentioned functions confirmed working (social icons, FABs, BackToTop)
- Share buttons: Facebook, Twitter, LinkedIn, WhatsApp, Copy Link on every post and thread
- Report: Full modal with reason selection and details textarea
- Post actions: Edit, Delete, Reply, Vote, Share, Report - all visible in action bar
- Thread actions: Bookmark, Share, Report (all users) + Pin, Lock, Archive (admin/mod)
- Bookmarks API: Added POST handler with toggle behavior
- Archived threads: Full support with badge, API, and admin toggle
