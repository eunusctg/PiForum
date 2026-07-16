---
Task ID: 1
Agent: main
Task: Hide quick links from footer in mobile version + Make FAB, back-to-top, and social links follow site theme

Work Log:
- Explored codebase: SiteFooter.tsx, NewThreadFAB.tsx, BackToTopButton.tsx, globals.css, store.ts, ThemeManager.tsx
- Added `hidden sm:block` to Quick Links section in SiteFooter.tsx to hide on mobile
- Removed unused `hexToRgba` helper function from SiteFooter.tsx
- Replaced hardcoded brand-color social icon backgrounds with neumorphic `.footer-social-icon` class + `.neu-circle`
- Updated NewThreadFAB.tsx to use `.theme-fab` CSS class instead of inline Tailwind gradient classes
- Updated BackToTopButton.tsx to use `.theme-back-top` CSS class instead of inline Tailwind color classes
- Added ~275 lines of theme-aware CSS to globals.css covering:
  - `.theme-fab` with day/night/golden variants + pulse animation overrides
  - `.theme-back-top` with day/night/golden variants including hover states
  - `.footer-social-icon` with day/night/golden variants including muted (unlinked) states
  - Progress ring theme variants for BackToTop
  - Mobile responsive adjustments
- Added `allowedDevOrigins: ["127.0.0.1", "localhost"]` to next.config.ts
- Verified via agent-browser on mobile viewport (375px): Quick Links section confirmed hidden

Stage Summary:
- Quick Links hidden on mobile ✅
- Social icons now use neumorphic theme-aware circles instead of solid brand-color backgrounds ✅
- FAB (+) button adapts to day/night/golden theme with appropriate shadows, borders, and gradients ✅
- Back-to-top button adapts to day/night/golden theme ✅
- All theme pulse animations use theme-appropriate colors ✅
