import { useEffect } from 'react'

/**
 * Lightweight per-route SEO component.
 * Updates document.title and meta tags on mount.
 * Works with Cloudflare Pages SPA without SSR.
 */
export default function SEOHead({ title, description, canonical, type = 'website', image }) {
  useEffect(() => {
    // Title
    document.title = title

    // Helper to set or create a meta tag
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    // Standard meta
    setMeta('name', 'description', description)
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', canonical)
    }

    // Open Graph
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', type)
    if (canonical) setMeta('property', 'og:url', canonical)
    if (image) setMeta('property', 'og:image', image)

    // Twitter Card
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    if (image) setMeta('name', 'twitter:image', image)
  }, [title, description, canonical, type, image])

  return null
}
