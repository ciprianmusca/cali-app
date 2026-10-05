-- Ranger capability flags: users, observation validation, school.
ALTER TABLE users ADD COLUMN can_manage_users INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN can_validate_observations INTEGER NOT NULL DEFAULT 0;
-- Copy legacy users flag if present.
UPDATE users SET can_manage_users = 1 WHERE can_manage_registrations = 1;
-- Demo ranger keeps observation validation by default (applied in seed / ensure).
