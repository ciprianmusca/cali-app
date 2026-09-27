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
}
