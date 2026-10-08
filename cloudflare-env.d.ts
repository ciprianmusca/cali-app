/** Cloudflare Email Service binding (Workers Paid). */
interface SendEmail {
  send: (message: {
    to: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | { email: string; name?: string };
    cc?: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
    bcc?: string | { email: string; name?: string } | (string | { email: string; name?: string })[];
  }) => Promise<{ messageId: string }>;
}

interface CloudflareEnv {
  DB: D1Database;
  PHOTOS: R2Bucket;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  /** Workers AI binding (optional in local next dev). */
  AI?: {
    run: (
      model: string,
      inputs: Record<string, unknown>
    ) => Promise<unknown>;
  };
  /** Outbound transactional email (Cloudflare Email Service). */
  EMAIL?: SendEmail;
  AUTH_SECRET?: string;
  EXPORT_PSEUDO_SALT?: string;
  TURNSTILE_SITE_KEY?: string;
  /** Prefer wrangler secret in production. */
  TURNSTILE_SECRET_KEY?: string;
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  MAIL_REPLY_TO?: string;
  APP_URL?: string;
}
