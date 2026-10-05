-- Ranger capability flags (admin-granted).
ALTER TABLE users ADD COLUMN can_manage_registrations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN can_teach_school INTEGER NOT NULL DEFAULT 0;
