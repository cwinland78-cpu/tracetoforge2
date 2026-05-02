// Saved tool library: persistent reusable tool shapes per user.
// Lets a user trace a tool once, save it, then drop it into any tray
// (Gridfinity, custom tray, or 3D object) without re-tracing.
//
// Uses the same raw-fetch pattern as the rest of the app per the
// "do not use supabase.from()" rule documented in the project reference.

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

// Build a small thumbnail (data URL) from an HTMLImageElement.
// Capped at ~150px on the long edge to keep listing payloads small.
export function makeThumbnail(imgEl, maxSize = 150) {
  if (!imgEl || !imgEl.naturalWidth) return null
  const scale = Math.min(1, maxSize / Math.max(imgEl.naturalWidth, imgEl.naturalHeight))
  const w = Math.round(imgEl.naturalWidth * scale)
  const h = Math.round(imgEl.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgEl, 0, 0, w, h)
  try {
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

// List the user's saved tools, lightweight (no full image, no contour data).
// Used to populate the picker UI.
export async function listSavedTools(userId) {
  const url = `${SUPABASE_URL}/rest/v1/saved_tools` +
    `?select=id,name,category,thumbnail,created_at,updated_at` +
    `&user_id=eq.${userId}` +
    `&order=updated_at.desc`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  return res.ok ? { data, error: null } : { data: null, error: data }
}

// Fetch one saved tool with its full config (contours + image + everything).
// Used at the moment the user actually adds a saved tool to a tray.
export async function getSavedTool(id) {
  const url = `${SUPABASE_URL}/rest/v1/saved_tools?select=*&id=eq.${id}`
  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data }
  return { data: data[0] || null, error: null }
}

// Create a new saved tool.
// `config` should contain everything needed to restore the tool into the editor:
//   image (data URL), imageSize, contours, selectedContour, locked,
//   realWidth, realHeight, toolDepth, tolerance, toolOffsetX, toolOffsetY,
//   toolRotation, cavityBevel, sensitivity, simplification, minContourPct.
export async function createSavedTool(userId, { name, category = null, config, thumbnail = null }) {
  const url = `${SUPABASE_URL}/rest/v1/saved_tools`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify({ user_id: userId, name, category, config, thumbnail }),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data }
  return { data: data[0] || null, error: null }
}

// Update an existing saved tool (e.g. user re-edited and re-saved).
export async function updateSavedTool(id, patch) {
  const url = `${SUPABASE_URL}/rest/v1/saved_tools?id=eq.${id}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  if (!res.ok) return { data: null, error: data }
  return { data: data[0] || null, error: null }
}

export async function deleteSavedTool(id) {
  const url = `${SUPABASE_URL}/rest/v1/saved_tools?id=eq.${id}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { data: null, error: data }
  }
  return { data: { id }, error: null }
}
