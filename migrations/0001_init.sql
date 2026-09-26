-- CALI-LAB D1 schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  password TEXT NOT NULL,
  is_adult INTEGER NOT NULL DEFAULT 1,
  parental_consent INTEGER,
  gdpr_accepted_at TEXT,
  gdpr_version TEXT,
  registered_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  status TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_role TEXT NOT NULL,
  author_name TEXT NOT NULL,
  details TEXT,
  photos_json TEXT NOT NULL DEFAULT '[]',
  location_json TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  validated_at TEXT,
  validator_id TEXT,
  validator_name TEXT,
  validation_comment TEXT,
  is_sentinel_tree INTEGER DEFAULT 0,
  species TEXT,
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_observations_status ON observations(status);
CREATE INDEX IF NOT EXISTS idx_observations_module ON observations(module);
CREATE INDEX IF NOT EXISTS idx_observations_author ON observations(author_id);
CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at);
