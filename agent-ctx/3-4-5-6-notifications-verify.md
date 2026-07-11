---
Task ID: 3-4-5-6
Agent: notifications-verify
Task: FCM push + email notifications + login notifications + email verification

Work Log:
- Installed Firebase SDK (firebase@12.16.0)
- Created Firebase client module at src/lib/firebase-client.ts with lazy messaging init
- Created FCM token management API at src/app/api/push/token/route.ts (POST/DELETE/GET)
- Created push notification sending API at src/app/api/push/send/route.ts with FCM HTTP v1 API + Web Crypto RS256 signing
- Updated PwaRegistration.tsx with FCM integration: push permission prompt, token registration, foreground message handler
- Created notification triggers utility at src/lib/notifications.ts with createNotification, createLoginNotification, createWelcomeNotification
- Enhanced notifications API at src/app/api/notifications/route.ts with pagination (page/limit), count-only endpoint, and existing actor/pagination support
- Enhanced NotificationsView.tsx with: type-specific icons (reply/mention/like/vote/bookmark/login/system/welcome/report/follow), date grouping (Today/Yesterday/This Week/Earlier), individual mark-as-read, notification sound via Web Audio API, auto-refresh every 30s, pagination controls
- Added login notification to auth/login route with new device detection (IP + user-agent tracking via UserSetting)
- Added notification badge count using efficient /api/notifications?count=true endpoint in Header
- Created email sending utility at src/lib/email.ts supporting Resend/SendGrid/Mailgun HTTP APIs (Cloudflare Workers compatible)
- Created email verification templates (HTML + text) for verification emails
- Enhanced verify-email API with: GET endpoint for direct link click, resend rate limiting (20 min cooldown), proper email sending via SMTP when configured, redirect on successful verification
- Enhanced registration flow with welcome notification creation and proper email sending
- Enhanced AuthModal with "Resend Verification Email" button and improved verification step UI
- Added verification banner in Header for unverified users when require_email_verification is enabled
- Created verification guard at src/lib/verification-guard.ts to block posting/thread creation for unverified users
- Integrated verification guard into threads and posts API routes
- Added notification triggers to post creation (reply to thread author, @mention detection)
- Added notification trigger to vote (like notification for post author on upvote)
- Updated Header to use efficient notification count endpoint instead of fetching all notifications

Stage Summary:
- Complete FCM web push notification infrastructure (client SDK + token management + sending API)
- Enhanced in-app notification system with type icons, date grouping, individual mark-as-read, notification sound, pagination
- Real-time login notifications with new device detection (IP + user-agent comparison)
- Complete email verification system with resend capability, verification banner, and action blocking
- Email sending utility supporting multiple providers (Resend, SendGrid, Mailgun) via HTTP API
- Notification triggers for replies, mentions, and likes integrated into post and vote APIs
- Zero ESLint errors (only 11 pre-existing warnings)
