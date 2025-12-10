import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create SMTP transporter from environment variables
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send an email using SMTP
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  });
}

/**
 * Send magic link email for authentication
 */
export async function sendMagicLinkEmail(email: string, magicLink: string): Promise<void> {
  const appName = "Vexa Dashboard";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to ${appName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎙️ ${appName}</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #1f2937; margin-top: 0;">Sign in to your account</h2>

          <p style="color: #4b5563;">
            Click the button below to sign in to ${appName}. This link will expire in 15 minutes.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Sign in to ${appName}
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
            ${magicLink}
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
            If you didn't request this email, you can safely ignore it.
            <br>
            This link will expire in 15 minutes for security reasons.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Sign in to ${appName}

Click the link below to sign in to your account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this email, you can safely ignore it.
  `;

  await sendEmail({
    to: email,
    subject: `Sign in to ${appName}`,
    html,
    text,
  });
}
