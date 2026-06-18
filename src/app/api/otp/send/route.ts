import { db } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  requireAuth,
  parseBody,
} from '@/lib/api-helpers';
import { getSettingsMap, settingStr, settingBool, settingInt } from '@/lib/server-settings';
import {
  generateOtpCode,
  hashOtp,
  sendWhatsAppOtp,
  sendTelegramOtp,
  sendEmailOtp,
  type OtpChannel,
} from '@/lib/otp';

/**
 * POST /api/otp/send
 * Body: { channel: 'whatsapp'|'telegram'|'email', target?: string }
 *
 * Generates a one-time code and dispatches it via the requested channel.
 * The code is stored hashed in OtpChallenge with a 10-minute expiry.
 *
 * - WhatsApp: target is a phone number (E.164). Uses Meta WhatsApp Cloud API.
 * - Telegram: target is a Telegram chat id (the user must have /start'd the bot).
 * - Email: target defaults to the user's email. Uses the configured SMTP/SendGrid.
 *
 * In sandbox/dev (or when credentials are missing), the code is returned in
 * the response so testing is possible without real provider credentials.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const user = auth.user!;
    const body = await parseBody(request);
    if (!body) return errorResponse('Invalid request body');

    const channel = String(body.channel || '') as OtpChannel;
    if (!['whatsapp', 'telegram', 'email'].includes(channel)) {
      return errorResponse('channel must be one of: whatsapp, telegram, email', 400);
    }

    // Load admin settings
    const s = await getSettingsMap();
    const enabledChannels: string[] = [];
    if (settingBool(s, 'enable_whatsapp_otp', false)) enabledChannels.push('whatsapp');
    if (settingBool(s, 'enable_telegram_otp', false)) enabledChannels.push('telegram');
    if (settingBool(s, 'enable_email_otp', false)) enabledChannels.push('email');

    if (!enabledChannels.includes(channel)) {
      return errorResponse(`The ${channel} OTP channel is not enabled on this site.`, 403);
    }

    const otpLength = settingInt(s, 'otp_code_length', 6);
    const otpExpiryMin = settingInt(s, 'otp_expiry_minutes', 10);

    // Determine the target address
    let target = '';
    if (channel === 'whatsapp') {
      target = String(body.target || user.phoneNumber || '').trim();
      if (!target) return errorResponse('A phone number is required for WhatsApp OTP.', 400);
    } else if (channel === 'telegram') {
      target = String(body.target || '').trim();
      if (!target) return errorResponse('A Telegram chat id is required. Start a chat with the bot first.', 400);
    } else if (channel === 'email') {
      target = String(body.target || user.email || '').trim();
      if (!target) return errorResponse('An email address is required.', 400);
    }

    // Rate limit: max 3 pending challenges per (user, channel) in the last 10 min
    const recentCount = await db.otpChallenge.count({
      where: {
        userId: user.id,
        channel,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });
    if (recentCount >= 3) {
      return errorResponse('Too many OTP requests. Please wait a few minutes before trying again.', 429);
    }

    // Generate + hash the code
    const code = generateOtpCode(otpLength);
    const codeHash = hashOtp(code);

    // Store the challenge
    await db.otpChallenge.create({
      data: {
        userId: user.id,
        channel,
        target,
        codeHash,
        expiresAt: new Date(Date.now() + otpExpiryMin * 60 * 1000),
      },
    });

    // Dispatch via the channel
    let delivery: { delivered: boolean; debugCode?: string; messageId?: string; error?: string } = {
      delivered: false,
      error: 'Unknown channel',
    };

    if (channel === 'whatsapp') {
      delivery = await sendWhatsAppOtp(target, code, {
        phoneNumberId: settingStr(s, 'whatsapp_phone_number_id', ''),
        accessToken: settingStr(s, 'whatsapp_access_token', ''),
        apiVersion: settingStr(s, 'whatsapp_api_version', 'v18.0'),
      });
    } else if (channel === 'telegram') {
      delivery = await sendTelegramOtp(target, code, {
        botToken: settingStr(s, 'telegram_bot_token', ''),
      });
    } else if (channel === 'email') {
      delivery = await sendEmailOtp(
        target,
        code,
        {
          provider: 'sendgrid', // placeholder — real provider decided by SMTP config
          fromAddress: settingStr(s, 'email_from_address', 'noreply@piforum.com'),
        },
        settingStr(s, 'email_otp_subject', 'Your PiForum verification code')
      );
    }

    await db.securityLog.create({
      data: {
        userId: user.id,
        eventType: 'OTP_SENT',
        details: `${channel} OTP sent to ${target} (delivered=${delivery.delivered})`,
      },
    });

    return successResponse({
      sent: true,
      channel,
      delivered: delivery.delivered,
      expiresAt: new Date(Date.now() + otpExpiryMin * 60 * 1000).toISOString(),
      // Sandbox/dev only — surface the code so testing is possible
      debugCode: !delivery.delivered ? delivery.debugCode : undefined,
      messageId: delivery.messageId,
      error: delivery.error,
    });
  } catch (e: any) {
    return serverErrorResponse(e.message || 'Failed to send OTP');
  }
}
