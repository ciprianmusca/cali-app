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
  AUTH_SECRET?: string;
  /** Resend.com API key for activation / password-reset emails. */
  RESEND_API_KEY?: string;
  /** From address, e.g. noreply@cali-lab.app */
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
  /** Cloudflare Email Service binding (Workers Paid / Email Sending). */
  EMAIL?: {
    send: (msg: {
      to: string;
      from: string | { email: string; name?: string };
      subject: string;
      html?: string;
      text?: string;
    }) => Promise<{ messageId?: string }>;
  };
}
