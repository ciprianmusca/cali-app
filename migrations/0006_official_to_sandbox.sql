-- One-shot: empty the official lane by moving all current data to sandbox.
-- Applied also at runtime via migrateOfficialDataToSandboxOnce (schema_meta).

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

UPDATE observations SET is_demo = 1;
UPDATE users SET is_demo = 1 WHERE lower(email) != lower('admin@cali-lab.ro');
UPDATE users SET is_demo = 0 WHERE lower(email) = lower('admin@cali-lab.ro');

INSERT OR REPLACE INTO schema_meta (key, value)
VALUES ('official_cleared_v1', datetime('now'));
