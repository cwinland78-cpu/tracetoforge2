// Print-and-ship pricing, shared by the editor (display) and the
// tracetoforge-print-orders worker (the price that is actually charged).
// Keep this file free of browser/Node-only APIs: the worker imports it too.

export const PRINT_PRICING = {
  feeCents: 1400,       // flat print fee
  perGramCents: 4,      // filament, per gram
  shippingCents: 600,   // flat US shipping (added by Stripe as the shipping option)
  bedMm: 260,           // Creality K2 bed: 260 x 260 x 260
  maxFootprintMm: 520,  // largest we split and print (4 sections)
  maxHeightMm: 260,
  // Filament model: grams = solid volume x PLA density x fillRatio.
  // fillRatio calibrated Sep 26, 2026 against Chris's slicer: a 251.5 x 125.5 x 31 mm
  // Gridfinity bin (592 cm3 solid) sliced to 164 g, so 164 / 1.24 / 592 = 0.223.
  // (A shell-over-surface model overcounted thin-walled parts about 2.6x.)
  fillRatio: 0.223,
  densityGcm3: 1.24,    // PLA
}

/**
 * Analyze a binary STL (ArrayBuffer or typed array, units mm).
 * Returns volume, area, bounding box, estimated grams, section count and price.
 */
export function analyzeSTL(input, pricing = PRINT_PRICING) {
  const buf = input instanceof ArrayBuffer ? input : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
  const dv = new DataView(buf)
  if (dv.byteLength < 84) throw new Error('STL too small')
  const n = dv.getUint32(80, true)
  if (84 + n * 50 > dv.byteLength) throw new Error('STL is truncated or not binary')

  let vol6 = 0, area2 = 0
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12
    const ax = dv.getFloat32(o, true), ay = dv.getFloat32(o + 4, true), az = dv.getFloat32(o + 8, true)
    const bx = dv.getFloat32(o + 12, true), by = dv.getFloat32(o + 16, true), bz = dv.getFloat32(o + 20, true)
    const cx = dv.getFloat32(o + 24, true), cy = dv.getFloat32(o + 28, true), cz = dv.getFloat32(o + 32, true)
    vol6 += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)
    const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az
    area2 += Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx)
    if (ax < minX) minX = ax; if (bx < minX) minX = bx; if (cx < minX) minX = cx
    if (ay < minY) minY = ay; if (by < minY) minY = by; if (cy < minY) minY = cy
    if (az < minZ) minZ = az; if (bz < minZ) minZ = bz; if (cz < minZ) minZ = cz
    if (ax > maxX) maxX = ax; if (bx > maxX) maxX = bx; if (cx > maxX) maxX = cx
    if (ay > maxY) maxY = ay; if (by > maxY) maxY = by; if (cy > maxY) maxY = cy
    if (az > maxZ) maxZ = az; if (bz > maxZ) maxZ = bz; if (cz > maxZ) maxZ = cz
  }
  if (!n || !Number.isFinite(vol6)) throw new Error('STL has no usable geometry')

  const volumeCm3 = Math.abs(vol6) / 6 / 1000
  const areaCm2 = area2 / 2 / 100
  const grams = Math.max(1, Math.round(volumeCm3 * pricing.densityGcm3 * pricing.fillRatio))

  const bbox = { x: +(maxX - minX).toFixed(1), y: +(maxY - minY).toFixed(1), z: +(maxZ - minZ).toFixed(1) }
  const bed = pricing.bedMm
  const pieces = Math.ceil(bbox.x / bed) * Math.ceil(bbox.y / bed)
  let fit = 'one'
  if (bbox.z > pricing.maxHeightMm || bbox.x > pricing.maxFootprintMm || bbox.y > pricing.maxFootprintMm) fit = 'too-big'
  else if (pieces > 1) fit = 'split'

  const printCents = pricing.feeCents + Math.round(grams * pricing.perGramCents)
  return {
    triangles: n, volumeCm3, areaCm2, grams, bbox, pieces, fit,
    printCents, shippingCents: pricing.shippingCents, totalCents: printCents + pricing.shippingCents,
  }
}

/** Customer-facing fit message for the order screen. */
export function fitMessage(a, pricing = PRINT_PRICING) {
  const bed = pricing.bedMm, max = pricing.maxFootprintMm
  if (a.fit === 'too-big') return `This design is too big for us to print. The largest we can do is ${max} x ${max} mm across and ${pricing.maxHeightMm} mm tall.`
  if (a.fit === 'split') return `This design is bigger than our printer bed (${bed} x ${bed} mm), so we print it in ${a.pieces} sections that sit side by side in your box. You will see a thin seam where they meet.`
  return 'Fits our printer in one piece.'
}

export const dollars = cents => `$${(cents / 100).toFixed(2)}`
