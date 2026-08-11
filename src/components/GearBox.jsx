import { useState } from 'react'

// Affiliate gear box for blog posts. Items with a photo render as image
// cards; items without fall back to the plain link row, so photos can be
// added product by product without breaking anything.
// Photos live in /public/gear/ - our own product photography only
// (Amazon's image terms do not allow hotlinking or re-hosting their images).
// If a photo is missing or fails to load, the thumbnail removes itself and
// the row degrades to the plain link. Never show a broken image icon.
function GearThumb({ src, alt }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width="80"
      height="80"
      onError={() => setFailed(true)}
      className="w-20 h-20 rounded-lg object-cover border border-[#2A2A35] bg-[#0E0E14] flex-shrink-0"
    />
  )
}

export default function GearBox({ items }) {
  return (
    <div className="my-8 p-5 rounded-xl bg-[#16161E] border border-[#2A2A35]">
      <p className="!mt-0 !mb-3 font-bold text-white">Gear mentioned in this guide</p>
      <div className="!my-0 space-y-3">
        {items.map((it, i) => (
          <a
            key={i}
            href={it.href}
            rel="sponsored nofollow noopener"
            target="_blank"
            className="flex items-center gap-4 group !no-underline rounded-lg -mx-2 px-2 py-1.5 hover:bg-[#1C1C24] transition-colors"
          >
            <GearThumb src={it.img} alt={it.title} />
            <span className="min-w-0">
              <span className="block font-semibold text-brand group-hover:underline leading-snug">{it.title}</span>
              {it.blurb && <span className="block text-sm text-[#9999AD] leading-snug mt-0.5">{it.blurb}</span>}
            </span>
          </a>
        ))}
      </div>
      <p className="!mb-0 !mt-3 text-xs text-[#666680]">Amazon affiliate links. As an Amazon Associate we earn from qualifying purchases at no extra cost to you.</p>
    </div>
  )
}
