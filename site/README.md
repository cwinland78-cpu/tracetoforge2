# site/ = what is deployed to Cloudflare Pages

This is the production site: Astra's static landing redesign (Sep 2026,
forge-*.css/js, fonts, prerendered pages with new branding) wrapping the
compiled editor bundle from `npm run build`.

The React source in src/ builds only the editor bundle and the OLD prerendered
pages. Deploying dist/ directly discards the redesign. Always deploy this dir.

## Ship a code change

    npm run build
    node scripts/sync-site.js
    npx wrangler@3.99.0 pages deploy site --project-name=tracetoforge --commit-dirty=true
    git add site && git commit

Before any deploy, check Cloudflare's deployment list and confirm the current
production deploy came from a commit on origin/main. If not, someone deployed
from a working copy: get their files into site/ first.

The September 18 AdSense repair uses one responsive display unit after each
blog article (9118825546). The React component loads it only on the production
hostname when the placement approaches the viewport. Auto ads remain off.
No units belong on the editor, login, dashboard, legal pages, or landing page.
Publisher verification uses the head meta tag and ads.txt independently of ad
requests. `sync-site.js` preserves the static homepage and branding, rebuilds
blog HTML from the same corrected source used by React, and updates app assets.
