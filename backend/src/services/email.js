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
 * Generate a secure random verification token.
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send a verification email to the user.
 */
async function sendVerificationEmail(toEmail, userName, token) {
  const baseUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Flowa" <noreply@flowa.dev>',
    to: toEmail,
    subject: 'Verify your Flowa account',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #7C3AED); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 24px; color: white;">⚡</div>
          <h1 style="margin: 12px 0 0; font-size: 24px; color: #111;">Flowa</h1>
        </div>
        <h2 style="font-size: 20px; color: #111; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Hi ${userName},</p>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">Thanks for signing up! Please confirm your email address by clicking the button below.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 15px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">This link expires in 24 hours. If you didn't create a Flowa account, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 12px;">Or copy and paste this URL into your browser:</p>
        <p style="color: #8B5CF6; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `,
    text: `Hi ${userName},\n\nVerify your Flowa account by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`Verification email sent to ${toEmail} (messageId: ${info.messageId})`);

  // In dev mode, log the Ethereal preview URL
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`📧 Preview verification email: ${previewUrl}`);
  }

  return info;
}

module.exports = { initEmail, generateToken, sendVerificationEmail };
