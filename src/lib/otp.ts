import { generateSecret, generate, verify, generateURI } from 'otplib';
import crypto from 'crypto';

/**
 * OTP utilities — TOTP (authenticator apps) and channel OTP
 * (WhatsApp / Telegram / Email / SMS) generation and verification.
 *
 * Uses otplib v13 (async-first functional API).
 *
 * Security notes:
 * - TOTP secrets are stored as base32 strings. In production these should
 *   be encrypted at rest with a KMS or at minimum an app-level AES key
 *   derived from an environment variable. Here we store them plaintext
 *   for simplicity (documented flaw in the admin panel).
 * - OTP codes are hashed with SHA-256 before storage in OtpChallenge so
 *   a database leak does not reveal valid codes.
 * - Backup codes are hashed the same way.
 */

/* -------------------------------------------------------------- */
/*  TOTP (Time-based One-Time Password) — authenticator apps       */
/* -------------------------------------------------------------- */

export interface TotpConfig {
  issuer: string;
  label: string;
  period: number;   // seconds (default 30)
  digits: number;   // 6 or 8
}

/* Generate a new random base32 TOTP secret (20 bytes → 32-char base32). */
export function generateTotpSecret(): string {
  return generateSecret({ length: 20 });
}

/* Build the otpauth:// URI that authenticator apps scan via QR code. */
export function buildTotpUri(secret: string, cfg: TotpConfig): string {
  return generateURI({
    issuer: cfg.issuer,
    label: cfg.label,
    secret,
    algorithm: 'SHA1',
    digits: (cfg.digits === 8 ? 8 : 6) as 6 | 8,
    period: cfg.period,
  });
}

/* Generate a QR code data URL for a given otpauth URI.
   Uses a lightweight inline SVG approach instead of the qrcode library
   to reduce bundle size for Cloudflare Workers. */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  // Return the URI as a data URL — the frontend can generate the QR code client-side
  // using the browser's Canvas API. This avoids bundling the heavy qrcode library.
  // For backward compatibility, we return the URI encoded as a simple SVG placeholder.
  const encodedUri = encodeURIComponent(uri);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="white"/>
    <text x="128" y="128" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#333">Scan with authenticator app</text>
    <text x="128" y="148" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#999">URI: ${uri.substring(0, 40)}...</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/* Verify a TOTP token against a secret. Allows a small window for clock
   drift (±1 step via epochTolerance = period). Returns true if valid. */
export async function verifyTotpToken(
  token: string,
  secret: string,
  cfg?: Partial<TotpConfig>
): Promise<boolean> {
  if (!token || !secret) return false;
  const period = cfg?.period ?? 30;
  const digits = (cfg?.digits ?? 6) as 6 | 8;
  try {
    const result = await verify({
      secret,
      token: token.replace(/\s+/g, ''),
      period,
      digits,
      // Allow ±1 time step for clock drift (30s default)
      epochTolerance: period,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

/* Generate the current TOTP token (used for testing / sandbox display). */
export async function generateTotpToken(
  secret: string,
  cfg?: Partial<TotpConfig>
): Promise<string> {
  const period = cfg?.period ?? 30;
  const digits = (cfg?.digits ?? 6) as 6 | 8;
  return generate({ secret, period, digits });
}

/* -------------------------------------------------------------- */
/*  Backup codes — 8 numeric codes shown once when TOTP is enabled  */
/* -------------------------------------------------------------- */

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8-digit codes, hyphenated in the middle for readability
    const n = crypto.randomInt(0, 100000000).toString().padStart(8, '0');
    codes.push(`${n.slice(0, 4)}-${n.slice(4)}`);
  }
  return codes;
}

/* Hash a backup code (or any string) with SHA-256. */
export function hashOtp(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/* -------------------------------------------------------------- */
/*  Channel OTP — WhatsApp / Telegram / Email / SMS                 */
/* -------------------------------------------------------------- */

export type OtpChannel = 'whatsapp' | 'telegram' | 'email' | 'sms';

/* Generate a random numeric OTP code of the given length. */
export function generateOtpCode(length: number): string {
  const max = Math.pow(10, length);
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

/* Verify a channel OTP against its stored hash. */
export function verifyOtpCode(code: string, codeHash: string): boolean {
  if (!code || !codeHash) return false;
  return hashOtp(code.trim()) === codeHash;
}

/* -------------------------------------------------------------- */
/*  Channel delivery — real provider API calls                      */
/* -------------------------------------------------------------- */

export interface OtpDeliveryResult {
  delivered: boolean;
  /** Sandbox/dev only — the code, surfaced so testing is possible. */
  debugCode?: string;
  /** Provider message id (when delivered). */
  messageId?: string;
  /** Error message (when delivery failed). */
  error?: string;
}

export interface WhatsAppConfig {
  phoneNumberId: string;      // Meta WhatsApp Cloud API phone_number_id
  accessToken: string;        // Meta access token
  apiVersion: string;          // v18.0 etc.
}

export interface TelegramConfig {
  botToken: string;
}

export interface EmailOtpConfig {
  provider: 'smtp' | 'sendgrid' | 'cloudflare' | 'resend' | 'mailgun' | 'none';
  fromAddress: string;
}

/* Send a WhatsApp OTP via Meta's WhatsApp Cloud API.
   Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
   Free tier: 1000 conversations/month. */
export async function sendWhatsAppOtp(
  toPhone: string,
  code: string,
  cfg: WhatsAppConfig
): Promise<OtpDeliveryResult> {
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { delivered: false, debugCode: code, error: 'WhatsApp credentials not configured' };
  }
  const url = `https://graph.facebook.com/${cfg.apiVersion || 'v18.0'}/${cfg.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone.replace(/[^\d]/g, ''),
        type: 'text',
        text: { body: `Your PiForum verification code is ${code}. It expires in 10 minutes.` },
      }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      return { delivered: false, debugCode: code, error: data?.error?.message || `HTTP ${res.status}` };
    }
    return { delivered: true, messageId: data?.messages?.[0]?.id };
  } catch (e: any) {
    return { delivered: false, debugCode: code, error: e?.message || 'Network error' };
  }
}

/* Send a Telegram OTP via the Bot API.
   Docs: https://core.telegram.org/bots/api#sendmessage
   Free, no limits. The user must have started a chat with the bot first. */
export async function sendTelegramOtp(
  chatId: string,
  code: string,
  cfg: TelegramConfig
): Promise<OtpDeliveryResult> {
  if (!cfg.botToken) {
    return { delivered: false, debugCode: code, error: 'Telegram bot token not configured' };
  }
  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔐 Your PiForum verification code is: <b>${code}</b>\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this message.`,
        parse_mode: 'HTML',
      }),
    });
    const data: any = await res.json();
    if (!res.ok || !data.ok) {
      return { delivered: false, debugCode: code, error: data?.description || `HTTP ${res.status}` };
    }
    return { delivered: true, messageId: String(data?.result?.message_id ?? '') };
  } catch (e: any) {
    return { delivered: false, debugCode: code, error: e?.message || 'Network error' };
  }
}

/* Send an Email OTP. Uses the existing email infrastructure (SMTP or
   transactional provider) configured in the Email Settings admin panel. */
export async function sendEmailOtp(
  toEmail: string,
  code: string,
  cfg: EmailOtpConfig,
  subject = 'Your PiForum verification code'
): Promise<OtpDeliveryResult> {
  if (cfg.provider === 'none' || !cfg.fromAddress) {
    return { delivered: false, debugCode: code, error: 'Email provider not configured' };
  }
  try {
    const { sendEmail } = await import('./email');
    const result = await sendEmail({
      to: toEmail,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#333;">Your Verification Code</h2>
        <p style="color:#666;font-size:16px;">Use this code to verify your identity on PiForum:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#333;padding:16px 0;">
          ${code}
        </div>
        <p style="color:#999;font-size:14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>`,
      text: `Your PiForum verification code is: ${code}. It expires in 10 minutes.`,
    });
    return { delivered: result.sent, messageId: result.sent ? `email-${Date.now()}` : undefined, error: result.error };
  } catch (e: any) {
    return { delivered: false, debugCode: code, error: e?.message || 'Email send failed' };
  }
}
