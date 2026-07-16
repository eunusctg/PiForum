---
Task ID: 1
Agent: Main Agent
Task: Fix social links in footer, make New Thread button floating FAB, fix BackToTop button, add progress animation only in post view

Work Log:
- Read and analyzed SiteFooter.tsx, BackToTopButton.tsx, ForumShell.tsx, ThreadList.tsx, ForumHome.tsx
- Found social icons issue: using `color + '20'` produced 8-digit hex `#1877F220` which could have rendering issues and was too faint (13% alpha)
- Created `hexToRgba()` helper function for reliable color conversion
- Rewrote social icons rendering: unconfigured icons now use `rgba()` with 15% alpha background + dashed border + explicit icon color via inline style
- Configured icons use solid brand color background with white icons + explicit `style={{ color: '#ffffff' }}`
- Created NewThreadFAB component (floating, responsive, animated) - only shows for logged-in users on home/forum views
- Updated BackToTopButton with `showProgress` prop - progress ring only shows when `showProgress={true}`
- Updated ForumShell to pass `showProgress={currentView === 'thread'}` to BackToTopButton
- Removed old inline "New Thread" button from ForumHome toolbar and mobile-only floating button
- Removed inline "New Thread" button from ThreadList forum header
- Cleaned up unused imports (Plus from ForumHome, Loader2 from ThreadList)
- Verified all features with Agent Browser and VLM:
  - Social icons: All 8 visible with brand colors in footer
  - BackToTop: Floating, fixed position, progress ring works on thread view
  - NewThreadFAB: Correctly hidden when not logged in (expected behavior)
  - No dev server errors

Stage Summary:
- Social links fix: Replaced fragile hex8 colors with rgba(), added dashed borders for unconfigured icons, explicit inline styles on Icon components
- NewThreadFAB: Created as global floating FAB in ForumShell (z-[99], bottom-24/28/32)
- BackToTop: Made accept showProgress prop, progress ring only in thread view
- ForumShell: Wires showProgress and NewThreadFAB together
- All features verified working via Agent Browser
