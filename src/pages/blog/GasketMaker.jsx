import React from 'react'
import GearBox from '../../components/GearBox'
import BlogPost from './BlogPost'

export default function GasketMaker() {
  return (
    <BlogPost
      title="Make a Replacement Gasket from a Photo (No CAD, No Tracing by Hand)"
      description="Turn a photo of a dead gasket into a cutting template or printable TPU gasket. Lay it on a sheet of paper, snap a photo, export SVG, DXF, or STL."
      canonical="https://tracetoforge.com/blog/gasket-maker-from-photo/"
      date="July 18, 2026"
      readTime="6 min"
      tags={['Gaskets', 'DIY Repair', 'SVG', 'DXF']}
    >
      <p><strong>The old gasket tore coming off, the part is discontinued, and the parts counter guy just shrugged.</strong> Every small engine, compressor, and old machine owner hits this wall eventually. The usual fix is tracing the dead gasket onto material with a pencil and cutting by eyeball, which works about as well as it sounds.</p>
      <p>Here is the better way: photograph the old gasket on a sheet of printer paper and let software do the tracing. TracetoForge was built for tool drawer inserts, but the exact same engine that traces a wrench traces a gasket, and it exports the two formats gasket work actually needs: SVG and DXF for cutting, STL and 3MF for printing.</p>

      <h2>Why the Sheet of Paper Matters</h2>
      <p>A photo alone has no scale. A photo with a Letter or A4 sheet in it does, because the software knows a Letter sheet is exactly 279.4 by 215.9 millimeters. Lay your old gasket flat on plain white paper, keep all four corners of the sheet in frame, and shoot straight down. The app finds the paper, corrects the camera angle as if you had shot it perfectly overhead, and sets real dimensions automatically. No ruler, no guessing, no scaling the export by trial and error.</p>
      <p>In our testing against calipers, dimensions come out within a couple millimeters, and gasket material is compressible, so that is comfortably inside working tolerance for most jobs.</p>

      <h2>The Process, Start to Finish</h2>
      <ul>
        <li><strong>1. Recover the old gasket.</strong> Even a torn one works if you can lay the pieces in position. Scrape it clean enough that the outline reads true.</li>
        <li><strong>2. Photograph it on white paper.</strong> Darker table underneath, light from above, all four paper corners visible. Overhead light means less shadow and a truer trace.</li>
        <li><strong>3. Trace it.</strong> Upload with the paper option checked. The outline gets detected automatically and you can drag any point that needs a nudge.</li>
        <li><strong>4. Export for your method.</strong> SVG or DXF if you are cutting material with a knife, a vinyl cutter, or a laser. STL or 3MF if you are printing the gasket directly in TPU.</li>
      </ul>

      <div className="my-8 p-5 rounded-xl bg-brand/5 border border-brand/20">
        <p className="!my-0 text-sm"><strong>See the tracer work first:</strong> <a href="/editor/?gasket=1">open the gasket preset</a> and it sets up thin-profile output with paper sizing on, or <a href="/editor/?sample=1">watch it trace a sample tool</a> in about ten seconds. No signup needed to try it.</p>
      </div>

      <h2>Cutting vs Printing the New Gasket</h2>
      <p>For most jobs, exporting the template and cutting real gasket material is the move. Cork sheet for oil pans and valve covers on old equipment, rubber or neoprene sheet for water and air, and fiber gasket material for fuel and higher temps. Print the SVG at 100 percent scale on plain paper, glue stick it to the material, and cut. Or send the DXF straight to a vinyl cutter or laser if you have one.</p>
      <p>Printing directly works when the material fits the job. TPU at 95A prints a serviceable gasket for low pressure air, water, and dust sealing applications. Keep it away from fuel and real heat. Print 2 to 3 perimeters, 100 percent infill, and around 0.5 to 1 millimeter thicker than the old gasket to account for compression.</p>

      <h2>The Honest Limitation: Bolt Holes</h2>
      <p>The tracer captures the outer profile of the gasket. Interior bolt holes and the center opening do not auto-detect yet, so handle them the way machinists always have: transfer punch the holes from the old gasket or the flange itself. Cut the outer profile from the template, lay it in place, and punch. A cheap hollow punch set makes cleaner holes than any knife anyway. For center openings, trace the flange opening onto the back of the template and cut inside the line.</p>

      <GearBox items={[
        { img: '/gear/gasket-material.webp', href: 'https://www.amazon.com/s?k=gasket+material+sheet+assortment&tag=tracetoforge-20', title: 'Gasket material sheet assortment', blurb: 'cork, rubber, and fiber in one pack covers most jobs' },
        { img: '/gear/punch-set.webp', href: 'https://www.amazon.com/s?k=hollow+punch+set&tag=tracetoforge-20', title: 'Hollow punch set', blurb: 'clean bolt holes, better than any knife' },
        { img: '/gear/tpu-filament.webp', href: 'https://www.amazon.com/s?k=tpu+filament+95a+1.75mm&tag=tracetoforge-20', title: 'TPU filament (95A)', blurb: 'for printing low-pressure gaskets directly' },
      ]} />

      <h2>What This Replaces</h2>
      <p>A custom gasket from a specialty shop runs $15 to $50 plus a week of waiting. Gasket material for a dozen gaskets costs about $10. The trace takes two minutes, and the template is saved in your library, so the next time that machine needs the same gasket, you export and cut in five minutes flat.</p>
    </BlogPost>
  )
}
