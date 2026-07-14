import { db } from '@/lib/db';

/**
 * Email sending utility for PiForum.
 *
 * Since this project runs on Cloudflare Workers which doesn't support
 * Node.js `net` module (needed by nodemailer), we use HTTP-based email
 * APIs instead.
 *
 * Supported providers (configured via admin settings):
 * 1. Cloudflare MailChannels — recommended, free for Cloudflare Workers domains
 * 2. Resend API (https://resend.com) — free tier available
 * 3. SendGrid API — popular transactional email service
 * 4. Mailgun API — another popular option
 *
 * The `smtp_*` settings in the database determine the provider and credentials.
 * When SMTP is not enabled or not configured, emails are not sent (silent fallback).
 */

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using the configured provider.
 * Returns true if the email was sent (or would have been sent), false on error.
 *
 * On Cloudflare Workers we can't use nodemailer, so we use HTTP-based APIs.
 * The `smtp_host` setting is repurposed to indicate the provider:
 *   - "cloudflare" → Use Cloudflare MailChannels API (free, no API key needed)
 *   - "resend" → Use Resend API
 *   - "sendgrid" → Use SendGrid API
 *   - "mailgun" → Use Mailgun API
 *
 * When smtp_enabled is false, this function is a no-op that returns true.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  // Check if SMTP is enabled
  const enabledSetting = await db.setting.findUnique({ where: { key: 'smtp_enabled' } });
  if (!enabledSetting || enabledSetting.value !== 'true') {
    // SMTP not enabled — silent skip
    return { sent: false, error: 'SMTP not enabled' };
  }

  const hostSetting = await db.setting.findUnique({ where: { key: 'smtp_host' } });
  const passwordSetting = await db.setting.findUnique({ where: { key: 'smtp_password' } });
  const fromEmailSetting = await db.setting.findUnique({ where: { key: 'smtp_from_email' } });
  const fromNameSetting = await db.setting.findUnique({ where: { key: 'smtp_from_name' } });

  const host = hostSetting?.value || '';
  const apiKey = passwordSetting?.value || '';
  const fromEmail = fromEmailSetting?.value || 'noreply@piforum.org';
  const fromName = fromNameSetting?.value || 'PiForum';

  // Cloudflare MailChannels doesn't need an API key — it authenticates via domain ownership
  if (host.toLowerCase().trim() !== 'cloudflare' && !apiKey) {
    return { sent: false, error: 'No API key configured' };
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];

  // Route to the appropriate provider
  const provider = host.toLowerCase().trim();

  if (provider === 'cloudflare') {
    return sendViaCloudflare({ ...payload, to, from });
  }

  if (provider === 'resend' || provider.includes('resend')) {
    return sendViaResend(apiKey, { ...payload, to, from });
  }

  if (provider === 'sendgrid' || provider.includes('sendgrid')) {
    return sendViaSendGrid(apiKey, { ...payload, to, from });
  }

  if (provider === 'mailgun' || provider.includes('mailgun')) {
    const usernameSetting = await db.setting.findUnique({ where: { key: 'smtp_username' } });
    const domain = usernameSetting?.value || '';
    return sendViaMailgun(apiKey, domain, { ...payload, to, from });
  }

  // Default: try Resend API (most common for modern setups)
  return sendViaResend(apiKey, { ...payload, to, from });
}

/* ---------- Cloudflare MailChannels API ---------- */
async function sendViaCloudflare(
  payload: { to: string[]; from: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string }> {
  try {
    // Extract the email address from "Name <email>" format
    const fromEmail = payload.from.includes('<')
      ? payload.from.match(/<(.+)>/)?.[1] || payload.from
      : payload.from;
    const fromName = payload.from.includes('<')
      ? payload.from.replace(/\s*<.+>/, '').trim()
      : undefined;

    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: payload.to.map((email) => ({ to: [{ email }] })),
        from: {
          email: fromEmail,
          ...(fromName && { name: fromName }),
        },
        subject: payload.subject,
        content: [
          { type: 'text/html', value: payload.html },
          ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return { sent: true };
    }

    const errText = await response.text();
    return { sent: false, error: `Cloudflare MailChannels error: ${errText.substring(0, 200)}` };
  } catch (err: any) {
    return { sent: false, error: `Cloudflare MailChannels fetch error: ${err.message?.substring(0, 200) || 'Unknown'}` };
  }
}

/* ---------- Resend API ---------- */
async function sendViaResend(
  apiKey: string,
  payload: { to: string[]; from: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.text && { text: payload.text }),
      }),
    });

    if (response.ok) {
      return { sent: true };
    }

    const errText = await response.text();
    return { sent: false, error: `Resend API error: ${errText.substring(0, 200)}` };
  } catch (err: any) {
    return { sent: false, error: `Resend fetch error: ${err.message?.substring(0, 200) || 'Unknown'}` };
  }
}

/* ---------- SendGrid API ---------- */
async function sendViaSendGrid(
  apiKey: string,
  payload: { to: string[]; from: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: payload.to.map((email) => ({ to: [{ email }] })),
        from: { email: payload.from.includes('<')
          ? payload.from.match(/<(.+)>/)?.[1] || payload.from
          : payload.from },
        subject: payload.subject,
        content: [
          { type: 'text/html', value: payload.html },
          ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return { sent: true };
    }

    const errText = await response.text();
    return { sent: false, error: `SendGrid API error: ${errText.substring(0, 200)}` };
  } catch (err: any) {
    return { sent: false, error: `SendGrid fetch error: ${err.message?.substring(0, 200) || 'Unknown'}` };
  }
}

/* ---------- Mailgun API ---------- */
async function sendViaMailgun(
  apiKey: string,
  domain: string,
  payload: { to: string[]; from: string; subject: string; html: string; text?: string },
): Promise<{ sent: boolean; error?: string }> {
  if (!domain) {
    return { sent: false, error: 'Mailgun domain not configured (set smtp_username to your domain)' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('from', payload.from);
    payload.to.forEach((email) => formData.append('to', email));
    formData.append('subject', payload.subject);
    formData.append('html', payload.html);
    if (payload.text) formData.append('text', payload.text);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      return { sent: true };
    }

    const errText = await response.text();
    return { sent: false, error: `Mailgun API error: ${errText.substring(0, 200)}` };
  } catch (err: any) {
    return { sent: false, error: `Mailgun fetch error: ${err.message?.substring(0, 200) || 'Unknown'}` };
  }
}

/**
 * Generate a verification email HTML body.
 */
export function generateVerificationEmailHtml(
  forumName: string,
  verifyLink: string,
  username: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - ${forumName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr>
      <td style="padding:40px 32px;text-align:center;background:linear-gradient(135deg,#e8e8e8 0%,#d0d0d0 100%);">
        <h1 style="margin:0;font-size:28px;color:#333;">${forumName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 32px;">
        <h2 style="margin:0 0 16px;font-size:22px;color:#333;">Verify Your Email Address</h2>
        <p style="margin:0 0 16px;font-size:16px;color:#666;line-height:1.5;">
          Hello <strong>${username}</strong>,
        </p>
        <p style="margin:0 0 24px;font-size:16px;color:#666;line-height:1.5;">
          Thank you for joining ${forumName}! Please click the button below to verify your email address and activate your account.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:8px 0;">
              <a href="${verifyLink}" style="display:inline-block;padding:14px 32px;background:#e8e8e8;color:#333;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;border:2px solid #ccc;">
                Verify Email Address
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#999;line-height:1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyLink}" style="color:#666;word-break:break-all;">${verifyLink}</a>
        </p>
        <p style="margin:16px 0 0;font-size:14px;color:#999;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;text-align:center;background:#f9f9f9;border-top:1px solid #eee;">
        <p style="margin:0;font-size:12px;color:#999;">
          &copy; ${new Date().getFullYear()} ${forumName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate a plain text version of the verification email.
 */
export function generateVerificationEmailText(
  forumName: string,
  verifyLink: string,
  username: string,
): string {
  return `Verify Your Email - ${forumName}

Hello ${username},

Thank you for joining ${forumName}! Please verify your email address by clicking the link below:

${verifyLink}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} ${forumName}`;
}
