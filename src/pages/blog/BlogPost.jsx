import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import SEOHead from '../../components/SEOHead'

export default function BlogPost({ title, description, canonical, date, readTime, tags, children }) {
  return (
    <>
      <SEOHead
        title={`${title} | TracetoForge Blog`}
        description={description}
        canonical={canonical}
        type="article"
      />
      <div className="min-h-screen bg-[#0D0D12] text-white">
        <header className="border-b border-[#2A2A35]/50 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold text-brand">TracetoForge</Link>
            <nav className="flex items-center gap-4">
              <Link to="/blog" className="text-sm text-[#8888A0] hover:text-white transition-colors">Blog</Link>
              <Link to="/editor" className="px-4 py-2 text-sm font-semibold bg-brand hover:bg-brand-light text-white rounded-lg transition-colors">
                Try Free
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-[#8888A0] hover:text-white transition-colors mb-8">
            <ArrowLeft size={14} /> All Posts
          </Link>

          <article>
            <div className="flex items-center gap-3 text-xs text-[#666680] mb-4">
              <span className="flex items-center gap-1"><Calendar size={12} /> {date}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {readTime} read</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight mb-4 leading-tight">
              {title}
            </h1>

            {tags && (
              <div className="flex items-center gap-2 flex-wrap mb-8">
                {tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#1A1A25] text-[#8888A0] rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-invert prose-orange max-w-none
              [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4
              [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3
              [&_p]:text-[#BBBBCC] [&_p]:leading-relaxed [&_p]:mb-4
              [&_ul]:text-[#BBBBCC] [&_ul]:space-y-2 [&_ul]:mb-4 [&_ul]:pl-5
              [&_ol]:text-[#BBBBCC] [&_ol]:space-y-2 [&_ol]:mb-4 [&_ol]:pl-5
              [&_li]:leading-relaxed
              [&_strong]:text-white [&_strong]:font-semibold
              [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2
              [&_blockquote]:border-l-2 [&_blockquote]:border-brand/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#8888A0]
            ">
              {children}
            </div>
          </article>

          {/* CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-brand/5 border border-brand/20 text-center">
            <h2 className="text-xl font-bold mb-2">Ready to create your own custom inserts?</h2>
            <p className="text-[#8888A0] mb-5 max-w-md mx-auto">
              Snap a photo, trace, preview, and export. 3 free credits on signup, no credit card required.
            </p>
            <Link
              to="/editor"
              className="inline-block px-6 py-3 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-colors"
            >
              Try TracetoForge Free
            </Link>
          </div>
        </main>

        <footer className="border-t border-[#2A2A35]/50 py-8 text-center text-xs text-[#555568]">
          <p>&copy; {new Date().getFullYear()} TracetoForge. All rights reserved.</p>
        </footer>
      </div>
    </>
  )
}
