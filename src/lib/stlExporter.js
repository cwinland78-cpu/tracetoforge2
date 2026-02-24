import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, ADDITION } from 'three-bvh-csg'
import ClipperLib from 'clipper-lib'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json'

// ─── Branding: "TracetoForge" deboss ───
const brandFont = new Font(helvetikerBold)
const BRAND_TEXT = 'TracetoForge'
const BRAND_HEIGHT = 0.3 // mm raised above floor

/**
 * Create branding geometry - raised text on inside floor.
 * Places "TracetoForge" text in the bottom-right corner of the tray floor,
 * raised slightly so it's visible when looking into the tray.
 * @param {number} trayW - tray inner width
 * @param {number} trayH - tray inner height (depth in Y direction)
 * @param {number} floorZ - Z position of the floor top surface
 * @param {number} cornerMargin - margin from corner edge in mm
 * @returns {THREE.BufferGeometry|null}
 */
function createBrandGeometry(toolPts, floorZ, cornerMargin = 1) {
  try {
    if (!toolPts || toolPts.length < 3) return null
    const bounds = getShapeBounds(toolPts)
    const cavW = bounds.width
    const cavH = bounds.height
    if (cavW < 10 || cavH < 5) return null

    const targetW = Math.min(Math.max(cavW * 0.4, 6), 35)
    const shapes = brandFont.generateShapes(BRAND_TEXT, 1)
    if (!shapes || shapes.length === 0) return null

    const tempGeo = new THREE.ShapeGeometry(shapes)
    tempGeo.computeBoundingBox()
    const bb = tempGeo.boundingBox
    const rawW = bb.max.x - bb.min.x
    const rawH = bb.max.y - bb.min.y
    tempGeo.dispose()
    if (rawW < 0.001) return null

    const scale = targetW / rawW
    const textH = rawH * scale
    if (textH > cavH * 0.3) return null

    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: BRAND_HEIGHT,
      bevelEnabled: false,
    })
    geo.scale(scale, scale, 1)

    // Center horizontally in cavity, place at bottom with margin
    const cavCx = (bounds.minX + bounds.maxX) / 2
    const x = cavCx - targetW / 2
    const y = bounds.minY + cornerMargin
    geo.translate(x, y, floorZ)

    return geo
  } catch (e) {
    console.warn('[Brand] Failed to create branding geometry:', e)
    return null
  }
}

// ─── Edge Profile Helpers ───

/**
 * Create a chamfered edge profile path (45-degree cut)
 * Returns array of {x, y} offsets from the edge
 */
function chamferProfile(size, segments = 1) {
  return [
    { x: 0, y: 0 },
    { x: size, y: size },
  ]
}

/**
 * Create a fillet (rounded) edge profile
 * Returns array of {x, y} offsets forming a quarter-circle
 */
function filletProfile(radius, segments = 8) {
  const pts = []
  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI / 2) * (i / segments)
    pts.push({
      x: radius * (1 - Math.cos(angle)),
      y: radius * (1 - Math.sin(angle)),
    })
  }
  return pts
}

// ─── Shape Utilities ───

// Polygon offset using Clipper library - proper uniform edge offset
function offsetPolygon(points, offsetMm) {
  if (!offsetMm || offsetMm <= 0 || points.length < 3) return points
  const scale = 1000 // Clipper uses integers, so scale up
  const path = points.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }))
  const co = new ClipperLib.ClipperOffset()
  co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
  const solution = []
  co.Execute(solution, offsetMm * scale)
  if (solution.length === 0 || solution[0].length < 3) return points
  return solution[0].map(p => ({ x: p.X / scale, y: p.Y / scale }))
}

function centerPoints(points) {
  let cx = 0, cy = 0
  points.forEach(p => { cx += p.x; cy += p.y })
  cx /= points.length
  cy /= points.length
  return points.map(p => ({ x: p.x - cx, y: -(p.y - cy) }))
}

function createShapeFromPoints(points) {
  const shape = new THREE.Shape()
  const centered = centerPoints(points)
  centered.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y)
    else shape.lineTo(p.x, p.y)
  })
  shape.closePath()
  return { shape, centered }
}

function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape()
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(radius, hw, hh)

  shape.moveTo(-hw + r, -hh)
  shape.lineTo(hw - r, -hh)
  if (r > 0) shape.quadraticCurveTo(hw, -hh, hw, -hh + r)
  shape.lineTo(hw, hh - r)
  if (r > 0) shape.quadraticCurveTo(hw, hh, hw - r, hh)
  shape.lineTo(-hw + r, hh)
  if (r > 0) shape.quadraticCurveTo(-hw, hh, -hw, hh - r)
  shape.lineTo(-hw, -hh + r)
  if (r > 0) shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh)

  return shape
}

function createOvalShape(width, height, segments = 48) {
  const shape = new THREE.Shape()
  const hw = width / 2
  const hh = height / 2
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * hw
    const y = Math.sin(angle) * hh
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function createCustomOuterShape(outerPoints) {
  const shape = new THREE.Shape()
  // Points should already be centered
  outerPoints.forEach((p, i) => {
    if (i === 0) shape.moveTo(p.x, p.y)
    else shape.lineTo(p.x, p.y)
  })
  shape.closePath()
  return shape
}

/**
 * Get the outer tray shape based on config
 * Returns { outerShape, innerShape } where innerShape is the wall-inset version
 */
function getOuterShape(config) {
  const {
    trayWidth = 150,
    trayHeight = 100,
    cornerRadius = 2,
    wallThickness = 3,
    outerShapeType = 'rectangle', // 'rectangle' | 'oval' | 'custom'
    outerShapePoints = null,
  } = config

  let outerShape, innerW, innerH, innerShape

  if (outerShapeType === 'oval') {
    outerShape = createOvalShape(trayWidth, trayHeight)
    innerW = trayWidth - wallThickness * 2
    innerH = trayHeight - wallThickness * 2
    innerShape = createOvalShape(innerW, innerH)
  } else if (outerShapeType === 'custom' && outerShapePoints && outerShapePoints.length >= 3) {
    outerShape = createCustomOuterShape(outerShapePoints)
    // For custom, create inner by offsetting inward (simplified: scale down)
    const scale = 1 - (wallThickness * 2 / Math.max(trayWidth, trayHeight))
    const scaledPts = outerShapePoints.map(p => ({ x: p.x * scale, y: p.y * scale }))
    innerShape = createCustomOuterShape(scaledPts)
    innerW = trayWidth * scale
    innerH = trayHeight * scale
  } else {
    outerShape = createRoundedRectShape(trayWidth, trayHeight, cornerRadius)
    innerW = trayWidth - wallThickness * 2
    innerH = trayHeight - wallThickness * 2
    const innerR = Math.max(0, cornerRadius - wallThickness)
    innerShape = createRoundedRectShape(innerW, innerH, innerR)
  }

  return { outerShape, innerShape, innerW, innerH }
}

// ─── Gridfinity Constants ───
const GF = {
  gridUnit: 42,        // mm per grid square
  tolerance: 0.25,     // gap between bin and baseplate on each side
  cornerRadius: 3.75,  // bin outer corner radius
  heightUnit: 7,       // mm per height unit
  baseHeight: 4.75,    // total base profile height
  // Base profile per grid unit (bottom to top):
  //   Layer 1: 45deg chamfer, 0.8mm tall, expands 0.8mm/side
  //   Layer 2: vertical, 1.8mm tall, no width change
  //   Layer 3: 45deg chamfer, 2.15mm tall, expands 2.15mm/side
  baseChamfer1: 0.8,   // first 45deg chamfer height
  baseVertical: 1.8,   // vertical section height (middle layer)
  baseChamfer2: 2.15,  // second 45deg chamfer height
  baseUnitSize: 41.5,  // per-unit top width (42 - 0.5 tolerance)
  // Stacking lip profile (from top of bin walls, going up)
  lipVertical: 1.9,    // vertical section
  lipSlope: 1.8,       // 45deg inward slope
}

// ─── Mesh Creators ───

/**
 * Create a simple extruded 3D object from tool outline
 */
function createObjectExtrusion(points, config) {
  const { shape } = createShapeFromPoints(points)
  const depth = config.depth || 25
  const rawEdgeRadius = config.objectEdgeRadius || 0
  const edgeRadius = Math.min(rawEdgeRadius, depth * 0.3)

  const extrudeSettings = edgeRadius > 0
    ? {
        depth: Math.max(1, depth - edgeRadius * 2),
        bevelEnabled: true,
        bevelThickness: edgeRadius,
        bevelSize: edgeRadius,
        bevelSegments: Math.max(4, Math.round(edgeRadius * 3)),
        bevelOffset: -edgeRadius,
      }
    : {
        depth,
        bevelEnabled: false,
      }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)

  const group = new THREE.Group()

  const solidMat = new THREE.MeshPhongMaterial({
    color: 0xe8650a,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  })
  const solid = new THREE.Mesh(geometry, solidMat)
  group.add(solid)

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff8534,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  })
  const wire = new THREE.Mesh(geometry.clone(), wireMat)
  group.add(wire)

  return group
}

/**
 * Create custom tray insert - solid block with tool-shaped cavity
 * Chamfer/fillet on BOTTOM edge only: the tray is full-size at the top,
 * with the bottom face inset by edgeSize all around the perimeter.
 */
function createCustomInsert(points, config) {
  const {
    trayWidth = 150,
    trayHeight = 100,
    trayDepth = 30,
    cornerRadius = 2,
    tolerance = 1.5,
    wallThickness = 3,
    edgeProfile = 'straight',
    edgeSize = 2,
    floorThickness = 2,
    toolDepth,
    toolOffsetX = 0,
    toolOffsetY = 0,
    toolRotation = 0,
  } = config

  const group = new THREE.Group()
  const cavityZ = toolDepth || (trayDepth - floorThickness)

  // Rotation helper
  const rad = (toolRotation * Math.PI) / 180
  const cosR = Math.cos(rad), sinR = Math.sin(rad)
  const rotPt = (x, y) => ({ x: x * cosR - y * sinR, y: x * sinR + y * cosR })

  // ─── Build outer shape (full size) ───
  let outerShape
  const { outerShapeType = 'rectangle' } = config
  if (outerShapeType === 'oval') {
    outerShape = createOvalShape(trayWidth, trayHeight)
  } else if (outerShapeType === 'custom' && config.outerShapePoints && config.outerShapePoints.length >= 3) {
    outerShape = createCustomOuterShape(config.outerShapePoints)
  } else {
    outerShape = createRoundedRectShape(trayWidth, trayHeight, cornerRadius)
  }

  // ─── Tool cavity setup ───
  const { shape: toolShape, centered: toolCentered } = createShapeFromPoints(points)
  const toolBounds = getShapeBounds(points)
  const maxToolW = trayWidth - wallThickness * 2
  const maxToolH = trayHeight - wallThickness * 2
  const scaleX = maxToolW / toolBounds.width
  const scaleY = maxToolH / toolBounds.height
  const toolScale = Math.min(scaleX, scaleY, 1)

  // Scale tool points to fit tray
  const scaledToolPts = toolCentered.map(p => {
    const sx = p.x * toolScale, sy = p.y * toolScale
    const r = rotPt(sx, sy)
    return { x: r.x + toolOffsetX, y: r.y + toolOffsetY }
  })

  // Apply tolerance using Clipper polygon offset - uniform gap on all edges
  const holePts = (tolerance > 0) ? offsetPolygon(scaledToolPts, tolerance) : scaledToolPts

  const toolHolePath = new THREE.Path()
  holePts.forEach((p, i) => {
    if (i === 0) toolHolePath.moveTo(p.x, p.y)
    else toolHolePath.lineTo(p.x, p.y)
  })
  toolHolePath.closePath()

  // ─── Finger notches ───
  const { fingerNotches = [] } = config
  const allNotchPts = []          // ALL notch point sets (for visualization)
  const defaultNotchPts = []      // default-depth notches (same as cavity depth)
  const indepNotches = []         // independent-depth notches
  fingerNotches.forEach(fn => {
    let pts = []
    if (fn.shape === 'circle') {
      const fnr = Math.max(5, fn.radius || 12)
      const segs = 32
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2
        pts.push({ x: (fn.x || 0) + Math.cos(angle) * fnr, y: (fn.y || 0) + Math.sin(angle) * fnr })
      }
    } else {
      const hw = (fn.shape === 'square' ? fn.w : fn.w || 24) / 2
      const hh = (fn.shape === 'square' ? fn.w : fn.h || 16) / 2
      pts.push(
        { x: (fn.x || 0) - hw, y: (fn.y || 0) - hh },
        { x: (fn.x || 0) + hw, y: (fn.y || 0) - hh },
        { x: (fn.x || 0) + hw, y: (fn.y || 0) + hh },
        { x: (fn.x || 0) - hw, y: (fn.y || 0) + hh },
      )
    }
    if (pts.length < 3) return
    allNotchPts.push(pts)
    const isIndep = fn.depth > 0 && Math.abs(fn.depth - cavityZ) > 0.01
    if (isIndep) {
      indepNotches.push({ pts, depth: fn.depth })
    } else {
      defaultNotchPts.push(pts)
    }
  })

  // Union tool hole + default-depth finger notches into combined hole(s)
  // Independent-depth notches are handled separately via layered walls
  const combinedHoles = (() => {
    const scale = 1000
    if (defaultNotchPts.length === 0 && indepNotches.length === 0) return [holePts]
    // For the main hole (used for ALL wall layers), union tool + default notches
    const clipper = new ClipperLib.Clipper()
    const toolClip = holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }))
    clipper.AddPath(toolClip, ClipperLib.PolyType.ptSubject, true)
    defaultNotchPts.forEach(nPts => {
      const notchClip = nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }))
      clipper.AddPath(notchClip, ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length === 0) return [holePts]
    return solution.map(path => {
      const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
      if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
      return pts
    })
  })()

  // Full hole = tool + ALL notches (for upper wall layers where all notches are open)
  // Create hole paths from combined result
  // Track unified hole point arrays for bevel (updated if extra tools exist)
  const unifiedHolePtArrays = [...combinedHoles]
  const allHolePaths = combinedHoles.map(pts => {
    const hp = new THREE.Path()
    pts.forEach((p, i) => {
      if (i === 0) hp.moveTo(p.x, p.y)
      else hp.lineTo(p.x, p.y)
    })
    hp.closePath()
    return hp
  })

  // ─── Edge profile ───
  const es = Math.min(edgeSize, trayDepth * 0.4, trayWidth * 0.25, trayHeight * 0.25)
  const hasBevel = edgeProfile !== 'straight' && es > 0

  const baseDepth = trayDepth - cavityZ
  const actualBaseDepth = Math.max(baseDepth, floorThickness)

  const trayMat = new THREE.MeshPhongMaterial({
    color: 0x888899, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  })
  const trayMat2 = new THREE.MeshPhongMaterial({
    color: 0x888899, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  })

  if (hasBevel) {
    // Full body from z=es to z=actualBaseDepth (no bevel, clean)
    const bodyGeo = new THREE.ExtrudeGeometry(outerShape, { depth: actualBaseDepth - es, bevelEnabled: false })
    bodyGeo.translate(0, 0, es)
    group.add(new THREE.Mesh(bodyGeo, trayMat))

    // Chamfer skirt at bottom: full-size outline at z=es, scaled-down outline at z=0
    // Use getPoints on the SAME shape for both, just scale the bottom copy
    const pts = outerShape.getPoints(256)
    const hw = trayWidth / 2, hh = trayHeight / 2
    const maxHalf = Math.max(hw, hh)
    const scaleX = (hw - es) / hw
    const scaleY = (hh - es) / hh
    const segs = edgeProfile === 'fillet' ? 8 : 1

    const skirtVerts = []
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs
      let sx0, sy0, z0, sx1, sy1, z1
      if (edgeProfile === 'chamfer') {
        sx0 = 1 - (1 - scaleX) * (1 - t0); sy0 = 1 - (1 - scaleY) * (1 - t0); z0 = es * t0
        sx1 = 1 - (1 - scaleX) * (1 - t1); sy1 = 1 - (1 - scaleY) * (1 - t1); z1 = es * t1
      } else {
        const a0 = (t0 * Math.PI) / 2, a1 = (t1 * Math.PI) / 2
        sx0 = 1 - (1 - scaleX) * Math.cos(a0); sy0 = 1 - (1 - scaleY) * Math.cos(a0); z0 = es * Math.sin(a0)
        sx1 = 1 - (1 - scaleX) * Math.cos(a1); sy1 = 1 - (1 - scaleY) * Math.cos(a1); z1 = es * Math.sin(a1)
      }
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        const ax0 = pts[i].x * sx0, ay0 = pts[i].y * sy0
        const ax1 = pts[i].x * sx1, ay1 = pts[i].y * sy1
        const bx0 = pts[j].x * sx0, by0 = pts[j].y * sy0
        const bx1 = pts[j].x * sx1, by1 = pts[j].y * sy1
        skirtVerts.push(ax0,ay0,z0, bx0,by0,z0, bx1,by1,z1)
        skirtVerts.push(ax0,ay0,z0, bx1,by1,z1, ax1,ay1,z1)
      }
    }
    const skirtGeo = new THREE.BufferGeometry()
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(skirtVerts, 3))
    skirtGeo.computeVertexNormals()
    group.add(new THREE.Mesh(skirtGeo, trayMat))

    // Bottom cap at z=0 (the scaled-down face)
    const capShape = new THREE.Shape()
    pts.forEach((p, i) => {
      const x = p.x * scaleX, y = p.y * scaleY
      i === 0 ? capShape.moveTo(x, y) : capShape.lineTo(x, y)
    })
    capShape.closePath()
    group.add(new THREE.Mesh(new THREE.ShapeGeometry(capShape), trayMat))
  } else {
    // Skip flat base here if deeper notches/tools will build layered base later
    const hasDeeperNotches = indepNotches.some(n => n.depth > cavityZ)
    const hasDeeperTools = (config.additionalTools || []).some(at => (at.toolDepth || cavityZ) > cavityZ)
    if (!hasDeeperNotches && !hasDeeperTools) {
      const baseGeo = new THREE.ExtrudeGeometry(outerShape, { depth: actualBaseDepth, bevelEnabled: false })
      group.add(new THREE.Mesh(baseGeo, trayMat))
    }
  }

  // ─── Additional tools ───
  const { additionalTools = [] } = config
  const extraToolViz = [] // store viz data for additional tools
  const extraToolHolePts = [] // raw point arrays for Clipper union
  additionalTools.forEach(at => {
    if (!at.points || at.points.length < 3) return
    const { shape: atShape, centered: atCentered } = createShapeFromPoints(at.points)
    const atBounds = getShapeBounds(at.points)
    const atScaleX = maxToolW / atBounds.width
    const atScaleY = maxToolH / atBounds.height
    const atScale = Math.min(atScaleX, atScaleY, 1)
    const atRad = (at.toolRotation || 0) * Math.PI / 180
    const atRotPt = (x, y) => {
      if (atRad === 0) return { x, y }
      const c = Math.cos(atRad), s = Math.sin(atRad)
      return { x: x * c - y * s, y: x * s + y * c }
    }
    const atOx = at.toolOffsetX || 0, atOy = at.toolOffsetY || 0
    const atScaledPts = atCentered.map(p => {
      const sx = p.x * atScale, sy = p.y * atScale
      const r = atRotPt(sx, sy)
      return { x: r.x + atOx, y: r.y + atOy }
    })
    const atTol = at.tolerance || 0
    const atHolePts = atTol > 0 ? offsetPolygon(atScaledPts, atTol) : atScaledPts
    const atDepth = at.toolDepth || cavityZ // default to primary cavity depth
    extraToolHolePts.push({ pts: atHolePts, depth: atDepth })
    extraToolViz.push({ shape: atShape, scale: atScale, rad: atRad, ox: atOx, oy: atOy, cutShape: atHolePts, cavityBevel: at.cavityBevel || 0, depth: atDepth })
  })

  // Split additional tools into same-depth (union with primary) and different-depth (layered)
  const sameDepthExtraTools = extraToolHolePts.filter(et => Math.abs(et.depth - cavityZ) < 0.01)
  const diffDepthExtraTools = extraToolHolePts.filter(et => Math.abs(et.depth - cavityZ) >= 0.01)

  // Union ALL holes (primary tool + notches + same-depth additional tools) into one clean set
  // This prevents overlapping holes from breaking ExtrudeGeometry
  if (sameDepthExtraTools.length > 0) {
    const scale = 1000
    const clipper = new ClipperLib.Clipper()
    // Add existing combined holes (primary + notches) as subjects
    combinedHoles.forEach(pts => {
      clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
    })
    // Add same-depth additional tool holes as clips
    sameDepthExtraTools.forEach(et => {
      clipper.AddPath(et.pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length > 0) {
      // Replace allHolePaths with unified result
      allHolePaths.length = 0
      unifiedHolePtArrays.length = 0
      solution.forEach(path => {
        const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
        if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
        unifiedHolePtArrays.push(pts)
        const hp = new THREE.Path()
        pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
        hp.closePath()
        allHolePaths.push(hp)
      })
    } else {
      // Fallback: add additional tools as separate paths
      sameDepthExtraTools.forEach(et => {
        const hp = new THREE.Path()
        et.pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
        hp.closePath()
        allHolePaths.push(hp)
      })
    }
  }

  // ─── Top section (with tool cavity hole) - layered for independent notch depths ───
  const { cavityBevel = 0 } = config
  const cb = Math.min(cavityBevel, cavityZ * 0.3, 5) // clamp
  const anyBevel = cb > 0.1 || extraToolViz.some(ev => (ev.cavityBevel || 0) > 0.1)
  const topSurface = actualBaseDepth + cavityZ

  // Split independent notches by relation to cavity depth
  const shallowerIndep = indepNotches.filter(n => n.depth < cavityZ)
  const deeperIndep = indepNotches.filter(n => n.depth > cavityZ)

  // Split different-depth additional tools into shallower and deeper
  const shallowerExtraTools = diffDepthExtraTools.filter(et => et.depth < cavityZ)
  const deeperExtraTools = diffDepthExtraTools.filter(et => et.depth > cavityZ)

  // Helper: apply bevel CSG to a wall geometry
  const applyBevel = (wallGeo) => {
    if (!anyBevel) return new THREE.Mesh(wallGeo, trayMat2)
    try {
      const evaluator = new Evaluator()
      let resultMesh = new Brush(wallGeo)
      resultMesh.updateMatrixWorld()

      const maxCb = Math.max(cb, ...extraToolViz.map(ev => ev.cavityBevel || 0))
      if (maxCb > 0.1) {
        // Apply bevel to unified holes (all tools + notches merged)
        unifiedHolePtArrays.forEach(pts => {
          const bevelShape = new THREE.Shape()
          pts.forEach((p, i) => { if (i === 0) bevelShape.moveTo(p.x, p.y); else bevelShape.lineTo(p.x, p.y) })
          bevelShape.closePath()
          const bevelGeo = new THREE.ExtrudeGeometry(bevelShape, {
            depth: 0.01, bevelEnabled: true,
            bevelThickness: maxCb, bevelSize: maxCb, bevelSegments: 1, bevelOffset: 0,
          })
          bevelGeo.translate(0, 0, topSurface)
          const bevelBrush = new Brush(bevelGeo)
          bevelBrush.updateMatrixWorld()
          const prevBrush = new Brush(resultMesh.geometry || resultMesh)
          prevBrush.updateMatrixWorld()
          resultMesh = evaluator.evaluate(prevBrush, bevelBrush, SUBTRACTION)
        })
      }

      resultMesh.material = trayMat2
      if (resultMesh.geometry) resultMesh.geometry.computeVertexNormals()
      return resultMesh
    } catch (e) {
      console.error('CSG bevel failed:', e)
      return new THREE.Mesh(wallGeo, trayMat2)
    }
  }

  // Helper: build Clipper union of tool + given notch point arrays
  const buildHolePaths = (notchPtsArray) => {
    const scale = 1000
    const clipper = new ClipperLib.Clipper()
    clipper.AddPath(holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
    notchPtsArray.forEach(nPts => {
      clipper.AddPath(nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length === 0) return [holePts]
    return solution.map(path => {
      const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
      if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
      return pts
    })
  }

  // For deeper notches/tools in custom tray: cut into the base (only for flat base, not edge-profiled)
  const hasEdgeProfile = edgeProfile && edgeProfile !== 'none' && edgeSize > 0
  if ((deeperIndep.length > 0 || deeperExtraTools.length > 0) && actualBaseDepth > 0.01 && !hasEdgeProfile) {
    const baseCuts = [
      ...deeperIndep.map(n => {
        const extraDepth = Math.min(n.depth - cavityZ, actualBaseDepth)
        return { pts: n.pts, cutStart: actualBaseDepth - extraDepth }
      }),
      ...deeperExtraTools.map(et => {
        const extraDepth = Math.min(et.depth - cavityZ, actualBaseDepth)
        return { pts: et.pts, cutStart: actualBaseDepth - extraDepth }
      })
    ]
    const baseBreaks = [0, ...baseCuts.map(c => c.cutStart), actualBaseDepth]
    const uniqueBaseBreaks = [...new Set(baseBreaks)].filter(h => h >= 0 && h <= actualBaseDepth).sort((a, b) => a - b)

    for (let bi = 0; bi < uniqueBaseBreaks.length - 1; bi++) {
      const layBot = uniqueBaseBreaks[bi]
      const layTop = uniqueBaseBreaks[bi + 1]
      const layH = layTop - layBot
      if (layH < 0.01) continue
      const baseLayerShape = outerShape.clone()
      baseCuts.forEach(c => {
        if (layBot >= c.cutStart - 0.001) {
          baseLayerShape.holes.push(new THREE.Path(c.pts.map(p => new THREE.Vector2(p.x, p.y))))
        }
      })
      const baseLayerGeo = new THREE.ExtrudeGeometry(baseLayerShape, { depth: layH, bevelEnabled: false })
      baseLayerGeo.translate(0, 0, layBot)
      group.add(new THREE.Mesh(baseLayerGeo, trayMat))
    }
  }

  // Build wall layers
  if (shallowerIndep.length > 0 || shallowerExtraTools.length > 0) {
    const notchBreaks = shallowerIndep.map(n => cavityZ - n.depth)
    const toolBreaks = shallowerExtraTools.map(et => cavityZ - et.depth)
    const sliceHeights = [0, ...notchBreaks, ...toolBreaks, cavityZ]
    const uniqueHeights = [...new Set(sliceHeights)].sort((a, b) => a - b)

    for (let li = 0; li < uniqueHeights.length - 1; li++) {
      const layerBottom = uniqueHeights[li]
      const layerTop = uniqueHeights[li + 1]
      const layerHeight = layerTop - layerBottom
      if (layerHeight < 0.01) continue

      const isTopLayer = li === uniqueHeights.length - 2

      // Determine which notches are open at this layer height
      const openNotchPts = [...defaultNotchPts]
      deeperIndep.forEach(n => openNotchPts.push(n.pts)) // deeper always open in wall
      shallowerIndep.forEach(n => {
        const opensAt = cavityZ - n.depth
        if (layerBottom >= opensAt - 0.001) openNotchPts.push(n.pts)
      })

      const layerHoles = buildHolePaths(openNotchPts)
      const layerShape = outerShape.clone()

      // Collect extra tool holes that are open at this layer
      // Same-depth tools are already in the unified holes via allHolePaths
      // Different-depth tools open at (cavityZ - toolDepth)
      const openExtraToolPts = []
      sameDepthExtraTools.forEach(et => openExtraToolPts.push(et.pts)) // always open
      deeperExtraTools.forEach(et => openExtraToolPts.push(et.pts)) // always open in wall
      shallowerExtraTools.forEach(et => {
        const opensAt = cavityZ - et.depth
        if (layerBottom >= opensAt - 0.001) openExtraToolPts.push(et.pts)
      })

      if (openExtraToolPts.length > 0) {
        // Union layer holes with open additional tool holes
        const scale = 1000
        const clipper = new ClipperLib.Clipper()
        layerHoles.forEach(pts => {
          clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
        })
        openExtraToolPts.forEach(pts => {
          clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
        })
        const solution = []
        clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
        const unifiedLayerHoles = solution.length > 0 ? solution.map(path => {
          const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
          if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
          return pts
        }) : layerHoles
        unifiedLayerHoles.forEach(pts => {
          const hp = new THREE.Path()
          pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
          hp.closePath()
          layerShape.holes.push(hp)
        })
      } else {
        layerHoles.forEach(pts => {
          const hp = new THREE.Path()
          pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
          hp.closePath()
          layerShape.holes.push(hp)
        })
      }

      const layerGeo = new THREE.ExtrudeGeometry(layerShape, { depth: layerHeight, bevelEnabled: false })
      layerGeo.translate(0, 0, actualBaseDepth + layerBottom)

      if (isTopLayer) {
        group.add(applyBevel(layerGeo))
      } else {
        group.add(new THREE.Mesh(layerGeo, trayMat))
      }
    }
  } else {
    // No shallower independent notches or extra tools - single wall section
    const wallNotchPts = [...defaultNotchPts]
    deeperIndep.forEach(n => wallNotchPts.push(n.pts))
    const wallHoles = wallNotchPts.length > 0 ? buildHolePaths(wallNotchPts) : combinedHoles

    // Collect all extra tool holes that should be full-depth in the wall
    const fullDepthExtraPts = [
      ...sameDepthExtraTools.map(et => et.pts),
      ...deeperExtraTools.map(et => et.pts)
    ]

    const topShape = outerShape.clone()
    if (fullDepthExtraPts.length > 0) {
      // Union wall holes with full-depth additional tools
      const scale = 1000
      const clipper = new ClipperLib.Clipper()
      wallHoles.forEach(pts => {
        clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
      })
      fullDepthExtraPts.forEach(pts => {
        clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
      })
      const solution = []
      clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
      const unifiedWallHoles = solution.length > 0 ? solution.map(path => {
        const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
        if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
        return pts
      }) : wallHoles
      unifiedWallHoles.forEach(pts => {
        const hp = new THREE.Path()
        pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
        hp.closePath()
        topShape.holes.push(hp)
      })
    } else {
      wallHoles.forEach(pts => {
        const hp = new THREE.Path()
        pts.forEach((p, i) => { if (i === 0) hp.moveTo(p.x, p.y); else hp.lineTo(p.x, p.y) })
        hp.closePath()
        topShape.holes.push(hp)
      })
    }
    const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: cavityZ, bevelEnabled: false })
    topGeo.translate(0, 0, actualBaseDepth)
    group.add(applyBevel(topGeo))
  }

  const cavityGeo = new THREE.ExtrudeGeometry(toolShape, { depth: cavityZ + 0.5, bevelEnabled: false })
  cavityGeo.scale(toolScale, toolScale, 1)
  cavityGeo.rotateZ(rad)
  cavityGeo.translate(toolOffsetX, toolOffsetY, actualBaseDepth - 0.25)

  const activeIdx = config.activeToolIdx ?? 0
  const activeCavityMat = new THREE.MeshPhongMaterial({
    color: 0xffaa00, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    emissive: 0xff6600, emissiveIntensity: 0.5,
  })
  const inactiveCavityMat = new THREE.MeshPhongMaterial({
    color: 0x665533, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
  })







  const cavMesh1 = new THREE.Mesh(cavityGeo, activeIdx === 0 ? activeCavityMat : inactiveCavityMat)
  cavMesh1.userData.vizOnly = true
  cavMesh1.userData.toolIndex = -1
  group.add(cavMesh1)

  // Additional tool visualizations
  extraToolViz.forEach((ev, evIdx) => {
    const evDepth = ev.depth || cavityZ
    const evGeo = new THREE.ExtrudeGeometry(ev.shape, { depth: evDepth + 0.5, bevelEnabled: false })
    evGeo.scale(ev.scale, ev.scale, 1)
    evGeo.rotateZ(ev.rad)
    evGeo.translate(ev.ox, ev.oy, actualBaseDepth + cavityZ - evDepth - 0.25)
    const isActive = (evIdx + 1) === activeIdx
    const evMesh = new THREE.Mesh(evGeo, isActive ? activeCavityMat : inactiveCavityMat)
    evMesh.userData.vizOnly = true
    evMesh.userData.toolIndex = evIdx
    group.add(evMesh)
  })

  // Finger notch visualizations (draggable)
  const notchMat = new THREE.MeshPhongMaterial({ color: 0x44bb44, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  const grabHandleMat = new THREE.MeshBasicMaterial({ visible: false }) // invisible but raycastable
  allNotchPts.forEach((nPts, ni) => {
    const fn = fingerNotches[ni]
    const notchDepth = (fn && fn.depth > 0) ? fn.depth : cavityZ
    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const nGeo = new THREE.ExtrudeGeometry(nShape, { depth: notchDepth + 0.5, bevelEnabled: false })
    nGeo.translate(0, 0, actualBaseDepth + cavityZ - notchDepth - 0.25)
    const nMesh = new THREE.Mesh(nGeo, notchMat)
    nMesh.userData.vizOnly = true
    nMesh.userData.notchIndex = ni
    group.add(nMesh)

    // Invisible grab handle on top surface - extends above wall for easy clicking
    const handleGeo = new THREE.ExtrudeGeometry(nShape, { depth: 3, bevelEnabled: false })
    handleGeo.translate(0, 0, actualBaseDepth + cavityZ - 0.5)
    const handleMesh = new THREE.Mesh(handleGeo, grabHandleMat)
    handleMesh.userData.vizOnly = true
    handleMesh.userData.notchIndex = ni
    group.add(handleMesh)
  })

  // ─── Branding emboss (raised text on inside floor) ───
  try {
    const brandGeo = createBrandGeometry(scaledToolPts, actualBaseDepth)
    if (brandGeo) {
      const brandMat = new THREE.MeshPhongMaterial({ color: 0x6a6a7a, side: THREE.DoubleSide })
      const brandMesh = new THREE.Mesh(brandGeo, brandMat)
      group.add(brandMesh)
    }
  } catch (e) { /* branding is non-critical */ }

  return group
}

/**
 * Create Gridfinity-compatible bin insert
 */
function createGridfinityInsert(points, config) {
  const {
    gridX = 2,
    gridY = 1,
    gridHeight = 21,
    tolerance = 1.5,
    realWidth = 100,
    toolDepth,
    toolOffsetX = 0,
    toolOffsetY = 0,
    toolRotation = 0,
  } = config

  const group = new THREE.Group()

  const binW = gridX * GF.gridUnit - GF.tolerance * 2
  const binH = gridY * GF.gridUnit - GF.tolerance * 2
  const totalHeight = GF.baseHeight + gridHeight
  const wallHeight = totalHeight - GF.baseHeight
  const minFloor = 1.0  // always keep at least 1mm floor above the base
  const maxCavity = wallHeight - minFloor
  const cavityZ = Math.max(0, Math.min(toolDepth || maxCavity, maxCavity))
  const floorZ = wallHeight - cavityZ

  const outerShape = createRoundedRectShape(binW, binH, GF.cornerRadius)

  const rad = (toolRotation * Math.PI) / 180
  const cosR = Math.cos(rad), sinR = Math.sin(rad)
  const rotPt = (x, y) => ({ x: x * cosR - y * sinR, y: x * sinR + y * cosR })

  const { shape: toolShape, centered: toolCentered } = createShapeFromPoints(points)
  const toolBounds = getShapeBounds(points)
  const finalToolScale = realWidth ? (realWidth / toolBounds.width) : 1

  const scaledToolPts = toolCentered.map(p => {
    const sx = p.x * finalToolScale, sy = p.y * finalToolScale
    const r = rotPt(sx, sy)
    return { x: r.x + toolOffsetX, y: r.y + toolOffsetY }
  })

  // Apply tolerance using Clipper polygon offset
  const holePts = (tolerance > 0) ? offsetPolygon(scaledToolPts, tolerance) : scaledToolPts

  // ─── Finger notches for Gridfinity ───
  const { fingerNotches: gfNotches = [] } = config
  const gfAllNotchPts = []       // same-depth notches (union with tool hole)
  const gfIndepNotches = []      // independent-depth notches (CSG subtract separately)

  function buildNotchPts(fn) {
    let pts = []
    if (fn.shape === 'circle') {
      const fnr = Math.max(5, fn.radius || 12)
      const segs = 32
      for (let i = 0; i < segs; i++) {
        const angle = (i / segs) * Math.PI * 2
        pts.push({ x: (fn.x || 0) + Math.cos(angle) * fnr, y: (fn.y || 0) + Math.sin(angle) * fnr })
      }
    } else {
      const hw = (fn.shape === 'square' ? fn.w : fn.w || 24) / 2
      const hh = (fn.shape === 'square' ? fn.w : fn.h || 16) / 2
      pts.push(
        { x: (fn.x || 0) - hw, y: (fn.y || 0) - hh },
        { x: (fn.x || 0) + hw, y: (fn.y || 0) - hh },
        { x: (fn.x || 0) + hw, y: (fn.y || 0) + hh },
        { x: (fn.x || 0) - hw, y: (fn.y || 0) + hh },
      )
    }
    return pts
  }

  let gfNotchOrigIdx = [] // maps gfAllNotchPts index -> original fingerNotches index
  gfNotches.forEach((fn, fnIdx) => {
    const pts = buildNotchPts(fn)
    if (pts.length < 3) return
    gfAllNotchPts.push(pts)
    gfNotchOrigIdx.push(fnIdx)
    // Any notch with custom depth (> 0) that isn't equal to cavityZ is independent
    const isIndependent = fn.depth > 0 && Math.abs(fn.depth - cavityZ) > 0.01
    if (isIndependent) {
      gfIndepNotches.push({ pts, depth: fn.depth, origIdx: fnIdx })
    }
  })

  // Union tool hole + notches for Gridfinity
  const gfCombinedHolePts = (() => {
    if (gfAllNotchPts.length === 0) return [holePts]
    const scale = 1000
    const clipper = new ClipperLib.Clipper()
    clipper.AddPath(holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
    gfAllNotchPts.forEach(nPts => {
      clipper.AddPath(nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length === 0) return [holePts]
    // Ensure consistent winding (positive area = CCW)
    return solution.map(path => {
      const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
      if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
      return pts
    })
  })()

  const toolHolePath = new THREE.Path()
  // Use first combined path for the hole (tool + ALL notches)
  const gfMainHole = gfCombinedHolePts[0] || holePts

  // Also build tool-only hole (excluding custom-depth notches) for lower wall layers
  const gfToolOnlyHole = (() => {
    // Get default-depth notch pts only
    const defaultNotchPts = gfAllNotchPts.filter((_, i) => {
      // gfAllNotchPts has all notches in order. We need to figure out which are default.
      // gfIndepNotches has custom ones. Compare pts references.
      const isCustom = gfIndepNotches.some(indep => indep.pts === gfAllNotchPts[i] || 
        (indep.pts.length === gfAllNotchPts[i].length && indep.pts[0].x === gfAllNotchPts[i][0].x && indep.pts[0].y === gfAllNotchPts[i][0].y))
      return !isCustom
    })
    if (defaultNotchPts.length === 0 && gfIndepNotches.length > 0) return holePts // tool only, no default notches
    if (defaultNotchPts.length === 0) return gfMainHole // no custom notches at all
    const scale = 1000
    const clipper = new ClipperLib.Clipper()
    clipper.AddPath(holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
    defaultNotchPts.forEach(nPts => {
      clipper.AddPath(nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length === 0) return holePts
    const pts = solution[0].map(p => ({ x: p.X / scale, y: p.Y / scale }))
    if (ClipperLib.Clipper.Area(solution[0]) < 0) pts.reverse()
    return pts
  })()
  gfMainHole.forEach((p, i) => {
    if (i === 0) toolHolePath.moveTo(p.x, p.y)
    else toolHolePath.lineTo(p.x, p.y)
  })
  toolHolePath.closePath()

  const trayMat = new THREE.MeshPhongMaterial({
    color: 0x888899, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  })
  const trayMat2 = new THREE.MeshPhongMaterial({
    color: 0x888899, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  })

  // ─── Base with proper Gridfinity profile (per grid cell) ───
  // Cross-section from confirmed bins:
  //   z=0.00: bottom (narrowest) 35.6mm per unit
  //   z=0.80: after 45deg chamfer -> 37.2mm per unit
  //   z=2.60: after vertical section -> 37.2mm (unchanged)
  //   z=4.75: after 45deg chamfer -> 41.5mm per unit (full baseUnitSize)
  
  const bottomW = GF.baseUnitSize - 2 * (GF.baseChamfer1 + GF.baseChamfer2) // 35.6
  const midW = GF.baseUnitSize - 2 * GF.baseChamfer2 // 37.2
  const topW = GF.baseUnitSize // 41.5
  const cr = 1.6 // corner radius for narrower layers

  // Helper: build a frustum (tapered extrusion) between two rounded rects
  function buildFrustum(w1, w2, cr1, cr2, height, segments) {
    segments = segments || 24
    const pts1 = createRoundedRectShape(w1, w1, cr1).getPoints(segments)
    const pts2 = createRoundedRectShape(w2, w2, cr2).getPoints(segments)
    
    const n = Math.min(pts1.length, pts2.length)
    const verts = []
    const indices = []
    
    // Bottom ring (z=0) and top ring (z=height)
    for (let i = 0; i < n; i++) {
      verts.push(pts1[i].x, pts1[i].y, 0)
      verts.push(pts2[i].x, pts2[i].y, height)
    }
    
    // Side faces
    for (let i = 0; i < n - 1; i++) {
      const b0 = i * 2, t0 = i * 2 + 1
      const b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1
      indices.push(b0, t0, b1)
      indices.push(b1, t0, t1)
    }
    
    // Bottom cap
    const centerBottom = n * 2
    verts.push(0, 0, 0)
    for (let i = 0; i < n - 1; i++) {
      indices.push(centerBottom, (i + 1) * 2, i * 2)
    }
    
    // Top cap
    const centerTop = n * 2 + 1
    verts.push(0, 0, height)
    for (let i = 0; i < n - 1; i++) {
      indices.push(centerTop, i * 2 + 1, (i + 1) * 2 + 1)
    }
    
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  for (let gx = 0; gx < gridX; gx++) {
    for (let gy = 0; gy < gridY; gy++) {
      const cx = -binW / 2 + GF.gridUnit / 2 + gx * GF.gridUnit
      const cy = -binH / 2 + GF.gridUnit / 2 + gy * GF.gridUnit
      const ov = 0 // no overlap needed
      let z = 0

      // Layer 1: 45deg chamfer (0.8mm) - tapers from 35.6 to 37.2
      const g1 = buildFrustum(bottomW, midW, cr, cr, GF.baseChamfer1 + ov, 24)
      g1.translate(cx, cy, z)
      group.add(new THREE.Mesh(g1, trayMat))
      z += GF.baseChamfer1

      // Layer 2: vertical section (1.8mm) - stays at 37.2
      const s2 = createRoundedRectShape(midW, midW, cr)
      const g2 = new THREE.ExtrudeGeometry(s2, { depth: GF.baseVertical + ov, bevelEnabled: false })
      g2.translate(cx, cy, z)
      group.add(new THREE.Mesh(g2, trayMat))
      z += GF.baseVertical

      // Layer 3: 45deg chamfer (2.15mm) - tapers from 37.2 to 41.5
      const g3 = buildFrustum(midW, topW, cr, GF.cornerRadius, GF.baseChamfer2 + ov, 24)
      g3.translate(cx, cy, z)
      group.add(new THREE.Mesh(g3, trayMat))
    }
  }

  // ─── Walls with tool hole (cavity bevel support via CSG) ───
  const cb = config.cavityBevel || 0
  const topSurface = GF.baseHeight + wallHeight

  // Floor + walls combined as single extrusion, then subtract tool cavity from top
  // This eliminates non-manifold edges at the floor/wall boundary

  // ─── Additional tools for gridfinity ───
  const { additionalTools = [] } = config
  const extraToolCutters = []
  const extraToolViz = []
  const extraGfHolePts = [] // raw point arrays for Clipper union
  const maxGfW = binW - 2
  const maxGfH = binH - 2
  additionalTools.forEach(at => {
    if (!at.points || at.points.length < 3) return
    const { shape: atShape, centered: atCentered } = createShapeFromPoints(at.points)
    const atBounds = getShapeBounds(at.points)
    const atScaleX = maxGfW / atBounds.width
    const atScaleY = maxGfH / atBounds.height
    const atScale = Math.min(atScaleX, atScaleY, 1)
    const atRad = (at.toolRotation || 0) * Math.PI / 180
    const atCos = Math.cos(atRad), atSin = Math.sin(atRad)
    const atOx = at.toolOffsetX || 0, atOy = at.toolOffsetY || 0
    const atScaledPts = atCentered.map(p => {
      const sx = p.x * atScale, sy = p.y * atScale
      return { x: sx * atCos - sy * atSin + atOx, y: sx * atSin + sy * atCos + atOy }
    })
    // Apply tolerance
    const atTol = at.tolerance || 0
    const atHolePts = atTol > 0 ? offsetPolygon(atScaledPts, atTol) : atScaledPts
    const atDepth = at.toolDepth || cavityZ
    extraGfHolePts.push({ pts: atHolePts, depth: atDepth })
    const atCutShape = new THREE.Shape()
    atHolePts.forEach((p, i) => {
      if (i === 0) atCutShape.moveTo(p.x, p.y)
      else atCutShape.lineTo(p.x, p.y)
    })
    atCutShape.closePath()
    extraToolCutters.push({ shape: atCutShape, holePts: atHolePts, cavityBevel: at.cavityBevel || 0, depth: atDepth })
    extraToolViz.push({ shape: atShape, scale: atScale, rad: atRad, ox: atOx, oy: atOy, depth: atDepth })
  })

  // Split extra tools by depth relative to primary cavityZ
  const sameDepthGfTools = extraGfHolePts.filter(et => Math.abs(et.depth - cavityZ) < 0.01)
  const shallowerGfTools = extraGfHolePts.filter(et => et.depth < cavityZ - 0.01)
  const deeperGfTools = extraGfHolePts.filter(et => et.depth > cavityZ + 0.01)

  // Union all holes (primary+notches + same-depth additional tools) for clean wall holes
  let gfUnifiedHoles = gfCombinedHolePts
  if (sameDepthGfTools.length > 0) {
    const scale = 1000
    const clipper = new ClipperLib.Clipper()
    gfCombinedHolePts.forEach(pts => {
      clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
    })
    sameDepthGfTools.forEach(et => {
      clipper.AddPath(et.pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
    })
    const solution = []
    clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
    if (solution.length > 0) {
      gfUnifiedHoles = solution.map(path => {
        const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
        if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
        return pts
      })
    }
  }

  // Build tool cavity cutter shape from combined hole (tool + notches)
  const toolCutterShape = new THREE.Shape()
  gfMainHole.forEach((p, i) => {
    if (i === 0) toolCutterShape.moveTo(p.x, p.y)
    else toolCutterShape.lineTo(p.x, p.y)
  })
  toolCutterShape.closePath()

  // ─── Floor + Layered walls for independent notch depths ───
  // Floor slab - may need notch cutouts if any notch is deeper than cavity
  const deeperNotches = gfIndepNotches.filter(n => n.depth > cavityZ) // notches deeper than tool cavity
  const shallowerNotches = gfIndepNotches.filter(n => n.depth > 0 && n.depth < cavityZ) // notches shallower than tool cavity

  if (floorZ > 0.01) {
    if (deeperNotches.length > 0 || deeperGfTools.length > 0) {
      // Layered floor approach: split floor into horizontal slices at each notch/tool depth boundary
      // Each deeper notch/tool cuts (depth - cavityZ) into the floor from the top
      // Floor layers go from bottom (GF.baseHeight) to top (GF.baseHeight + floorZ)
      // A notch/tool with extraDepth cuts from (floorZ - extraDepth) to floorZ within the floor
      
      const floorCuts = [
        ...deeperNotches.map(n => {
          const extraDepth = Math.min(n.depth - cavityZ, floorZ) // clamp to floor thickness
          return { pts: n.pts, cutStart: floorZ - extraDepth } // height within floor where cut begins
        }),
        ...deeperGfTools.map(et => {
          const extraDepth = Math.min(et.depth - cavityZ, floorZ)
          return { pts: et.pts, cutStart: floorZ - extraDepth }
        })
      ]
      
      // Get unique break heights within the floor
      const floorBreaks = [0, ...floorCuts.map(c => c.cutStart), floorZ]
      const uniqueFloorBreaks = [...new Set(floorBreaks)].filter(h => h >= 0 && h <= floorZ).sort((a, b) => a - b)
      
      
      for (let fi = 0; fi < uniqueFloorBreaks.length - 1; fi++) {
        const layerBot = uniqueFloorBreaks[fi]
        const layerTop = uniqueFloorBreaks[fi + 1]
        const layerH = layerTop - layerBot
        if (layerH < 0.01) continue
        
        // Which notch holes are open at this floor layer?
        // A notch hole is open if layerBot >= cutStart (the cut goes from cutStart to floorZ)
        const floorShape = outerShape.clone()
        floorCuts.forEach(c => {
          if (layerBot >= c.cutStart - 0.001) {
            floorShape.holes.push(new THREE.Path(c.pts.map(p => new THREE.Vector2(p.x, p.y))))
          }
        })
        
        const floorGeo = new THREE.ExtrudeGeometry(floorShape, { depth: layerH, bevelEnabled: false })
        floorGeo.translate(0, 0, GF.baseHeight + layerBot)
        group.add(new THREE.Mesh(floorGeo, trayMat))
      }
    } else {
      const floorGeo = new THREE.ExtrudeGeometry(outerShape, { depth: floorZ, bevelEnabled: false })
      floorGeo.translate(0, 0, GF.baseHeight)
      group.add(new THREE.Mesh(floorGeo, trayMat))
    }
  }

  // Collect shallower-than-cavity notches for layered wall approach
  const notchDepthMap = shallowerNotches.map(({ pts, depth }) => ({ pts, depth }))

  if (notchDepthMap.length === 0 && shallowerGfTools.length === 0) {
    // Simple case: no independent depths, single wall section
    // Include deeper extra tools as full-depth holes + same-depth tools (already in gfUnifiedHoles)
    const fullDepthGfPts = [...deeperGfTools.map(et => et.pts)]
    const wallShape = outerShape.clone()
    if (fullDepthGfPts.length > 0) {
      // Union gfUnifiedHoles with deeper extra tools
      const scale = 1000
      const clipper = new ClipperLib.Clipper()
      gfUnifiedHoles.forEach(pts => {
        clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
      })
      fullDepthGfPts.forEach(pts => {
        clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
      })
      const solution = []
      clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
      const wallHoles = solution.length > 0 ? solution.map(path => {
        const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
        if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
        return pts
      }) : gfUnifiedHoles
      wallHoles.forEach(pts => {
        wallShape.holes.push(new THREE.Path(pts.map(p => new THREE.Vector2(p.x, p.y))))
      })
    } else {
      gfUnifiedHoles.forEach(pts => {
        wallShape.holes.push(new THREE.Path(pts.map(p => new THREE.Vector2(p.x, p.y))))
      })
    }
    const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: cavityZ, bevelEnabled: false })
    wallGeo.translate(0, 0, GF.baseHeight + floorZ)

    // Apply bevel if needed
    let wallMesh
    const maxBevel = Math.max(cb, ...extraToolCutters.map(e => e.cavityBevel || 0))
    const hasBevel = maxBevel > 0.1
    if (hasBevel) {
      try {
        const csgEval = new Evaluator()
        let currentBrush = new Brush(wallGeo)
        currentBrush.updateMatrixWorld()
        let result = null

        // Apply bevel to each unified hole (covers all tools + notches)
        gfUnifiedHoles.forEach(holePts => {
          const bevelShape = new THREE.Shape()
          holePts.forEach((p, i) => { if (i === 0) bevelShape.moveTo(p.x, p.y); else bevelShape.lineTo(p.x, p.y) })
          bevelShape.closePath()
          const bevelGeo = new THREE.ExtrudeGeometry(bevelShape, {
            depth: 0.01, bevelEnabled: true,
            bevelThickness: maxBevel, bevelSize: maxBevel, bevelSegments: 1, bevelOffset: 0,
          })
          bevelGeo.translate(0, 0, topSurface)
          const bevelBrush = new Brush(bevelGeo)
          bevelBrush.updateMatrixWorld()
          const prevBrush = result ? new Brush(result.geometry) : currentBrush
          prevBrush.updateMatrixWorld()
          result = csgEval.evaluate(prevBrush, bevelBrush, SUBTRACTION)
        })
        if (result) {
          if (result.geometry) result.geometry.computeVertexNormals()
          wallMesh = new THREE.Mesh(result.geometry, trayMat2)
        } else {
          wallMesh = new THREE.Mesh(wallGeo, trayMat2)
        }
      } catch (e) {
        wallMesh = new THREE.Mesh(wallGeo, trayMat2)
      }
    } else {
      wallMesh = new THREE.Mesh(wallGeo, trayMat2)
    }
    group.add(wallMesh)
  } else {
    // Layered wall approach for independent notch/tool depths
    // Each shallower notch/tool opens at a different height from the cavity floor
    // A notch/tool with depth D opens at height (cavityZ - D) from cavity bottom
    
    // Build break heights where holes change
    const notchBreaks = shallowerNotches.map(n => cavityZ - n.depth)
    const toolBreaks = shallowerGfTools.map(et => cavityZ - et.depth)
    const sliceHeights = [0, ...notchBreaks, ...toolBreaks, cavityZ]
    const uniqueHeights = [...new Set(sliceHeights)].sort((a, b) => a - b)


    for (let li = 0; li < uniqueHeights.length - 1; li++) {
      const layerBottom = uniqueHeights[li]
      const layerTop = uniqueHeights[li + 1]
      const layerHeight = layerTop - layerBottom
      if (layerHeight < 0.01) continue

      // Determine which notches are open at this layer
      // A notch is open if layerBottom >= (cavityZ - notchDepth), i.e. notchDepth >= (cavityZ - layerBottom)
      const openNotchPts = []
      shallowerNotches.forEach(n => {
        const opensAt = cavityZ - n.depth
        if (layerBottom >= opensAt - 0.001) {
          openNotchPts.push(n.pts)
        }
      })
      // Also include default-depth notches (depth=0 or depth==cavityZ) which are always open
      const defaultNotchPts = gfAllNotchPts.filter((_, i) => {
        const isCustom = gfIndepNotches.some(indep => 
          indep.pts === gfAllNotchPts[i] || 
          (indep.pts.length === gfAllNotchPts[i].length && indep.pts[0].x === gfAllNotchPts[i][0].x && indep.pts[0].y === gfAllNotchPts[i][0].y))
        return !isCustom
      })

      // Build the hole for this layer: tool + default notches + open custom notches
      const layerNotchPts = [...defaultNotchPts, ...openNotchPts]
      let layerHole
      if (layerNotchPts.length === 0) {
        layerHole = holePts
      } else {
        const scale = 1000
        const clipper = new ClipperLib.Clipper()
        clipper.AddPath(holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
        layerNotchPts.forEach(nPts => {
          clipper.AddPath(nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
        })
        const solution = []
        clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
        if (solution.length > 0) {
          layerHole = solution[0].map(p => ({ x: p.X / scale, y: p.Y / scale }))
          if (ClipperLib.Clipper.Area(solution[0]) < 0) layerHole.reverse()
        } else {
          layerHole = holePts
        }
      }

      const layerShape = outerShape.clone()
      // Collect extra tool holes that are open at this layer height
      const openGfExtraToolPts = []
      sameDepthGfTools.forEach(et => openGfExtraToolPts.push(et.pts)) // always open
      deeperGfTools.forEach(et => openGfExtraToolPts.push(et.pts)) // always open in wall
      shallowerGfTools.forEach(et => {
        const opensAt = cavityZ - et.depth
        if (layerBottom >= opensAt - 0.001) openGfExtraToolPts.push(et.pts)
      })

      if (openGfExtraToolPts.length > 0) {
        const scale = 1000
        const clipper = new ClipperLib.Clipper()
        clipper.AddPath(layerHole.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptSubject, true)
        openGfExtraToolPts.forEach(pts => {
          clipper.AddPath(pts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) })), ClipperLib.PolyType.ptClip, true)
        })
        const solution = []
        clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)
        if (solution.length > 0) {
          solution.forEach(path => {
            const pts = path.map(p => ({ x: p.X / scale, y: p.Y / scale }))
            if (ClipperLib.Clipper.Area(path) < 0) pts.reverse()
            layerShape.holes.push(new THREE.Path(pts.map(p => new THREE.Vector2(p.x, p.y))))
          })
        } else {
          layerShape.holes.push(new THREE.Path(layerHole.map(p => new THREE.Vector2(p.x, p.y))))
          extraToolCutters.forEach(atEntry => {
            layerShape.holes.push(new THREE.Path(atEntry.shape.getPoints(32)))
          })
        }
      } else {
        layerShape.holes.push(new THREE.Path(layerHole.map(p => new THREE.Vector2(p.x, p.y))))
      }

      const layerGeo = new THREE.ExtrudeGeometry(layerShape, { depth: layerHeight, bevelEnabled: false })
      layerGeo.translate(0, 0, GF.baseHeight + floorZ + layerBottom)
      group.add(new THREE.Mesh(layerGeo, li === uniqueHeights.length - 2 ? trayMat2 : trayMat))
    }

    // Apply bevel to the top surface if needed (on the topmost layer)
    const maxBevelLayered = Math.max(cb, ...extraToolCutters.map(e => e.cavityBevel || 0))
    if (maxBevelLayered > 0.1) {
      try {
        gfUnifiedHoles.forEach(holePts => {
          const bevelShape = new THREE.Shape()
          holePts.forEach((p, i) => { if (i === 0) bevelShape.moveTo(p.x, p.y); else bevelShape.lineTo(p.x, p.y) })
          bevelShape.closePath()
          const bevelGeo = new THREE.ExtrudeGeometry(bevelShape, {
            depth: 0.01, bevelEnabled: true,
            bevelThickness: maxBevelLayered, bevelSize: maxBevelLayered, bevelSegments: 1, bevelOffset: 0,
          })
          bevelGeo.translate(0, 0, topSurface)
          const bevelMat = new THREE.MeshPhongMaterial({ color: 0x4a4a5a, side: THREE.DoubleSide })
          const bevelMesh = new THREE.Mesh(bevelGeo, bevelMat)
          bevelMesh.userData.vizOnly = true
          group.add(bevelMesh)
        })
      } catch (e) { /* bevel viz only */ }
    }
  }

  // ─── Stacking lip - perimeter ring on top of walls ───
  // 1.9mm thick ring matching outer wall profile exactly
  // Extra 1.5mm added for better stacking grip
  const lipExtra = 1.5
  const lipHeight = GF.lipVertical + GF.lipSlope + lipExtra  // ~3.7 + 1.5 = 5.2mm
  const lipThick = 1.9  // Gridfinity spec
  const lipOuter = createRoundedRectShape(binW, binH, GF.cornerRadius)
  const lipInnerW = binW - lipThick * 2
  const lipInnerH = binH - lipThick * 2
  const lipInnerR = Math.max(0.5, GF.cornerRadius - lipThick)
  const lipInner = createRoundedRectShape(lipInnerW, lipInnerH, lipInnerR)
  lipOuter.holes.push(new THREE.Path(lipInner.getPoints(12)))
  const lipGeo = new THREE.ExtrudeGeometry(lipOuter, { depth: lipHeight, bevelEnabled: false })
  lipGeo.translate(0, 0, totalHeight)
  group.add(new THREE.Mesh(lipGeo, trayMat))

  // ─── Grid lines on floor ───
  const linesMat = new THREE.LineBasicMaterial({ color: 0x444455 })
  for (let i = 1; i < gridX; i++) {
    const x = -binW / 2 + i * (binW / gridX)
    const pts = [new THREE.Vector3(x, -binH / 2, GF.baseHeight + 0.1), new THREE.Vector3(x, binH / 2, GF.baseHeight + 0.1)]
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), linesMat))
  }
  for (let i = 1; i < gridY; i++) {
    const y = -binH / 2 + i * (binH / gridY)
    const pts = [new THREE.Vector3(-binW / 2, y, GF.baseHeight + 0.1), new THREE.Vector3(binW / 2, y, GF.baseHeight + 0.1)]
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), linesMat))
  }

  // ─── Tool cavity visualization (orange, clipped to bin bounds) ───
  // Use raw scaled tool points (without tolerance) for viz so tolerance gap is visible
  const toolVizShape = new THREE.Shape()
  scaledToolPts.forEach((p, i) => {
    if (i === 0) toolVizShape.moveTo(p.x, p.y)
    else toolVizShape.lineTo(p.x, p.y)
  })
  toolVizShape.closePath()
  const cavityGeo = new THREE.ExtrudeGeometry(toolVizShape, {
    depth: cavityZ + 0.5,
    bevelEnabled: false,
  })
  cavityGeo.translate(0, 0, GF.baseHeight + floorZ - 0.25)

  const activeIdx = config.activeToolIdx ?? 0
  const activeCavityMat = new THREE.MeshPhongMaterial({
    color: 0xffaa00, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
    emissive: 0xff6600, emissiveIntensity: 0.5,
  })
  const inactiveCavityMat = new THREE.MeshPhongMaterial({
    color: 0x665533, transparent: true, opacity: 0.15, side: THREE.DoubleSide,
  })
  const primaryMat = activeIdx === 0 ? activeCavityMat : inactiveCavityMat

  // Clip cavity viz to bin boundary using CSG INTERSECTION
  try {
    const clipGeo = new THREE.ExtrudeGeometry(outerShape, { depth: cavityZ + 1, bevelEnabled: false })
    clipGeo.translate(0, 0, GF.baseHeight + floorZ - 0.5)
    const cavBrush = new Brush(cavityGeo)
    cavBrush.updateMatrixWorld()
    const clipBrush = new Brush(clipGeo)
    clipBrush.updateMatrixWorld()
    const ev = new Evaluator()
    const clipped = ev.evaluate(cavBrush, clipBrush, INTERSECTION)
    clipped.material = primaryMat
    clipped.userData.vizOnly = true
    clipped.userData.toolIndex = -1
    group.add(clipped)
  } catch (e) {
    const cavMesh2 = new THREE.Mesh(cavityGeo, primaryMat)
    cavMesh2.userData.vizOnly = true
    cavMesh2.userData.toolIndex = -1
    group.add(cavMesh2)
  }

  // Additional tool visualizations for gridfinity
  extraToolViz.forEach((ev, evIdx) => {
    const isActive = (evIdx + 1) === activeIdx
    const evMat = isActive ? activeCavityMat : inactiveCavityMat
    const evDepth = ev.depth || cavityZ
    const evGeo = new THREE.ExtrudeGeometry(ev.shape, { depth: evDepth + 0.5, bevelEnabled: false })
    evGeo.scale(ev.scale, ev.scale, 1)
    evGeo.rotateZ(ev.rad)
    evGeo.translate(ev.ox, ev.oy, GF.baseHeight + floorZ + cavityZ - evDepth - 0.25)
    try {
      const clipGeo = new THREE.ExtrudeGeometry(outerShape, { depth: evDepth + 1, bevelEnabled: false })
      clipGeo.translate(0, 0, GF.baseHeight + floorZ + cavityZ - evDepth - 0.5)
      const evBrush = new Brush(evGeo)
      evBrush.updateMatrixWorld()
      const clipBrush = new Brush(clipGeo)
      clipBrush.updateMatrixWorld()
      const evaluator = new Evaluator()
      const clipped = evaluator.evaluate(evBrush, clipBrush, INTERSECTION)
      clipped.material = evMat
      clipped.userData.vizOnly = true
      clipped.userData.toolIndex = evIdx
      group.add(clipped)
    } catch (e2) {
      const evMesh = new THREE.Mesh(evGeo, evMat)
      evMesh.userData.vizOnly = true
      evMesh.userData.toolIndex = evIdx
      group.add(evMesh)
    }
  })

  // Finger notch visualizations for gridfinity (draggable)
  const gfNotchMat = new THREE.MeshPhongMaterial({ color: 0x44bb44, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  const gfGrabHandleMat = new THREE.MeshBasicMaterial({ visible: false }) // invisible but raycastable

  // Helper to add grab handle on top surface for a notch
  const addGrabHandle = (nPts, notchIdx) => {
    const hShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) hShape.moveTo(p.x, p.y); else hShape.lineTo(p.x, p.y) })
    hShape.closePath()
    const handleGeo = new THREE.ExtrudeGeometry(hShape, { depth: 3, bevelEnabled: false })
    handleGeo.translate(0, 0, topSurface - 0.5)
    const handleMesh = new THREE.Mesh(handleGeo, gfGrabHandleMat)
    handleMesh.userData.vizOnly = true
    handleMesh.userData.notchIndex = notchIdx
    group.add(handleMesh)
  }

  // Default-depth notches only (skip ones that have independent depths)
  gfAllNotchPts.forEach((nPts, ni) => {
    // Check if this notch is in gfIndepNotches (has custom depth)
    const isCustom = gfIndepNotches.some(indep => 
      indep.pts === nPts || 
      (indep.pts.length === nPts.length && indep.pts[0].x === nPts[0].x && indep.pts[0].y === nPts[0].y))
    if (isCustom) return // skip - will be drawn by the indep loop below

    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const nGeo = new THREE.ExtrudeGeometry(nShape, { depth: cavityZ + 0.5, bevelEnabled: false })
    nGeo.translate(0, 0, GF.baseHeight + floorZ - 0.25)
    const origIdx = gfNotchOrigIdx[ni] !== undefined ? gfNotchOrigIdx[ni] : ni
    const nMesh = new THREE.Mesh(nGeo, gfNotchMat)
    nMesh.userData.vizOnly = true
    nMesh.userData.notchIndex = origIdx
    group.add(nMesh)
    addGrabHandle(nPts, origIdx)
  })
  // Custom-depth notches - drawn at their actual independent depth
  const gfNotchCustomMat = new THREE.MeshPhongMaterial({ color: 0x22aa88, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  gfIndepNotches.forEach(({ pts: nPts, depth: nDepth, origIdx }, ni) => {
    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const nGeo = new THREE.ExtrudeGeometry(nShape, { depth: nDepth + 0.5, bevelEnabled: false })
    nGeo.translate(0, 0, GF.baseHeight + floorZ + cavityZ - nDepth - 0.25)
    const idx = origIdx !== undefined ? origIdx : ni
    const nMesh = new THREE.Mesh(nGeo, gfNotchCustomMat)
    nMesh.userData.vizOnly = true
    nMesh.userData.notchIndex = idx
    group.add(nMesh)
    addGrabHandle(nPts, idx)
  })

  // ─── Branding emboss (raised text on inside floor) ───
  try {
    const brandGeo = createBrandGeometry(scaledToolPts, GF.baseHeight + floorZ)
    if (brandGeo) {
      const brandMat = new THREE.MeshPhongMaterial({ color: 0x6a6a7a, side: THREE.DoubleSide })
      const brandMesh = new THREE.Mesh(brandGeo, brandMat)
      group.add(brandMesh)
    }
  } catch (e) { /* branding is non-critical */ }

  return group
}

// ─── Utility ───

function getShapeBounds(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  points.forEach(p => {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  })
  return { width: maxX - minX, height: maxY - minY, minX, maxX, minY, maxY }
}

function mergeGeometries(geometries) {
  let totalVerts = 0
  let totalIdx = 0
  geometries.forEach(g => {
    g.computeVertexNormals()
    const nonIdx = g.index ? g.toNonIndexed() : g
    totalVerts += nonIdx.getAttribute('position').count
  })

  const positions = new Float32Array(totalVerts * 3)
  const normals = new Float32Array(totalVerts * 3)
  let offset = 0

  geometries.forEach(g => {
    const nonIdx = g.index ? g.toNonIndexed() : g
    const pos = nonIdx.getAttribute('position')
    const norm = nonIdx.getAttribute('normal')
    for (let i = 0; i < pos.count; i++) {
      positions[(offset + i) * 3] = pos.getX(i)
      positions[(offset + i) * 3 + 1] = pos.getY(i)
      positions[(offset + i) * 3 + 2] = pos.getZ(i)
      if (norm) {
        normals[(offset + i) * 3] = norm.getX(i)
        normals[(offset + i) * 3 + 1] = norm.getY(i)
        normals[(offset + i) * 3 + 2] = norm.getZ(i)
      }
    }
    offset += pos.count
  })

  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  return merged
}

// ─── Public API ───

/**
 * Create a Three.js Group for 3D preview
 */
export function createInsertMesh(toolPoints, config) {
  const mode = config.mode || 'object'

  if (mode === 'object') return createObjectExtrusion(toolPoints, config)
  if (mode === 'custom') return createCustomInsert(toolPoints, config)
  if (mode === 'gridfinity') return createGridfinityInsert(toolPoints, config)

  return createObjectExtrusion(toolPoints, config)
}

/**
 * Export STL binary buffer
 */
export function exportSTL(toolPoints, config) {
  const group = createInsertMesh(toolPoints, config)

  // Collect all non-vizOnly mesh geometries
  const geometries = []
  group.traverse(obj => {
    if (obj.isMesh && !obj.userData.vizOnly) {
      const geo = obj.geometry.clone()
      geo.applyMatrix4(obj.matrixWorld)
      geometries.push(geo)
    }
  })

  if (geometries.length === 0) throw new Error('No geometry to export')

  const merged = mergeGeometries(geometries)
  return geometryToSTL(merged)
}

/**
 * Convert BufferGeometry to binary STL
 */
export function geometryToSTL(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  const positions = nonIndexed.getAttribute('position')
  const numTriangles = positions.count / 3

  const headerBytes = 80
  const bufferSize = headerBytes + 4 + numTriangles * 50
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  const header = 'TracetoForge STL Export'
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0)
  }

  view.setUint32(80, numTriangles, true)

  let offset = 84
  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()
  const cb = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const normal = new THREE.Vector3()

  for (let i = 0; i < numTriangles; i++) {
    const idx = i * 3
    vA.fromBufferAttribute(positions, idx)
    vB.fromBufferAttribute(positions, idx + 1)
    vC.fromBufferAttribute(positions, idx + 2)

    cb.subVectors(vC, vB)
    ab.subVectors(vA, vB)
    normal.crossVectors(cb, ab).normalize()

    view.setFloat32(offset, normal.x, true); offset += 4
    view.setFloat32(offset, normal.y, true); offset += 4
    view.setFloat32(offset, normal.z, true); offset += 4

    view.setFloat32(offset, vA.x, true); offset += 4
    view.setFloat32(offset, vA.y, true); offset += 4
    view.setFloat32(offset, vA.z, true); offset += 4

    view.setFloat32(offset, vB.x, true); offset += 4
    view.setFloat32(offset, vB.y, true); offset += 4
    view.setFloat32(offset, vB.z, true); offset += 4

    view.setFloat32(offset, vC.x, true); offset += 4
    view.setFloat32(offset, vC.y, true); offset += 4
    view.setFloat32(offset, vC.z, true); offset += 4

    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}
