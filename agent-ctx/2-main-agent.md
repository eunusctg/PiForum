---
Task ID: 2
Agent: Main Agent
Task: Add Cloudflare Email Sending as a provider to the email system and update the admin UI

Work Log:
- Updated /src/lib/email.ts:
  - Added sendViaCloudflare() function using Cloudflare MailChannels API (https://api.mailchannels.net/tx/v1/send)
  - Routes "cloudflare" provider to sendViaCloudflare
  - Skips API key check when provider is "cloudflare" (MailChannels authenticates via domain ownership)
  - Updated header comment to list Cloudflare as the first recommended option
  - Added "cloudflare" to provider routing logic (before resend/sendgrid/mailgun checks)

- Updated /src/components/forum/admin/AdminEmail.tsx:
  - Replaced "SMTP Host" text input with Provider dropdown (Select component) with options: cloudflare, resend, sendgrid, mailgun
  - When "cloudflare" selected: shows green info box about free MailChannels, hides Password/Username/Port/Security fields, shows From Email and From Name
  - When "resend"/"sendgrid" selected: shows API key field, shows From Email and From Name
  - When "mailgun" selected: shows API key field, Domain field (mapped to smtp_username), shows From Email and From Name
  - Removed FlawsCallout that said "no emails are actually sent"
  - Added "Test Email" card with email input and Send Test button (calls /api/email/test)
  - Updated page title from "Email / SMTP" to "Email Settings"
  - Kept all shared admin components (useAdminSettings, AdminGate, etc.)

- Created /src/app/api/email/test/route.ts:
  - POST handler requiring admin auth
  - Reads current email settings from DB via sendEmail()
  - Sends simple test email to the specified `to` address
  - Returns { success: true/false, error?: string }

- Updated /src/lib/otp.ts:
  - Wired up sendEmailOtp to actually call sendEmail() from src/lib/email.ts
  - Updated EmailOtpConfig provider type to include 'cloudflare' | 'resend' | 'mailgun'
  - Sends styled HTML verification code email with 6-digit code
  - Returns proper OtpDeliveryResult based on sendEmail response

- Ran bun run lint: 0 errors, 11 warnings (all pre-existing)
- Dev server running fine on port 3000

Stage Summary:
- Cloudflare MailChannels provider fully integrated as email provider ✅
- Admin UI updated with provider dropdown, conditional fields, and test email ✅
- Test email API endpoint created ✅
- sendEmailOtp wired to real sendEmail() function ✅
- Lint passes with no new errors ✅
