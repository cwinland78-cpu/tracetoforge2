# TracetoForge: rules for every Claude session (Claude Code, chat, Cowork)

GitHub `main` (cwinland78-cpu/tracetoforge2) is the single source of truth. Production must always equal origin/main.

## Before you change anything
1. `git fetch origin && git pull --rebase origin main`. Never start from an old clone or snapshot.

## To ship
1. Make the change, `npm run build`, `node scripts/sync-site.js`.
2. Commit source, then commit dist/ + site/ as a second commit.
3. `git pull --rebase origin main` again (someone else may have shipped), rebuild if it pulled anything, then `git push origin main`.
4. Deploy ONLY with `scripts/deploy-site.sh`. It refuses unless your checkout is exactly origin/main.
   Never run `wrangler pages deploy` by hand. Never deploy dist/ (site/ is the deploy target).

If push is rejected, someone else shipped first: pull --rebase, resolve, rebuild, push. Never force-push main.

## Why
Oct 11-16, 2026: a session deployed unpushed commits built on week-old code and wiped undo, lids and the stacking lock from production for six days.
