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
walk(site)
// Only changed editorial pages receive a new lastmod, not every build.
const changed=['photo-to-gridfinity-guide','measure-tool-from-photo-paper','knipex-pliers-organizer-3d-printed','gridfinity-in-packout-drawer','image-to-stl-converter-free']
let sitemap=fs.readFileSync(path.join(site,'sitemap.xml'),'utf8')
for(const slug of changed)sitemap=sitemap.replace(new RegExp('(<loc>https://tracetoforge.com/blog/'+slug+'/</loc>\\s*<lastmod>)[^<]+'), '$12026-09-18')
fs.writeFileSync(path.join(site,'sitemap.xml'),sitemap)
console.log('Updated deployable site with',js,css)
