import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react'
import SEOHead from '../../components/SEOHead'

export const BLOG_POSTS = [
  {
    slug: 'custom-milwaukee-packout-inserts-3d-print',
    title: 'How to Make Custom Milwaukee Packout Inserts with a 3D Printer',
    excerpt: 'Stop buying $40 generic inserts. Learn how to create perfectly fitted, custom Packout inserts from a photo of your tools in under 5 minutes.',
    date: '2026-02-24',
    readTime: '6 min',
    tags: ['Milwaukee Packout', '3D Printing', 'Tool Organization'],
    image: '/blog/packout-insert.jpg',
  },
  {
    slug: 'gridfinity-insert-from-photo',
    title: 'Create Gridfinity Inserts from a Photo: The Fastest Way in 2026',
    excerpt: 'Forget hours of CAD work. Snap a photo of your tools on a sheet of paper and generate a perfectly fitted Gridfinity insert in minutes.',
    date: '2026-02-24',
    readTime: '5 min',
    tags: ['Gridfinity', '3D Printing', 'Workshop Organization'],
    image: '/blog/gridfinity-insert.jpg',
  },
  {
    slug: 'tool-organizer-photo-to-stl',
    title: 'Photo to STL: Turn Any Tool Photo into a 3D Printable Organizer',
    excerpt: 'A complete guide to converting photos of your tools into print-ready STL, 3MF, SVG, and DXF files. No CAD experience needed.',
    date: '2026-02-24',
    readTime: '7 min',
    tags: ['STL', '3D Printing', 'Tool Storage'],
    image: '/blog/photo-to-stl.jpg',
  },
  {
    slug: 'gridfinity-vs-packout-vs-custom-tray',
    title: 'Gridfinity vs Milwaukee Packout vs Custom Trays: Which Insert System Is Best?',
    excerpt: 'A practical comparison of the three most popular tool insert systems for 3D printing. Which one fits your workflow and toolbox?',
    date: '2026-02-24',
    readTime: '8 min',
    tags: ['Gridfinity', 'Milwaukee Packout', 'Comparison'],
    image: '/blog/comparison.jpg',
  },
  {
    slug: 'best-3d-printed-tool-organizer-ideas',
    title: '10 Best 3D Printed Tool Organizer Ideas for Your Workshop in 2026',
    excerpt: 'From socket holders to drill bit racks to custom drawer inserts. The best ideas for organizing your workshop with a 3D printer.',
    date: '2026-02-24',
    readTime: '6 min',
    tags: ['3D Printing', 'Workshop', 'Organization'],
    image: '/blog/organizer-ideas.jpg',
  },
  {
    slug: '3d-printed-inserts-vs-kaizen-foam',
    title: '3D Printed Tool Inserts vs Kaizen Foam: Why Foam Is Losing in 2026',
    excerpt: 'Kaizen foam costs more, degrades faster, and can not match the precision of 3D printed inserts. Here is the full cost and durability breakdown.',
    date: '2026-02-24',
    readTime: '7 min',
    tags: ['Kaizen Foam', '3D Printing', 'Tool Organization'],
    image: '/blog/foam-alternative.jpg',
  },
  {
    slug: 'how-to-organize-milwaukee-packout',
    title: 'How to Organize a Milwaukee Packout Like a Pro: The Complete System',
    excerpt: 'Trade-specific setups, custom insert strategies, Gridfinity integration, and the 7-step system for a Packout that saves you time every day.',
    date: '2026-02-24',
    readTime: '8 min',
    tags: ['Milwaukee Packout', 'Tool Organization', 'Workshop'],
    image: '/blog/organize-packout.jpg',
  },
]

export default function BlogIndex() {
  return (
    <>
      <SEOHead
        title="Blog - 3D Printing Tool Organization Guides | TracetoForge"
        description="Guides, tutorials, and tips for creating custom 3D printed tool organizers, Milwaukee Packout inserts, and Gridfinity bins from photos."
        canonical="https://tracetoforge.com/blog"
      />
      <div className="min-h-screen bg-[#0D0D12] text-white">
        {/* Header */}
        <header className="border-b border-[#2A2A35]/50 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold text-brand">TracetoForge</Link>
            <nav className="flex items-center gap-4">
              <Link to="/blog" className="text-sm text-white font-medium">Blog</Link>
              <Link to="/guide" className="text-sm text-[#8888A0] hover:text-white transition-colors">Guide</Link>
              <Link to="/editor" className="px-4 py-2 text-sm font-semibold bg-brand hover:bg-brand-light text-white rounded-lg transition-colors">
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
