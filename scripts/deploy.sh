#!/usr/bin/env bash
# TracetoForge deploy script
# Verifies all critical files are present in dist/ before pushing to Cloudflare Pages,
# then verifies the live deployment serves them with the correct content types.
#
# Why this exists:
#   - Cloudflare Pages serves index.html (HTTP 200) for any unknown path.
#   - That means missing files like ads.txt or demo.mp4 return 200 with HTML body.
#   - AdSense / browsers / users see the failure; we don't, unless we check content-type.
#   - This script makes those failures impossible to ship.

set -euo pipefail

# ----- config -----
REQUIRED_DIST_FILES=(
  "ads.txt:text/plain"
  "robots.txt:text/plain"
  "sitemap.xml:application/xml"
  "_headers:-"
  "_redirects:-"
  "demo.mp4:video/mp4"
  "favicon.ico:-"
  "opencv.js:-"
  "index.html:text/html"
)

REQUIRED_ENV_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY" "VITE_RC_API_KEY")
SUPABASE_BUNDLE_MARKER="382YBaplfZJVl"   # part of anon JWT, must appear in built JS
DEMO_MP4_MIN_BYTES=1000000               # 1MB - real video is ~16MB
PROJECT_NAME="tracetoforge"
PROD_DOMAIN="https://tracetoforge.com"

red()   { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$*"; }
blue()  { printf "\033[34m%s\033[0m\n" "$*"; }

fail() { red "FAIL: $*"; exit 1; }

# ----- step 1: env -----
blue "== step 1: env vars =="
if [ ! -f .env ]; then fail ".env file missing. Build will bake empty Supabase keys into bundle."; fi
for v in "${REQUIRED_ENV_VARS[@]}"; do
  grep -q "^${v}=" .env || fail ".env missing required var: ${v}"
  val=$(grep "^${v}=" .env | cut -d= -f2-)
  [ -n "$val" ] || fail ".env has empty value for: ${v}"
done
green "  .env present with all 3 required vars"

# Validate Supabase key actually works (catches stale/typo'd keys before they hit the bundle)
sb_url=$(grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2-)
sb_key=$(grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
sb_status=$(curl -s -o /dev/null -w "%{http_code}" "${sb_url}/auth/v1/health" \
  -H "apikey: ${sb_key}")
case "$sb_status" in
  200)     green "  Supabase anon key verified (auth/v1/health 200)" ;;
  401|403) fail "Supabase key rejected (HTTP ${sb_status}). Key may be rotated, wrong, or have a typo." ;;
  *)       yellow "  Supabase returned HTTP ${sb_status}; proceeding but worth checking" ;;
esac

# ----- step 2: demo.mp4 in public/ -----
blue "== step 2: demo.mp4 in public/ =="
DEMO_RECOVERY_URL="https://a2fd0410.tracetoforge.pages.dev/demo.mp4"
if [ ! -f public/demo.mp4 ]; then
  yellow "  public/demo.mp4 missing (gitignored, stripped on fresh clones)"
  yellow "  Auto-recovering from $DEMO_RECOVERY_URL ..."
  curl -fsSL -o public/demo.mp4.tmp "$DEMO_RECOVERY_URL" \
    || fail "Could not download demo.mp4 from recovery URL. Check the URL still serves video/mp4."
  # confirm we got a video, not an HTML fallback page
  recovered_ct=$(file -b --mime-type public/demo.mp4.tmp)
  if [ "$recovered_ct" != "video/mp4" ]; then
    rm -f public/demo.mp4.tmp
    fail "Recovery URL returned $recovered_ct, not video/mp4. Find a different known-good deploy."
  fi
  mv public/demo.mp4.tmp public/demo.mp4
  green "  Recovered demo.mp4 (file confirmed video/mp4)"
fi
size=$(stat -c %s public/demo.mp4 2>/dev/null || stat -f %z public/demo.mp4)
[ "$size" -gt "$DEMO_MP4_MIN_BYTES" ] || fail "public/demo.mp4 is only ${size} bytes (need >${DEMO_MP4_MIN_BYTES}). Truncated/corrupt?"
green "  public/demo.mp4 present (${size} bytes)"

# ----- step 3: build -----
blue "== step 3: build =="
npm run build

# ----- step 4: verify dist contents -----
blue "== step 4: verify dist/ =="
for entry in "${REQUIRED_DIST_FILES[@]}"; do
  file="${entry%%:*}"
  [ -f "dist/$file" ] || fail "dist/$file missing after build"
done
# zero-byte check
zb=$(find dist -size 0 -type f | head -5)
[ -z "$zb" ] || fail "Zero-byte files in dist:\n$zb"
# env baked into bundle
grep -q "$SUPABASE_BUNDLE_MARKER" dist/assets/*.js \
  || fail "Supabase anon key not found in dist/assets/*.js. Build ran with empty .env."
green "  all required files present, env baked in"

# ----- step 5: deploy -----
blue "== step 5: deploy =="
: "${CLOUDFLARE_EMAIL:?must export CLOUDFLARE_EMAIL}"
: "${CLOUDFLARE_API_KEY:?must export CLOUDFLARE_API_KEY}"
: "${CLOUDFLARE_ACCOUNT_ID:?must export CLOUDFLARE_ACCOUNT_ID}"

deploy_output=$(npx wrangler@3.99.0 pages deploy dist \
  --project-name="$PROJECT_NAME" --commit-dirty=true 2>&1 | tee /dev/stderr)

deploy_url=$(echo "$deploy_output" | grep -oE 'https://[a-f0-9]+\.tracetoforge\.pages\.dev' | head -1)
[ -n "$deploy_url" ] || fail "Could not extract deployment URL from wrangler output"
green "  deployed to: $deploy_url"

# ----- step 6: post-deploy smoke test -----
# Hit the *deployment URL* (not prod) so we test what we just shipped before DNS catches up.
blue "== step 6: smoke test on $deploy_url =="
sleep 3   # give the edge a moment
errors=0
for entry in "${REQUIRED_DIST_FILES[@]}"; do
  file="${entry%%:*}"
  expected_ct="${entry##*:}"
  [ "$expected_ct" = "-" ] && continue
  actual_ct=$(curl -sI "$deploy_url/$file" | grep -i '^content-type:' | tr -d '\r' | awk -F': ' '{print $2}' | awk -F';' '{print $1}' | tr -d ' ')
  if [[ "$actual_ct" == "$expected_ct"* ]]; then
    green "  OK  /$file -> $actual_ct"
  else
    red   "  BAD /$file -> $actual_ct (expected $expected_ct)"
    errors=$((errors+1))
  fi
done
[ "$errors" -eq 0 ] || fail "$errors file(s) returned wrong content-type. Cloudflare SPA fallback is masking missing files."

# Also test prod (may take a moment for alias to flip)
blue "== step 7: smoke test on $PROD_DOMAIN (best-effort) =="
sleep 5
for f in ads.txt demo.mp4 sitemap.xml; do
  actual_ct=$(curl -sI "$PROD_DOMAIN/$f" | grep -i '^content-type:' | tr -d '\r' | awk -F': ' '{print $2}' | awk -F';' '{print $1}' | tr -d ' ')
  echo "  $PROD_DOMAIN/$f  ->  $actual_ct"
done

green ""
green "Deploy complete. ads.txt, demo.mp4, sitemap.xml verified at content-type level."
