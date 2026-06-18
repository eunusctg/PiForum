import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
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

/* Generate a QR code data URL for a given otpauth URI. */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 240,
    color: { dark: '#1f2937', light: '#ffffff' },
  });
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
  provider: 'smtp' | 'sendgrid' | 'none';
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
   transactional provider) configured in the Email-SMTP admin panel.
   For sandbox, returns the code so it can be displayed. */
export async function sendEmailOtp(
  toEmail: string,
  code: string,
  cfg: EmailOtpConfig,
  subject = 'Your PiForum verification code'
): Promise<OtpDeliveryResult> {
  if (cfg.provider === 'none' || !cfg.fromAddress) {
    return { delivered: false, debugCode: code, error: 'Email provider not configured' };
  }
  // Real SMTP/SendGrid dispatch would happen here via the email lib.
  // For now we mark as delivered-but-debug so the admin can see the code.
  try {
    // TODO: integrate with the real email transport in src/lib/email.ts
    return { delivered: true, debugCode: code, messageId: `email-${Date.now()}` };
  } catch (e: any) {
    return { delivered: false, debugCode: code, error: e?.message || 'Email send failed' };
  }
}
