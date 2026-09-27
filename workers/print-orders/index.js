// tracetoforge-print-orders
// POST /checkout        signed-in user uploads the STL; we price it here and return a Stripe Checkout URL
// POST /stripe-webhook  Stripe tells us the order was paid; we store the shipping address
// GET  /admin?key=      Chris's order list with STL downloads
// Orders and STL files live in the ORDERS KV namespace.
import { analyzeSTL, fitMessage, dollars, PRINT_PRICING } from '../../src/lib/printPricing.js'

const MAX_STL_BYTES = 20 * 1024 * 1024 // KV values cap at 25 MiB

function cors(env, req) {
  const origin = req.headers.get('Origin') || ''
  const allowed = [env.SITE_URL, 'http://localhost:8765', 'http://localhost:5173'].includes(origin) ? origin : env.SITE_URL
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Project-Name, X-Output-Mode, X-Terms-Accepted',
    'Vary': 'Origin',
  }
}
const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...headers } })

async function supabaseUser(env, token) {
  if (!token) return null
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  return r.json()
}

async function stripe(env, path, params) {
  const body = new URLSearchParams()
  const add = (k, v) => {
    if (v === undefined || v === null) return
    if (typeof v === 'object') for (const [kk, vv] of Object.entries(v)) add(`${k}[${kk}]`, vv)
    else body.append(k, String(v))
  }
  for (const [k, v] of Object.entries(params)) add(k, v)
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data?.error?.message || `Stripe error ${r.status}`)
  return data
}

async function handleCheckout(req, env) {
  const h = cors(env, req)
  if (!env.STRIPE_SECRET_KEY) return json({ error: 'Ordering is not switched on yet.' }, 503, h)
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const user = await supabaseUser(env, token)
  if (!user?.id) return json({ error: 'Please sign in to order a print.' }, 401, h)
  if (req.headers.get('X-Terms-Accepted') !== 'yes') return json({ error: 'Please accept the fit terms first.' }, 400, h)

  const stl = await req.arrayBuffer()
  if (stl.byteLength > MAX_STL_BYTES) return json({ error: 'This design is too detailed to order online. Email us and we will sort it out.' }, 413, h)
  let a
  try { a = analyzeSTL(stl) } catch (e) { return json({ error: `Could not read the design: ${e.message}` }, 400, h) }
  if (a.fit === 'too-big') return json({ error: fitMessage(a) }, 400, h)

  const id = crypto.randomUUID()
  let name = req.headers.get('X-Project-Name') || 'Custom insert'
  try { name = decodeURIComponent(name) } catch {}
  name = name.slice(0, 80)
  const mode = (req.headers.get('X-Output-Mode') || '').slice(0, 20)
  const order = {
    id, user_id: user.id, email: user.email, name, mode,
    grams: a.grams, bbox: a.bbox, pieces: a.pieces, fit: a.fit,
    print_cents: a.printCents, shipping_cents: a.shippingCents, total_cents: a.totalCents,
    terms_accepted_at: new Date().toISOString(),
    status: 'pending', created_at: new Date().toISOString(),
  }

  const section = a.pieces > 1 ? `, printed in ${a.pieces} sections` : ''
  const session = await stripe(env, 'checkout/sessions', {
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: id,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': a.printCents,
    'line_items[0][price_data][product_data][name]': `Printed insert: ${name}`,
    'line_items[0][price_data][product_data][description]': `${a.bbox.x} x ${a.bbox.y} x ${a.bbox.z} mm, about ${a.grams} g${section}. Printed exactly as designed.`,
    'shipping_address_collection[allowed_countries][0]': 'US',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': 'Standard shipping',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': a.shippingCents,
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'usd',
    'metadata[order_id]': id,
    'metadata[grams]': a.grams,
    'metadata[pieces]': a.pieces,
    'payment_intent_data[metadata][order_id]': id,
    success_url: `${env.SITE_URL}/editor/?print_order=paid&id=${id}`,
    cancel_url: `${env.SITE_URL}/editor/?print_order=cancelled`,
  })
  order.stripe_session_id = session.id
  await env.ORDERS.put(`stl:${id}`, stl)
  await env.ORDERS.put(`order:${id}`, JSON.stringify(order))
  return json({ url: session.url, id }, 200, h)
}

// Stripe signature: header "t=...,v1=..."; HMAC-SHA256 over `${t}.${rawBody}`
async function verifyStripe(env, raw, header) {
  if (!env.STRIPE_WEBHOOK_SECRET || !header) return false
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=')).filter(p => p.length === 2).map(([k, v]) => [k, v]))
  const sigs = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3))
  if (!parts.t || !sigs.length) return false
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${raw}`))
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
  return sigs.includes(hex)
}

async function handleWebhook(req, env) {
  const raw = await req.text()
  if (!(await verifyStripe(env, raw, req.headers.get('Stripe-Signature')))) return new Response('bad signature', { status: 400 })
  const event = JSON.parse(raw)
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object
    const id = s.metadata?.order_id || s.client_reference_id
    const cur = id && await env.ORDERS.get(`order:${id}`, 'json')
    if (cur && s.payment_status === 'paid') {
      const ship = s.collected_information?.shipping_details || s.shipping_details || null
      await env.ORDERS.put(`order:${id}`, JSON.stringify({
        ...cur, status: cur.status === 'pending' ? 'paid' : cur.status, paid_at: new Date().toISOString(),
        amount_paid_cents: s.amount_total, shipping: ship, customer_email: s.customer_details?.email || cur.email,
      }))
    }
  }
  return new Response('ok')
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

async function handleAdmin(req, env, url) {
  if (!env.ADMIN_KEY || url.searchParams.get('key') !== env.ADMIN_KEY) return new Response('Not found', { status: 404 })
  const key = encodeURIComponent(env.ADMIN_KEY)
  const m = url.pathname.match(/^\/admin\/stl\/([\w-]+)$/)
  if (m) {
    const stl = await env.ORDERS.get(`stl:${m[1]}`, 'arrayBuffer')
    if (!stl) return new Response('Not found', { status: 404 })
    return new Response(stl, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="order-${m[1].slice(0, 8)}.stl"` } })
  }
  if (req.method === 'POST') {
    const f = await req.formData()
    const id = f.get('id'), status = f.get('status')
    const cur = await env.ORDERS.get(`order:${id}`, 'json')
    if (cur && ['paid', 'printing', 'shipped', 'cancelled'].includes(status)) await env.ORDERS.put(`order:${id}`, JSON.stringify({ ...cur, status, [`${status}_at`]: new Date().toISOString() }))
    return Response.redirect(`${url.origin}/admin?key=${key}`, 303)
  }
  const orders = []
  let cursor
  do {
    const page = await env.ORDERS.list({ prefix: 'order:', cursor })
    for (const k of page.keys) { const o = await env.ORDERS.get(k.name, 'json'); if (o) orders.push(o) }
    cursor = page.list_complete ? null : page.cursor
  } while (cursor)
  const show = url.searchParams.get('all') ? orders : orders.filter(o => o.status !== 'pending')
  show.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  const addr = s => {
    const a = s?.address; if (!a) return ''
    return esc([s.name, a.line1, a.line2, `${a.city || ''}, ${a.state || ''} ${a.postal_code || ''}`].filter(Boolean).join('\n'))
  }
  const rows = show.map(o => `<tr>
    <td>${esc(o.created_at?.slice(0, 16).replace('T', ' '))}</td>
    <td><b>${esc(o.status)}</b></td>
    <td>${esc(o.name)}<br><small>${esc(o.mode)} · ${o.bbox.x} x ${o.bbox.y} x ${o.bbox.z} mm · ${o.grams} g · ${o.pieces} piece${o.pieces > 1 ? 's' : ''}</small></td>
    <td>${dollars(o.amount_paid_cents ?? o.total_cents)}</td>
    <td><pre>${addr(o.shipping)}</pre><small>${esc(o.customer_email || o.email)}</small></td>
    <td><a href="/admin/stl/${o.id}?key=${key}">STL</a></td>
    <td><form method="post" action="/admin?key=${key}"><input type="hidden" name="id" value="${o.id}">
      <select name="status">${['paid', 'printing', 'shipped', 'cancelled'].map(s => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select>
      <button>Save</button></form></td></tr>`).join('')
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Print orders</title>
<style>body{font:14px system-ui;margin:16px;background:#111;color:#eee}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #333;padding:8px;text-align:left;vertical-align:top}pre{margin:0;font:inherit;white-space:pre-wrap}small{color:#999}a{color:#ffc38e}</style>
<h1>Print orders</h1><p><small>${show.length} shown. ${url.searchParams.get('all') ? `<a href="/admin?key=${key}">Hide unpaid</a>` : `<a href="/admin?key=${key}&all=1">Show unpaid checkouts too</a>`}</small></p>
<table><tr><th>Created</th><th>Status</th><th>Design</th><th>Paid</th><th>Ship to</th><th>File</th><th></th></tr>${rows || '<tr><td colspan=7>No orders yet.</td></tr>'}</table>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env, req) })
    try {
      if (url.pathname === '/checkout' && req.method === 'POST') return await handleCheckout(req, env)
      if (url.pathname === '/stripe-webhook' && req.method === 'POST') return await handleWebhook(req, env)
      if (url.pathname.startsWith('/admin')) return await handleAdmin(req, env, url)
      if (url.pathname === '/pricing') return json({ ...PRINT_PRICING }, 200, cors(env, req))
      if (url.pathname === '/status') return json({ enabled: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) }, 200, { ...cors(env, req), 'Cache-Control': 'no-store' })
      return new Response('Not found', { status: 404 })
    } catch (e) {
      return json({ error: e.message || 'Something went wrong' }, 500, cors(env, req))
    }
  },
}
