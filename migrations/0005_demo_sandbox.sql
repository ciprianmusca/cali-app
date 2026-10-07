-- Demo sandbox isolation: flag users + observations so test data
-- never appears in the official map / validation / FAIR export.

ALTER TABLE users ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE observations ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_observations_is_demo ON observations(is_demo);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);
