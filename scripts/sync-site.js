// Preserve the approved static landing while updating the React app and blog.
// Run after npm run build. Cloudflare Pages publishes site/, never dist/.
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const site = path.join(root, 'site'), dist = path.join(root, 'dist')
const built = fs.readFileSync(path.join(dist, 'editor/index.html'), 'utf8')
const js = built.match(/\/assets\/index-[\w-]+\.js/)[0]
const css = built.match(/\/assets\/index-[\w-]+\.css/)[0]
for (const asset of [js, css]) fs.copyFileSync(path.join(dist, asset.slice(1)), path.join(site, asset.slice(1)))
const extras = '<link rel="stylesheet" href="/forge-branding.css"><script src="/forge-branding.js" defer></script><script src="/forge-home-link.js"></script><link rel="icon" href="/forge-cube-r01.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-180.png">'
const meta = '<meta name="google-adsense-account" content="ca-pub-5879329589086028">'
const loader = /\s*<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*><\/script>/g
function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p=path.join(dir,e.name)
    if(e.isDirectory()){walk(p);continue}
    if(!p.endsWith('.html'))continue
    const rel=path.relative(site,p)
    let html=fs.readFileSync(p,'utf8')
    if(rel.startsWith('blog'+path.sep)) {
      html=fs.readFileSync(path.join(dist,rel),'utf8').replace('</head>',extras+'</head>')
    }
    html=html.replace(/\/assets\/index-[\w-]+\.js/g,js).replace(/\/assets\/index-[\w-]+\.css/g,css).replace(loader,'')
    if(!html.includes('google-adsense-account'))html=html.replace('</head>',meta+'</head>')
    // Preserve the existing analytics property on rebuilt editorial pages.
    if(rel.startsWith('blog'+path.sep) && !html.includes('G-DR28L813KR'))html=html.replace("gtag('config', 'AW-17969979491');", "gtag('config', 'AW-17969979491');\n      gtag('config', 'G-DR28L813KR');")
    fs.writeFileSync(p,html)
  }
}
// Posts merged into a pillar and 301-redirected in _redirects: drop their pages (before walk(),
// which rebuilds every site/blog page from dist/) and, below, their sitemap entries.
const merged=['packout-drawer-inserts','gridfinity-insert-from-photo','tool-organizer-photo-to-stl','best-3d-printed-tool-organizer-ideas']
for(const slug of merged)fs.rmSync(path.join(site,'blog',slug),{recursive:true,force:true})
walk(site)
// site/sitemap.xml is maintained here, not regenerated: only pages whose content changed get a new
// lastmod (re-running is idempotent). Add each release's changed paths under its date.
const lastmod={
  '2026-09-18':['/blog/measure-tool-from-photo-paper/'],
  '2026-10-15':['/','/blog/','/guide/','/editor/','/about/','/community/','/contact/','/blog/photo-to-gridfinity-guide/','/blog/knipex-pliers-organizer-3d-printed/','/blog/gridfinity-in-packout-drawer/','/blog/image-to-stl-converter-free/',
    '/blog/custom-milwaukee-packout-inserts-3d-print/','/blog/3d-printed-tool-organizer-guide/','/blog/tracetoforge-vs-tooltrace-vs-gridpilot/','/blog/gridfinity-custom-cutout-no-cad/',
    '/blog/gridfinity-generator-photo-vs-parametric/','/blog/reusable-tool-library-drawer-trays/','/blog/photo-tips-for-gridfinity-trace/','/blog/3d-printed-inserts-vs-kaizen-foam/',
    '/blog/gridfinity-vs-packout-vs-custom-tray/','/blog/how-to-organize-milwaukee-packout/','/blog/wera-screwdriver-gridfinity-bin/','/blog/wrench-set-gridfinity-bin/',
    '/blog/drawing-to-3d-object/','/blog/drill-bit-gridfinity-storage/','/blog/gasket-maker-from-photo/'],
}
let sitemap=fs.readFileSync(path.join(site,'sitemap.xml'),'utf8')
for(const [date,paths] of Object.entries(lastmod))for(const p of paths)sitemap=sitemap.replace(new RegExp('(<loc>https://tracetoforge.com'+p+'</loc>\\s*<lastmod>)[^<]+'), '$1'+date)
for(const slug of merged){
  sitemap=sitemap.replace(new RegExp('\\s*<url>\\s*<loc>https://tracetoforge.com/blog/'+slug+'/</loc>[\\s\\S]*?</url>'),'')
}
fs.writeFileSync(path.join(site,'sitemap.xml'),sitemap)
console.log('Updated deployable site with',js,css)
