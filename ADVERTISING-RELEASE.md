# Website advertising release

2026-09-29: One consent-controlled Adsterra 300x250 banner on blog articles. Homepage and editor have no banner; native apps excluded. Source BlogPost.jsx and lib/adsterraConsent.js. Deploy site/, preserving its custom homepage; do not replace it wholesale with dist/.

Build requires VITE_SUPABASE_URL, public anon VITE_SUPABASE_ANON_KEY, and public VITE_RC_API_KEY. scripts/check-build-env.mjs now blocks missing settings or non-anon credentials before Vite runs. Never commit private credentials. Frontend settings were recovered from the verified pre-release public bundle into ignored .env.local.

Banner uses the standard direct atOptions and invoke.js tag after consent (atOptions is assigned as a configurable window property because the vendor deletes it). Withdrawal from a previously accepted choice persists denial and reloads the page to clear the vendor runtime. CSP adds only observed delivery hosts. Optional website advertising is disclosed in React and static privacy content.

Validation: build passed; missing-config guard failed as expected; live editor/blog initialize; actual banner creative, consent withdrawal, and mobile header spacing corrected; mobile verification recorded in parent task. Production deployment IDs and screenshots are in the parent task work/PROGRESS.md and outputs.
