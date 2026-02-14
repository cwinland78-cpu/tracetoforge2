import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION, INTERSECTION, ADDITION } from 'three-bvh-csg'
import ClipperLib from 'clipper-lib'

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
  const allNotchPts = []          // same-depth notches (union with tool hole)
  const indepNotches = []         // independent-depth notches (CSG subtract separately)
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
    if (fn.depth > 0) {
      indepNotches.push({ pts, depth: fn.depth })
    }
  })

  // Union tool hole + all finger notches into combined hole(s) using Clipper
  const combinedHoles = (() => {
    const scale = 1000
    if (allNotchPts.length === 0) return [holePts]
    const clipper = new ClipperLib.Clipper()
    const toolClip = holePts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }))
    clipper.AddPath(toolClip, ClipperLib.PolyType.ptSubject, true)
    allNotchPts.forEach(nPts => {
      const notchClip = nPts.map(p => ({ X: Math.round(p.x * scale), Y: Math.round(p.y * scale) }))
      clipper.AddPath(notchClip, ClipperLib.PolyType.ptClip, true)
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

  // Create hole paths from combined result
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
    const baseGeo = new THREE.ExtrudeGeometry(outerShape, { depth: actualBaseDepth, bevelEnabled: false })
    group.add(new THREE.Mesh(baseGeo, trayMat))
  }

  // ─── Additional tools ───
  const { additionalTools = [] } = config
  const extraToolViz = [] // store viz data for additional tools
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
    const atHolePath = new THREE.Path()
    atHolePts.forEach((p, i) => {
      if (i === 0) atHolePath.moveTo(p.x, p.y)
      else atHolePath.lineTo(p.x, p.y)
    })
    atHolePath.closePath()
    allHolePaths.push(atHolePath)
    extraToolViz.push({ shape: atShape, scale: atScale, rad: atRad, ox: atOx, oy: atOy, cutShape: atHolePts, cavityBevel: at.cavityBevel || 0 })
  })

  // ─── Top section (with tool cavity hole) ───
  const { cavityBevel = 0 } = config
  const cb = Math.min(cavityBevel, cavityZ * 0.3, 5) // clamp
  const anyBevel = cb > 0.1 || extraToolViz.some(ev => (ev.cavityBevel || 0) > 0.1)

  if (anyBevel) {
    // Full top section with normal tool hole
    const topShape = outerShape.clone()
    allHolePaths.forEach(hp => topShape.holes.push(hp))
    const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: cavityZ, bevelEnabled: false })
    topGeo.translate(0, 0, actualBaseDepth)

    const topSurface = actualBaseDepth + cavityZ
    const evaluator = new Evaluator()

    try {
      let resultMesh = new Brush(topGeo)
      resultMesh.updateMatrixWorld()

      // Bevel primary tool if enabled
      if (cb > 0.1) {
        const bevelToolShape = new THREE.Shape()
        scaledToolPts.forEach((p, i) => {
          if (i === 0) bevelToolShape.moveTo(p.x, p.y)
          else bevelToolShape.lineTo(p.x, p.y)
        })
        bevelToolShape.closePath()

        const bevelGeo = new THREE.ExtrudeGeometry(bevelToolShape, {
          depth: 0.01,
          bevelEnabled: true,
          bevelThickness: cb,
          bevelSize: cb,
          bevelSegments: 1,
          bevelOffset: 0,
        })
        bevelGeo.translate(0, 0, topSurface)

        const bevelBrush = new Brush(bevelGeo)
        bevelBrush.updateMatrixWorld()
        resultMesh = evaluator.evaluate(resultMesh, bevelBrush, SUBTRACTION)
      }

      // Bevel each additional tool independently
      extraToolViz.forEach(ev => {
        const atCb = ev.cavityBevel || 0
        if (atCb > 0.1 && ev.cutShape && ev.cutShape.length >= 3) {
          const atBevelShape = new THREE.Shape()
          ev.cutShape.forEach((p, i) => {
            if (i === 0) atBevelShape.moveTo(p.x, p.y)
            else atBevelShape.lineTo(p.x, p.y)
          })
          atBevelShape.closePath()

          const atBevelGeo = new THREE.ExtrudeGeometry(atBevelShape, {
            depth: 0.01,
            bevelEnabled: true,
            bevelThickness: atCb,
            bevelSize: atCb,
            bevelSegments: 1,
            bevelOffset: 0,
          })
          atBevelGeo.translate(0, 0, topSurface)

          const atBevelBrush = new Brush(atBevelGeo)
          atBevelBrush.updateMatrixWorld()
          const prevBrush = new Brush(resultMesh.geometry || resultMesh)
          prevBrush.updateMatrixWorld()
          resultMesh = evaluator.evaluate(prevBrush, atBevelBrush, SUBTRACTION)
        }
      })

      resultMesh.material = trayMat2
      if (resultMesh.geometry) resultMesh.geometry.computeVertexNormals()
      group.add(resultMesh)
    } catch (e) {
      console.error('CSG failed:', e)
      group.add(new THREE.Mesh(topGeo, trayMat2))
    }
  } else {
    // No cavity bevel - simple extrusion
    const topShape = outerShape.clone()
    allHolePaths.forEach(hp => topShape.holes.push(hp))
    const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: cavityZ, bevelEnabled: false })
    topGeo.translate(0, 0, actualBaseDepth)
    group.add(new THREE.Mesh(topGeo, trayMat2))
  }

  // ─── Finger notch depth fill plugs (custom tray) ───
  const topSrf = actualBaseDepth + cavityZ
  indepNotches.forEach(({ pts: nPts, depth: nDepth }) => {
    if (nDepth >= cavityZ) return
    const fillDepth = cavityZ - nDepth
    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const fillGeo = new THREE.ExtrudeGeometry(nShape, { depth: fillDepth, bevelEnabled: false })
    fillGeo.translate(0, 0, actualBaseDepth)
    group.add(new THREE.Mesh(fillGeo, trayMat))
  })

  // ─── Tool cavity visualization (orange) ───
  const cavityGeo = new THREE.ExtrudeGeometry(toolShape, { depth: cavityZ + 0.5, bevelEnabled: false })
  cavityGeo.scale(toolScale, toolScale, 1)
  cavityGeo.rotateZ(rad)
  cavityGeo.translate(toolOffsetX, toolOffsetY, actualBaseDepth - 0.25)

  const cavityMat = new THREE.MeshPhongMaterial({
    color: 0xe8650a,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  })
  const cavMesh1 = new THREE.Mesh(cavityGeo, cavityMat)
  cavMesh1.userData.vizOnly = true
  cavMesh1.userData.toolIndex = -1
  group.add(cavMesh1)

  // Additional tool visualizations
  extraToolViz.forEach((ev, evIdx) => {
    const evGeo = new THREE.ExtrudeGeometry(ev.shape, { depth: cavityZ + 0.5, bevelEnabled: false })
    evGeo.scale(ev.scale, ev.scale, 1)
    evGeo.rotateZ(ev.rad)
    evGeo.translate(ev.ox, ev.oy, actualBaseDepth - 0.25)
    const evMesh = new THREE.Mesh(evGeo, cavityMat)
    evMesh.userData.vizOnly = true
    evMesh.userData.toolIndex = evIdx
    group.add(evMesh)
  })

  // Finger notch visualizations (draggable)
  const notchMat = new THREE.MeshPhongMaterial({ color: 0x44bb44, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
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
  })

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

  gfNotches.forEach(fn => {
    const pts = buildNotchPts(fn)
    if (pts.length < 3) return
    // Always union all notches with tool hole for reliable Shape-hole cutting
    gfAllNotchPts.push(pts)
    // Track notches with custom depth for fill plugs
    if (fn.depth > 0) {
      gfIndepNotches.push({ pts, depth: fn.depth })
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
  // Use first combined path for the hole
  const gfMainHole = gfCombinedHolePts[0] || holePts
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
    const atCutShape = new THREE.Shape()
    atHolePts.forEach((p, i) => {
      if (i === 0) atCutShape.moveTo(p.x, p.y)
      else atCutShape.lineTo(p.x, p.y)
    })
    atCutShape.closePath()
    extraToolCutters.push({ shape: atCutShape, cavityBevel: at.cavityBevel || 0 })
    extraToolViz.push({ shape: atShape, scale: atScale, rad: atRad, ox: atOx, oy: atOy })
  })

  // Build tool cavity cutter shape from combined hole (tool + notches)
  const toolCutterShape = new THREE.Shape()
  gfMainHole.forEach((p, i) => {
    if (i === 0) toolCutterShape.moveTo(p.x, p.y)
    else toolCutterShape.lineTo(p.x, p.y)
  })
  toolCutterShape.closePath()

  // Floor zone: solid from baseHeight to baseHeight+floorZ
  if (floorZ > 0.01) {
    const floorGeo = new THREE.ExtrudeGeometry(outerShape, { depth: floorZ, bevelEnabled: false })
    floorGeo.translate(0, 0, GF.baseHeight)
    group.add(new THREE.Mesh(floorGeo, trayMat))
  }

  // Wall section with holes: extrude outer shape with tool holes as path holes
  const wallShape = outerShape.clone()
  wallShape.holes.push(new THREE.Path(gfMainHole.map(p => new THREE.Vector2(p.x, p.y))))
  extraToolCutters.forEach(atEntry => {
    const atPts = atEntry.shape.getPoints(32)
    wallShape.holes.push(new THREE.Path(atPts))
  })
  const wallGeo = new THREE.ExtrudeGeometry(wallShape, { depth: cavityZ, bevelEnabled: false })
  wallGeo.translate(0, 0, GF.baseHeight + floorZ)

  // Apply cavity bevel via CSG only if needed
  let wallMesh
  const hasBevel = cb > 0.1 || extraToolCutters.some(e => (e.cavityBevel || 0) > 0.1)
  if (hasBevel) {
    try {
      const csgEval = new Evaluator()
      let currentBrush = new Brush(wallGeo)
      currentBrush.updateMatrixWorld()
      let result = null

      if (cb > 0.1) {
        const bevelGeo = new THREE.ExtrudeGeometry(toolCutterShape, {
          depth: 0.01, bevelEnabled: true,
          bevelThickness: cb, bevelSize: cb, bevelSegments: 1, bevelOffset: 0,
        })
        bevelGeo.translate(0, 0, topSurface)
        const bevelBrush = new Brush(bevelGeo)
        bevelBrush.updateMatrixWorld()
        result = csgEval.evaluate(currentBrush, bevelBrush, SUBTRACTION)
        currentBrush = new Brush(result.geometry)
        currentBrush.updateMatrixWorld()
      }

      extraToolCutters.forEach(atEntry => {
        const atCb = atEntry.cavityBevel || 0
        if (atCb > 0.1) {
          const atBevelGeo = new THREE.ExtrudeGeometry(atEntry.shape, {
            depth: 0.01, bevelEnabled: true,
            bevelThickness: atCb, bevelSize: atCb, bevelSegments: 1, bevelOffset: 0,
          })
          atBevelGeo.translate(0, 0, topSurface)
          const atBevelBrush = new Brush(atBevelGeo)
          atBevelBrush.updateMatrixWorld()
          const prevBrush = result ? new Brush(result.geometry) : currentBrush
          prevBrush.updateMatrixWorld()
          result = csgEval.evaluate(prevBrush, atBevelBrush, SUBTRACTION)
        }
      })



      if (result) {
        if (result.geometry) result.geometry.computeVertexNormals()
        wallMesh = new THREE.Mesh(result.geometry, trayMat2)
      } else {
        wallMesh = new THREE.Mesh(wallGeo, trayMat2)
      }
    } catch (e) {
      console.error('CSG failed:', e)
      wallMesh = new THREE.Mesh(wallGeo, trayMat2)
    }
  } else {
    wallMesh = new THREE.Mesh(wallGeo, trayMat2)
  }
  group.add(wallMesh)

  // ─── Finger notch depth fill plugs ───
  // For notches with custom depth < cavityZ, add solid fill to raise their floor
  gfIndepNotches.forEach(({ pts: nPts, depth: nDepth }) => {
    if (nDepth >= cavityZ) return  // notch is as deep or deeper than tool, no fill needed
    const fillDepth = cavityZ - nDepth  // how much to fill from the bottom
    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const fillGeo = new THREE.ExtrudeGeometry(nShape, { depth: fillDepth, bevelEnabled: false })
    fillGeo.translate(0, 0, GF.baseHeight + floorZ)  // start at bottom of cavity
    group.add(new THREE.Mesh(fillGeo, trayMat))
  })

  // ─── Stacking lip - outer wall extended upward ───
  // Simple wall ring: same outer profile, inset by wall thickness, no tool hole
  const lipHeight = GF.lipVertical + GF.lipSlope  // ~4.4mm
  const wallThickness = 1.2
  const lipOuter = createRoundedRectShape(binW, binH, GF.cornerRadius)
  const lipInner = createRoundedRectShape(
    binW - wallThickness * 2,
    binH - wallThickness * 2,
    Math.max(0, GF.cornerRadius - wallThickness)
  )
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
  const cavityGeo = new THREE.ExtrudeGeometry(toolCutterShape, {
    depth: cavityZ + 0.5,
    bevelEnabled: false,
  })
  cavityGeo.translate(0, 0, GF.baseHeight + floorZ - 0.25)

  const cavityMat = new THREE.MeshPhongMaterial({
    color: 0xe8650a, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
  })

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
    clipped.material = cavityMat
    clipped.userData.vizOnly = true
    clipped.userData.toolIndex = -1
    group.add(clipped)
  } catch (e) {
    const cavMesh2 = new THREE.Mesh(cavityGeo, cavityMat)
    cavMesh2.userData.vizOnly = true
    cavMesh2.userData.toolIndex = -1
    group.add(cavMesh2)
  }

  // Additional tool visualizations for gridfinity
  extraToolViz.forEach((ev, evIdx) => {
    const evGeo = new THREE.ExtrudeGeometry(ev.shape, { depth: cavityZ + 0.5, bevelEnabled: false })
    evGeo.scale(ev.scale, ev.scale, 1)
    evGeo.rotateZ(ev.rad)
    evGeo.translate(ev.ox, ev.oy, GF.baseHeight + floorZ - 0.25)
    try {
      const clipGeo = new THREE.ExtrudeGeometry(outerShape, { depth: cavityZ + 1, bevelEnabled: false })
      clipGeo.translate(0, 0, GF.baseHeight + floorZ - 0.5)
      const evBrush = new Brush(evGeo)
      evBrush.updateMatrixWorld()
      const clipBrush = new Brush(clipGeo)
      clipBrush.updateMatrixWorld()
      const evaluator = new Evaluator()
      const clipped = evaluator.evaluate(evBrush, clipBrush, INTERSECTION)
      clipped.material = cavityMat
      clipped.userData.vizOnly = true
      clipped.userData.toolIndex = evIdx
      group.add(clipped)
    } catch (e2) {
      const evMesh = new THREE.Mesh(evGeo, cavityMat)
      evMesh.userData.vizOnly = true
      evMesh.userData.toolIndex = evIdx
      group.add(evMesh)
    }
  })

  // Finger notch visualizations for gridfinity (draggable)
  const gfNotchMat = new THREE.MeshPhongMaterial({ color: 0x44bb44, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  gfAllNotchPts.forEach((nPts, ni) => {
    const fn = gfNotches[ni]
    const notchDepth = (fn && fn.depth > 0) ? fn.depth : cavityZ
    const nShape = new THREE.Shape()
    nPts.forEach((p, i) => { if (i === 0) nShape.moveTo(p.x, p.y); else nShape.lineTo(p.x, p.y) })
    nShape.closePath()
    const nGeo = new THREE.ExtrudeGeometry(nShape, { depth: notchDepth + 0.5, bevelEnabled: false })
    nGeo.translate(0, 0, GF.baseHeight + floorZ + cavityZ - notchDepth - 0.25)
    const nMesh = new THREE.Mesh(nGeo, gfNotchMat)
    nMesh.userData.vizOnly = true
    nMesh.userData.notchIndex = ni
    group.add(nMesh)
  })

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
