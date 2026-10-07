/**
 * Outbound mail for Workers: Resend HTTP API (preferred), with a safe
 * fallback that returns the link only when no provider is configured.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MailResult = {
  sent: boolean;
  error?: string;
  /** Only when no mail provider is configured (local / missing secrets). */
  demoResetUrl?: string;
};

type MailEnv = {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  /** Legacy flag — if set without Resend, we still cannot SMTP from Workers. */
  SMTP_HOST?: string;
};

async function readMailEnv(): Promise<MailEnv> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const e = env as unknown as MailEnv;
    return {
      RESEND_API_KEY: e.RESEND_API_KEY || process.env.RESEND_API_KEY,
      MAIL_FROM: e.MAIL_FROM || process.env.MAIL_FROM,
      MAIL_FROM_NAME: e.MAIL_FROM_NAME || process.env.MAIL_FROM_NAME,
      SMTP_HOST: e.SMTP_HOST || process.env.SMTP_HOST,
    };
  } catch {
    return {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      MAIL_FROM: process.env.MAIL_FROM,
      MAIL_FROM_NAME: process.env.MAIL_FROM_NAME,
      SMTP_HOST: process.env.SMTP_HOST,
    };
  }
}

function fromAddress(env: MailEnv): string {
  const email = (env.MAIL_FROM || "noreply@cali-lab.app").trim();
  const name = (env.MAIL_FROM_NAME || "CALI-LAB").trim();
  return `${name} <${email}>`;
}

async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<MailResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[cali-mail] Resend ${res.status}: ${body}`);
    return { sent: false, error: `mail_failed_${res.status}` };
  }
  return { sent: true };
}

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Fallback link shown in UI only when mail cannot be sent. */
  linkForDemoFallback?: string;
}): Promise<MailResult> {
  const env = await readMailEnv();
  const from = fromAddress(env);

  if (env.RESEND_API_KEY && env.RESEND_API_KEY.length > 8) {
    return sendViaResend({
      apiKey: env.RESEND_API_KEY,
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
  }

  // Workers cannot open raw SMTP sockets. Avoid pretending we sent.
  if (env.SMTP_HOST) {
    console.error(
      `[cali-mail] SMTP_HOST=${env.SMTP_HOST} is set but Workers need RESEND_API_KEY (HTTP).`
    );
  }

  console.info(
    `[cali-mail] no provider — ${opts.subject} → ${opts.to}` +
      (opts.linkForDemoFallback ? ` link=${opts.linkForDemoFallback}` : "")
  );
  return {
    sent: false,
    demoResetUrl: opts.linkForDemoFallback,
    error: "mail_not_configured",
  };
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
  expiresMinutes: number;
}): Promise<MailResult> {
  const subject = "CALI-LAB — resetare parolă";
  const text = [
    "Ați cerut resetarea parolei pentru CALI-LAB.",
    "",
    `Deschideți linkul (valabil ${opts.expiresMinutes} minute):`,
    opts.resetUrl,
    "",
    "Dacă nu ați cerut resetarea, ignorați acest mesaj.",
  ].join("\n");
  const html = `
    <p>Ați cerut resetarea parolei pentru <strong>CALI-LAB</strong>.</p>
    <p><a href="${opts.resetUrl}">Setați o parolă nouă</a> (valabil ${opts.expiresMinutes} minute).</p>
    <p style="color:#666;font-size:12px">Dacă nu ați cerut resetarea, ignorați acest mesaj.</p>
  `;
  return sendMail({
    to: opts.to,
    subject,
    text,
    html,
    linkForDemoFallback: opts.resetUrl,
  });
}

export async function sendAccountActivationEmail(opts: {
  to: string;
  name: string;
  activateUrl: string;
  expiresHours: number;
}): Promise<MailResult> {
  const subject = "CALI-LAB — activați contul";
  const text = [
    `Bună ziua, ${opts.name},`,
    "",
    "Contul CALI-LAB a fost creat. Activați-l cu linkul de mai jos:",
    opts.activateUrl,
    "",
    `Linkul expiră în ${opts.expiresHours} ore.`,
    "",
    "După activare vă puteți autentifica în aplicație.",
  ].join("\n");
  const html = `
    <p>Bună ziua, <strong>${escapeHtml(opts.name)}</strong>,</p>
    <p>Contul <strong>CALI-LAB</strong> a fost creat.</p>
    <p><a href="${opts.activateUrl}">Activați contul</a> (expiră în ${opts.expiresHours} ore).</p>
    <p style="color:#666;font-size:12px">După activare vă puteți autentifica în aplicație.</p>
  `;
  return sendMail({
    to: opts.to,
    subject,
    text,
    html,
    linkForDemoFallback: opts.activateUrl,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
