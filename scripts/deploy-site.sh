#!/usr/bin/env bash
# The ONLY way to deploy tracetoforge.com.
#
# Refuses to deploy anything that is not exactly origin/main. On Oct 11-16, 2026 a
# session deployed unpushed commits built from week-old code and silently wiped a
# week of shipped editor features (undo, lids, stacking lock) from production.
# With this script a session has to pull, merge and push before it can deploy,
# so two sessions can never overwrite each other again.
#
# Usage (from the repo root, after build + sync-site + commit + push):
#   CLOUDFLARE_EMAIL=... CLOUDFLARE_API_KEY=... CLOUDFLARE_ACCOUNT_ID=... scripts/deploy-site.sh
set -euo pipefail
red() { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
fail() { red "DEPLOY REFUSED: $*"; exit 1; }

: "${CLOUDFLARE_EMAIL:?export CLOUDFLARE_EMAIL}"
: "${CLOUDFLARE_API_KEY:?export CLOUDFLARE_API_KEY}"
: "${CLOUDFLARE_ACCOUNT_ID:?export CLOUDFLARE_ACCOUNT_ID}"

# 1. Exactly origin/main, nothing uncommitted, nothing unpushed
git fetch -q origin main || fail "could not fetch origin/main"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || fail "not on branch main"
git diff --quiet && git diff --cached --quiet || fail "uncommitted changes. Commit and push first."
[ -z "$(git ls-files --others --exclude-standard site)" ] || fail "untracked files in site/. Commit and push first."
LOCAL=$(git rev-parse HEAD); REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  if git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
    fail "your checkout is BEHIND origin/main. git pull --rebase origin main, rebuild, push, then deploy."
  else
    fail "you have commits that are not on origin/main. git pull --rebase origin main, rebuild, git push, then deploy."
  fi
fi

# 2. site/ must carry the bundle built from this commit
BUNDLE=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' site/editor/index.html | head -1)
[ -n "$BUNDLE" ] && [ -f "site/$BUNDLE" ] || fail "site/editor/index.html points at a missing bundle ($BUNDLE). Run npm run build && node scripts/sync-site.js."
[ -z "$(find site -size 0 -type f | head -1)" ] || fail "zero-byte files in site/"

# 3. Deploy site/ (never dist/), tagged with the commit
npx wrangler@3.99.0 pages deploy site --project-name=tracetoforge --branch=main \
  --commit-hash="$LOCAL" --commit-message="$(git log -1 --pretty=%s)" --commit-dirty=true

# 4. Purge and verify
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/89f13a8af93f05509acd78cd518b056c/purge_cache" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" -H "X-Auth-Key: $CLOUDFLARE_API_KEY" -H "Content-Type: application/json" \
  --data '{"purge_everything":true}' | grep -q '"success":true' || red "cache purge failed, purge manually"
sleep 8
LIVE=$(curl -sL https://tracetoforge.com/editor | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)
[ "$LIVE" = "$BUNDLE" ] && green "LIVE: $BUNDLE at $(git rev-parse --short HEAD)" || red "live serves $LIVE, expected $BUNDLE (cache?). Re-check in a minute."
