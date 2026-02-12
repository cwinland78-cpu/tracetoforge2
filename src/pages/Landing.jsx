import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Box, Download, ArrowRight, LayoutGrid, Package, Wrench, ShieldCheck, Layers, MousePointerClick, Printer, ChevronDown, Star, Cpu, Eye, FolderOpen, LogOut } from 'lucide-react'
import { useAuth } from '../components/AuthContext'

const STEPS = [
  {
    icon: Camera,
    num: '01',
    title: 'Snap a Photo',
    desc: 'Place your tool on a sheet of paper. Take a photo with your phone. That\'s it.',
    detail: 'Any contrasting background works. No scanning equipment needed.',
  },
  {
    icon: MousePointerClick,
    num: '02',
    title: 'Trace & Adjust',
    desc: 'Our edge detection finds the outline automatically. Fine-tune with simple click-and-drag controls.',
    detail: 'Set real-world dimensions, tolerances, and depth with sliders.',
  },
  {
    icon: Download,
    num: '03',
    title: 'Export & Print',
    desc: 'Download a print-ready STL file. Load it into your slicer and hit print.',
    detail: 'Works with any 3D printer and any slicer software.',
  },
]

const MODES = [
  {
    icon: Box,
    title: 'Custom Tray',
    desc: 'Rectangular or oval tray with a precision-cut cavity for your tool. Set wall height, thickness, and edge chamfers.',
    tag: 'Most Popular',
  },
  {
    icon: LayoutGrid,
    title: 'Gridfinity Bin',
    desc: 'Standard Gridfinity-compatible insert with proper base profile, stacking lip, and grid alignment. Drops right into your baseplate.',
    tag: 'Gridfinity',
  },
  {
    icon: Layers,
    title: '3D Object',
    desc: 'Just the extruded shape of your tool. Perfect for custom mounts, templates, or prototyping parts.',
    tag: 'Flexible',
  },
]

const PAIN_POINTS = [
  { problem: 'Spent 4 hours learning Fusion 360 just to make one tray', solution: 'TracetoForge does it in under 2 minutes' },
  { problem: 'Hand-cutting foam with a knife looks terrible', solution: 'Get precision 3D-printed inserts from a photo' },
  { problem: 'Downloaded a generic bin that doesn\'t fit my tools', solution: 'Every insert is custom-shaped to YOUR exact tools' },
  { problem: 'Paid $40+ for a single pre-made Packout insert', solution: 'Print unlimited custom inserts for pennies in filament' },
]

function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.round(eased * end))
          if (progress < 1) requestAnimationFrame(tick)
        }
        tick()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function Landing() {
  const navigate = useNavigate()
  const { user, profile, isAuthenticated, signOut } = useAuth()
  const heroRef = useRef(null)
  const [activeMode, setActiveMode] = useState(0)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const handleMove = (e) => {
      const rect = hero.getBoundingClientRect()
      hero.style.setProperty('--mx', `${e.clientX - rect.left}px`)
      hero.style.setProperty('--my', `${e.clientY - rect.top}px`)
    }
    hero.addEventListener('mousemove', handleMove)
    return () => hero.removeEventListener('mousemove', handleMove)
  }, [])

  return (
    <div className="min-h-screen bg-bg landing-page">
      <style>{`
        .landing-page {
          --font-display: 'Outfit', 'Space Grotesk', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        .landing-page h1, .landing-page h2, .landing-page h3, .landing-page .font-display {
          font-family: var(--font-display);
        }
        .landing-page .font-mono {
          font-family: var(--font-mono);
        }

        .hero-grid {
          background-image:
            linear-gradient(rgba(232,101,10,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232,101,10,0.04) 1px, transparent 1px);
          background-size: 42px 42px;
        }

        .glow-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(232,101,10,0.5), transparent);
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          border-color: rgba(232,101,10,0.4);
          box-shadow: 0 8px 32px rgba(232,101,10,0.08);
        }

        .step-line {
          position: absolute;
          top: 36px;
          left: calc(33.33% + 12px);
          right: calc(33.33% + 12px);
          height: 1px;
          background: linear-gradient(90deg, rgba(232,101,10,0.3), rgba(232,101,10,0.1), rgba(232,101,10,0.3));
        }

        @keyframes float-badge {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
        .float-badge {
          animation: float-badge 3s ease-in-out infinite;
        }

        .stat-card {
          position: relative;
          overflow: hidden;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--brand), transparent);
        }

        .mode-tab {
          transition: all 0.25s ease;
        }
        .mode-tab.active {
          background: rgba(232,101,10,0.1);
          border-color: rgba(232,101,10,0.4);
          color: #E8650A;
        }

        .cta-glow {
          position: relative;
        }
        .cta-glow::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(232,101,10,0.4), transparent 50%, rgba(255,133,52,0.3));
          z-index: -1;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .cta-glow:hover::before {
          opacity: 1;
        }
      `}</style>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-lighter/20 backdrop-blur-sm sticky top-0 z-50 bg-bg/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
            <Box className="text-brand" size={18} />
          </div>
          <span className="text-lg font-display font-bold tracking-tight">Traceto<span className="text-brand">Forge</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/guide')}
            className="px-4 py-2 text-sm font-semibold text-brand border border-brand/40 hover:bg-brand/10 hover:border-brand rounded-lg transition-all hidden sm:flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Guide & FAQ
          </button>
          {isAuthenticated ? (
            <>
              <span className="hidden sm:inline text-xs text-[#8888A0]">{profile?.credits || 0} credits</span>
              <button onClick={() => navigate('/dashboard')}
                className="px-3 py-2 text-sm text-[#C8C8D0] hover:text-white transition-colors flex items-center gap-1.5">
                <FolderOpen size={14} /> My Projects
              </button>
              <button onClick={async () => { await signOut() }}
                className="px-3 py-2 text-sm text-[#8888A0] hover:text-white transition-colors">
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-[#C8C8D0] hover:text-white border border-[#444] rounded-lg transition-colors">
              Sign In
            </button>
          )}
          <button
            onClick={() => navigate('/editor')}
            className="px-5 py-2 bg-brand hover:bg-brand-light text-white font-semibold rounded-lg transition-all text-sm hover:shadow-lg hover:shadow-brand/20"
          >
            Open Editor
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative overflow-hidden px-6 pt-16 pb-24 md:pt-24 md:pb-32 hero-grid"
        style={{
          background: `radial-gradient(800px circle at var(--mx, 50%) var(--my, 50%), rgba(232,101,10,0.05), transparent 50%), radial-gradient(ellipse at 50% 120%, rgba(232,101,10,0.06), transparent 60%)`,
        }}
      >
        {/* Floating badge */}
        <div className="absolute top-8 right-8 md:top-16 md:right-16 float-badge hidden md:block">
          <div className="px-3 py-1.5 bg-surface border border-surface-lighter/50 rounded-lg text-xs font-mono text-[#8888A0]">
            <span className="text-brand">$0</span> to start
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/8 text-brand text-xs font-semibold mb-8 border border-brand/15 font-mono tracking-wide uppercase">
            <Cpu size={13} />
            Zero CAD Skills Required
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black tracking-tight leading-[1.05] mb-6">
            Your Tools.<br />
            Your Trays.<br />
            <span className="text-brand">Your Photo.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#9999AD] max-w-2xl mx-auto mb-4 leading-relaxed">
            Take a photo of any tool. TracetoForge turns it into a perfectly-fitted, 
            3D-printable tray insert. No Fusion 360. No CAD experience. No design skills. 
            Just your phone and your printer.
          </p>

          <p className="text-sm text-[#666680] font-mono mb-10">
            Works with <span className="text-[#AAABB8]">Milwaukee Packout</span> &bull; <span className="text-[#AAABB8]">DeWalt ToughSystem</span> &bull; <span className="text-[#AAABB8]">Gridfinity</span> &bull; <span className="text-[#AAABB8]">10+ systems</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/editor')}
              className="cta-glow px-8 py-4 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-all text-base shadow-xl shadow-brand/15 hover:shadow-brand/25 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              Start Building
              <ArrowRight size={18} />
            </button>
            <span className="text-xs text-[#666680] font-mono">
              100% browser-based &bull; Nothing to install
            </span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="glow-line" />

      {/* Anti-CAD messaging */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight mb-4">
              Built for <span className="text-brand">Makers</span>, Not Engineers
            </h2>
            <p className="text-[#8888A0] max-w-xl mx-auto leading-relaxed">
              You shouldn't need a CAD degree to organize your toolbox.
              TracetoForge turns anyone with a phone camera into a custom insert designer.
            </p>
          </div>

          {/* Pain points grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {PAIN_POINTS.map(({ problem, solution }, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl bg-surface border border-surface-lighter/40 card-hover">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                    <span className="text-red-400 text-xs font-bold font-mono">&#x2715;</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-[#8888A0] mb-2 line-through decoration-[#555]/50">{problem}</p>
                  <p className="text-sm text-[#CCCCDD] font-medium flex items-start gap-2">
                    <span className="text-brand flex-shrink-0 mt-0.5">&rarr;</span>
                    {solution}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* How It Works */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-mono text-xs text-brand tracking-widest uppercase mb-3 block">Process</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight">
              Three Steps. Two Minutes. Done.
            </h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line (desktop) */}
            <div className="step-line hidden md:block" />

            {STEPS.map(({ icon: Icon, num, title, desc, detail }, i) => (
              <div key={i} className="relative text-center group">
                {/* Number circle */}
                <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] rounded-2xl bg-surface border border-surface-lighter/60 mb-6 group-hover:border-brand/40 transition-colors">
                  <Icon size={28} className="text-brand" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {num}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-[#BBBBCC] leading-relaxed mb-2">{desc}</p>
                <p className="text-xs text-[#666680] font-mono">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* Output Modes - Tabbed */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="font-mono text-xs text-brand tracking-widest uppercase mb-3 block">Output</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight mb-4">
              Three Ways to Forge
            </h2>
            <p className="text-[#8888A0] max-w-lg mx-auto">
              Choose the output that matches your setup. Every mode exports a print-ready STL.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 justify-center mb-8 flex-wrap">
            {MODES.map(({ icon: Icon, title, tag }, i) => (
              <button
                key={i}
                onClick={() => setActiveMode(i)}
                className={`mode-tab px-4 py-2.5 rounded-lg border text-sm font-semibold flex items-center gap-2 ${
                  activeMode === i
                    ? 'active border-brand/40'
                    : 'border-surface-lighter/40 text-[#8888A0] hover:text-[#CCCCDD] hover:border-surface-lighter/80'
                }`}
              >
                <Icon size={16} />
                {title}
              </button>
            ))}
          </div>

          {/* Active mode detail */}
          <div className="p-8 rounded-2xl bg-surface border border-surface-lighter/50 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand/10 text-brand text-[10px] font-mono font-semibold uppercase tracking-wider mb-4">
              {MODES[activeMode].tag}
            </div>
            <h3 className="font-display font-bold text-xl mb-3">{MODES[activeMode].title}</h3>
            <p className="text-[#9999AD] max-w-lg mx-auto leading-relaxed">{MODES[activeMode].desc}</p>
            {activeMode === 1 && (
              <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-surface-light border border-surface-lighter/40">
                <LayoutGrid size={14} className="text-brand" />
                <span className="text-xs font-mono text-[#8888A0]">42mm grid &bull; Proper base profile &bull; Stacking lip</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* Stats */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 0, label: 'CAD skills needed', suffix: '' },
              { value: 100, label: 'Browser-based', suffix: '%' },
              { value: 2, label: 'Minutes avg', suffix: '' },
              { value: 0, label: 'Install required', suffix: '' },
            ].map(({ value, label, suffix }, i) => (
              <div key={i} className="stat-card p-5 rounded-xl bg-surface border border-surface-lighter/40 text-center">
                <div className="text-2xl md:text-3xl font-display font-black text-brand mb-1">
                  <AnimatedCounter end={value} suffix={suffix} />
                </div>
                <p className="text-xs text-[#8888A0] font-mono">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* Compatible Systems */}
      <section className="px-6 py-20 md:py-28">
        <div className="max-w-5xl mx-auto text-center">
          <span className="font-mono text-xs text-brand tracking-widest uppercase mb-3 block">Compatibility</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold tracking-tight mb-4">
            Works With What You Already Own
          </h2>
          <p className="text-[#8888A0] max-w-lg mx-auto mb-14">
            Export STL files sized for your exact organizer system. Pick your brand, set your case, and print inserts that fit.
          </p>

          {/* Tier 1 - Primary Systems */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { name: 'Milwaukee Packout', note: 'The standard. Largest ecosystem of cases, mounts, and accessories.', highlight: true },
              { name: 'DeWalt ToughSystem 2.0', note: 'Heavy-duty modular storage. Big presence at Home Depot.' },
              { name: 'DeWalt TSTAK', note: 'Compact and lightweight. Great for mobile setups.' },
            ].map(({ name, note, highlight }, i) => (
              <div key={i} className={`relative p-5 rounded-xl border transition-colors card-hover ${
                highlight
                  ? 'bg-brand/5 border-brand/30'
                  : 'bg-surface border-surface-lighter/40'
              }`}>
                {highlight && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest bg-brand text-white px-2.5 py-0.5 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display font-bold text-sm mb-1.5">{name}</h3>
                <p className="text-xs text-[#666680] leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          {/* Tier 2 - Growing Systems */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { name: 'Ridgid Pro Gear 2.0', note: 'Home Depot exclusive' },
              { name: 'Makita MakTrak', note: 'New and growing fast' },
              { name: 'Flex Stack Pack', note: "Lowe's powerhouse" },
              { name: 'Gridfinity', note: '42mm open standard' },
            ].map(({ name, note }, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface border border-surface-lighter/40 card-hover">
                <h3 className="font-display font-bold text-xs mb-1">{name}</h3>
                <p className="text-[10px] text-[#666680] font-mono">{note}</p>
              </div>
            ))}
          </div>

          {/* Tier 3 - Specialty Systems */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { name: 'Klein ModBox', note: 'Electrician favorite' },
              { name: 'Bosch L-Boxx', note: 'New Contractor system' },
              { name: 'Festool Systainer', note: 'Premium woodworking' },
              { name: 'Makita MakPac', note: 'Systainer-compatible' },
            ].map(({ name, note }, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface/50 border border-surface-lighter/20 card-hover">
                <h3 className="font-display font-bold text-xs text-[#AAABB8] mb-1">{name}</h3>
                <p className="text-[10px] text-[#555568] font-mono">{note}</p>
              </div>
            ))}
          </div>

          {/* Printers & Slicers row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="p-5 rounded-xl bg-surface border border-surface-lighter/40 card-hover">
              <Printer size={18} className="text-brand mx-auto mb-2" />
              <h3 className="font-display font-bold text-sm mb-1">Any 3D Printer</h3>
              <p className="text-xs text-[#666680] font-mono">FDM, Resin, or SLA</p>
            </div>
            <div className="p-5 rounded-xl bg-surface border border-surface-lighter/40 card-hover">
              <Cpu size={18} className="text-brand mx-auto mb-2" />
              <h3 className="font-display font-bold text-sm mb-1">Any Slicer</h3>
              <p className="text-xs text-[#666680] font-mono">Cura, PrusaSlicer, Bambu, OrcaSlicer</p>
            </div>
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* Privacy / Trust */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-xl bg-surface border border-surface-lighter/40 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={24} className="text-green-400" />
            </div>
            <div>
              <h3 className="font-display font-bold mb-1">Your photos never leave your browser</h3>
              <p className="text-sm text-[#8888A0] leading-relaxed">
                All processing happens locally on your device using OpenCV.js. No uploads, no cloud processing, no accounts required. 
                Your tool photos and designs stay on your machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 md:py-28 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight mb-6">
            Stop cutting foam.<br />
            <span className="text-brand">Start forging.</span>
          </h2>
          <p className="text-[#8888A0] mb-8 max-w-md mx-auto">
            From photo to print-ready STL in under two minutes. 
            Free to use. No sign-up. No downloads.
          </p>
          <button
            onClick={() => navigate('/editor')}
            className="cta-glow px-10 py-4 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-all text-lg shadow-xl shadow-brand/20 hover:shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 mx-auto"
          >
            Open Editor
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-surface-lighter/20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[#666680]">
            <div className="w-5 h-5 rounded bg-brand/15 flex items-center justify-center">
              <Box className="text-brand" size={12} />
            </div>
            <span className="font-mono text-xs">&copy; {new Date().getFullYear()} TracetoForge</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#555568] font-mono">
            <a href="/guide" className="hover:text-white transition-colors">Guide & FAQ</a>
            <span>All brand names are trademarks of their respective owners</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
