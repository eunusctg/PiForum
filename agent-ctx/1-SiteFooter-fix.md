# Task 1: SiteFooter Social Icon Visibility Fix

## Summary
Fixed the social media icons in the SiteFooter component that were barely visible due to very low alpha (0.15) background colors on a neumorphic background.

## Changes Made to `/home/z/my-project/src/components/forum/SiteFooter.tsx`

### 1. Icons WITH links (already visible - kept, with minor improvements)
- Added `rel="me"` attribute for Mastodon/IndieAuth verification (was `rel="noopener noreferrer"`, now `rel="me noopener noreferrer"`)
- Increased icon size from `w-5 h-5` to `w-6 h-6`

### 2. Icons WITHOUT links (main fix)
- **Background alpha**: Changed from `0.15` (nearly invisible) to `0.3` (clearly visible)
- **Border style**: Changed from `dashed` to `solid` 
- **Border alpha**: Changed from `0.4` to `0.5` for better visibility
- **Icon size**: Changed from `w-5 h-5` to `w-6 h-6`
- **Hover effect**: Added `onMouseEnter`/`onMouseLeave` handlers that increase background alpha to `0.45` and border alpha to `0.7` on hover, reverting to `0.3`/`0.5` on leave
- Added CSS custom properties (`--icon-bg-hover`, `--icon-border-hover`) for hover state values
- Added `group` class to the span for potential Tailwind group-hover usage

### Preserved
- `hexToRgba` helper function - unchanged
- All 8 platform definitions - unchanged
- Layout structure (brand section, quick links, newsletter) - unchanged
- All other component logic - unchanged
