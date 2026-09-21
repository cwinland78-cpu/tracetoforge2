// Keeps the editor's work across a sign-in round trip (email/password,
// OAuth redirect, or a confirmation link opened in a new tab). Stored in
// IndexedDB because a multi-tool project with photos is several MB, well past
// localStorage's quota. One draft slot; it expires after 24 hours.

const DB = 'ttf-drafts', STORE = 'drafts', KEY = 'pending', MAX_AGE_MS = 24 * 60 * 60 * 1000

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

function tx(mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); res(out && out.result) }
    t.onerror = () => { db.close(); rej(t.error) }
  }))
}

/** Save the draft. `draft` must be JSON-safe (DOM elements are dropped). */
export async function stashDraft(draft) {
  const clean = JSON.parse(JSON.stringify(draft))
  await tx('readwrite', s => s.put({ ...clean, savedAt: Date.now() }, KEY))
}

/** Return the pending draft if one exists and is fresh, else null. */
export async function peekDraft() {
  try {
    const d = await tx('readonly', s => s.get(KEY))
    if (!d || !d.config) return null
    if (Date.now() - (d.savedAt || 0) > MAX_AGE_MS) { await clearDraft(); return null }
    return d
  } catch { return null }
}

export async function clearDraft() {
  try { await tx('readwrite', s => s.delete(KEY)) } catch {}
}
