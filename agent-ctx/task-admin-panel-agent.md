# Task: Admin Panel Components for PiForum

## Summary
Created 5 fully functional 'use client' admin panel components for PiForum using Next.js 16, TypeScript, Tailwind CSS 4 with Neumorphism, shadcn/ui, Zustand store, and recharts.

## Files Created

### 1. `/src/components/forum/AdminDashboard.tsx`
- Analytics overview page with stats cards, charts, recent activity
- Fetches stats from GET /api/stats
- 4 stat cards: Total Users, Active Threads, Total Posts, Storage Used
- 2 recharts: BarChart (activity) and LineChart (user growth) with demo data
- Recent Users and Recent Threads lists with avatars
- Quick navigation buttons to other admin pages
- Admin guard, loading skeletons, error handling, responsive layout

### 2. `/src/components/forum/AdminUsers.tsx`
- User management matrix with search and role filtering
- Fetches users from GET /api/users with x-user-id header
- Search bar (neu-input) + role filter (Select)
- User table with avatar, username, email, role badge, status, joined date, actions
- Edit Role Dialog (Select for role: User/Moderator/Admin/Super Admin)
- Ban Dialog with reason textarea
- Unban direct action
- Pagination with page controls
- PUT /api/users/{id} for updates

### 3. `/src/components/forum/AdminCategories.tsx`
- Category and forum management with CRUD operations
- Fetches categories with forums from GET /api/categories
- Category list with header (name, description, sortOrder, accessLevel badge)
- Add/Edit Category Dialog (name, description, icon, sort order, access level)
- Add/Edit Forum Dialog (name, description, icon, sort order)
- Delete Confirmation Dialog (AlertDialog)
- POST/PUT /api/categories, POST/PUT /api/forums, DELETE endpoints
- Access level badges: Public, Registered, Admin

### 4. `/src/components/forum/AdminSettings.tsx`
- Global settings panel with form sections
- Fetches settings from GET /api/settings
- General Settings: Forum Name, Meta Description, Logo URL (with upload), Favicon URL (with upload)
- Registration & Access: Open Registration (Switch), Maintenance Mode (Switch)
- Upload Settings: Max Upload Size, Allowed File Types
- File upload via POST /api/upload with FormData
- Save All button: PUT /api/settings with array of key/value pairs
- Updates Zustand store settings on save

### 5. `/src/components/forum/AdminSecurity.tsx`
- Security logs and cache management
- Fetches logs from GET /api/security with pagination
- Cloudflare Cache section with "Purge All Cache" button (POST /api/security/clear-cache)
- Security Logs table: Date, Event Type (with colored badges), User, IP Address, Details
- Filter by event type (Select dropdown)
- Pagination for logs
- Quick Actions: Clear Old Logs, Export Logs as JSON (download)

## Common Features Across All Components
- `'use client'` directive
- Admin guard (role >= 2 check via isAdmin())
- Loading skeleton states
- Error handling with inline messages and retry
- Responsive layout (stack on mobile, grid on desktop)
- Back/Dashboard navigation button
- x-user-id header for all admin API calls
- Neumorphism CSS classes: neu-card, neu-card-inset, neu-btn, neu-input, neu-circle, neu-divider, neu-well
- shadcn/ui components: Dialog, Select, Input, Switch, Badge, Button, Label, Textarea, AlertDialog, Skeleton, Avatar
- Toast notifications via useToast hook
- date-fns for date formatting

## Lint Status
✅ All 5 files pass ESLint with no errors or warnings.
