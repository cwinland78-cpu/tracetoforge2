// Public community library client.
// Wraps the published_tools / published_tool_ratings / published_tool_votes tables.
//
// Browse is open to everyone (PostgREST returns rows because the public_read
// RLS policy passes for anon). Publish/rate/upvote require a paying user; RLS
// rejects the insert otherwise, and we also gate the UI to keep the UX clean.
//
// Same raw-fetch pattern as src/lib/savedTools.js per the project rule.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function getAccessToken() {
  try {
    const stored = localStorage.getItem('sb-pzmykycxmbzbrzkyotkc-auth-token')
    if (stored) return JSON.parse(stored)?.access_token
  } catch {}
  return null
}

function authHeaders(extra = {}) {
  const token = getAccessToken()
  return {
    apikey: ANON_KEY,
    Accept: 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...extra,
  }
}

// ─── Browse / read ───────────────────────────────────────────────

// List public tools. Sort options:
//   'top' = highest engagement (upvotes + ratings count)
//   'new' = newest first
//   'rated' = highest avg rating with at least 1 rating
export async function listPublishedTools({ category = null, sort = 'top', search = '', limit = 60 } = {}) {
  const params = new URLSearchParams()
  params.set('select', 'id,author_id,name,category,description,thumbnail,upvotes_count,ratings_count,ratings_sum,created_at')
  params.set('is_hidden', 'eq.false')
  if (category) params.set('category', `eq.${category}`)
  if (search) params.set('name', `ilike.*${search}*`)

  switch (sort) {
    case 'new':
      params.set('order', 'created_at.desc')
      break
    case 'rated':
      // Postgres can't ORDER BY a computed expression via PostgREST cleanly;
      // we fetch a wider window then sort client-side by avg rating.
      params.set('order', 'ratings_count.desc,ratings_sum.desc')
      break
    case 'top':
    default:
      // Engagement proxy: ratings_count + upvotes_count, then recency
      params.set('order', 'upvotes_count.desc,ratings_count.desc,created_at.desc')
  }
  params.set('limit', String(limit))

  const url = `${SUPABASE_URL}/rest/v1/published_tools?${params}`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data }

  // For 'rated' sort, do the avg-rating sort client-side
  if (sort === 'rated' && Array.isArray(data)) {
    data.sort((a, b) => {
      const aAvg = a.ratings_count > 0 ? a.ratings_sum / a.ratings_count : 0
      const bAvg = b.ratings_count > 0 ? b.ratings_sum / b.ratings_count : 0
      if (bAvg !== aAvg) return bAvg - aAvg
      return b.ratings_count - a.ratings_count
    })
  }
  return { data, error: null }
}

// Get one full tool (with its contour data) for adding to a project.
export async function getPublishedTool(id) {
  const url = `${SUPABASE_URL}/rest/v1/published_tools?select=*&id=eq.${id}`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data }
  return { data: data[0] || null, error: null }
}

// Has the current user already rated this tool? Returns the stars or null.
export async function getMyRating(toolId, userId) {
  if (!userId) return { stars: null }
  const url = `${SUPABASE_URL}/rest/v1/published_tool_ratings?select=stars&tool_id=eq.${toolId}&user_id=eq.${userId}`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) return { stars: null }
  return { stars: data[0]?.stars ?? null }
}

// Has the current user upvoted this tool?
export async function getMyVote(toolId, userId) {
  if (!userId) return { voted: false }
  const url = `${SUPABASE_URL}/rest/v1/published_tool_votes?select=tool_id&tool_id=eq.${toolId}&user_id=eq.${userId}`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) return { voted: false }
  return { voted: data.length > 0 }
}

// ─── Write actions (RLS will block non-paying users with HTTP 403) ──────

// Strip identifying / sensitive data from a saved tool before publishing.
// Returns the contour object that goes into published_tools.contour.
// Notably DOES NOT include `image` (the original photo).
export function buildPublicContour(savedConfig) {
  const c = savedConfig || {}
  return {
    contours: c.contours,
    selectedContour: c.selectedContour,
    realWidth: c.realWidth,
    realHeight: c.realHeight,
    toolDepth: c.toolDepth,
    tolerance: c.tolerance,
    toolRotation: c.toolRotation,
    cavityBevel: c.cavityBevel,
    sensitivity: c.sensitivity,
    simplification: c.simplification,
    minContourPct: c.minContourPct,
    // explicitly NOT: image, imageSize, toolOffsetX/Y (positional in original tray)
  }
}

// Build a clean silhouette PNG from contour points, no source photo involved.
// Renders the largest contour as a filled black-on-white shape.
export function makeSilhouetteThumbnail(contours, size = 200) {
  if (!contours || !contours[0] || contours[0].length < 3) return null
  const pts = contours[0]
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const w = maxX - minX, h = maxY - minY
  const scale = (size * 0.85) / Math.max(w, h)
  const tw = Math.round(w * scale), th = Math.round(h * scale)
  const padX = (size - tw) / 2, padY = (size - th) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0D0D12'
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = '#E8650A'
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = padX + (p.x - minX) * scale
    const y = padY + (p.y - minY) * scale
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()

  try { return canvas.toDataURL('image/png') } catch { return null }
}

export async function publishTool(authorId, { name, category, description, contour, thumbnail, sourceSavedToolId }) {
  const url = `${SUPABASE_URL}/rest/v1/published_tools`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({
      author_id: authorId,
      source_saved_tool_id: sourceSavedToolId || null,
      name, category: category || null, description: description || null,
      contour, thumbnail: thumbnail || null,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    // 403 = RLS rejected (most likely not a paying user)
    return { data: null, error: data, status: res.status }
  }
  return { data: data[0] || null, error: null, status: res.status }
}

export async function unpublishTool(id) {
  const url = `${SUPABASE_URL}/rest/v1/published_tools?id=eq.${id}`
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { data: null, error: data }
  }
  return { data: { id }, error: null }
}

// Toggle upvote: if already voted, remove; else add.
export async function toggleUpvote(toolId, userId) {
  const { voted } = await getMyVote(toolId, userId)
  if (voted) {
    const url = `${SUPABASE_URL}/rest/v1/published_tool_votes?tool_id=eq.${toolId}&user_id=eq.${userId}`
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
    return { voted: false, ok: res.ok }
  } else {
    const url = `${SUPABASE_URL}/rest/v1/published_tool_votes`
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tool_id: toolId, user_id: userId }),
    })
    return { voted: res.ok, ok: res.ok, status: res.status }
  }
}

// Set rating (creates or updates). Use upsert via Prefer: resolution=merge-duplicates.
export async function setRating(toolId, userId, stars) {
  const url = `${SUPABASE_URL}/rest/v1/published_tool_ratings`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify({ tool_id: toolId, user_id: userId, stars }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data, error: res.ok ? null : data }
}

export async function clearRating(toolId, userId) {
  const url = `${SUPABASE_URL}/rest/v1/published_tool_ratings?tool_id=eq.${toolId}&user_id=eq.${userId}`
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
  return { ok: res.ok }
}

// ─── Paying-user check (UI gate; RLS is the real enforcer) ──────

// Cheap heuristic: checks credit_transactions for a 'purchase' row.
// We use the same logic that the SQL is_paying_user() function uses.
export async function isPayingUser(userId) {
  if (!userId) return false
  const url = `${SUPABASE_URL}/rest/v1/credit_transactions?select=id&user_id=eq.${userId}&type=eq.purchase&limit=1`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) return false
  const data = await res.json()
  return Array.isArray(data) && data.length > 0
}
