-- Session invalidation + outbound mail rate limits (also applied in ensureSchema).
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS mail_rate_limits (
  id TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);
