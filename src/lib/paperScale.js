// paperScale.js
// Detects a white Letter/A4 sheet in a photo, rectifies perspective, and returns
// an exact mm-per-pixel scale. Completely standalone: does NOT touch the tool
// detection pipeline. If detection fails, callers fall back to the normal flow.

export const PAPER_SIZES = {
  letter: { long: 279.4, short: 215.9, label: 'Letter (8.5x11")' },
  a4: { long: 297.0, short: 210.0, label: 'A4' },
}

const PX_PER_MM = 4 // rectified output resolution: 0.25mm per pixel

// Order 4 corner points as [topLeft, topRight, bottomRight, bottomLeft]
function orderCorners(pts) {
  const bySum = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const tl = bySum[0], br = bySum[3]
  const byDiff = [...pts].sort((a, b) => (a.y - a.x) - (b.y - b.x))
  const tr = byDiff[0], bl = byDiff[3]
  return [tl, tr, br, bl]
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }

/**
 * @param {object} cv - window.cv (OpenCV.js, already loaded)
 * @param {HTMLImageElement} imgEl - the uploaded photo
 * @returns {{found: boolean, reason?: string, paper?: string, paperLabel?: string,
 *            mmPerPx?: number, dataUrl?: string, outW?: number, outH?: number}}
 */
export function detectPaperAndRectify(cv, imgEl) {
  const mats = []
  const track = (m) => { mats.push(m); return m }
  try {
    // Work on a downscaled copy for detection speed; warp from full res for quality.
    const maxDim = 1400
    const scale = Math.min(1, maxDim / Math.max(imgEl.width, imgEl.height))
    const dw = Math.round(imgEl.width * scale)
    const dh = Math.round(imgEl.height * scale)

    const workCanvas = document.createElement('canvas')
    workCanvas.width = dw; workCanvas.height = dh
    workCanvas.getContext('2d').drawImage(imgEl, 0, 0, dw, dh)

    const src = track(cv.imread(workCanvas))
    const gray = track(new cv.Mat())
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    const blurred = track(new cv.Mat())
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

    // Paper is the bright region: Otsu threshold, then close small gaps
    const bin = track(new cv.Mat())
    cv.threshold(blurred, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    const kernel = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(7, 7)))
    cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, kernel)

    const contours = track(new cv.MatVector())
    const hierarchy = track(new cv.Mat())
    cv.findContours(bin, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const imgArea = dw * dh

    // ---- v3: multi-strategy candidate masks with strict validation ----
    // Paper is bright AND colorless; surfaces vary, so we try three masks:
    // whiteness (bright + unsaturated), pure brightness, and low saturation.
    const hsv = track(new cv.Mat())
    cv.cvtColor(src, hsv, cv.COLOR_RGB2HSV)
    const hsvCh = track(new cv.MatVector())
    cv.split(hsv, hsvCh)
    const sat = hsvCh.get(1)

    const otsuProbe = track(new cv.Mat())
    const otsuT = cv.threshold(blurred, otsuProbe, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)

    const brightMask = track(new cv.Mat())
    cv.threshold(blurred, brightMask, otsuT, 255, cv.THRESH_BINARY)
    const sat25 = track(new cv.Mat())
    cv.threshold(sat, sat25, 25, 255, cv.THRESH_BINARY_INV)
    const whiteMask = track(new cv.Mat())
    cv.bitwise_and(brightMask, sat25, whiteMask)
    const lowSatMask = track(new cv.Mat())
    cv.threshold(sat, lowSatMask, 40, 255, cv.THRESH_BINARY_INV)
    sat.delete()

    const evaluateMask = (mask) => {
      const m = new cv.Mat()
      cv.morphologyEx(mask, m, cv.MORPH_CLOSE, kernel)
      const cnts = new cv.MatVector()
      const hier = new cv.Mat()
      cv.findContours(m, cnts, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
      const out = []
      for (let i = 0; i < cnts.size(); i++) {
        const c = cnts.get(i)
        const area = cv.contourArea(c)
        // must dominate the frame but can NEVER be (nearly) the whole frame
        if (area < imgArea * 0.12 || area > imgArea * 0.90) { c.delete(); continue }
        const hull = new cv.Mat()
        cv.convexHull(c, hull)
        const peri = cv.arcLength(hull, true)
        let pts = null
        for (const eps of [0.02, 0.03, 0.05, 0.08]) {
          const approx = new cv.Mat()
          cv.approxPolyDP(hull, approx, eps * peri, true)
          if (approx.rows === 4) {
            pts = []
            for (let r = 0; r < 4; r++) pts.push({ x: approx.data32S[r * 2], y: approx.data32S[r * 2 + 1] })
            approx.delete()
            break
          }
          approx.delete()
        }
        hull.delete()
        c.delete()
        if (!pts) continue
        const side = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y)
        const s02 = (side(0, 1) + side(2, 3)) / 2
        const s13 = (side(1, 2) + side(3, 0)) / 2
        const long = Math.max(s02, s13), short = Math.min(s02, s13)
        const aspect = long / short
        if (aspect < 1.15 || aspect > 1.6) continue
        out.push({ pts, area, aspect })
      }
      m.delete(); cnts.delete(); hier.delete()
      return out
    }

    const candidates = [
      ...evaluateMask(whiteMask),
      ...evaluateMask(brightMask),
      ...evaluateMask(lowSatMask),
    ]

    let best = null
    for (const cand of candidates) {
      // interior must be clearly brighter than a meaningful exterior sample
      const qmask = new cv.Mat.zeros(dh, dw, cv.CV_8UC1)
      const quad = cv.matFromArray(4, 1, cv.CV_32SC2, cand.pts.flatMap(p => [p.x, p.y]))
      const mv = new cv.MatVector(); mv.push_back(quad)
      cv.fillPoly(qmask, mv, new cv.Scalar(255))
      const inMean = cv.mean(gray, qmask)[0]
      const outsideCount = imgArea - cv.countNonZero(qmask)
      cv.bitwise_not(qmask, qmask)
      const outMean = cv.mean(gray, qmask)[0]
      qmask.delete(); quad.delete(); mv.delete()
      if (outsideCount < imgArea * 0.08) continue
      if (inMean < outMean + 15) continue
      const score = -Math.min(Math.abs(cand.aspect - 1.294), Math.abs(cand.aspect - 1.414)) * 10
        + (inMean - outMean) / 50
      if (!best || score > best.score) best = { ...cand, score }
    }

    if (!best) return { found: false, reason: 'no valid paper sheet found' }

    const aspect = best.aspect
    const [tl, tr, br, bl] = orderCorners(best.pts)

    // Orientation from actual side lengths (validation already done upstream)
    const top = dist(tl, tr), bottom = dist(bl, br)
    const left = dist(tl, bl), right = dist(tr, br)
    const wPx = (top + bottom) / 2
    const hPx = (left + right) / 2
    const paper = Math.abs(aspect - 279.4 / 215.9) <= Math.abs(aspect - 297 / 210) ? 'letter' : 'a4'
    const size = PAPER_SIZES[paper]

    // Output dimensions in rectified space (orientation follows the photo)
    const landscape = wPx >= hPx
    const outW = Math.round((landscape ? size.long : size.short) * PX_PER_MM)
    const outH = Math.round((landscape ? size.short : size.long) * PX_PER_MM)

    // Map detected corners back to FULL-RES coordinates for the warp
    const inv = 1 / scale
    const srcPts = [tl, tr, br, bl].map(p => ({ x: p.x * inv, y: p.y * inv }))

    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = imgEl.width; fullCanvas.height = imgEl.height
    fullCanvas.getContext('2d').drawImage(imgEl, 0, 0)
    const fullSrc = track(cv.imread(fullCanvas))

    const srcTri = track(cv.matFromArray(4, 1, cv.CV_32FC2,
      srcPts.flatMap(p => [p.x, p.y])))
    const dstTri = track(cv.matFromArray(4, 1, cv.CV_32FC2,
      [0, 0, outW, 0, outW, outH, 0, outH]))
    const M = track(cv.getPerspectiveTransform(srcTri, dstTri))
    const warped = track(new cv.Mat())
    cv.warpPerspective(fullSrc, warped, M, new cv.Size(outW, outH),
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255))

    // Trim a small border: warp edge artifacts and slivers of table from
    // imperfect corner detection would otherwise register as contours.
    const inset = Math.round(Math.min(outW, outH) * 0.015)
    const cropW = outW - inset * 2
    const cropH = outH - inset * 2
    const roi = warped.roi(new cv.Rect(inset, inset, cropW, cropH))
    const outCanvas = document.createElement('canvas')
    outCanvas.width = cropW; outCanvas.height = cropH
    cv.imshow(outCanvas, roi)
    roi.delete()
    const dataUrl = outCanvas.toDataURL('image/jpeg', 0.92)

    return {
      found: true,
      paper,
      paperLabel: size.label,
      mmPerPx: 1 / PX_PER_MM,
      dataUrl,
      outW: cropW,
      outH: cropH,
    }
  } catch (err) {
    console.error('[paperScale] detection error:', err)
    return { found: false, reason: 'error: ' + (err?.message || String(err)) }
  } finally {
    mats.forEach(m => { try { m.delete() } catch (_) { /* already deleted */ } })
  }
}

/**
 * Measure the tool's true footprint on a rectified paper image, trimming
 * cast shadows. A shadow, even a dark contact shadow, is brighter than a
 * dark tool, so we peel the bounding box inward while the outermost
 * rows/columns are brighter than the tool's core.
 * Returns {found, wMm, hMm} or {found:false}. Callers fall back to the
 * traced contour's bbox when this fails (e.g. light-colored tools).
 */
export function measureToolOnPaper(cv, imgEl) {
  const mats = []
  const track = (m) => { mats.push(m); return m }
  try {
    // Work at reduced scale: the 45px closing below is separable and fast,
    // and ~2px/mm is ample precision for a dimension readout.
    const scale = Math.min(1, 600 / imgEl.width)
    const cw = Math.round(imgEl.width * scale)
    const ch = Math.round(imgEl.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = cw; canvas.height = ch
    canvas.getContext('2d').drawImage(imgEl, 0, 0, cw, ch)
    const src = track(cv.imread(canvas))
    const gray8 = track(new cv.Mat())
    cv.cvtColor(src, gray8, cv.COLOR_RGBA2GRAY)

    // Illumination field: grayscale closing with a kernel larger than the
    // tool's minor axis removes the tool but keeps the lighting gradient.
    const bg = track(new cv.Mat())
    const bigK = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(45, 45)))
    cv.morphologyEx(gray8, bg, cv.MORPH_CLOSE, bigK)
    cv.GaussianBlur(bg, bg, new cv.Size(17, 17), 0)

    // solid tool = pixels darker than half the local paper brightness
    const bgHalf = track(new cv.Mat())
    bg.convertTo(bgHalf, cv.CV_8U, 0.5, 0)
    const mask = track(new cv.Mat())
    cv.compare(gray8, bgHalf, mask, cv.CMP_LT)
    const k7 = track(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5)))
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, k7)
    const k3 = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)))
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, k3)

    const contours = track(new cv.MatVector())
    const hierarchy = track(new cv.Mat())
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    let best = null
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const a = cv.contourArea(c)
      if (a > 100 && (!best || a > best.area)) {
        best = { area: a, rect: cv.boundingRect(c) }
      }
      c.delete()
    }
    if (!best) return { found: false }
    const pxPerMm = 4 * scale
    return {
      found: true,
      wMm: Math.round((best.rect.width / pxPerMm) * 10) / 10,
      hMm: Math.round((best.rect.height / pxPerMm) * 10) / 10,
    }
  } catch (err) {
    console.error('[paperScale] measure error:', err)
    return { found: false }
  } finally {
    mats.forEach(m => { try { m.delete() } catch (_) { /* already deleted */ } })
  }
}

// ─── Gasket calibration sheet (QR-style finder markers) ───
// The printable sheet has four finder patterns (21mm nested squares) whose
// CENTERS form a 170 x 230 mm rectangle, centered on A4 or Letter. Detecting
// them gives exact perspective + scale with no assumptions about paper edges
// or background. Detection is plain contour hierarchy - no ArUco module needed.

const CALIB_RECT_W = 170  // mm between marker centers, horizontal
const CALIB_RECT_H = 230  // mm between marker centers, vertical
const CALIB_PX_PER_MM = 6 // rectified output resolution
const CALIB_MARGIN = 14   // mm of sheet kept around the marker rectangle

/**
 * @param {object} cv - window.cv
 * @param {HTMLImageElement} imgEl - uploaded photo
 * @returns same shape as detectPaperAndRectify
 */
export function detectCalibSheetAndRectify(cv, imgEl) {
  const mats = []
  const track = (m) => { mats.push(m); return m }
  try {
    // Detect on a downscaled copy for speed
    const maxDim = 1600
    const scale = Math.min(1, maxDim / Math.max(imgEl.width, imgEl.height))
    const dw = Math.round(imgEl.width * scale)
    const dh = Math.round(imgEl.height * scale)
    const workCanvas = document.createElement('canvas')
    workCanvas.width = dw; workCanvas.height = dh
    workCanvas.getContext('2d').drawImage(imgEl, 0, 0, dw, dh)

    const src = track(cv.imread(workCanvas))
    const gray = track(new cv.Mat())
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // Adaptive threshold, inverse: dark marker ink becomes white blobs.
    // Block size scales with image so it works from phone photos to scans.
    const block = Math.max(31, Math.round(Math.max(dw, dh) / 22)) | 1
    const bin = track(new cv.Mat())
    cv.adaptiveThreshold(gray, bin, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, block, 5)

    const contours = track(new cv.MatVector())
    const hierarchy = track(new cv.Mat())
    cv.findContours(bin, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

    // A finder pattern in the inverted binary is: blob (outer black square)
    // containing a hole (white ring) containing another blob (black core).
    // Hierarchy: contour i has child, child has child.
    const minArea = dw * dh * 0.00005
    const cands = []
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)
      if (area < minArea) { cnt.delete(); continue }
      const child = hierarchy.data32S[i * 4 + 2]
      if (child === -1) { cnt.delete(); continue }
      const gchild = hierarchy.data32S[child * 4 + 2]
      if (gchild === -1) { cnt.delete(); continue }
      const core = contours.get(gchild)
      const coreArea = cv.contourArea(core)
      core.delete()
      if (coreArea <= 0) { cnt.delete(); continue }
      const ratio = area / coreArea
      // module areas 49 vs 9 -> ~5.44 ideal; tolerate perspective + blur
      if (ratio < 3.0 || ratio > 10.0) { cnt.delete(); continue }
      const br = cv.boundingRect(cnt)
      const sq = br.width / br.height
      if (sq < 0.6 || sq > 1.7) { cnt.delete(); continue }
      const m = cv.moments(cnt)
      cnt.delete()
      if (m.m00 <= 0) continue
      cands.push({ x: m.m10 / m.m00, y: m.m01 / m.m00, area })
    }

    if (cands.length < 4) return { found: false, reason: `only ${cands.length} markers` }

    // If extra candidates, keep the 4 most similar in area (the real markers
    // are the same physical size; noise blobs vary wildly)
    let four = cands
    if (cands.length > 4) {
      cands.sort((a, b) => a.area - b.area)
      let best = null
      for (let i = 0; i + 3 < cands.length; i++) {
        const spread = cands[i + 3].area / cands[i].area
        if (!best || spread < best.spread) best = { spread, set: cands.slice(i, i + 4) }
      }
      four = best.set
    }

    // Order and undo the detection downscale so we warp from full resolution
    const ordered = orderCorners(four).map(p => ({ x: p.x / scale, y: p.y / scale }))
    const [tl, tr, br2, bl] = ordered

    // Orientation: marker rect is portrait (170 wide, 230 tall). If the photo
    // was taken landscape, the detected quad's horizontal span exceeds its
    // vertical span - rotate the correspondence instead of assuming.
    const wSpan = (dist(tl, tr) + dist(bl, br2)) / 2
    const hSpan = (dist(tl, bl) + dist(tr, br2)) / 2
    const landscape = wSpan > hSpan

    const m = CALIB_MARGIN, S = CALIB_PX_PER_MM
    const outW = Math.round((CALIB_RECT_W + 2 * m) * S)
    const outH = Math.round((CALIB_RECT_H + 2 * m) * S)
    const dTL = { x: m * S, y: m * S }
    const dTR = { x: (m + CALIB_RECT_W) * S, y: m * S }
    const dBR = { x: (m + CALIB_RECT_W) * S, y: (m + CALIB_RECT_H) * S }
    const dBL = { x: m * S, y: (m + CALIB_RECT_H) * S }
    // Landscape photo: image TL corresponds to sheet BL (90 deg rotation)
    const srcPts = landscape ? [bl, tl, tr, br2] : [tl, tr, br2, bl]

    const srcMat = track(cv.matFromArray(4, 1, cv.CV_32FC2,
      srcPts.flatMap(p => [p.x, p.y])))
    const dstMat = track(cv.matFromArray(4, 1, cv.CV_32FC2,
      [dTL, dTR, dBR, dBL].flatMap(p => [p.x, p.y])))
    const M = track(cv.getPerspectiveTransform(srcMat, dstMat))

    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = imgEl.width; fullCanvas.height = imgEl.height
    fullCanvas.getContext('2d').drawImage(imgEl, 0, 0)
    const full = track(cv.imread(fullCanvas))
    const out = track(new cv.Mat())
    cv.warpPerspective(full, out, M, new cv.Size(outW, outH),
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255))

    const outCanvas = document.createElement('canvas')
    outCanvas.width = outW; outCanvas.height = outH
    cv.imshow(outCanvas, out)
    return {
      found: true,
      paperLabel: 'Calibration',
      mmPerPx: 1 / S,
      dataUrl: outCanvas.toDataURL('image/jpeg', 0.92),
      outW, outH,
    }
  } catch (err) {
    return { found: false, reason: err?.message || 'calib detect error' }
  } finally {
    mats.forEach(m => { try { m.delete() } catch (e) { /* noop */ } })
  }
}
