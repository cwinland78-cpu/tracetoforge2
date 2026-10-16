import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react'
import SEOHead from '../../components/SEOHead'

export const BLOG_POSTS = [
  {
    slug: 'drawing-to-3d-object',
    title: 'Turn a Drawing into a 3D Printable Object',
    excerpt: 'Sketch a shape on paper, photograph it, and export a printable STL. The same tracer that cuts tool cavities also extrudes solid objects. No CAD required.',
    date: '2026-09-01',
    readTime: '7 min',
    tags: ['Drawing to STL', '3D Printing', 'No CAD', 'Sketch'],
  },
  {
    slug: 'photo-to-gridfinity-guide',
    title: 'Photo to Gridfinity: Measure, Trace, and Check the Fit',
    excerpt: 'Turn a phone photo of any tool into a printable Gridfinity bin. Paper-based scaling, tolerance and fit checks, STL and 3MF export.',
    date: '2026-05-07',
    readTime: '12 min',
    tags: ['Gridfinity', 'Photo to STL', 'Tool Organization', '3D Printing'],
  },
  {
    slug: 'tracetoforge-vs-tooltrace-vs-gridpilot',
    title: 'TracetoForge vs Tooltrace vs GridPilot vs Tracefinity (2026)',
    excerpt: 'TracetoForge, Tooltrace, GridPilot, gridfinity.tools and the open-source Tracefinity side by side: free tiers, pricing, export formats, multi-tool layouts.',
    date: '2026-05-07',
    readTime: '8 min',
    tags: ['Gridfinity', 'Comparison', 'Tool Organization'],
  },
  {
    slug: 'gridfinity-in-packout-drawer',
    title: 'Gridfinity in Milwaukee Packout Drawers: Setup Guide',
    excerpt: 'Install a 9×6 Gridfinity baseplate in a Packout drawer. Drawer dimensions, baseplate sizing, mounting, and custom tool inserts. Works with the 48-22-8443 3-Drawer and 48-22-8442 2-Drawer.',
    date: '2026-05-07',
    readTime: '9 min',
    tags: ['Gridfinity', 'Milwaukee Packout', 'Tool Organization'],
  },
  {
    slug: 'photo-tips-for-gridfinity-trace',
    title: 'Photo Tips for a Clean Tool Trace',
    excerpt: 'Five things that matter for a clean trace: paper, lighting, camera angle, tool prep, and Sensitivity slider tuning. Common failure modes and fixes.',
    date: '2026-05-07',
    readTime: '8 min',
    tags: ['Gridfinity', 'Photography', 'Tool Organization'],
  },
  {
    slug: 'wera-screwdriver-gridfinity-bin',
    title: 'Wera Screwdriver Gridfinity Bin: Photo-to-Print Walkthrough',
    excerpt: 'Build a 6×3 Gridfinity bin for a 12-piece Wera Kraftform set from a phone photo. Sizing, cavity depth, finger notches, print settings.',
    date: '2026-05-07',
    readTime: '8 min',
    tags: ['Wera', 'Gridfinity', 'Screwdrivers', 'Tool Organization'],
  },
  {
    slug: 'wrench-set-gridfinity-bin',
    title: 'Wrench Set Gridfinity Bin from a Photo',
    excerpt: 'Custom Gridfinity bins for combination, ratcheting, stubby, and ignition wrenches. SAE, metric, and combined-set layouts. Per-brand tolerance notes.',
    date: '2026-05-07',
    readTime: '9 min',
    tags: ['Wrenches', 'Gridfinity', 'Tool Organization'],
  },
  {
    slug: 'drill-bit-gridfinity-storage',
    title: 'Drill Bit Storage in Gridfinity: Custom Bin Layouts',
    excerpt: 'Tip-up vs tip-down, parametric vs photo-trace, single-set vs multi-set. Twist drills, brad-point, Forstner, step drills, hole saws, spade bits.',
    date: '2026-05-07',
    readTime: '9 min',
    tags: ['Drill Bits', 'Gridfinity', 'Tool Organization'],
  },
  {
    slug: 'reusable-tool-library-drawer-trays',
    title: 'Reusable Tool Library for Custom Drawer Trays',
    excerpt: 'Save your traced tools and reuse them across any Gridfinity bin, Packout insert, or drawer tray without re-tracing.',
    date: '2026-05-02',
    readTime: '5 min',
    tags: ['Tool Organizer', 'Workflow', 'Gridfinity', 'Drawer Tray', 'New Feature'],
  },
  {
    slug: 'custom-milwaukee-packout-inserts-3d-print',
    title: 'Custom Milwaukee Packout Inserts: 3D Print Your Own',
    excerpt: 'Make fitted Packout inserts from a photo: case and drawer interior sizes, cavity depth, three ways to fill a drawer, and print settings for full-drawer trays.',
    date: '2026-02-24',
    readTime: '11 min',
    tags: ['Milwaukee Packout', '3D Printing', 'Tool Organization'],
  },
  {
    slug: 'gasket-maker-from-photo',
    title: 'Make a Replacement Gasket from a Photo, Bolt Holes and All',
    excerpt: 'Photograph a dead gasket and get a cutting template with bolt holes detected automatically. Calibration sheet for exact bolt spacing. SVG, DXF, STL, and 3MF exports.',
    date: '2026-07-18',
    readTime: '6 min',
    tags: ['Gaskets', 'DIY Repair', 'SVG', 'DXF', 'Hole Detection'],
  },
  {
    slug: 'measure-tool-from-photo-paper',
    title: 'Measure a Tool from a Photo With a Sheet of Paper',
    excerpt: 'Skip the calipers. Paper size detected automatically, perspective corrected, holes measured too. Plus when to use the calibration sheet instead.',
    date: '2026-07-18',
    readTime: '8 min',
    tags: ['Measuring', 'Photo Tracing', 'Workshop Tips'],
  },
  {
    slug: 'gridfinity-vs-packout-vs-custom-tray',
    title: 'Gridfinity vs Packout vs Custom Trays: Which to Pick',
    excerpt: 'Three insert systems compared on cost, print time, drawer fit, and how easy each is to modify. A straight answer on which one suits your setup.',
    date: '2026-02-24',
    readTime: '8 min',
    tags: ['Gridfinity', 'Milwaukee Packout', 'Comparison'],
  },
  {
    slug: '3d-printed-inserts-vs-kaizen-foam',
    title: '3D Printed Tool Inserts vs Kaizen Foam',
    excerpt: 'Cost breakdown, durability comparison, and why 3D printed inserts are replacing foam.',
    date: '2026-02-24',
    readTime: '7 min',
    tags: ['Tool Organization', '3D Printing', 'Kaizen Foam', 'Workshop'],
  },
  {
    slug: 'how-to-organize-milwaukee-packout',
    title: 'How to Organize a Milwaukee Packout: Real Layouts',
    excerpt: 'Drawer-by-drawer Packout layouts using 3D printed inserts and Gridfinity bins. What fits where, which drawers waste space, and how to cut trays for your own tools.',
    date: '2026-02-24',
    readTime: '8 min',
    tags: ['Milwaukee Packout', 'Tool Organization', 'Workshop', '3D Printing'],
  },
  {
    slug: 'image-to-stl-converter-free',
    title: 'Image to STL for Tool Outlines: Free Trace & Preview',
    excerpt: 'Trace a photo into an STL, 3MF, SVG, or DXF outline file. Which format to use, output modes, and fixes for shadows, reflections, and scale errors.',
    date: '2026-03-10',
    readTime: '10 min',
    tags: ['STL', 'Photo to 3D', '3D Printing', 'Free Tool'],
  },
  {
    slug: 'gridfinity-custom-cutout-no-cad',
    title: 'Gridfinity Custom Cutout From a Photo (No CAD)',
    excerpt: 'Generate a Gridfinity cutout from a photo of your tool. No Fusion 360, no OpenSCAD, no parametric setup. Upload, trace, export STL in about 2 minutes.',
    date: '2026-03-10',
    readTime: '5 min',
    tags: ['Gridfinity', 'Custom Cutout', '3D Printing', 'No CAD'],
  },
  {
    slug: '3d-printed-tool-organizer-guide',
    title: '3D Printed Tool Organizer Ideas and Fit Guide',
    excerpt: 'Ten organizer ideas worth printing, plus filament choice, tolerances, and print settings for organizers fitted to your exact tools.',
    date: '2026-03-10',
    readTime: '13 min',
    tags: ['3D Printing', 'Tool Organizer', 'Workshop', 'Storage'],
  },
  {
    slug: 'knipex-pliers-organizer-3d-printed',
    title: 'Knipex Pliers Organizer: Cobra, Pliers Wrench, TwinGrip',
    excerpt: 'Printable organizer inserts fitted to Knipex Cobra 125-300mm, Pliers Wrench, TwinGrip, and diagonal cutters. Gridfinity and Packout compatible, or trace your own.',
    date: '2026-03-10',
    readTime: '7 min',
    tags: ['Knipex', 'Tool Organizer', '3D Printing', 'Gridfinity', 'Packout'],
  },
  {
    slug: 'gridfinity-generator-photo-vs-parametric',
    title: 'Gridfinity Generators Compared: Parametric vs Photo-Based',
    excerpt: 'Compare the best Gridfinity generators. Parametric tools for simple bins vs photo-based generators for precision tool cutouts.',
    date: '2026-03-11',
    readTime: '6 min',
    tags: ['Gridfinity', 'Generator', 'Comparison', '3D Printing'],
  },
]

export default function BlogIndex() {
  return (
    <>
      <SEOHead
        title="Blog - 3D Printing Tool Organization Tips | TracetoForge"
        description="Guides and tutorials on 3D printing custom tool inserts, Gridfinity bins, Milwaukee Packout organizers, and workshop organization."
        canonical="https://tracetoforge.com/blog/"
      />
      <div className="min-h-screen bg-[#0D0D12] text-white">
        {/* Header */}
        <header className="border-b border-[#2A2A35]/50 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold text-brand">TracetoForge</Link>
            <nav className="flex items-center gap-4">
              <Link to="/blog/" className="text-sm text-white font-medium">Blog</Link>
              <Link to="/guide/" className="text-sm text-[#8888A0] hover:text-white transition-colors">Guide</Link>
              <Link to="/editor/" className="px-4 py-2 text-sm font-semibold bg-brand hover:bg-brand-light text-white rounded-lg transition-colors">
                Try Free
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#8888A0] hover:text-white transition-colors mb-8">
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-3">
            TracetoForge Blog
          </h1>
          <p className="text-[#8888A0] text-lg mb-12 max-w-2xl">
            Guides and tips for creating custom 3D printed tool organizers, Packout inserts, and Gridfinity bins.
          </p>

          <div className="space-y-8">
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block group p-6 rounded-2xl bg-surface border border-surface-lighter/40 hover:border-brand/30 transition-all"
              >
                <div className="flex items-center gap-3 text-xs text-[#666680] mb-3">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime} read</span>
                </div>
                <h2 className="text-xl font-bold text-white group-hover:text-brand transition-colors mb-2">
                  {post.title}
                </h2>
                <p className="text-[#8888A0] text-sm leading-relaxed mb-3">{post.excerpt}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#1A1A25] text-[#8888A0] rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-brand font-medium mt-4 group-hover:gap-2 transition-all">
                  Read more <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </main>

        <footer className="border-t border-[#2A2A35]/50 py-8 text-center text-xs text-[#555568]">
          <p>&copy; {new Date().getFullYear()} TracetoForge. All rights reserved.</p>
        </footer>
      </div>
    </>
  )
}
