# Task: Build ThreadView and NewThread Components for PiForum

## Summary

Created two fully functional 'use client' components for the PiForum application:

### 1. ThreadView.tsx (`/src/components/forum/ThreadView.tsx`)

**Features implemented:**
- **Data Loading**: Fetches thread via `/api/threads/${threadId}` and posts via `/api/posts?threadId=${threadId}&userId=${userId}` on mount
- **Breadcrumb**: Home > Category > Forum > Thread title navigation
- **Thread Header**: neu-card with title, author info (avatar in neu-circle, name, role badge, date), view/reply counts, pinned/locked badges, and admin/mod pin/unpin and lock/unlock buttons
- **Original Post**: Thread content rendered as the first "post" with author sidebar, markdown rendering, and neumorphic styling
- **Replies**: Each subsequent post with reply number, vote buttons, author sidebar, markdown rendering, attachments
- **Post Content Rendering**: Simple markdown-like renderer supporting **bold**, *italic*, ```code blocks```, `inline code`, > blockquotes (with neu-card-inset), [links](url), and line breaks
- **Vote Logic**: Upvote/downvote arrows with current score, optimistic updates, POST to /api/posts/{id}/vote, visual highlighting of user's vote
- **Edit/Delete**: Post authors and admins see Edit/Delete buttons; inline editing with textarea
- **Reply Form**: textarea with neu-input style, file upload button, submit with loading state
- **Pagination**: Prev/next page controls for posts
- **Loading Skeleton**: Full skeleton UI while data loads
- **Error States**: Thread not found, locked thread notice, login prompt

### 2. NewThread.tsx (`/src/components/forum/NewThread.tsx`)

**Features implemented:**
- **Props**: forumId from viewParams
- **Form Fields**: Title input (neu-input, max 200 chars with counter), content textarea (neu-input, larger), file attachment upload
- **Submit Logic**: POST to /api/threads with { forumId, title, content, authorId }, navigates to thread view on success
- **Breadcrumb**: Home > Forum > New Thread
- **Layout**: neu-card container, neu-btn for Submit/Cancel
- **Character Counter**: Live counter for title with color-coded warnings
- **Loading State**: Spinner and "Creating..." text during submission
- **Error Handling**: Displays error messages in neu-card-inset styled alerts
- **Authentication Guard**: Shows login prompt if user is not authenticated
- **File Upload**: Multiple file upload with individual removal

### 3. API Enhancement

Updated `/src/app/api/posts/route.ts` GET endpoint to support a `userId` query parameter that returns `userVote` for each post, enabling the frontend to show the user's current vote state.

## Files Created/Modified
- **Created**: `/src/components/forum/ThreadView.tsx`
- **Created**: `/src/components/forum/NewThread.tsx`
- **Modified**: `/src/app/api/posts/route.ts` (added userId parameter and userVote support)

## Lint Status
✅ All lint checks passed with no errors.
