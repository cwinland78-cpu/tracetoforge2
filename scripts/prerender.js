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

// Add FAQPage schema for landing page
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does TracetoForge convert a photo to an STL file?",
      acceptedAnswer: { "@type": "Answer", text: "Place your tool on a sheet of paper, take a top-down photo with your phone, and upload it. TracetoForge uses OpenCV edge detection to trace the tool outline automatically. The outline is then extruded into a 3D model and exported as an STL, 3MF, SVG, or DXF file. All processing happens in your browser — no uploads to any server." }
    },
    {
      "@type": "Question",
      name: "What tool storage systems does TracetoForge support?",
      acceptedAnswer: { "@type": "Answer", text: "TracetoForge exports inserts compatible with Milwaukee Packout, Gridfinity (42mm standard grid), DeWalt ToughSystem, DeWalt TSTAK, Ridgid Pro Gear, Makita MakTrak, Flex Stack Pack, Klein ModBox, Bosch L-Boxx, Festool Systainer, Kobalt, Husky, Craftsman, Snap-on, Harbor Freight, and any custom-dimension toolbox drawer." }
    },
    {
      "@type": "Question",
      name: "Is TracetoForge free to use?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. Tracing and 3D previewing are always free with no account required. You get 3 free export credits when you sign up. Additional credits are available in packs: 5 for $9.99 or 20 for $34.99. Credits never expire." }
    },
    {
      "@type": "Question",
      name: "Do I need CAD experience to use TracetoForge?",
      acceptedAnswer: { "@type": "Answer", text: "No. TracetoForge is designed for makers, tradespeople, and DIYers with zero CAD experience. The entire workflow is photo-based: snap a photo, adjust the auto-generated trace if needed, set dimensions, and export. Average time from photo to printable file is under 2 minutes." }
    },
    {
      "@type": "Question",
      name: "What is the best filament for 3D printed tool inserts?",
      acceptedAnswer: { "@type": "Answer", text: "PETG is recommended for most tool inserts. It handles temperatures up to 80°C, making it safe for vehicle-mounted toolboxes and garages. PLA works for indoor workshop use but warps in heat above 60°C. ABS and ASA offer higher heat resistance for industrial applications." }
    },
    {
      "@type": "Question",
      name: "Can I buy pre-made 3D printed tool inserts instead of printing my own?",
      acceptedAnswer: { "@type": "Answer", text: "Yes. TracetoForge sells precision-fit PETG tool inserts on Amazon and Etsy. Each insert is traced from the actual tool for guaranteed fit. Available for Gridfinity and Milwaukee Packout systems, with inserts for Knipex, Klein, Wera, Milwaukee, and other popular tool brands." }
    }
  ]
}

const landingHtml = makePage({
  title: 'Custom Gridfinity Inserts From a Photo | TracetoForge',
  description: 'Create custom Gridfinity inserts from a photo of your tools. Auto-trace, export STL, 3MF, SVG, or DXF. Also works with Milwaukee Packout. Free, no CAD needed.',
  canonical: 'https://tracetoforge.com',
  ogTitle: 'TracetoForge - Custom Gridfinity Inserts From a Photo',
  h1: 'Custom Gridfinity Inserts From a Photo — No CAD Needed',
  bodyHtml: `
      <p>Create custom Gridfinity bins with precision tool cutouts from a simple photo. Snap a photo of any tool, auto-trace the outline, and export a Gridfinity-compatible insert as STL, 3MF, SVG, or DXF. Also works with Milwaukee Packout, DeWalt ToughSystem, and any custom tray. No CAD skills needed.</p>
      <h2>How It Works</h2>
      <p>Place your tool on a sheet of paper. Take a photo with your phone. Upload to TracetoForge and the edge detection finds the outline automatically. The app generates a Gridfinity bin with the correct 42mm grid spacing, standard base profile, and a cavity shaped exactly like your tool. Fine-tune with simple controls, preview in 3D, and export.</p>
      <h2>Export Formats</h2>
      <p>TracetoForge exports Gridfinity-compatible STL files for 3D printing, 3MF for multi-material prints, SVG for laser cutting foam inserts, and DXF for CNC machining. Every export includes the proper Gridfinity base profile, stacking lip, and 42mm grid alignment.</p>
      <h2>Insert Modes</h2>
      <p>Gridfinity Bin: The most popular mode. Standard Gridfinity-compatible insert with proper base profile, stacking lip, and grid alignment. Drops right into any Gridfinity baseplate. Custom Tray: Rectangular or oval tray with a precision-cut cavity for Milwaukee Packout, DeWalt ToughSystem, or any toolbox drawer. 3D Object: Just the extruded shape for custom mounts, templates, or prototyping.</p>
      <h2>Why TracetoForge for Gridfinity?</h2>
      <p>Most Gridfinity generators are parametric: you type in dimensions and get a bin with rectangular dividers. TracetoForge is a photo-based Gridfinity generator. Snap a photo of your real tool, and the app generates a Gridfinity bin with a precision cutout shaped exactly like your tool. No parametric inputs, no CAD, no manual measurement. The Gridfinity ecosystem has thousands of generic bins, but when you need a cutout shaped exactly like your Knipex Cobra pliers or your Wera Kraftform screwdriver, a parametric generator cannot help. TracetoForge creates precision Gridfinity cutouts from a photo in under 2 minutes.</p>
      <h2>Compatible Tool Storage Systems</h2>
      <p>Milwaukee Packout, Gridfinity, DeWalt ToughSystem 2.0, DeWalt TSTAK, Ridgid Pro Gear 2.0, Makita MakTrak, Flex Stack Pack, Klein ModBox, Bosch L-Boxx, Festool Systainer, Makita MakPac, Kobalt, Husky, Craftsman, Stanley FatMax, Harbor Freight US General, and Snap-on. Works with any 3D printer, laser cutter, or CNC router.</p>
      <h2>Custom Inserts for Any Tool</h2>
      <p>Create precision-fit organizer inserts for pliers, screwdrivers, socket sets, ratchets, wrenches, utility knives, hex keys, wire strippers, multimeters, drill bits, tape measures, chisels, files, flashlights, and more. Works as a foam organizer alternative. Replace kaizen foam with 3D printed inserts for your tool drawer, tool chest, or garage storage.</p>
      <h2>Guides and Tutorials</h2>
      <ul>
        <li><a href="/blog/image-to-stl-converter-free">Image to STL Converter: Free, No CAD Needed</a></li>
        <li><a href="/blog/gridfinity-custom-cutout-no-cad">Gridfinity Custom Cutouts Without CAD</a></li>
        <li><a href="/blog/3d-printed-tool-organizer-guide">3D Printed Tool Organizer: Complete Guide</a></li>
        <li><a href="/blog/knipex-pliers-organizer-3d-printed">Knipex Pliers Organizer: 3D Printed Inserts</a></li>
        <li><a href="/blog/gridfinity-insert-from-photo">Create Gridfinity Inserts from a Photo</a></li>
        <li><a href="/blog/gridfinity-generator-photo-vs-parametric">Gridfinity Generator: Photo-Based vs Parametric</a></li>
        <li><a href="/blog/custom-milwaukee-packout-inserts-3d-print">Custom Milwaukee Packout Inserts</a></li>
        <li><a href="/blog/gridfinity-vs-packout-vs-custom-tray">Gridfinity vs Packout vs Custom Trays</a></li>
        <li><a href="/blog/best-3d-printed-tool-organizer-ideas">Best 3D Printed Tool Organizer Ideas</a></li>
        <li><a href="/blog/3d-printed-inserts-vs-kaizen-foam">3D Printed Inserts vs Kaizen Foam</a></li>
        <li><a href="/blog/how-to-organize-milwaukee-packout">How to Organize a Milwaukee Packout</a></li>
        <li><a href="/blog/tool-organizer-photo-to-stl">Photo to STL Tool Organizer Guide</a></li>
      </ul>
      <h2>Buy Ready-Made Inserts</h2>
      <p>No 3D printer? Buy precision-fit PETG tool inserts on <a href="https://www.amazon.com/s?k=TracetoForge">Amazon</a> and <a href="https://www.etsy.com/shop/TracetoForge">Etsy</a>. Gridfinity and Milwaukee Packout compatible. Inserts for Knipex Cobra, Knipex Pliers Wrench, Klein wire strippers, Wera screwdrivers, Milwaukee hand tools, and more.</p>
      <h2>Frequently Asked Questions</h2>
      <h3>How does TracetoForge convert a photo to an STL file?</h3>
      <p>Place your tool on a sheet of paper, take a top-down photo, and upload it. TracetoForge uses OpenCV edge detection to trace the outline automatically. The outline is extruded into a 3D model and exported as STL, 3MF, SVG, or DXF. All processing happens in your browser.</p>
      <h3>What tool storage systems are supported?</h3>
      <p>Milwaukee Packout, Gridfinity, DeWalt ToughSystem, TSTAK, Ridgid Pro Gear, Makita MakTrak, Flex Stack Pack, Klein ModBox, Bosch L-Boxx, Festool Systainer, and any custom-dimension toolbox drawer.</p>
      <h3>Is TracetoForge free?</h3>
      <p>Tracing and 3D previewing are always free. You get 3 free export credits on signup. Additional credits: 5 for $9.99 or 20 for $34.99. Credits never expire.</p>
      <h3>Do I need CAD experience?</h3>
      <p>No. The entire workflow is photo-based. Snap a photo, adjust the trace, set dimensions, export. Under 2 minutes from photo to printable file.</p>
      <h3>What filament should I use for tool inserts?</h3>
      <p>PETG is recommended. It handles temperatures up to 80C, making it safe for vehicle toolboxes. PLA works for indoor use but warps in heat above 60C.</p>
      <p><a href="/editor">Try the Editor Free</a> | <a href="/blog">Read the Blog</a> | <a href="/guide">Getting Started Guide</a></p>`,
  articleSchema: faqSchema
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
  { slug: 'gridfinity-generator-photo-vs-parametric', title: 'Gridfinity Generator: Photo-Based vs Parametric — Which Is Better?', excerpt: 'Compare the best Gridfinity generators. Parametric tools for simple bins vs photo-based generators for precision tool cutouts.' },
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
  { slug: 'gridfinity-generator-photo-vs-parametric', file: 'GridfinityGenerator.jsx' },
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
