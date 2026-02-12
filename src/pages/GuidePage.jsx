import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Box, Camera, MousePointerClick, Download, ChevronDown, ChevronUp, ArrowLeft, Ruler, Move, LayoutGrid, Hand, Layers, Settings, ScanLine } from 'lucide-react'

const TUTORIAL_STEPS = [
  {
    icon: Camera,
    title: 'Take a Good Photo',
    content: [
      'Place your tool on a solid, contrasting background (white paper on a dark surface works great).',
      'Shoot from directly above, keeping the camera as level as possible to avoid perspective distortion.',
      'Make sure the entire tool is in frame with some margin around the edges.',
      'Good lighting helps the edge detection. Avoid strong shadows that could confuse the outline.',
    ],
    tip: 'Pro tip: A sheet of printer paper on a dark countertop is the easiest setup. Natural daylight near a window gives the cleanest edges.',
  },
  {
    icon: ScanLine,
    title: 'Trace the Outline',
    content: [
      'After uploading, TracetoForge automatically detects the tool outline using edge detection.',
      'Use the Threshold and Sensitivity sliders to fine-tune how the edge detection works.',
      'If the auto-detection misses part of the outline, try adjusting the Simplification slider to capture more detail.',
      'You can select different detected shapes from the sidebar if multiple contours are found.',
    ],
    tip: 'Pro tip: Start with the default settings. Only adjust sliders if the detected outline looks wrong.',
  },
  {
    icon: Ruler,
    title: 'Set Real Dimensions',
    content: [
      'Enter the real-world Width of your tool in millimeters. Measure with a ruler or calipers for accuracy.',
      'The Height will auto-calculate based on the photo aspect ratio.',
      'Set the Depth to how deep you want the tool cavity (typically the thickest part of the tool).',
      'Tolerance adds extra space around the outline so the tool fits easily. Start with 1-1.5mm.',
    ],
    tip: 'Pro tip: Measure your tool at its widest point. Add 1mm tolerance for a snug fit, 2mm for easy drop-in.',
  },
  {
    icon: Move,
    title: 'Position Your Tool',
    content: [
      'Use Offset X and Y to move the tool cavity within the tray.',
      'Use Rotate to angle the tool if needed.',
      'In the 3D preview, you can click and drag the orange tool cavity to reposition it directly.',
      'For multi-tool trays, click "+ Add Tool" to upload additional tools into the same tray.',
    ],
    tip: 'Pro tip: Switch to Top view in the 3D preview for the easiest drag-and-drop positioning.',
  },
  {
    icon: LayoutGrid,
    title: 'Choose Your Output',
    content: [
      'Object Mode exports just the tool shape as a standalone 3D object.',
      'Tray Mode generates a rectangular tray with the tool cavity cut in. Set tray Width, Height, Depth, and Wall Thickness.',
      'Gridfinity Mode generates a Gridfinity-compatible bin with proper base profile for stacking on baseplates.',
      'For Gridfinity, set Grid X and Grid Y for bin size (in grid units) and Height for wall height in mm.',
    ],
    tip: 'Pro tip: Gridfinity bins snap into standard Gridfinity baseplates. A 4x2 bin at 21mm height works great for most hand tools.',
  },
  {
    icon: Hand,
    title: 'Add Finger Notches',
    content: [
      'Finger notches are cutouts that let you grab the tool out of the tray.',
      'Click "+ Add" in the Finger Notches section to add one (up to 5).',
      'Choose circle, square, or rectangle shape and set the size.',
      'In the 3D preview, drag the green notch to position it exactly where you want to grip.',
    ],
    tip: 'Pro tip: Place notches near the heaviest end of the tool for the easiest grip.',
  },
  {
    icon: Settings,
    title: 'Fine-Tune & Export',
    content: [
      'Cavity Bevel adds a chamfer around the top edge of the cavity for easier tool insertion.',
      'Edge Profile (Tray mode) lets you add a rounded or chamfered edge to the tray itself.',
      'Outer Shape (Tray mode) can be Rectangle, Oval, or a Custom polygon you draw.',
      'When everything looks right, click "3D Preview & Export" then "Export STL" to download your file.',
    ],
    tip: 'Pro tip: A 1-2mm cavity bevel makes a big difference in how smoothly the tool drops in.',
  },
]

const FAQ_ITEMS = [
  {
    q: 'What 3D printer do I need?',
    a: 'Any FDM 3D printer works. PLA is the most common material for tool inserts. No special hardware required.',
  },
  {
    q: 'Is TracetoForge really free?',
    a: 'The core features are free and run entirely in your browser. No account required to get started. Premium features with additional export options are available for power users.',
  },
  {
    q: 'What file format does it export?',
    a: 'TracetoForge exports standard STL files that work with every major slicer including Cura, PrusaSlicer, BambuStudio, Creality Print, and OrcaSlicer.',
  },
  {
    q: 'Do I need CAD experience?',
    a: 'Not at all. That is the whole point. You take a photo, adjust a few sliders, and export. No CAD software, no modeling skills, no tutorials to watch.',
  },
  {
    q: 'What is Gridfinity?',
    a: 'Gridfinity is an open-source modular storage system designed by Zack Freedman. Bins snap onto baseplates in a grid pattern, letting you organize drawers and workbenches with customizable compartments. TracetoForge generates bins that are fully compatible with standard Gridfinity baseplates.',
  },
  {
    q: 'How accurate is the edge detection?',
    a: 'Very accurate for tools on contrasting backgrounds. The auto-trace works best with good lighting and a clean background. You can always adjust the threshold and sensitivity sliders to dial it in, or use a different contour if multiple are detected.',
  },
  {
    q: 'Can I put multiple tools in one tray?',
    a: 'Yes. Click "+ Add Tool" to upload additional tools. Each tool gets its own photo, dimensions, and positioning. You can drag each tool independently in the 3D preview.',
  },
  {
    q: 'What tolerance should I use?',
    a: 'Start with 1.5mm for a comfortable fit. Use 1mm for a snug fit (tools stay in when tilted), 2mm for easy drop-in access. This depends on your printer accuracy too, so you may need to experiment.',
  },
  {
    q: 'My slicer shows errors in the STL. What do I do?',
    a: 'Most slicers have an auto-repair function that fixes minor mesh issues. In Cura, it happens automatically. In PrusaSlicer, use the "Fix through Netfabb" option. In BambuStudio and OrcaSlicer, click the repair button.',
  },
  {
    q: 'Can I save my projects and come back later?',
    a: 'Yes. Create a free account and use the Save button. Your projects are stored in the cloud and accessible from the Projects dashboard.',
  },
  {
    q: 'What material should I print inserts in?',
    a: 'PLA works great for most tool inserts. It is rigid, inexpensive, and easy to print. For inserts that might get hot (like near car engines), consider PETG. TPU gives a slightly flexible, foam-like feel.',
  },
  {
    q: 'How do I get the best photo for tracing?',
    a: 'White paper on a dark surface, natural light, camera directly above, and make sure the entire tool is in frame. Avoid shadows and reflective surfaces. Matte backgrounds work better than glossy ones.',
  },
]

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#2A2A35]/50">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="text-sm font-medium text-white group-hover:text-brand transition-colors pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="text-brand flex-shrink-0" /> : <ChevronDown size={16} className="text-[#666680] flex-shrink-0" />}
      </button>
      {open && (
        <div className="pb-5 pr-8">
          <p className="text-sm text-[#999AAB] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function GuidePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-lighter/20 backdrop-blur-sm sticky top-0 z-50 bg-bg/80">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
            <Box className="text-brand" size={18} />
          </div>
          <span className="font-semibold text-base tracking-tight">TracetoForge</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs text-[#8888A0] hover:text-white transition-colors">Home</Link>
          <button onClick={() => navigate('/editor')}
            className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors">
            Open Editor
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How to Use <span className="text-brand">TracetoForge</span>
          </h1>
          <p className="text-[#999AAB] text-base max-w-xl mx-auto">
            From photo to print-ready STL in minutes. Follow this step-by-step guide to create custom tool tray inserts and Gridfinity bins.
          </p>
        </div>
      </section>

      {/* Tutorial Steps */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-6">
          {TUTORIAL_STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="bg-surface/40 border border-[#2A2A35]/50 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center mt-0.5">
                    <Icon className="text-brand" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-bold text-brand/60 bg-brand/10 px-2 py-0.5 rounded-full">STEP {i + 1}</span>
                      <h2 className="text-lg font-semibold">{step.title}</h2>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {step.content.map((line, j) => (
                        <li key={j} className="text-sm text-[#999AAB] leading-relaxed flex gap-2">
                          <span className="text-brand/40 mt-1 flex-shrink-0">&#8226;</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="bg-brand/5 border border-brand/10 rounded-lg px-4 py-3">
                      <p className="text-xs text-brand/80 leading-relaxed">{step.tip}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick Reference */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Quick Reference</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface/40 border border-[#2A2A35]/50 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-brand mb-1">1-1.5mm</div>
              <div className="text-xs text-[#999AAB]">Recommended tolerance for comfortable fit</div>
            </div>
            <div className="bg-surface/40 border border-[#2A2A35]/50 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-brand mb-1">21mm</div>
              <div className="text-xs text-[#999AAB]">Good default Gridfinity height for hand tools</div>
            </div>
            <div className="bg-surface/40 border border-[#2A2A35]/50 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-brand mb-1">1-2mm</div>
              <div className="text-xs text-[#999AAB]">Cavity bevel for smooth tool insertion</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-20" id="faq">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center">Frequently Asked Questions</h2>
          <p className="text-[#666680] text-sm text-center mb-8">Everything you need to know about TracetoForge</p>
          <div className="bg-surface/30 border border-[#2A2A35]/50 rounded-xl px-6">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center bg-surface/40 border border-[#2A2A35]/50 rounded-xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
          <p className="text-[#999AAB] text-sm mb-6">No signup needed. Upload a photo and get a print-ready file in minutes.</p>
          <button onClick={() => navigate('/editor')}
            className="px-8 py-3 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold transition-colors">
            Open the Editor
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
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/guide" className="hover:text-white transition-colors">Guide</Link>
            <span>All brand names are trademarks of their respective owners</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
