#!/usr/bin/env bash
# Full live backup of CALI-LAB production (https://cali.ipsv.ro):
#   - D1 database (schema + data) via wrangler remote export
#   - R2 photo objects (best-effort via Cloudflare API + wrangler get)
#   - Git commit SHA + MANIFEST
#
# Requires: CLOUDFLARE_API_TOKEN with Account D1 read/export and R2 read.
# Optional: CLOUDFLARE_ACCOUNT_ID (auto-detected via API if omitted)
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   ./scripts/backup-production.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAMP="${BACKUP_STAMP:-$(date -u +%Y%m%d-%H%M%S-utc)}"
OUT="${BACKUP_DIR:-$ROOT/backups/live-$STAMP}"
DB_NAME="cali-lab-db"
BUCKET="cali-lab-photos"
SITE_URL="https://cali.ipsv.ro"

mkdir -p "$OUT/d1" "$OUT/r2" "$OUT/meta"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN (Cloudflare API Token with D1 + R2 read)." >&2
  exit 1
fi

echo "==> Backup dir: $OUT"
git rev-parse HEAD >"$OUT/meta/git-sha.txt"
git log -1 --format='%H%n%s%n%ci' >"$OUT/meta/git-head.txt" || true
date -u +"%Y-%m-%dT%H:%M:%SZ" >"$OUT/meta/created-at-utc.txt"
echo "$SITE_URL" >"$OUT/meta/site-url.txt"
printf '%s\n' "$DB_NAME" >"$OUT/meta/d1-database.txt"
printf '%s\n' "$BUCKET" >"$OUT/meta/r2-bucket.txt"

echo "==> Export D1 remote ($DB_NAME)"
npx wrangler d1 export "$DB_NAME" --remote --output="$OUT/d1/cali-lab-db.sql" -y

echo "==> Resolve Cloudflare account id"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z "$ACCOUNT_ID" ]]; then
  ACCOUNT_ID="$(
    curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/accounts?per_page=20" \
      | python3 -c "
import json,sys
j=json.load(sys.stdin)
if not j.get('success'):
  raise SystemExit('accounts API failed: '+json.dumps(j.get('errors')))
results=j.get('result') or []
if not results:
  raise SystemExit('no Cloudflare accounts visible to this token')
print(results[0]['id'])
"
  )"
fi
echo "$ACCOUNT_ID" >"$OUT/meta/cloudflare-account-id.txt"

echo "==> List + download R2 objects ($BUCKET)"
python3 - <<PY
import json, os, subprocess, urllib.request
from pathlib import Path

token = os.environ["CLOUDFLARE_API_TOKEN"]
account = Path("$OUT/meta/cloudflare-account-id.txt").read_text().strip()
bucket = "$BUCKET"
out = Path("$OUT/r2")
out.mkdir(parents=True, exist_ok=True)
cursor = None
keys = []
while True:
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/{bucket}/objects?per_page=1000"
    if cursor:
        url += f"&cursor={cursor}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
    if not data.get("success"):
        raise SystemExit(f"R2 list failed: {data.get('errors')}")
    result = data.get("result") or []
    # API shape: list of objects or {"objects":[...]}
    objs = result if isinstance(result, list) else result.get("objects") or []
    for obj in objs:
        key = obj.get("key") or obj.get("name")
        if key:
            keys.append(key)
    info = data.get("result_info") or {}
    cursor = info.get("cursor")
    if not info.get("is_truncated") or not cursor:
        break

(Path("$OUT/meta") / "r2-keys.json").write_text(json.dumps(keys, indent=2))
print(f"R2 objects: {len(keys)}")
failed = []
for i, key in enumerate(keys, 1):
    dest = out / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    # wrangler path form: bucket/key
    cmd = [
        "npx", "wrangler", "r2", "object", "get", f"{bucket}/{key}",
        "--file", str(dest),
        "--remote",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"  [{i}/{len(keys)}] {key}")
    except subprocess.CalledProcessError as e:
        failed.append(key)
        print(f"  FAIL {key}: {e.stderr[-200:] if e.stderr else e}")

(Path("$OUT/meta") / "r2-failed.json").write_text(json.dumps(failed, indent=2))
if failed:
    print(f"WARNING: {len(failed)} R2 downloads failed")
PY

# Public JSON snapshot (approved observations visible without auth) — extra safety net
echo "==> Public API snapshot"
curl -sS "$SITE_URL/api/observations" -o "$OUT/meta/public-observations.json" || true

cat >"$OUT/RESTORE.md" <<EOF
# Restore CALI-LAB live backup ($STAMP)

Created: $(cat "$OUT/meta/created-at-utc.txt")
Site: $SITE_URL
Git: $(cat "$OUT/meta/git-sha.txt")
D1: $DB_NAME
R2: $BUCKET

## 1. Code

\`\`\`bash
git checkout \$(cat meta/git-sha.txt)
# or: git checkout backup-2026-09-26-2004-utc
\`\`\`

## 2. D1 (schema + data)

\`\`\`bash
# WARNING: replaces remote DB contents — use a new DB or confirm intentionally
npx wrangler d1 execute $DB_NAME --remote --file=./d1/cali-lab-db.sql
\`\`\`

## 3. R2 photos

\`\`\`bash
# For each file under ./r2/ (example for one key):
npx wrangler r2 object put $BUCKET/PATH/IN/BUCKET --file=./r2/PATH/IN/BUCKET --remote
\`\`\`

Or sync with rclone configured for Cloudflare R2.
EOF

echo "==> Pack tarball"
TAR="$ROOT/backups/cali-lab-live-$STAMP.tar.gz"
mkdir -p "$ROOT/backups"
tar -czf "$TAR" -C "$(dirname "$OUT")" "$(basename "$OUT")"
echo "DONE: $TAR"
ls -lh "$TAR" "$OUT/d1" || true
