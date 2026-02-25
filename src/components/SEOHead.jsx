import { useEffect } from 'react'

/**
 * Lightweight per-route SEO component.
 * Updates document.title, meta tags, and structured data on mount.
 * Works with Cloudflare Pages SPA without SSR.
 */
export default function SEOHead({ title, description, canonical, type = 'website', image, article }) {
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

    // BlogPosting structured data for articles
    if (type === 'article' && article) {
      // Remove any previous article schema
      const prev = document.getElementById('article-schema')
      if (prev) prev.remove()

      const schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.headline || title,
        description: description,
        url: canonical,
        datePublished: article.datePublished,
        dateModified: article.dateModified || article.datePublished,
        author: {
          '@type': 'Person',
          name: 'Chris Winland',
          url: 'https://tracetoforge.com'
        },
        publisher: {
          '@type': 'Organization',
          name: 'TracetoForge',
          url: 'https://tracetoforge.com',
          logo: {
            '@type': 'ImageObject',
            url: 'https://tracetoforge.com/icon-512.png'
          }
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical
        },
        ...(article.keywords && { keywords: article.keywords }),
        ...(image && { image: image })
      }

      const script = document.createElement('script')
      script.id = 'article-schema'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    }

    // Cleanup article schema on unmount
    return () => {
      const el = document.getElementById('article-schema')
      if (el) el.remove()
    }
  }, [title, description, canonical, type, image, article])

  return null
}
