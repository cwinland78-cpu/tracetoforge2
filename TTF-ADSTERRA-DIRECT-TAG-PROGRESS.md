# TraceToForge Adsterra direct-tag correction

## Completed

- Replaced the custom `srcdoc` iframe in `src/pages/blog/BlogPost.jsx` with the standard direct `window.atOptions` configuration and `invoke.js` loader, still gated by accepted advertising consent and the production-host check.
- Updated `src/lib/adsterraConsent.js` so opening Advertising choices preserves the current choice. Revoking a previously accepted choice writes `declined` first, then reloads to clear vendor code already running.
- Updated `ADVERTISING-RELEASE.md` to describe the direct tag and reload-on-revoke behavior.
- Ran `npm run build` successfully with the existing ignored `.env.local`; `scripts/check-build-env.mjs` passed. New bundle: `dist/assets/index-DbLuN3lO.js`.
- Ran `node scripts/sync-site.js` successfully. Deployable output: `site/`, using `site/assets/index-DbLuN3lO.js`.
- Confirmed the custom production homepage was preserved: `site/index.html` SHA-256 stayed `61DC746D981AFFBF00A2501B80CF0F793AA276AB34DB04D3E58D0DE967571257` before and after sync.
- `git diff --check` passed apart from Git's informational LF-to-CRLF warnings.

## Deployment blocker

- Wrangler 4.63.0 is installed, but `npx wrangler whoami` reports that the CLI is not authenticated.
- The existing authenticated Cloudflare dashboard was opened at the TraceToForge Pages production upload screen. The folder chooser stalled and was interrupted without completing an upload.
- No new deployment was created. The verified current production deployment remains `bd781640-db6b-46da-85e8-3c8f45d59bc1` from the prior release.

## State and limits

- Source, generated `dist/`, and synced `site/` changes remain in the working tree and are ready for deployment.
- No Safari/iPhone runtime test was available, so this is an integration-policy correction and is not claimed as a proven Safari root-cause fix.
