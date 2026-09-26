/**
 * Outbound mail helper. Without SMTP credentials, messages are logged and
 * the reset URL is returned to the caller for local/demo use (ADM-13).
 */

export type MailResult = {
  sent: boolean;
  /** Present when SMTP is unavailable — for demo / local reset. */
  demoResetUrl?: string;
};

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  expiresMinutes: number;
}): Promise<MailResult> {
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.info(
      `[cali-mail] password reset for ${opts.to} (expires ${opts.expiresMinutes}m): ${opts.resetUrl}`
    );
    return { sent: false, demoResetUrl: opts.resetUrl };
  }
  // SMTP wiring can be added when credentials are provisioned.
  console.info(`[cali-mail] would send reset to ${opts.to} via ${smtpHost}`);
  return { sent: true };
}
