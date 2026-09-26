-- SEC-05: observation photos move from D1 base64 (photos_json data: URIs)
-- into Cloudflare R2 (binding PHOTOS / bucket cali-lab-photos).
-- D1 photos_json keeps only r2:observations/<id>/<index> refs (or /placeholders/).
-- Runtime migration: migratePhotosToR2() on GET /api/bootstrap.
-- No schema change required; this file documents the data migration.
SELECT 1;
