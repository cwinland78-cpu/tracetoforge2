import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-[#8888A0] hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Back to TracetoForge
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
          About TracetoForge
        </h1>
        <p className="text-sm text-[#666680] font-mono mb-12">A small maker project run out of Ohio.</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[#AAABB8] leading-relaxed">
          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Why this exists</h2>
            <p className="mb-3">
              TracetoForge started as a personal problem. Anyone who owns a decent set of hand tools
              eventually hits the same wall: the tools are fine, the toolbox is fine, but the inside
              of the drawer is a loose mess of pliers rolling into wrenches into screwdrivers. Every
              time you reach for a tool you have to rummage. Foam inserts help but they are expensive,
              they do not last, and cutting them by hand is slow.
            </p>
            <p className="mb-3">
              3D printed inserts are the obvious answer, but the existing workflow to design one was
              not obvious at all. You needed to learn Fusion 360 or FreeCAD, manually measure every
              tool with calipers, model the shape by hand, then extrude it into a tray. For a single
              pair of pliers that is a 30 to 45 minute project. For a drawer full of them, a whole
              weekend. That gap is what TracetoForge was built to close.
            </p>
            <p>
              The idea was simple. A phone camera already captures the shape of a tool more accurately
              than any human with calipers. Edge detection is a solved problem. If you could point
              that pipeline at a top-down photo of a tool on a sheet of paper, you could skip the
              measuring and the modeling and go straight to a printable file. Everything else is
              plumbing.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Who runs it</h2>
            <p className="mb-3">
              TracetoForge is operated by Qwikymart LLC, an Ohio-registered small business. The team
              is one person who writes the code, answers the support email, and packs the physical
              inserts that ship from the shop. It is not a venture-backed company and it will not
              be one. The goal is to cover its costs, serve the 3D printing and maker community, and
              grow at a pace that keeps the product quality honest.
            </p>
            <p>
              The owner is a longtime hobbyist maker based in Northeast Ohio. No fancy credentials,
              no pedigree. Just a garage, a 3D printer, a toolbox that used to be a mess, and enough
              web development background to turn an idea into something other makers can use. Every
              feature in the editor got built because somebody (often the owner) hit a wall trying to
              do something in Fusion 360 that should have taken two minutes.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">What we actually do</h2>
            <p className="mb-3">
              <strong className="text-white">The software side.</strong> TracetoForge is a browser-based
              editor that runs entirely on your device. You upload a photo of a tool, OpenCV traces
              the outline, and you export a print-ready STL, 3MF, SVG, or DXF. The app supports
              Gridfinity, Milwaukee Packout, DeWalt ToughSystem, and any custom tray dimensions.
              Tracing and previewing are free. Exporting a file costs one credit. New accounts get
              three free credits on signup.
            </p>
            <p>
              <strong className="text-white">The physical side.</strong> Not everyone owns a 3D printer.
              For those folks we print and ship inserts from the shop, using PETG filament that holds
              up to garage heat and vehicle toolboxes. The inserts are listed on the{' '}
              <a
                href="https://www.etsy.com/shop/TracetoForge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline hover:no-underline"
              >
                TracetoForge Etsy shop
              </a>
              {' '}and on{' '}
              <a
                href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&rh=n%3A553240"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline hover:no-underline"
              >
                Amazon
              </a>
              {', '}
              sold under the Qwikymart LLC seller account. Each insert is traced from the actual tool,
              not from manufacturer spec sheets, so the fit is real.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">What we believe about tool organization</h2>
            <p className="mb-3">
              An honest opinion, because this site is not a neutral encyclopedia. A few things we have
              come to believe after making a lot of these:
            </p>
            <p className="mb-3">
              <strong className="text-white">Shadowbox trays beat bin systems for flat tools.</strong>
              Gridfinity is brilliant for small parts and anything you want to stand up. For pliers
              and wrenches that want to lie flat, a drawer-tray format with a precision cutout wastes
              less space and looks better. Not every tool wants to live in a bin.
            </p>
            <p className="mb-3">
              <strong className="text-white">PETG is the right filament for tool inserts.</strong>
              PLA looks cleaner off the bed but warps above roughly 60°C, which is a normal summer
              day in a closed garage or a truck toolbox. PETG handles 80°C, prints fine on a cheap
              printer, and ages well. ABS and ASA are overkill unless the shop gets really hot.
            </p>
            <p>
              <strong className="text-white">Socket organizers are a solved problem, leave them alone.</strong>
              There are hundreds of free socket holder designs on Printables, MakerWorld, and
              Thingiverse, and most of them work. Wrenches, pliers, screwdrivers, utility knives, and
              specialty tools are where the gap is. That is where TracetoForge focuses.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Where the site is heading</h2>
            <p>
              Most of the work happens in the editor. It gets better when users report a case where
              tracing failed or a tolerance was off. The blog is a slower project: one post at a time,
              focused on practical questions real makers actually ask instead of SEO fodder. Support
              email is{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>{' '}
              and it is read by a human.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Business information</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-white">Operator:</strong> Qwikymart LLC</li>
              <li><strong className="text-white">Location:</strong> Northeast Ohio, United States</li>
              <li><strong className="text-white">Support email:</strong>{' '}
                <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                  support@tracetoforge.com
                </a>
              </li>
              <li><strong className="text-white">Etsy shop:</strong>{' '}
                <a href="https://www.etsy.com/shop/TracetoForge" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:no-underline">
                  etsy.com/shop/TracetoForge
                </a>
              </li>
              <li><strong className="text-white">Amazon storefront:</strong>{' '}
                <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&rh=n%3A553240" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:no-underline">
                  TracetoForge on Amazon
                </a>
              </li>
              <li><strong className="text-white">Founded:</strong> 2025</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Contact</h2>
            <p>
              The best way to reach us is email at{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>. Feature requests, bug reports, tracing problems, or just hello, all welcome.
              There is also a{' '}
              <Link to="/contact/" className="text-brand underline hover:no-underline">
                contact form
              </Link>{' '}
              if you prefer.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-surface-lighter/20 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#8888A0] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to TracetoForge
          </Link>
        </div>
      </main>
    </div>
  )
}
