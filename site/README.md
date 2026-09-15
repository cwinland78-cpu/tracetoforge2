# site/ = what is deployed to Cloudflare Pages

This is the production site: Astra's static landing redesign (Sep 2026,
forge-*.css/js, fonts, prerendered pages with new branding) wrapping the
compiled editor bundle from `npm run build`.

The React source in src/ builds only the editor bundle and the OLD prerendered
pages. Deploying dist/ directly discards the redesign. Always deploy this dir.

## Ship a code change

    npm run build
    NEW=$(basename dist/assets/index-*.js)
    OLD=$(basename site/assets/index-*.js)
    rm site/assets/$OLD && cp dist/assets/$NEW site/assets/
    grep -rl "$OLD" site | xargs sed -i "s/$OLD/$NEW/g"
    # if dist/assets/index-*.css hash changed, do the same for the css
    grep -rl "$OLD" site | wc -l          # must be 0
    npx wrangler@3.99.0 pages deploy site --project-name=tracetoforge --commit-dirty=true
    git add site && git commit

Before any deploy, check Cloudflare's deployment list and confirm the current
production deploy came from a commit on origin/main. If not, someone deployed
from a working copy: get their files into site/ first.
