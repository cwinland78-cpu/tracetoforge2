#!/usr/bin/env node
/**
 * Pre-render static HTML pages for SEO.
 * Runs AFTER vite build. Reads the built index.html as a template,
 * then generates route-specific HTML files with unique titles,
 * descriptions, and content that Google can index.
 *
 * The React SPA still hydrates on top when JS loads.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')

// Read the built index.html to extract asset references
const builtHtml = readFileSync(join(DIST, 'index.html'), 'utf-8')

// Extract the JS and CSS asset filenames from the built HTML
const jsMatch = builtHtml.match(/src="(\/assets\/index-[^"]+\.js)"/)
const cssMatch = builtHtml.match(/href="(\/assets\/index-[^"]+\.css)"/)
const jsAsset = jsMatch ? jsMatch[1] : '/assets/index.js'
const cssAsset = cssMatch ? cssMatch[1] : '/assets/index.css'

console.log(`[prerender] JS asset: ${jsAsset}`)
console.log(`[prerender] CSS asset: ${cssAsset}`)

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function makePage({ title, description, canonical, ogTitle, ogType = 'website', h1, bodyHtml, articleSchema }) {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "TracetoForge",
      url: "https://tracetoforge.com",
      description: "Browser-based tool that converts photos of tools into 3D-printable STL tray inserts and Gridfinity bins. No CAD experience required.",
      applicationCategory: "DesignApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Photo-based automatic tool outline detection",
        "Custom tray insert generation",
        "Gridfinity-compatible bin export",
        "STL, 3MF, SVG, DXF export",
        "Real-time 3D preview"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TracetoForge",
      url: "https://tracetoforge.com",
      logo: "https://tracetoforge.com/icon-512.png",
      description: "Photo-to-print tool insert generator for 3D printing.",
      sameAs: ["https://www.etsy.com/shop/TracetoForge"],
      founder: { "@type": "Person", name: "Chris Winland" }
    }
  ]

  if (articleSchema) schemas.push(articleSchema)

  const schemaBlocks = schemas.map(s =>
    `    <script type="application/ld+json">\n    ${JSON.stringify(s, null, 2).split('\n').join('\n    ')}\n    </script>`
  ).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17969979491"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-17969979491');
    </script>
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/icon-512.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="author" content="TracetoForge" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(ogTitle || title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="https://tracetoforge.com/og-twitter.jpg" />
    <meta property="og:site_name" content="TracetoForge" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${canonical}" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle || title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="https://tracetoforge.com/og-twitter.jpg" />
${schemaBlocks}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <script type="module" crossorigin src="${jsAsset}"></script>
    <link rel="stylesheet" crossorigin href="${cssAsset}">
  </head>
  <body>
    <div id="root">
      <h1>${escapeHtml(h1)}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`
}

function writePage(route, html) {
  const dir = join(DIST, ...route.split('/').filter(Boolean))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  console.log(`[prerender] ${route}/index.html`)
}

// ============================================================
// PAGE DEFINITIONS
// ============================================================

// Landing page (overwrite dist/index.html)
const landingHtml = makePage({
  title: 'Turn Tool Photos into 3D Printable Inserts | TracetoForge',
  description: 'Snap a photo of any tool, auto-trace it, and export STL, 3MF, SVG, or DXF files. Custom inserts for Packout, Gridfinity, and more. Free, no CAD needed.',
  canonical: 'https://tracetoforge.com',
  ogTitle: 'TracetoForge - Photo to Print-Ready STL, 3MF, SVG & DXF',
  h1: 'TracetoForge: Turn Any Tool Photo Into a Custom-Fit Insert',
  bodyHtml: `
      <p>Snap a photo of any tool, auto-trace the outline, and export STL, 3MF, SVG, or DXF files. Custom tray inserts and Gridfinity bins in minutes. No CAD skills needed.</p>
      <h2>How It Works</h2>
      <p>Place your tool on a sheet of paper. Take a photo with your phone. Upload to TracetoForge and the edge detection finds the outline automatically. Fine-tune with simple click-and-drag controls. See your insert in full 3D before exporting. Download STL, 3MF, SVG, or DXF files for any 3D printer, laser cutter, or CNC router.</p>
      <h2>Export Formats</h2>
      <p>TracetoForge exports STL files for 3D printing, 3MF for multi-material prints, SVG for laser cutting foam inserts, and DXF for CNC machining. Works with Milwaukee Packout, Gridfinity, DeWalt ToughSystem, and more.</p>
      <h2>Insert Modes</h2>
      <p>Custom Tray: Rectangular or oval tray with a precision-cut cavity. Set wall height, thickness, and edge chamfers. Gridfinity Bin: Standard Gridfinity-compatible insert with proper base profile, stacking lip, and grid alignment. 3D Object: Just the extruded shape for custom mounts, templates, or prototyping.</p>
      <h2>Why TracetoForge?</h2>
      <p>No more spending hours in Fusion 360 for a single tray. No more hand-cutting foam with a knife. No more buying generic inserts that do not fit your tools. Every insert is custom-shaped to your exact tools. Print unlimited custom inserts for pennies in filament.</p>
      <p><a href="/editor">Try the Editor Free</a> | <a href="/blog">Read the Blog</a> | <a href="/guide">Getting Started Guide</a></p>`
})
writeFileSync(join(DIST, 'index.html'), landingHtml)
console.log('[prerender] /index.html (landing)')

// Guide
writePage('/guide', makePage({
  title: 'Getting Started Guide | TracetoForge',
  description: 'Step-by-step guide to creating custom 3D-printable tool inserts from photos with TracetoForge. Photo, trace, export, print.',
  canonical: 'https://tracetoforge.com/guide',
  ogTitle: 'TracetoForge Getting Started Guide',
  h1: 'TracetoForge: Getting Started Guide',
  bodyHtml: `
      <p>A step-by-step walkthrough for creating custom 3D-printable tool inserts with TracetoForge. No CAD experience needed.</p>
      <h2>Step 1: Take a Good Photo</h2>
      <p>Place your tool on a solid, contrasting background. White paper on a dark surface works great. Shoot from directly above, keeping the camera as level as possible. Make sure the entire tool is in frame with some margin. Good lighting helps the edge detection.</p>
      <h2>Step 2: Trace the Outline</h2>
      <p>After uploading, TracetoForge automatically detects the tool outline using edge detection. Use the Threshold and Sensitivity sliders to fine-tune. If auto-detection misses part of the outline, adjust the Simplification slider.</p>
      <h2>Step 3: Set Real Dimensions</h2>
      <p>Click the dimension tool and set the actual size of your tool or the paper reference. This lets TracetoForge convert pixel measurements into real-world millimeters for accurate exports.</p>
      <h2>Step 4: Choose Your Insert Mode</h2>
      <p>Select Custom Tray for rectangular inserts with adjustable walls. Choose Gridfinity Bin for standard-compatible bins with proper base profiles. Pick 3D Object for just the extruded tool shape.</p>
      <h2>Step 5: Export and Print</h2>
      <p>Download STL for standard 3D printing, 3MF for multi-material, SVG for laser cutting, or DXF for CNC. Slice with your preferred slicer and print.</p>
      <p><a href="/editor">Open the Editor</a></p>`
}))

// Editor
writePage('/editor', makePage({
  title: 'Tool Insert Editor - Upload Photo & Export STL | TracetoForge',
  description: 'Upload a photo of your tool and create a custom 3D-printable insert. Export STL, 3MF, SVG, or DXF. Works with Packout, Gridfinity, and custom trays.',
  canonical: 'https://tracetoforge.com/editor',
  ogTitle: 'TracetoForge Editor - Photo to 3D Insert',
  h1: 'TracetoForge Editor',
  bodyHtml: `
      <p>Upload a photo of your tool to create a custom 3D-printable insert. Supports STL, 3MF, SVG, and DXF export. Compatible with Milwaukee Packout, Gridfinity, DeWalt ToughSystem, and custom trays.</p>
      <p><a href="/">Learn more about TracetoForge</a> | <a href="/guide">Getting Started Guide</a></p>`
}))

// Blog Index
const blogPosts = [
  { slug: 'custom-milwaukee-packout-inserts-3d-print', title: 'How to Make Custom Milwaukee Packout Inserts with a 3D Printer', excerpt: 'Stop buying $40 generic inserts. Learn how to create perfectly fitted, custom Packout inserts from a photo.' },
  { slug: 'gridfinity-insert-from-photo', title: 'Create Gridfinity Inserts from a Photo: The Fastest Way in 2026', excerpt: 'Forget hours of CAD work. Snap a photo and generate a perfectly fitted Gridfinity insert in minutes.' },
  { slug: 'tool-organizer-photo-to-stl', title: 'Photo to STL: Turn Any Tool Photo into a 3D Printable Organizer', excerpt: 'A complete guide to converting photos into print-ready STL, 3MF, SVG, and DXF files.' },
  { slug: 'gridfinity-vs-packout-vs-custom-tray', title: 'Gridfinity vs Milwaukee Packout vs Custom Trays: Which Is Best?', excerpt: 'A practical comparison of the three most popular tool insert systems for 3D printing.' },
  { slug: 'best-3d-printed-tool-organizer-ideas', title: '10 Best 3D Printed Tool Organizer Ideas for Your Workshop in 2026', excerpt: 'Socket holders, drill bit racks, wrench organizers, and custom inserts for any workshop.' },
  { slug: '3d-printed-inserts-vs-kaizen-foam', title: '3D Printed Tool Inserts vs Kaizen Foam: Why Foam Is Losing', excerpt: 'Cost breakdown, durability comparison, and why 3D printed inserts are replacing foam.' },
  { slug: 'how-to-organize-milwaukee-packout', title: 'How to Organize a Milwaukee Packout Like a Pro', excerpt: 'A practical guide with 3D printed inserts, Gridfinity bins, and smart layouts.' },
  { slug: 'image-to-stl-converter-free', title: 'Image to STL Converter: Turn Any Photo into a 3D Printable File for Free', excerpt: 'Convert photos of tools into STL files for 3D printing. No CAD skills needed. Free browser-based converter.' },
  { slug: 'gridfinity-custom-cutout-no-cad', title: 'Gridfinity Custom Cutouts Without CAD: The Photo-Based Method', excerpt: 'Create custom Gridfinity bin cutouts from photos of your tools. No Fusion 360, no TinkerCAD. Just a photo and 2 minutes.' },
  { slug: '3d-printed-tool-organizer-guide', title: '3D Printed Tool Organizer: The Complete Guide to Custom Workshop Storage', excerpt: 'Everything you need to know about 3D printed tool organizers. Design methods, filament choices, and custom inserts from photos.' },
  { slug: 'knipex-pliers-organizer-3d-printed', title: 'Knipex Pliers Organizer: 3D Printed Inserts for Cobra, Pliers Wrench, and More', excerpt: 'Custom 3D printed organizer inserts for Knipex Cobra, Pliers Wrench, TwinGrip. Gridfinity and Packout compatible.' },
]

const blogListHtml = blogPosts.map(p =>
  `      <article><h3><a href="/blog/${p.slug}">${escapeHtml(p.title)}</a></h3><p>${escapeHtml(p.excerpt)}</p></article>`
).join('\n')

writePage('/blog', makePage({
  title: 'Blog - 3D Printing Tool Organization Tips | TracetoForge',
  description: 'Guides and tutorials on 3D printing custom tool inserts, Gridfinity bins, Milwaukee Packout organizers, and workshop organization.',
  canonical: 'https://tracetoforge.com/blog',
  ogTitle: 'TracetoForge Blog - 3D Printing Tool Organization',
  h1: 'TracetoForge Blog',
  bodyHtml: `
      <p>Guides and tutorials on creating custom tool inserts with 3D printing. Milwaukee Packout, Gridfinity, and more.</p>
${blogListHtml}
      <p><a href="/">Back to TracetoForge</a></p>`
}))

// Individual Blog Posts - extract content from JSX source files
import { readdirSync } from 'fs'

const postConfigs = [
  { slug: 'custom-milwaukee-packout-inserts-3d-print', file: 'PackoutInserts.jsx' },
  { slug: 'gridfinity-insert-from-photo', file: 'GridfinityFromPhoto.jsx' },
  { slug: 'tool-organizer-photo-to-stl', file: 'PhotoToSTL.jsx' },
  { slug: 'gridfinity-vs-packout-vs-custom-tray', file: 'ComparisonPost.jsx' },
  { slug: 'best-3d-printed-tool-organizer-ideas', file: 'OrganizerIdeas.jsx' },
  { slug: '3d-printed-inserts-vs-kaizen-foam', file: 'FoamAlternative.jsx' },
  { slug: 'how-to-organize-milwaukee-packout', file: 'OrganizePackout.jsx' },
  { slug: 'image-to-stl-converter-free', file: 'ImageToSTL.jsx' },
  { slug: 'gridfinity-custom-cutout-no-cad', file: 'GridfinityCustomCutout.jsx' },
  { slug: '3d-printed-tool-organizer-guide', file: 'PrintedToolOrganizer.jsx' },
  { slug: 'knipex-pliers-organizer-3d-printed', file: 'KnipexOrganizer.jsx' },
]

function extractMeta(jsxContent) {
  const title = jsxContent.match(/title="([^"]*)"/)?.[1] || ''
  const desc = jsxContent.match(/description="([^"]*)"/)?.[1] || ''
  const canonical = jsxContent.match(/canonical="([^"]*)"/)?.[1] || ''
  const date = jsxContent.match(/date="([^"]*)"/)?.[1] || ''
  const tagsMatch = jsxContent.match(/tags=\{\[([^\]]*)\]\}/)
  const tags = tagsMatch ? tagsMatch[1].match(/'([^']+)'/g)?.map(t => t.replace(/'/g, '')) || [] : []
  return { title, desc, canonical, date, tags }
}

function extractArticleContent(jsxContent) {
  // Get content after the BlogPost opening tag's children
  const match = jsxContent.match(/>\s*\n([\s\S]*?)(?:\n\s*<\/BlogPost>|\n\s*<\/>)/)
  if (!match) return ''
  let content = match[1]

  // Convert Link to a tags
  content = content.replace(/<Link\s+to="([^"]*)"[^>]*>/g, '<a href="$1">')
  content = content.replace(/<\/Link>/g, '</a>')

  // Remove React components and JSX expressions
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '')
  content = content.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, '')
  content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  // Remove className attributes
  content = content.replace(/\s+className="[^"]*"/g, '')
  content = content.replace(/\s+className='[^']*'/g, '')
  content = content.replace(/\s+className=\{[^}]*\}/g, '')

  return content.trim()
}

const blogSrcDir = join(__dirname, '..', 'src', 'pages', 'blog')

for (const post of postConfigs) {
  const srcPath = join(blogSrcDir, post.file)
  if (!existsSync(srcPath)) {
    console.log(`[prerender] SKIP ${post.slug} - source not found: ${srcPath}`)
    continue
  }

  const jsx = readFileSync(srcPath, 'utf-8')
  const meta = extractMeta(jsx)
  const articleContent = extractArticleContent(jsx)

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.desc,
    url: meta.canonical,
    datePublished: meta.date,
    dateModified: meta.date,
    author: { "@type": "Person", name: "Chris Winland", url: "https://tracetoforge.com" },
    publisher: {
      "@type": "Organization",
      name: "TracetoForge",
      url: "https://tracetoforge.com",
      logo: { "@type": "ImageObject", url: "https://tracetoforge.com/icon-512.png" }
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": meta.canonical },
    keywords: meta.tags.join(', ')
  }

  writePage(`/blog/${post.slug}`, makePage({
    title: `${meta.title} | TracetoForge Blog`,
    description: meta.desc,
    canonical: meta.canonical,
    ogTitle: meta.title,
    ogType: 'article',
    h1: meta.title,
    bodyHtml: `
      <p>Published ${meta.date} by Chris Winland</p>
      <article>
${articleContent}
      </article>
      <p><a href="/blog">Back to Blog</a> | <a href="/editor">Try TracetoForge Free</a></p>`,
    articleSchema
  }))
}

// Update sitemap
const today = new Date().toISOString().split('T')[0]
const sitemapUrls = [
  { loc: 'https://tracetoforge.com', freq: 'weekly', priority: '1.0' },
  { loc: 'https://tracetoforge.com/editor', freq: 'weekly', priority: '0.9' },
  { loc: 'https://tracetoforge.com/guide', freq: 'monthly', priority: '0.8' },
  { loc: 'https://tracetoforge.com/blog', freq: 'weekly', priority: '0.9' },
  ...postConfigs.map(p => ({
    loc: `https://tracetoforge.com/blog/${p.slug}`,
    freq: 'monthly',
    priority: '0.8'
  }))
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

writeFileSync(join(DIST, 'sitemap.xml'), sitemap)
console.log('[prerender] sitemap.xml updated')
console.log('[prerender] Done!')
