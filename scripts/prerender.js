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
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5879329589086028" crossorigin="anonymous"></script>
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
      acceptedAnswer: { "@type": "Answer", text: "Yes. Tracing and 3D previewing are always free with no account required. You get 3 free export credits when you sign up. Additional credits are available in packs: 20 for $9.99 or 100 for $34.99. Credits never expire." }
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
  title: 'Custom Tool Drawer Organizer From a Photo | TracetoForge',
  description: 'Design custom wrench, plier, screwdriver, and hammer drawer trays from a photo of your tools. Auto-trace, export STL, 3MF, SVG, or DXF. Gridfinity supported. Free, no CAD needed.',
  canonical: 'https://tracetoforge.com',
  ogTitle: 'TracetoForge - Custom Tool Drawer Trays From a Photo',
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
      <p>No 3D printer? Buy precision-fit PETG tool inserts on <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&rh=n%3A553240">Amazon</a> and <a href="https://www.etsy.com/shop/TracetoForge">Etsy</a>. Gridfinity and Milwaukee Packout compatible. Inserts for Knipex Cobra, Knipex Pliers Wrench, Klein wire strippers, Wera screwdrivers, Milwaukee hand tools, and more.</p>
      <h2>Frequently Asked Questions</h2>
      <h3>How does TracetoForge convert a photo to an STL file?</h3>
      <p>Place your tool on a sheet of paper, take a top-down photo, and upload it. TracetoForge uses OpenCV edge detection to trace the outline automatically. The outline is extruded into a 3D model and exported as STL, 3MF, SVG, or DXF. All processing happens in your browser.</p>
      <h3>What tool storage systems are supported?</h3>
      <p>Milwaukee Packout, Gridfinity, DeWalt ToughSystem, TSTAK, Ridgid Pro Gear, Makita MakTrak, Flex Stack Pack, Klein ModBox, Bosch L-Boxx, Festool Systainer, and any custom-dimension toolbox drawer.</p>
      <h3>Is TracetoForge free?</h3>
      <p>Tracing and 3D previewing are always free. You get 3 free export credits on signup. Additional credits: 20 for $9.99 or 100 for $34.99. Credits never expire.</p>
      <h3>Do I need CAD experience?</h3>
      <p>No. The entire workflow is photo-based. Snap a photo, adjust the trace, set dimensions, export. Under 2 minutes from photo to printable file.</p>
      <h3>What filament should I use for tool inserts?</h3>
      <p>PETG is recommended. It handles temperatures up to 80C, making it safe for vehicle toolboxes. PLA works for indoor use but warps in heat above 60C.</p>
      <h2>About TracetoForge</h2>
      <p>TracetoForge is a small maker project run out of Northeast Ohio, operated by Qwikymart LLC. It started as a personal fix for a messy tool drawer and turned into a browser-based editor that other makers could use. One person writes the code, answers the support email, and packs the physical inserts that ship from the shop. No venture capital, no outsourced copywriting, no bloat. Every feature in the editor exists because someone hit a wall trying to do it another way. <a href="/about/">Read the full story</a> or <a href="/contact/">get in touch</a>.</p>

      <p><a href="/editor">Try the Editor Free</a> | <a href="/blog">Read the Blog</a> | <a href="/guide">Getting Started Guide</a> | <a href="/about/">About</a> | <a href="/contact/">Contact</a></p>`,
  articleSchema: faqSchema
})
writeFileSync(join(DIST, 'index.html'), landingHtml)
console.log('[prerender] /index.html (landing)')

// Guide
writePage('/guide', makePage({
  title: 'Getting Started Guide | TracetoForge',
  description: 'Step-by-step guide to creating custom 3D-printable tool inserts from photos with TracetoForge. Photo, trace, dimensions, export, and print. No CAD experience needed.',
  canonical: 'https://tracetoforge.com/guide/',
  ogTitle: 'TracetoForge Getting Started Guide',
  h1: 'TracetoForge: Getting Started Guide',
  bodyHtml: `
      <p>This guide walks you through every stage of creating a custom 3D-printable tool insert with TracetoForge, from taking the photo to printing the finished part. The whole process takes around two minutes per tool once you know the workflow. No CAD experience is needed.</p>

      <h2>What You Will Need</h2>
      <p>Before you start, gather a smartphone with a working camera, a sheet of plain white paper (A4 or US Letter), the tool you want to make an insert for, and a 3D printer with PETG or PLA filament. If you do not own a 3D printer, you can still trace and preview the insert for free, then send the exported STL to a print service or buy ready-made inserts from our shop.</p>

      <h2>Step 1: Take a Good Photo</h2>
      <p>Place the tool flat on a sheet of white paper on a non-reflective surface. The white paper does two jobs: it gives the edge detector a clean contrast against your tool, and it acts as a known-size reference so the editor can convert pixels to millimeters.</p>
      <p>Hold your phone directly above the tool, as level as possible. Get high enough that the tool fills about half the frame, with the entire tool plus all four corners of the paper visible. Use diffused lighting (overhead room light or soft natural light from a window). Avoid harsh direct shadows and avoid glare on shiny chrome tools — a piece of tracing paper or a thin t-shirt over a lamp diffuses light nicely.</p>
      <p>Common photo problems and fixes: blurry photo (hold phone steadier or use a tripod); shadow falling across the tool (move the light source overhead); part of tool cut off (zoom out); shiny tool reflecting the camera (rotate the tool slightly or use diffuse light); paper edges cropped (zoom out and recompose).</p>

      <h2>Step 2: Upload and Auto-Trace</h2>
      <p>Open the <a href="/editor">TracetoForge editor</a> and drag your photo onto the upload area. The editor loads OpenCV.js and processes the image entirely in your browser. After a moment, you will see your photo with a red outline showing the detected tool boundary.</p>
      <p>If the trace looks right, move on. If it missed parts of the outline, included background noise, or picked up shadows, adjust the Sensitivity slider. Lower values (1-2) use Otsu thresholding, ideal when you have strong contrast (dark tool on white paper). Mid-range (3-8) uses Canny edge detection, the safe default. Higher values (9-10) use adaptive thresholding for low-contrast or shadowed photos.</p>
      <p>The Simplification slider controls how many anchor points the trace uses. Higher simplification means a smoother outline with fewer points, which prints faster and more reliably. Lower simplification preserves fine detail.</p>

      <h2>Step 3: Set Real Dimensions</h2>
      <p>Click the dimension tool and either enter the actual length of your tool in millimeters, or click two corners of the paper to set scale automatically using the known paper size. This calibration is critical: without it, the editor has no way to know whether your tool is a 100mm pair of pliers or a 300mm pair of bolt cutters.</p>

      <h2>Step 4: Choose Your Insert Mode</h2>
      <p>TracetoForge offers three output modes:</p>
      <p><strong>Custom Tray</strong> creates a rectangular or oval tray with adjustable wall thickness, depth, and dimensions. Use this for Milwaukee Packout, DeWalt ToughSystem, or any custom toolbox drawer. Enter your drawer's interior dimensions and the tool cavity is cut into the tray.</p>
      <p><strong>Gridfinity Bin</strong> generates a Gridfinity-compatible bin with the standard 42mm grid spacing and proper base profile. Drops directly into any Gridfinity baseplate. The cavity is cut from the tool outline.</p>
      <p><strong>3D Object</strong> exports just the extruded tool shape. Useful for shadow boards, foam templates, or custom mounts.</p>

      <h2>Step 5: Fine-Tune Tolerance and Notches</h2>
      <p>The Tolerance slider adds clearance around your tool so it slides in and out without sticking. Start at 0.5mm and adjust based on your printer's calibration. Tighter prints can use 0.3mm; looser prints might need 0.7mm.</p>
      <p>Add a Finger Notch if you want a curved cutout for grabbing the tool. The notch can be positioned at either end of the tool cavity. For multiple tools in one tray, each tool can have its own independent notch.</p>

      <h2>Step 6: Add Multiple Tools (Optional)</h2>
      <p>Up to five tools fit in a single insert. Click "Add Tool" and trace a new photo. Each tool can be repositioned by dragging in the 3D preview. Each has independent settings for cavity depth, tolerance, rotation, and finger notch. This is the fastest way to build a complete drawer of pliers, screwdrivers, or wrenches in a single print.</p>

      <h2>Step 7: Preview in 3D</h2>
      <p>The 3D preview shows your insert exactly as it will print. Rotate, zoom, and inspect the geometry from all angles. If anything looks off (wrong cavity depth, weird overhangs, missing notches), go back and adjust. The preview updates in real time as you change settings.</p>

      <h2>Step 8: Export</h2>
      <p>Pick your format and click Export. Exporting requires one credit per file:</p>
      <p><strong>STL</strong> for standard single-material 3D printing. Works with every slicer.</p>
      <p><strong>3MF</strong> for multi-material or multi-color prints (Bambu AMS, Prusa MMU).</p>
      <p><strong>SVG</strong> for laser cutting foam, plywood, or acrylic versions of the same shape.</p>
      <p><strong>DXF</strong> for CNC routing wood or aluminum trays.</p>

      <h2>Step 9: Slice and Print</h2>
      <p>Open the STL or 3MF in your slicer. Recommended settings for tool inserts:</p>
      <ul>
        <li><strong>Filament:</strong> PETG for tool inserts in vehicles, garages, or anywhere temperatures may rise above 60°C. PLA for indoor workshops only.</li>
        <li><strong>Layer height:</strong> 0.2mm for a balance of speed and finish. 0.16mm if you want smoother walls.</li>
        <li><strong>Walls:</strong> 3 perimeters minimum for strength.</li>
        <li><strong>Infill:</strong> 15 to 20 percent gyroid is plenty.</li>
        <li><strong>Supports:</strong> Usually not needed. The flat-bottom design prints support-free.</li>
        <li><strong>Bed adhesion:</strong> Brim if your printer struggles with first-layer adhesion on larger trays.</li>
      </ul>

      <h2>Step 10: Test Fit and Iterate</h2>
      <p>Print one tray first and test fit your tool. If it sticks, increase tolerance by 0.2mm and reprint. If it rattles loose, decrease tolerance. Once dialed in, those tolerance values will work for all your future inserts on the same printer.</p>

      <h2>Tips for Best Results</h2>
      <ul>
        <li>Photograph each tool separately, then combine them in the editor for multi-tool trays.</li>
        <li>Save your projects so you can come back and adjust tolerance after a test print.</li>
        <li>For shiny chrome tools, use a thin sheet of tissue paper over the tool to diffuse reflections.</li>
        <li>Print a small 50mm calibration cube before your first tool insert to confirm dimensional accuracy.</li>
        <li>For Gridfinity bins, the standard base height is 7mm. Account for this in total bin height.</li>
      </ul>

      <h2>Common Questions</h2>

      <h3>How long does printing take?</h3>
      <p>A single-tool insert typically prints in 1 to 3 hours depending on size and tray dimensions. A full Gridfinity-compatible drawer (5 tools) takes 6 to 10 hours.</p>

      <h3>Can I edit a saved project?</h3>
      <p>Yes. Sign in, open the dashboard, and click any saved project to load it back into the editor with all your settings preserved.</p>

      <h3>Do I need to redo the trace if I want a different tray size?</h3>
      <p>No. The trace is independent of tray dimensions. Change the tray size and re-export.</p>

      <p>Ready to start? <a href="/editor">Open the editor</a> and upload your first photo. Need inspiration? Browse the <a href="/blog">TracetoForge blog</a> for project ideas.</p>`
}))

// Editor
writePage('/editor', makePage({
  title: 'Tool Insert Editor - Upload Photo & Export STL | TracetoForge',
  description: 'Free browser-based tool insert editor. Upload a photo, auto-trace the outline, and export print-ready STL, 3MF, SVG, or DXF files. Works with Milwaukee Packout, Gridfinity, DeWalt ToughSystem, and custom trays.',
  canonical: 'https://tracetoforge.com/editor/',
  ogTitle: 'TracetoForge Editor - Photo to 3D Insert',
  h1: 'TracetoForge Editor: Photo to Print-Ready Tool Insert',
  bodyHtml: `
      <p>The TracetoForge editor turns a top-down photo of any hand tool into a precision-fit 3D printable insert. Upload your photo, the app auto-traces the outline using OpenCV edge detection, and you export a print-ready file in STL, 3MF, SVG, or DXF. The editor runs entirely in your browser — no installs, no uploads to a server, no CAD experience required. Average time from photo to printable file is under two minutes.</p>

      <h2>How to Use the Editor</h2>
      <h3>Step 1: Take a top-down photo</h3>
      <p>Place your tool on a clean sheet of white paper, A4 or US Letter size. The paper acts as both a contrasting background and a size reference, which the editor uses to calibrate real-world dimensions. Hold your phone directly above the tool and shoot straight down. Good even lighting matters more than a high-end camera. Avoid harsh shadows, glare on shiny tools, and tilted angles.</p>

      <h3>Step 2: Upload and auto-trace</h3>
      <p>Drag and drop your photo into the editor or use the file picker. OpenCV processes the image client-side and detects the tool outline automatically. If the trace looks off, adjust the Sensitivity slider. Lower sensitivity (1-2) uses Otsu thresholding, which works well for high-contrast white-paper-and-dark-tool shots. Mid-range sensitivity (3-8) uses Canny edge detection. Higher sensitivity (9-10) blends adaptive thresholding with Canny for low-contrast or shadowed photos.</p>

      <h3>Step 3: Set real dimensions</h3>
      <p>Enter the actual length of your tool, or use the paper reference for automatic scale calibration. This converts pixel measurements to millimeters so your printed insert fits the tool exactly. You can also adjust tolerance, cavity depth, and add a finger notch for easy tool removal.</p>

      <h3>Step 4: Pick an insert mode</h3>
      <p>Choose between three output modes depending on where the insert will live. Custom Tray creates a rectangular or oval tray for Milwaukee Packout, DeWalt ToughSystem, or any toolbox drawer with custom dimensions. Gridfinity Bin generates a standards-compliant 42mm-grid bin with the proper base profile. 3D Object exports just the extruded tool shape, useful for custom mounts, foam templates, or shadow boards.</p>

      <h3>Step 5: Preview and export</h3>
      <p>The 3D preview shows your insert in real time. Drag tools around in the preview to reposition. When you are satisfied, pick your export format and download. Slice with Cura, PrusaSlicer, OrcaSlicer, Bambu Studio, or any other slicer.</p>

      <h2>Multi-Tool Support</h2>
      <p>The editor supports up to five tools per insert. Trace each tool from its own photo, then position them on a single tray. Each tool has independent settings: cavity depth, wall tolerance, finger notch, rotation, and bevel. This lets you build a single insert that holds an entire set of pliers, screwdrivers, or wrenches in one print.</p>

      <h2>Supported Export Formats</h2>
      <p><strong>STL:</strong> The universal 3D printing format. Works with every slicer and 3D printer. Best choice for single-material PETG or PLA prints.</p>
      <p><strong>3MF:</strong> Modern 3D printing format with support for multi-material, multi-color, and embedded slicing settings. Use for Bambu, Prusa XL, or any AMS-equipped printer if you want a two-tone insert.</p>
      <p><strong>SVG:</strong> Vector format for laser cutting. Use SVG to laser-cut foam inserts, plywood trays, or acrylic templates of the same shape you would otherwise 3D print.</p>
      <p><strong>DXF:</strong> CAD format for CNC routing. Use DXF when you want to mill a custom hardwood tool tray or aluminum insert on a CNC router.</p>

      <h2>Compatible Tool Storage Systems</h2>
      <p>TracetoForge generates inserts that fit Milwaukee Packout (full size, compact, low-profile), Gridfinity (42mm standard grid), DeWalt ToughSystem 2.0, DeWalt TSTAK, Ridgid Pro Gear 2.0, Makita MakTrak, Flex Stack Pack, Klein ModBox, Bosch L-Boxx, Festool Systainer, Makita MakPac, Kobalt, Husky, Craftsman, Stanley FatMax, Harbor Freight US General, and Snap-on. For toolbox drawers without a standard system, use Custom Tray mode and enter your own dimensions.</p>

      <h2>Pricing and Credits</h2>
      <p>Tracing, previewing, and adjusting your insert are always free with no signup required. Exporting a file to download requires one credit. New accounts get three free export credits on signup. Additional credits are available in packs: 20 credits for $9.99 or 100 credits for $34.99. Credits never expire.</p>

      <h2>Editor FAQ</h2>

      <h3>Does the editor work on mobile?</h3>
      <p>Yes. The editor runs in any modern mobile browser (Safari on iOS, Chrome on Android). Photo upload, tracing, and 3D preview all work on phones and tablets. Most users find it easier to take the photo on phone and do the export on desktop, but either works.</p>

      <h3>What photo quality do I need?</h3>
      <p>A standard smartphone camera is more than enough. Aim for the tool to fill at least half the frame, shoot from at least 12 inches above the object to minimize perspective distortion, and use diffused lighting. Auto-detection handles 90% of cases on the first try.</p>

      <h3>Are my photos uploaded anywhere?</h3>
      <p>No. All image processing happens in your browser using OpenCV.js. Your photo never leaves your device unless you explicitly save the project to your account, in which case a small thumbnail is stored alongside the project settings.</p>

      <h3>What filament should I print with?</h3>
      <p>PETG is the recommended choice for tool inserts. It survives temperatures up to 80°C, which makes it safe for vehicle toolboxes and hot garages. PLA prints faster and looks cleaner but warps above 60°C, so save it for indoor workshop use. ABS and ASA work for industrial applications but require an enclosed printer.</p>

      <h3>Can I save and edit projects later?</h3>
      <p>Yes. Sign in with email to save unlimited projects. Each project stores your tool dimensions, tracing settings, insert mode, and a thumbnail. Projects are private to your account.</p>

      <h3>Can I sell prints I make with TracetoForge?</h3>
      <p>Yes. You own the files you generate. There is no royalty or commercial-use restriction on your exports.</p>

      <h2>Tutorials and Guides</h2>
      <p>For deeper walkthroughs, see the <a href="/guide">Getting Started Guide</a>, or browse practical guides on the <a href="/blog">TracetoForge blog</a>:</p>
      <ul>
        <li><a href="/blog/image-to-stl-converter-free">Image to STL Converter: Turn Any Photo into a 3D Printable File for Free</a></li>
        <li><a href="/blog/gridfinity-custom-cutout-no-cad">Gridfinity Custom Cutouts Without CAD: The Photo-Based Method</a></li>
        <li><a href="/blog/3d-printed-tool-organizer-guide">3D Printed Tool Organizer: The Complete Guide</a></li>
        <li><a href="/blog/knipex-pliers-organizer-3d-printed">Knipex Pliers Organizer: 3D Printed Inserts</a></li>
        <li><a href="/blog/custom-milwaukee-packout-inserts-3d-print">Custom Milwaukee Packout Inserts</a></li>
      </ul>

      <p><a href="/">Back to TracetoForge home</a> | <a href="/guide">Getting Started Guide</a> | <a href="/blog">Blog</a></p>`
}))

// Privacy Policy
writePage('/privacy', makePage({
  title: 'Privacy Policy | TracetoForge',
  description: 'TracetoForge privacy policy. How we collect, use, and protect your information. Covers AdSense, analytics, cookies, data retention, your rights, and contact information.',
  canonical: 'https://tracetoforge.com/privacy/',
  ogTitle: 'TracetoForge Privacy Policy',
  h1: 'Privacy Policy',
  bodyHtml: `
      <p><em>Last updated: April 22, 2026</em></p>

      <h2>Overview</h2>
      <p>TracetoForge is operated by Qwikymart LLC ("we," "us," "our"). This Privacy Policy explains what information we collect when you use tracetoforge.com, how we use it, who we share it with, how long we keep it, and the rights and choices you have. We have written it in plain English. If anything is unclear, email <!--email_off-->support@tracetoforge.com<!--/email_off-->.</p>

      <h2>Information We Collect</h2>
      <p><strong>Account information.</strong> If you create an account, we collect your email address and a hashed password. We do not collect your real name, mailing address, or phone number.</p>
      <p><strong>Usage data.</strong> We collect standard web analytics data such as pages viewed, time on site, referring URL, approximate location at the city or country level, browser type, operating system, and device type. This helps us understand which features are useful and which need work.</p>
      <p><strong>Your photos and designs.</strong> When you upload a photo of a tool to the editor, the image is processed entirely in your browser using client-side OpenCV edge detection. Your photos are never uploaded to our servers unless you explicitly save a project to your account. Saved project data is limited to tool dimensions, tracing settings, output configuration, and a small thumbnail.</p>
      <p><strong>Purchase information.</strong> If you buy export credits, payments are processed by Stripe through RevenueCat. We never see or store your full credit card number, CVV, or banking details. We only receive a confirmation that payment succeeded and a transaction ID we use to grant credits to your account.</p>

      <h2>How We Use Your Information</h2>
      <p>We use the information we collect to operate the site and provide the photo-to-STL service, manage your account and saved projects, process payments and grant export credits, improve the product based on usage patterns, respond to support requests, send transactional emails such as password resets and purchase receipts, display advertising, and detect and prevent fraud or abuse.</p>

      <h2>Cookies and Tracking Technologies</h2>
      <p>We use cookies and similar technologies for three categories of purpose:</p>
      <p><strong>Essential cookies.</strong> Required for sign-in, session management, and core functionality. These cannot be disabled without breaking the site.</p>
      <p><strong>Analytics cookies.</strong> Used by Google Analytics to understand site usage in aggregate. These can be opted out at the browser level.</p>
      <p><strong>Advertising cookies.</strong> Set by Google AdSense and Google Ads to serve and measure ads. These can be opted out as described in the next section.</p>

      <h2>Advertising and Google AdSense</h2>
      <p>This site uses Google AdSense to display advertisements. Google and its certified third-party advertising partners use cookies and similar technologies to serve ads based on your prior visits to this site and other sites on the internet.</p>
      <p>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to our site and other sites. You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads">Google Ads Settings</a>. Alternatively, you can opt out of third-party vendor use of cookies for personalized advertising by visiting <a href="https://www.aboutads.info/">aboutads.info</a> or <a href="https://www.youronlinechoices.eu/">youronlinechoices.eu</a> (for European users).</p>
      <p>For more information about how Google uses data when you use our partners' sites or apps, see Google's <a href="https://policies.google.com/technologies/partner-sites">privacy and terms page</a>.</p>

      <h2>Third-Party Services We Use</h2>
      <ul>
        <li><strong>Supabase</strong> for authentication and database hosting</li>
        <li><strong>Cloudflare</strong> for website hosting, DNS, and DDoS protection</li>
        <li><strong>Google Analytics</strong> for website usage analytics</li>
        <li><strong>Google AdSense</strong> for advertising</li>
        <li><strong>Google Ads</strong> for conversion tracking</li>
        <li><strong>Stripe (through RevenueCat)</strong> for payment processing</li>
      </ul>
      <p>Each service has its own privacy policy governing how it handles data we share with it.</p>

      <h2>Data Retention</h2>
      <p>We keep your account data for as long as your account is active. If you request account deletion, we will remove your account, saved projects, and associated personal information within 30 days. Some transactional records (purchase history, refund records) may be retained longer where required by tax or accounting law. Web analytics data is retained according to the default policy of our analytics providers, typically 26 months.</p>

      <h2>Your Rights</h2>
      <p>Depending on where you live, you may have the right to access the personal information we hold about you, correct inaccurate information, request deletion of your information, object to or restrict certain types of processing, request a copy of your data in a portable format, and withdraw consent where we rely on consent to process your data. To exercise any of these rights, email <!--email_off-->support@tracetoforge.com<!--/email_off--> from the email address on your account.</p>
      <p><strong>California residents:</strong> Under the California Consumer Privacy Act (CCPA), you have additional rights regarding the categories of personal information we collect, the sources we collect it from, the business purpose for collection, and the right to opt out of the sale of personal information. We do not sell personal information.</p>
      <p><strong>European users:</strong> Under the GDPR, our legal bases for processing are contract performance (operating the service for you), legitimate interest (analytics and product improvement), consent (advertising cookies), and legal obligation (tax records).</p>

      <h2>Children's Privacy</h2>
      <p>TracetoForge is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn that a child under 13 has provided personal information to us, we will delete it. If you believe a child under 13 has provided us with personal information, please contact <!--email_off-->support@tracetoforge.com<!--/email_off-->.</p>

      <h2>Security</h2>
      <p>We use industry-standard security measures to protect your data, including encrypted connections (HTTPS), hashed passwords, encrypted database backups, and access controls on our backend systems. No system is perfectly secure, but we work to limit risk.</p>

      <h2>International Data Transfers</h2>
      <p>TracetoForge is operated from the United States. If you access the site from outside the United States, your information may be transferred to, stored in, and processed in the United States and other countries where our service providers operate.</p>

      <h2>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Significant changes will be announced on the site or by email. Continued use of TracetoForge after a change indicates acceptance of the updated policy.</p>

      <h2>Contact</h2>
      <p>Questions about this Privacy Policy or about your data? Email <!--email_off-->support@tracetoforge.com<!--/email_off-->. TracetoForge is operated by Qwikymart LLC.</p>

      <p><a href="/">Back to TracetoForge</a> | <a href="/terms/">Terms of Service</a></p>`
}))

// Terms of Service
writePage('/terms', makePage({
  title: 'Terms of Service | TracetoForge',
  description: 'TracetoForge terms of service. Account rules, credit packs, refund policy, intellectual property, third-party trademarks, acceptable use, and contact information.',
  canonical: 'https://tracetoforge.com/terms/',
  ogTitle: 'TracetoForge Terms of Service',
  h1: 'Terms of Service',
  bodyHtml: `
      <p><em>Last updated: April 22, 2026</em></p>

      <p>These Terms of Service ("Terms") govern your use of tracetoforge.com (the "Service"), operated by Qwikymart LLC ("we," "us," "our"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

      <h2>The Service</h2>
      <p>TracetoForge is a browser-based application that converts photos of physical objects into 3D-printable files in STL, 3MF, SVG, and DXF formats. The core tracing and preview functions are free. Exporting downloadable files requires export credits.</p>

      <h2>Eligibility</h2>
      <p>You must be at least 13 years old to use the Service. If you are between 13 and 18, you must have permission from a parent or legal guardian. By using the Service, you represent that you meet these requirements.</p>

      <h2>Accounts</h2>
      <p>You can use the editor without an account, but creating an account is required to save projects, retain export credits, and access purchase history. You are responsible for keeping your password secure and for all activity that occurs under your account. Notify us immediately at <!--email_off-->support@tracetoforge.com<!--/email_off--> if you suspect unauthorized access.</p>

      <h2>Credits and Payments</h2>
      <p><strong>How credits work.</strong> One export credit allows one file download. New accounts receive three free export credits on signup. Additional credits are sold in packs: 20 credits for $9.99 or 100 credits for $34.99. Credits do not expire.</p>
      <p><strong>Payment processing.</strong> Payments are processed by Stripe through RevenueCat. We do not store your full payment information. Prices are in U.S. dollars and exclude any applicable taxes, which may be collected by Stripe based on your billing location.</p>
      <p><strong>Refunds.</strong> Credits that have not yet been spent on an export are refundable within 14 days of purchase. Email <!--email_off-->support@tracetoforge.com<!--/email_off--> with your order ID to request a refund. Credits that have already been used to generate a downloadable file are non-refundable.</p>
      <p><strong>Pricing changes.</strong> We may change credit pack prices at any time. Existing unused credits are not affected by price changes.</p>

      <h2>Acceptable Use</h2>
      <p>You agree not to use the Service to do any of the following:</p>
      <ul>
        <li>Attempt to gain unauthorized access to other user accounts, our backend systems, or third-party services we use</li>
        <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service beyond what is permitted by law</li>
        <li>Use automated tools, scrapers, or bots to interact with the Service in ways that degrade performance for other users</li>
        <li>Upload images that contain content you do not have the right to use</li>
        <li>Use the Service to create files that infringe the intellectual property rights of others</li>
        <li>Use the Service to create weapons, weapon components, or items prohibited by applicable law</li>
        <li>Resell, sublicense, or commercially redistribute access to the Service itself (the files you export are yours, but the editor is not)</li>
      </ul>

      <h2>Intellectual Property</h2>
      <p><strong>Your content.</strong> You retain all rights to the photos you upload and the files you export. We claim no ownership over your designs.</p>
      <p><strong>License to operate the Service.</strong> By uploading a photo or saving a project, you grant us a limited, non-exclusive license to process, store (where applicable), and display that content as needed to operate the Service for you. This license ends when you delete the content or your account.</p>
      <p><strong>Our content.</strong> The TracetoForge name, logo, blog posts, marketing copy, and editor interface are owned by Qwikymart LLC and protected by copyright, trademark, and other intellectual property laws. You may not copy or reuse them without permission.</p>

      <h2>Third-Party Trademarks</h2>
      <p>Milwaukee, Packout, DeWalt, ToughSystem, TSTAK, Gridfinity, Knipex, Klein, Wera, Bosch, Festool, Makita, Ridgid, Snap-on, Kobalt, Husky, Craftsman, Stanley, FatMax, Bambu, Prusa, and all other brand and product names referenced on this site are trademarks of their respective owners. They are used here only to describe compatibility and are not affiliated with, endorsed by, or sponsored by their owners.</p>

      <h2>Disclaimer of Warranties</h2>
      <p>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that exports will be perfectly dimensioned for any particular tool. Always test fit a printed sample before printing in volume.</p>

      <h2>Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Qwikymart LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or use, arising out of or in connection with the Service. Our total liability for any claim arising out of these Terms or the Service is limited to the amount you paid us in the 12 months preceding the claim, or $50, whichever is greater.</p>

      <h2>Indemnification</h2>
      <p>You agree to indemnify and hold harmless Qwikymart LLC and its officers and operators from any claims, damages, or expenses arising out of your use of the Service, your violation of these Terms, or your infringement of any third party's rights.</p>

      <h2>Account Termination</h2>
      <p>You can delete your account at any time by emailing <!--email_off-->support@tracetoforge.com<!--/email_off-->. We may suspend or terminate your account if you violate these Terms or use the Service in a way that creates risk or legal exposure for us or for other users. On termination, your saved projects and unused credits may be lost.</p>

      <h2>Changes to These Terms</h2>
      <p>We may update these Terms from time to time. The "Last updated" date at the top of this page reflects the most recent revision. Significant changes will be announced on the site or by email. Continued use of the Service after changes indicates acceptance of the updated Terms.</p>

      <h2>Governing Law</h2>
      <p>These Terms are governed by the laws of the State of Ohio, United States, without regard to its conflict of law principles. Any dispute arising out of these Terms or the Service will be resolved in the state or federal courts located in Cuyahoga County, Ohio.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms? Email <!--email_off-->support@tracetoforge.com<!--/email_off-->. TracetoForge is operated by Qwikymart LLC.</p>

      <p><a href="/">Back to TracetoForge</a> | <a href="/privacy/">Privacy Policy</a></p>`
}))

// About
writePage('/about', makePage({
  title: 'About TracetoForge | Qwikymart LLC',
  description: 'TracetoForge is a small maker project run out of Northeast Ohio, operated by Qwikymart LLC. Browser-based tool insert editor plus physical 3D printed inserts shipped from the shop.',
  canonical: 'https://tracetoforge.com/about/',
  ogTitle: 'About TracetoForge',
  h1: 'About TracetoForge',
  bodyHtml: `
      <p><em>A small maker project run out of Ohio.</em></p>

      <h2>Why this exists</h2>
      <p>TracetoForge started as a personal problem. Anyone who owns a decent set of hand tools eventually hits the same wall: the tools are fine, the toolbox is fine, but the inside of the drawer is a loose mess of pliers rolling into wrenches into screwdrivers. Every time you reach for a tool you have to rummage. Foam inserts help but they are expensive, they do not last, and cutting them by hand is slow.</p>
      <p>3D printed inserts are the obvious answer, but the existing workflow to design one was not obvious at all. You needed to learn Fusion 360 or FreeCAD, manually measure every tool with calipers, model the shape by hand, then extrude it into a tray. For a single pair of pliers that is a 30 to 45 minute project. For a drawer full of them, a whole weekend. That gap is what TracetoForge was built to close.</p>
      <p>The idea was simple. A phone camera already captures the shape of a tool more accurately than any human with calipers. Edge detection is a solved problem. If you could point that pipeline at a top-down photo of a tool on a sheet of paper, you could skip the measuring and the modeling and go straight to a printable file. Everything else is plumbing.</p>

      <h2>Who runs it</h2>
      <p>TracetoForge is operated by Qwikymart LLC, an Ohio-registered small business. The team is one person who writes the code, answers the support email, and packs the physical inserts that ship from the shop. It is not a venture-backed company and it will not be one. The goal is to cover its costs, serve the 3D printing and maker community, and grow at a pace that keeps the product quality honest.</p>
      <p>The owner is a longtime hobbyist maker based in Northeast Ohio. No fancy credentials, no pedigree. Just a garage, a 3D printer, a toolbox that used to be a mess, and enough web development background to turn an idea into something other makers can use. Every feature in the editor got built because somebody (often the owner) hit a wall trying to do something in Fusion 360 that should have taken two minutes.</p>

      <h2>What we actually do</h2>
      <p><strong>The software side.</strong> TracetoForge is a browser-based editor that runs entirely on your device. You upload a photo of a tool, OpenCV traces the outline, and you export a print-ready STL, 3MF, SVG, or DXF. The app supports Gridfinity, Milwaukee Packout, DeWalt ToughSystem, and any custom tray dimensions. Tracing and previewing are free. Exporting a file costs one credit. New accounts get three free credits on signup.</p>
      <p><strong>The physical side.</strong> Not everyone owns a 3D printer. For those folks we print and ship inserts from the shop, using PETG filament that holds up to garage heat and vehicle toolboxes. The inserts are listed on the <a href="https://www.etsy.com/shop/TracetoForge">TracetoForge Etsy shop</a> and on <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&amp;rh=n%3A553240">Amazon</a>, sold under the Qwikymart LLC seller account. Each insert is traced from the actual tool, not from manufacturer spec sheets, so the fit is real.</p>

      <h2>What we believe about tool organization</h2>
      <p>An honest opinion, because this site is not a neutral encyclopedia. A few things we have come to believe after making a lot of these:</p>
      <p><strong>Shadowbox trays beat bin systems for flat tools.</strong> Gridfinity is brilliant for small parts and anything you want to stand up. For pliers and wrenches that want to lie flat, a drawer-tray format with a precision cutout wastes less space and looks better. Not every tool wants to live in a bin.</p>
      <p><strong>PETG is the right filament for tool inserts.</strong> PLA looks cleaner off the bed but warps above roughly 60°C, which is a normal summer day in a closed garage or a truck toolbox. PETG handles 80°C, prints fine on a cheap printer, and ages well. ABS and ASA are overkill unless the shop gets really hot.</p>
      <p><strong>Socket organizers are a solved problem, leave them alone.</strong> There are hundreds of free socket holder designs on Printables, MakerWorld, and Thingiverse, and most of them work. Wrenches, pliers, screwdrivers, utility knives, and specialty tools are where the gap is. That is where TracetoForge focuses.</p>

      <h2>Where the site is heading</h2>
      <p>Most of the work happens in the editor. It gets better when users report a case where tracing failed or a tolerance was off. The blog is a slower project: one post at a time, focused on practical questions real makers actually ask instead of SEO fodder. Support email is <!--email_off-->support@tracetoforge.com<!--/email_off--> and it is read by a human.</p>

      <h2>Business information</h2>
      <ul>
        <li><strong>Operator:</strong> Qwikymart LLC</li>
        <li><strong>Location:</strong> Northeast Ohio, United States</li>
        <li><strong>Support email:</strong> <a href="mailto:support@tracetoforge.com">support@tracetoforge.com</a></li>
        <li><strong>Etsy shop:</strong> <a href="https://www.etsy.com/shop/TracetoForge">etsy.com/shop/TracetoForge</a></li>
        <li><strong>Amazon storefront:</strong> <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&amp;rh=n%3A553240">TracetoForge on Amazon</a></li>
        <li><strong>Founded:</strong> 2025</li>
      </ul>

      <h2>Contact</h2>
      <p>The best way to reach us is email at <!--email_off-->support@tracetoforge.com<!--/email_off-->. Feature requests, bug reports, tracing problems, or just hello, all welcome. There is also a <a href="/contact/">contact form</a> if you prefer.</p>

      <p><a href="/">Back to TracetoForge</a> | <a href="/contact/">Contact</a></p>`
}))

// Contact
writePage('/contact', makePage({
  title: 'Contact TracetoForge | Support & Feedback',
  description: 'Contact TracetoForge. Email support@tracetoforge.com for bug reports, feature requests, refund inquiries, and partnership questions. Typical response time 1-2 business days.',
  canonical: 'https://tracetoforge.com/contact/',
  ogTitle: 'Contact TracetoForge',
  h1: 'Contact TracetoForge',
  bodyHtml: `
      <p><em>Real email, read by a real person.</em></p>

      <h2>Email us directly</h2>
      <p>The fastest way to reach us is email: <a href="mailto:support@tracetoforge.com">support@tracetoforge.com</a>. Messages are typically answered within 1 to 2 business days. If you are reporting a bug or a tracing problem, a screenshot and the photo you uploaded help a lot.</p>
      <p>For purchase issues (refund requests, missing credits, receipt problems), include the email address on your TracetoForge account and the approximate date of purchase so we can look up the transaction in RevenueCat.</p>

      <h2>What to expect</h2>
      <ul>
        <li><strong>Typical response time:</strong> 1 to 2 business days</li>
        <li><strong>Bug reports:</strong> fixes usually ship within a week, sometimes same day</li>
        <li><strong>Feature requests:</strong> reviewed, prioritized against the roadmap, replied to honestly even if the answer is "not soon"</li>
        <li><strong>Refund requests:</strong> processed per the <a href="/terms/">Terms of Service</a> refund policy (unspent credits refundable within 14 days)</li>
        <li><strong>Partnership or press inquiries:</strong> also at the same email, with "press" or "partnership" in the subject</li>
      </ul>

      <h2>Contact form</h2>
      <p>A contact form is available on the page once it loads. The form opens your email app prefilled with your message. If your browser does not have a mail client configured, just email <!--email_off-->support@tracetoforge.com<!--/email_off--> directly.</p>

      <h2>Business information</h2>
      <ul>
        <li><strong>Operator:</strong> Qwikymart LLC</li>
        <li><strong>Location:</strong> Northeast Ohio, United States</li>
        <li><strong>Email:</strong> <a href="mailto:support@tracetoforge.com">support@tracetoforge.com</a></li>
        <li><strong>Etsy:</strong> <a href="https://www.etsy.com/shop/TracetoForge">etsy.com/shop/TracetoForge</a></li>
        <li><strong>Amazon:</strong> <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&amp;rh=n%3A553240">TracetoForge on Amazon</a></li>
      </ul>

      <h2>Before you email: common questions</h2>
      <p><strong>"Auto-trace is missing part of my tool."</strong> Try increasing the Sensitivity slider. For shiny or chrome tools, tissue paper or a matte spray over the tool helps cut reflections. The <a href="/guide/">Getting Started Guide</a> has photo tips.</p>
      <p><strong>"I bought credits and they did not show up."</strong> Give it up to 60 seconds for the webhook to fire, then refresh the page. If credits are still missing after five minutes, email us with your order ID.</p>
      <p><strong>"The printed insert is too tight / too loose."</strong> Adjust the Tolerance slider in the editor. Most printers land well at 0.4 to 0.6 mm tolerance. Dial it in once on your printer and the same value works for every future insert.</p>
      <p><strong>"Can I get a refund?"</strong> Yes, unspent credits are refundable within 14 days of purchase. Email with the order ID and we will process it. See the full policy in the <a href="/terms/">Terms of Service</a>.</p>

      <p><a href="/">Back to TracetoForge</a> | <a href="/about/">About TracetoForge</a></p>`
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
  canonical: 'https://tracetoforge.com/blog/',
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

  const authorBioHtml = `
      <aside>
        <h3>About the author</h3>
        <p>Chris Winland runs TracetoForge out of a small workshop in Northeast Ohio. Qwikymart LLC, the operator of this site, makes and ships precision-fit 3D printed tool inserts alongside the browser-based editor. Most posts on this blog come from real problems hit while tracing, printing, and selling inserts to other makers. Reach out at <a href="mailto:support@tracetoforge.com">support@tracetoforge.com</a> with corrections, questions, or tracing problems.</p>
        <p><a href="/about/">More about TracetoForge</a> | <a href="/contact/">Contact</a></p>
      </aside>`

  writePage(`/blog/${post.slug}`, makePage({
    title: `${meta.title} | TracetoForge Blog`,
    description: meta.desc,
    canonical: meta.canonical,
    ogTitle: meta.title,
    ogType: 'article',
    h1: meta.title,
    bodyHtml: `
      <p>Published ${meta.date} by <a href="/about/">Chris Winland</a></p>
      <article>
${articleContent}
      </article>
${authorBioHtml}
      <p><a href="/blog">Back to Blog</a> | <a href="/editor">Try TracetoForge Free</a></p>`,
    articleSchema
  }))
}

// Update sitemap
const today = new Date().toISOString().split('T')[0]
const sitemapUrls = [
  { loc: 'https://tracetoforge.com/', freq: 'weekly', priority: '1.0' },
  { loc: 'https://tracetoforge.com/about/', freq: 'monthly', priority: '0.8' },
  { loc: 'https://tracetoforge.com/editor/', freq: 'weekly', priority: '0.7' },
  { loc: 'https://tracetoforge.com/guide/', freq: 'monthly', priority: '0.8' },
  { loc: 'https://tracetoforge.com/blog/', freq: 'weekly', priority: '0.9' },
  ...postConfigs.map(p => ({
    loc: `https://tracetoforge.com/blog/${p.slug}/`,
    freq: 'monthly',
    priority: '0.8'
  })),
  { loc: 'https://tracetoforge.com/contact/', freq: 'monthly', priority: '0.5' },
  { loc: 'https://tracetoforge.com/privacy/', freq: 'yearly', priority: '0.3' },
  { loc: 'https://tracetoforge.com/terms/', freq: 'yearly', priority: '0.3' }
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
