import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Globe, Star, Share2 } from 'lucide-react'
import SEOHead from '../components/SEOHead'
import CommunityLibrary from '../components/CommunityLibrary'
import { useAuth } from '../components/AuthContext'
import { isPayingUser } from '../lib/publishedTools'

export default function CommunityPage() {
  const { user } = useAuth()
  const [paying, setPaying] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) { setPaying(false); return }
    isPayingUser(user.id).then(setPaying)
  }, [user])

  return (
    <>
      <SEOHead
        title="Community Tool Library — Shared 3D Printable Tool Traces | TracetoForge"
        description="Browse a growing library of community-shared tool traces. Use any trace in your own custom drawer trays, Gridfinity bins, or Packout inserts. Free to use."
        canonical="https://tracetoforge.com/community/"
      />
      <div className="min-h-screen bg-[#0D0D12] text-white">
        <header className="border-b border-[#2A2A35]/50 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-lg font-bold text-brand">TracetoForge</Link>
            <nav className="flex items-center gap-4">
              <Link to="/blog/" className="text-sm text-[#8888A0] hover:text-white transition-colors">Blog</Link>
              <Link to="/editor/" className="px-4 py-2 text-sm font-semibold bg-brand hover:bg-brand-light text-white rounded-lg transition-colors">
                Open Editor
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10 md:py-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#8888A0] hover:text-white transition-colors mb-6">
            <ArrowLeft size={14} /> Home
          </Link>

          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold mb-5 border border-purple-500/30 font-mono tracking-wide uppercase">
              <Globe size={13} /> Community Tool Library
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
              A Growing Library of Tool Traces
            </h1>
            <p className="text-base text-[#9999AD] leading-relaxed">
              Real users have published their traced tools so you can drop them straight into your own drawer trays, Gridfinity bins, or Packout inserts. Free to browse. Free to use. Click any tool to open it in the editor.
            </p>
          </div>

          <div className="bg-surface/40 border border-[#2A2A35]/60 rounded-2xl p-4 md:p-6 mb-10">
            <CommunityLibrary
              userId={user?.id}
              canContribute={paying}
              onUseTool={(tool) => {
                // Persist the picked tool to sessionStorage and bounce to the editor.
                try {
                  sessionStorage.setItem('ttf:loadCommunityTool', JSON.stringify(tool))
                } catch {}
                navigate('/editor')
              }}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-surface/40 border border-[#2A2A35]/60 rounded-xl p-4">
              <Globe size={18} className="text-blue-400 mb-2" />
              <h3 className="font-display font-bold text-sm mb-1">Free to Browse</h3>
              <p className="text-xs text-[#9999AD] leading-relaxed">Anyone can browse the library and use any published tool in their own trays. No sign-in required to look around.</p>
            </div>
            <div className="bg-surface/40 border border-[#2A2A35]/60 rounded-xl p-4">
              <Star size={18} className="text-amber-400 mb-2" />
              <h3 className="font-display font-bold text-sm mb-1">Quality Up Top</h3>
              <p className="text-xs text-[#9999AD] leading-relaxed">Star ratings and upvotes from credit holders surface the best fitting traces. Sort by Top, Highest Rated, or Newest.</p>
            </div>
            <div className="bg-surface/40 border border-[#2A2A35]/60 rounded-xl p-4">
              <Share2 size={18} className="text-purple-400 mb-2" />
              <h3 className="font-display font-bold text-sm mb-1">Contribute</h3>
              <p className="text-xs text-[#9999AD] leading-relaxed">Have a tool dialed in? Publish it from the editor and let the community use it. Original photos stay private; only the silhouette goes public.</p>
            </div>
          </div>

          <div className="text-center py-8 border-t border-[#2A2A35]/50">
            <h2 className="text-xl font-display font-bold mb-3">Trace your own tools and share them</h2>
            <p className="text-sm text-[#9999AD] mb-5 max-w-lg mx-auto">Open the editor, snap a photo, trace it, and click Publish. Help the next person who organizes a drawer skip the work.</p>
            <Link to="/editor/" className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-colors">
              Open Editor <ArrowRight size={16} />
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
