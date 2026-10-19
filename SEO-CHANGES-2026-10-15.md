# SEO changes, 2026-10-15

Branch `seo-content-2026-10`, based on `production-snapshot-2026-10-15`. Nothing here has been deployed.
To ship it, upload `site/`. Before you upload, check the "Before deploy" list at the end.

## Per task

1. **`{' '}` leaks.** Root cause: `scripts/prerender.js` builds post HTML from the JSX source text with regexes. It stripped components and `className`, but it left JSX string-literal expressions untouched. Prettier-wrapped lines emit `{' '}`. React renders that as a space; the static HTML printed it literally (7 posts, 59 occurrences). The prerender now converts `{'…'}` / `{"…"}` to their text. It also **fails the build** if raw JSX (`{'`, `className=`, `style={{`, `{/*`, capitalised component tags) reaches a page.
2. **JSON-LD dates.** The prerender normalises `datePublished` and `dateModified` to `YYYY-MM-DD` and fails the build on any date it cannot parse. The 3 surviving posts with long-form dates (drawing-to-3d-object, gasket-maker-from-photo, measure-tool-from-photo-paper) now use ISO props, so the React-injected schema is ISO too. The real publish dates were kept. `updated` was set to 2026-10-15 only on posts whose title or body text changed: the 4 pillars, the comparison post, cutout, generator, reusable library, photo tips, kaizen, gridfinity-vs-packout, gridfinity-in-packout, how-to-organize, wera and wrench. Description-only posts (drawing, drill bit, gasket, knipex) kept their old `dateModified`.
3. **Byline.** The `Â·` mojibake was in `BlogPost.jsx`: the source file held a double-encoded `·`. It is fixed there. The static HTML was already correct UTF-8. The React byline now reads "By Chris Winland" to match the static "by Chris Winland". The static author box names Chris Winland. The React schema author URL now points to /about/.
4. **Titles and descriptions.** The seo.js titles and descriptions are now in the source, with the brand spelled "TracetoForge". A shared rule in `prerender.js` and `BlogPost.jsx` adds " | TracetoForge" only while the full title stays at or under 65 characters. This reproduces the seo.js titles exactly. Every blog title is now ≤ 60 characters without the suffix. Every description is ≤ 160 characters except the privacy and terms pages: those are legal pages, and the brief said not to touch them (169 and 162). og:/twitter tags carry the same text. The about, community, contact, editor and guide descriptions were trimmed in both `prerender.js` and the preserved `site/*/index.html`, because sync does not regenerate non-blog pages.
5. **Homepage** (`site/index.html`; this is the only source, because sync preserves it). Changed: the title, description, og:/twitter title and description, and og:site_name (now "TracetoForge"). Added Organization, WebSite and SoftwareApplication JSON-LD with the seo.js content. Nothing in the body changed. The unused prerendered landing in `dist/index.html` got the same title and description.
6. **Broken images.** The `img:` and `image:` references were removed. GearBox already falls back to the plain link row, so the boxes look the same, and the blog index never rendered `image`. The 26 missing files are listed below.
7. **Merges.** All four were merged, with 301s; details are below. The cutout and generator posts were retitled as requested. Cross-links:
   - The Packout pillar, gridfinity-in-packout-drawer and how-to-organize now all link to each other.
   - The photo→Gridfinity cluster (guide, cutout, generator, photo tips) and the image→STL cluster (image-to-stl, drawing-to-3d, gasket, measure) link both ways.
   - The React blog index (`BLOG_POSTS`) was stale, with 16 posts and old titles. It is now generated from the same 20-post list the static index uses.
8. **Comparison post.** The post covers TracetoForge, Tooltrace and GridPilot in depth and has a dedicated Tracefinity section, so the seo.js title is now the title and the H1. It also covers gridfinity.tools, which is mentioned in the blog-index excerpt. In the seo.js description I changed "fit accuracy" to "trace accuracy", because the post discusses trace accuracy but has no fit test. One existing body line said "up to five tools per bin"; it now says up to 12, which is the verified figure. The editor and guide copy got the same fix. No new competitor claims were added.
9. **`/editor/x` 404.** The rule was `/editor/*  /editor/index.html  200`. Pages answers `/editor/index.html` with a 308 to `/editor/`, so the rewrite target never resolves to an asset. Both the live site and tracetoforge.pages.dev returned 404 for `/editor/x` and `/editor/x/`. The rule is now `/editor/*  /editor/  200`, and it sits after the static 301s. The React route also had to change: it was `/editor`, which renders nothing for `/editor/x`, so it is now `/editor/*`. This could not be tested without deploying (wrangler and Cloudflare were off-limits). **After deploying, check that `curl -I https://tracetoforge.com/editor/x` returns 200.**
10. **Sitemap.** The 4 merged URLs were removed, leaving 29 URLs. `scripts/sync-site.js` now keeps a lastmod-per-release map and is idempotent.
    - Pages whose content or meta changed get 2026-10-15. That is 26 URLs: home, blog index, guide, editor, about, community, contact and 19 posts.
    - measure-tool-from-photo-paper keeps 2026-09-18.
    - privacy and terms keep 2026-09-14.
    - `public/sitemap.xml` was stale and is now a copy of `site/sitemap.xml`.
11. **Build and verify.** Ran `npm run build` and `node scripts/sync-site.js`. Every check below passed.
    - All 29 sitemap URLs have a file.
    - No raw JSX and no `Â` in any `site/` HTML.
    - All 104 JSON-LD blocks parse, every date is ISO, and the BlogPosting author is Chris Winland.
    - Titles and descriptions are within limits, apart from the legal pages noted in task 4.
    - Blog H1, og:title and title agree.
    - The homepage has Organization, WebSite and SoftwareApplication.
    - `_redirects` has all 8 301s and the editor rule, and `public/` matches `site/`.
    - No removed image path and no merged URL appears in any `site/` HTML, the new bundle (`index-DHY2Erw7.js`), `llms.txt` or the sitemap.
12. Commits are on `seo-content-2026-10` (see `git log`).

## Redirects (in `public/_redirects` and `site/_redirects`)

| Old URL (with and without trailing slash) | 301 to |
|---|---|
| /blog/packout-drawer-inserts/ | /blog/custom-milwaukee-packout-inserts-3d-print/ |
| /blog/gridfinity-insert-from-photo/ | /blog/photo-to-gridfinity-guide/ |
| /blog/tool-organizer-photo-to-stl/ | /blog/image-to-stl-converter-free/ |
| /blog/best-3d-printed-tool-organizer-ideas/ | /blog/3d-printed-tool-organizer-guide/ |

The old pages were deleted from `site/blog/` and `dist/blog/`, so no static file shadows the redirect.

## What moved into each pillar (existing repo content only)

- **Custom Milwaukee Packout Inserts: 3D Print Your Own**, taken from packout-drawer-inserts:
  - measuring the usable drawer interior
  - "Depth Is the Constraint That Bites"
  - "Three Ways to Fill a Packout Drawer"
  - the layout rules
  - full-drawer tray print settings
  - the test-coupon advice
- **Photo to Gridfinity**, taken from gridfinity-insert-from-photo:
  - the flatbed-scanner note
  - the parametric alternatives (Perplexing Labs generator, Fusion 360 plugin)
  - the first-layer print tip

  Skipped on purpose: unverified time, tolerance and pricing claims that the 2026-09-18 correction had removed.
- **Image to STL for Tool Outlines: Free Trace & Preview**, taken from tool-organizer-photo-to-stl:
  - the five-stage pipeline
  - "Which File Format Do You Need?"
  - output modes
  - common trace problems

  Also added: a short note that the tool extrudes outlines and does not make lithophanes or AI meshes. The "no account required for your first export" sentence now says no account is needed to trace and preview, which matches the post's own Quick Answer.
- **3D Printed Tool Organizer Ideas and Fit Guide**, taken from best-3d-printed-tool-organizer-ideas: the 10 organizer ideas, condensed. The audit suggested "(With Photos)", but there are no photos, so the title does not say that.

## Removed image paths (no files exist; supply real photos to restore)

The 12 blog card images were referenced by `BLOG_POSTS` in `src/pages/blog/BlogIndex.jsx` and never rendered:

- /blog/comparison.jpg
- /blog/foam-alternative.jpg
- /blog/gridfinity-cutout.jpg
- /blog/gridfinity-generator.jpg
- /blog/gridfinity-insert.jpg
- /blog/image-to-stl.jpg
- /blog/knipex-organizer.jpg
- /blog/organize-packout.jpg
- /blog/organizer-ideas.jpg
- /blog/packout-insert.jpg
- /blog/photo-to-stl.jpg
- /blog/tool-organizer-guide.jpg

The 14 gear thumbnails were `img:` entries on GearBox items. They belong in `public/gear/`, and they must be your own product photos (Amazon images may not be re-hosted).

| Image | Used in |
|---|---|
| /gear/calipers.webp | Packout pillar, PaperMeasure, PhotoToGridfinityGuide, PrintedToolOrganizer |
| /gear/cutting-mat.webp | PaperMeasure |
| /gear/digital-caliper.webp | DrawingTo3D, and the old packout-drawer-inserts post |
| /gear/drawer-liner.webp | the old packout-drawer-inserts post |
| /gear/gasket-material.webp | GasketMaker |
| /gear/knipex-8603.webp | KnipexOrganizer |
| /gear/knipex-cobra.webp | KnipexOrganizer, PhotoToGridfinityGuide |
| /gear/packout-3drawer.webp | Packout pillar |
| /gear/packout-organizer.webp | Packout pillar, KnipexOrganizer, PrintedToolOrganizer |
| /gear/petg-filament.webp | DrawingTo3D, PrintedToolOrganizer, and the old packout-drawer-inserts post |
| /gear/pla-filament.webp | PhotoToGridfinityGuide |
| /gear/punch-set.webp | GasketMaker |
| /gear/sharpie.webp | DrawingTo3D |
| /gear/tpu-filament.webp | GasketMaker |

To restore one, add the file to `public/gear/` and put back `img: '/gear/<name>.webp'` on the GearBox item.

## `git diff --stat production-snapshot-2026-10-15 -- site/`

41 files changed, 5060 insertions(+), 1647 deletions(-).

- Added: the new bundle `assets/index-DHY2Erw7.js` (+4418 lines) and `index-B7zH7uX_.css`. The live bundle `index-bIZWp0lk.js` is left in place for cached pages.
- Deleted: the 4 merged post pages.
- Rebuilt: the remaining 20 posts and the blog index.
- Edited directly in `site/`: `index.html` (head only), `_redirects`, `sitemap.xml`, `llms.txt`, and the about, community, contact, editor and guide pages (meta, plus the 12-tool fix).
- The other non-blog pages only had their asset hash swapped.

## Not done, or needs the owner

- **Real photos.** These are still the biggest content gap: the images listed above, plus screenshots of the trace and the printed result for the pillars.
- **The new bundle carries pre-existing undeployed source changes.** It also contains the `src/` edits that were already uncommitted or undeployed in the snapshot (Landing.jsx, index.css, adsterraConsent.js; see commit f392470). Review them before uploading.
- **Worker overrides.** Once this is live, remove the matching `ttf` overrides from the Worker's `seo.js`, or update them, because they would override the new text. In particular, its homepage JSON-LD would duplicate the blocks now in `site/index.html`, and it spells the brand "TraceToForge".
- **React-rendered pages.** `CommunityPage.jsx` sets its own `<title>` and description after React loads (via SEOHead), and that was not changed. The other non-blog React pages do not set head tags.
- **Legal pages.** The privacy and terms descriptions are 169 and 162 characters; they were left alone under the legal-pages rule.
- **Duplicate BlogPosting schema.** The rendered DOM still has 2 BlogPosting blocks, one prerendered and one injected by React. Both now carry the same ISO dates and author, and the duplicate is harmless.
- **`seo-cluster/`** planning files still mention the old slugs. They are historical notes, not site links, so they were left as they are.
