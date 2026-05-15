const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../utils/logger');

/* ─────────────────────────────────────────────
   Email Service – sends verification emails
   Uses SMTP (configure via environment vars).
   Falls back to Ethereal test account in dev.
   ───────────────────────────────────────────── */

let transporter = null;

/**
 * Initialise the mailer transport.
 * Call once at startup (index.js).
 */
async function initEmail() {
  if (process.env.SMTP_HOST) {
    // Production / user-supplied SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    logger.info(`Email transport configured via ${process.env.SMTP_HOST}`);
  } else {
    // Dev fallback – Ethereal fake SMTP (emails viewable at ethereal.email)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    logger.info(`Email transport using Ethereal test account: ${testAccount.user}`);
  }
}

/**
 * Generate a 6-digit OTP code for email verification.
 */
function generateToken() {
  // Cryptographically random 6-digit code (100000 – 999999)
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}

/**
 * Send a verification email containing a 6-digit OTP code.
 * The `token` parameter is now a 6-digit string.
 */
async function sendVerificationEmail(toEmail, userName, token) {
  // Split digits for the visual "boxes" in the email template
  const digits = token.split('');

  const digitBoxStyle =
    'display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;' +
    'font-size:28px;font-weight:700;letter-spacing:0;color:#111;' +
    'background:#f4f4f5;border-radius:8px;margin:0 4px;';

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Flowa" <noreply@flowa.dev>',
    to: toEmail,
    subject: `${token} is your Flowa verification code`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#fff;">
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#F63049,#E11D48);width:48px;height:48px;border-radius:12px;line-height:48px;font-size:24px;color:white;">⚡</div>
          <h1 style="margin:10px 0 0;font-size:22px;color:#111;font-weight:700;">Flowa</h1>
        </div>

        <!-- Heading -->
        <h2 style="font-size:20px;color:#111;margin:0 0 8px;font-weight:700;">Your verification code</h2>
        <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Hi ${userName}, enter the code below on the Flowa registration page to verify your email address.
        </p>

        <!-- OTP digits -->
        <div style="text-align:center;margin:0 0 32px;">
          ${digits.map(d => `<span style="${digitBoxStyle}">${d}</span>`).join('')}
        </div>

        <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 8px;">
          This code expires in <strong>15 minutes</strong>.
        </p>
        <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 28px;">
          If you didn't create a Flowa account, you can safely ignore this email.
        </p>

        <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
        <p style="color:#bbb;font-size:12px;margin:0;">Flowa — AI-Native Workflow Automation</p>
      </div>
    `,
    text: `Hi ${userName},\n\nYour Flowa verification code is: ${token}\n\nThis code expires in 15 minutes.`,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`OTP verification email sent to ${toEmail} (messageId: ${info.messageId})`);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`📧 Preview OTP email: ${previewUrl}`);
  }

  return info;
}

module.exports = { initEmail, generateToken, sendVerificationEmail };
