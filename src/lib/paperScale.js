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
    let best = null
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i)
      const area = cv.contourArea(c)
      if (area < imgArea * 0.12) { c.delete(); continue } // paper should dominate the frame
      const peri = cv.arcLength(c, true)
      const approx = new cv.Mat()
      cv.approxPolyDP(c, approx, 0.02 * peri, true)
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        if (!best || area > best.area) {
          if (best) best.approx.delete()
          const pts = []
          for (let r = 0; r < 4; r++) {
            pts.push({ x: approx.data32S[r * 2], y: approx.data32S[r * 2 + 1] })
          }
          best = { area, approx, pts }
        } else {
          approx.delete()
        }
      } else {
        approx.delete()
      }
      c.delete()
    }

    if (!best) return { found: false, reason: 'no bright 4-cornered sheet found' }

    const [tl, tr, br, bl] = orderCorners(best.pts)
    best.approx.delete()

    // Side lengths in the photo
    const top = dist(tl, tr), bottom = dist(bl, br)
    const left = dist(tl, bl), right = dist(tr, br)
    const wPx = (top + bottom) / 2
    const hPx = (left + right) / 2
    const longPx = Math.max(wPx, hPx)
    const shortPx = Math.min(wPx, hPx)
    const aspect = longPx / shortPx

    // Letter = 1.294, A4 = 1.414. Reject anything not paper-shaped.
    if (aspect < 1.15 || aspect > 1.6) {
      return { found: false, reason: `quad aspect ${aspect.toFixed(2)} not paper-like` }
    }
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
