/**
 * Outbound mail via Cloudflare Email Service (env.EMAIL.send).
 * Local / missing binding: log to console outside production.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MailResult = {
  sent: boolean;
  error?: string;
  /** True when only logged locally (no EMAIL binding). */
  loggedOnly?: boolean;
};

const MAIL_ERROR_CODES = new Set([
  "E_SENDER_NOT_VERIFIED",
  "E_SENDER_DOMAIN_NOT_AVAILABLE",
  "E_RATE_LIMIT_EXCEEDED",
  "E_DAILY_LIMIT_EXCEEDED",
  "E_RECIPIENT_SUPPRESSED",
  "E_TOO_MANY_RECIPIENTS",
  "E_VALIDATION_ERROR",
]);

type MailAddress = string | { email: string; name?: string };

export type MailEnv = {
  EMAIL?: SendEmail;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  MAIL_REPLY_TO?: string;
  APP_URL?: string;
};

export async function readMailEnv(): Promise<MailEnv> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const e = env as unknown as MailEnv & Record<string, string | undefined>;
    return {
      EMAIL: (env as CloudflareEnv).EMAIL,
      MAIL_FROM: e.MAIL_FROM || process.env.MAIL_FROM,
      MAIL_FROM_NAME: e.MAIL_FROM_NAME || process.env.MAIL_FROM_NAME,
      MAIL_REPLY_TO: e.MAIL_REPLY_TO || process.env.MAIL_REPLY_TO,
      APP_URL: e.APP_URL || process.env.APP_URL,
    };
  } catch {
    return {
      MAIL_FROM: process.env.MAIL_FROM,
      MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
      MAIL_REPLY_TO: process.env.MAIL_REPLY_TO,
      APP_URL: process.env.APP_URL,
    };
  }
}

export function appBaseUrl(env?: MailEnv): string {
  const raw = (env?.APP_URL || process.env.APP_URL || "https://cali-lab.app").trim();
  return raw.replace(/\/$/, "");
}

function countRecipients(
  to: MailAddress | MailAddress[]
): number {
  return Array.isArray(to) ? to.length : 1;
}

function isProductionHost(): boolean {
  try {
    // Workers always run with NODE_ENV=production; binding presence is the real signal.
    return process.env.NODE_ENV === "production";
  } catch {
    return false;
  }
}

/**
 * Send one transactional email. Max 50 recipients (Cloudflare Email Service limit).
 */
export async function sendMail(
  env: MailEnv,
  opts: {
    to: MailAddress | MailAddress[];
    subject: string;
    html: string;
    text: string;
  }
): Promise<MailResult> {
  if (countRecipients(opts.to) > 50) {
    console.error("[cali-mail] E_TOO_MANY_RECIPIENTS: max 50");
    return { sent: false, error: "E_TOO_MANY_RECIPIENTS" };
  }

  const fromEmail = (env.MAIL_FROM || "noreply@cali-lab.app").trim();
  const fromName = (env.MAIL_FROM_NAME || "CALI-LAB").trim();
  const replyTo = (env.MAIL_REPLY_TO || "contact@cali-lab.app").trim();

  if (env.EMAIL?.send) {
    try {
      await env.EMAIL.send({
        to: opts.to,
        from: { email: fromEmail, name: fromName },
        replyTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      return { sent: true };
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const code = err.code || "mail_failed";
      const message = err.message || String(e);
      console.error(`[cali-mail] ${code}: ${message}`);
      if (MAIL_ERROR_CODES.has(code)) {
        return { sent: false, error: code };
      }
      return { sent: false, error: code };
    }
  }

  // wrangler dev / next dev without EMAIL binding
  if (!isProductionHost() || process.env.CALI_MAIL_LOG === "1") {
    console.info(
      `[cali-mail:local] to=${JSON.stringify(opts.to)} subject=${opts.subject}\n${opts.text}`
    );
    return { sent: true, loggedOnly: true };
  }

  console.error("[cali-mail] EMAIL binding missing in production");
  return { sent: false, error: "mail_not_configured" };
}

function mailFooterText(): string {
  return [
    "—",
    "CALI-LAB · observații forestiere",
    "Răspunsuri: contact@cali-lab.app",
    "https://cali-lab.app",
  ].join("\n");
}

function mailFooterHtml(): string {
  return `
    <hr style="border:none;border-top:1px solid #d4d4d4;margin:24px 0" />
    <p style="color:#666;font-size:12px;line-height:1.5">
      <strong>CALI-LAB</strong> · observații forestiere<br />
      Răspunsuri: <a href="mailto:contact@cali-lab.app">contact@cali-lab.app</a><br />
      <a href="https://cali-lab.app">cali-lab.app</a>
    </p>
  `;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendAccountActivationEmail(opts: {
  to: string;
  name: string;
  activateUrl: string;
  expiresHours: number;
}): Promise<MailResult> {
  const env = await readMailEnv();
  const subject = "CALI-LAB — activați contul";
  const text = [
    `Bună ziua, ${opts.name},`,
    "",
    "Contul dumneavoastră CALI-LAB a fost creat.",
    "Activați-l deschizând linkul de mai jos:",
    opts.activateUrl,
    "",
    `Linkul expiră în ${opts.expiresHours} ore.`,
    "După activare vă puteți autentifica în aplicație.",
    "",
    mailFooterText(),
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#1a2e1a;max-width:560px">
      <p style="font-size:20px;margin:0 0 8px"><strong>CALI-LAB</strong></p>
      <p>Bună ziua, <strong>${escapeHtml(opts.name)}</strong>,</p>
      <p>Contul dumneavoastră a fost creat. Activați-l pentru a putea intra în aplicație.</p>
      <p style="margin:24px 0">
        <a href="${escapeHtml(opts.activateUrl)}"
           style="background:#1a4d2e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">
          Activați contul
        </a>
      </p>
      <p style="color:#555;font-size:14px">Linkul expiră în ${opts.expiresHours} ore.</p>
      <p style="color:#888;font-size:12px;word-break:break-all">${escapeHtml(opts.activateUrl)}</p>
      ${mailFooterHtml()}
    </div>
  `;
  return sendMail(env, { to: opts.to, subject, html, text });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  expiresMinutes: number;
}): Promise<MailResult> {
  const env = await readMailEnv();
  const subject = "CALI-LAB — resetare parolă";
  const text = [
    "Ați cerut resetarea parolei pentru CALI-LAB.",
    "",
    `Deschideți linkul (valabil ${opts.expiresMinutes} minute):`,
    opts.resetUrl,
    "",
    "Dacă nu ați cerut resetarea, ignorați acest mesaj.",
    "",
    mailFooterText(),
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#1a2e1a;max-width:560px">
      <p style="font-size:20px;margin:0 0 8px"><strong>CALI-LAB</strong></p>
      <p>Ați cerut resetarea parolei pentru contul CALI-LAB.</p>
      <p style="margin:24px 0">
        <a href="${escapeHtml(opts.resetUrl)}"
           style="background:#1a4d2e;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block">
          Setați o parolă nouă
        </a>
      </p>
      <p style="color:#555;font-size:14px">Linkul expiră în ${opts.expiresMinutes} minute.</p>
      <p style="color:#888;font-size:12px">Dacă nu ați cerut resetarea, ignorați acest mesaj.</p>
      <p style="color:#888;font-size:12px;word-break:break-all">${escapeHtml(opts.resetUrl)}</p>
      ${mailFooterHtml()}
    </div>
  `;
  return sendMail(env, { to: opts.to, subject, html, text });
}
