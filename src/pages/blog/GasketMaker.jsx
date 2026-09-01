import React from 'react'
import GearBox from '../../components/GearBox'
import BlogPost from './BlogPost'

export default function GasketMaker() {
  return (
    <BlogPost
      title="Make a Replacement Gasket from a Photo, Bolt Holes and All"
      description="Photograph a dead gasket and get back a cutting template with bolt holes detected automatically. Perspective-corrected sizing, SVG and DXF for cutting, STL and 3MF for TPU."
      canonical="https://tracetoforge.com/blog/gasket-maker-from-photo/"
      date="July 18, 2026"
      updated="September 1, 2026"
      readTime="6 min"
      tags={['Gaskets', 'DIY Repair', 'SVG', 'DXF', 'Hole Detection']}
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

      <h2>Bolt Holes Are Detected Automatically</h2>
      <p>This used to be the weak spot. It is not anymore. The tracer now finds interior openings, not just the outer profile, so bolt holes and the center opening come through in the same pass as the outline. Behind the scenes it walks the contour hierarchy and keeps anything nested inside the gasket body, which is exactly what a bolt hole is.</p>
      <p>The <strong>Hole Size</strong> slider controls how small an opening has to be before it gets ignored. Turn it down and you pick up every pinhole, including specks of dirt and paper texture. Turn it up and you keep only the real bolt holes. Start in the middle and adjust until the preview matches what you are holding.</p>
      <p>A few things still fool it. Holes that the old gasket tore through are open to the edge, so they read as part of the outline rather than as holes. Holes filled with old sealant or carbon do not read at all, so scrape them clear before shooting. And if a hole comes out slightly undersized, that is usually better than oversized, since you can open a hole with a punch but you cannot shrink one.</p>

      <h2>The Calibration Sheet, for When It Has to Be Exact</h2>
      <p>Plain paper gets you within a couple of millimeters, which is fine for cork and rubber. When the bolt pattern has to line up on the first try, print the calibration sheet instead. It carries reference markers that let the software correct perspective more aggressively than paper corners alone, so a photo shot slightly off-axis still resolves to true dimensions. Print it at 100 percent scale with page scaling off, lay the gasket on it, and shoot as normal.</p>
      <p>Worth doing whenever bolt spacing matters more than outer profile, which for flange gaskets is most of the time.</p>

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
