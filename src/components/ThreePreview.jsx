import React, { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createInsertMesh } from '../lib/stlExporter'
import { RotateCcw, Eye, Crosshair } from 'lucide-react'

export default function ThreePreview({ contourPoints, config, onToolDrag, onNotchDrag }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const controlsRef = useRef(null)
  const cameraRef = useRef(null)
  const sceneRef = useRef(null)
  const meshGroupRef = useRef(null)
  const frameRef = useRef(null)
  const maxDimRef = useRef(100)
  const centerRef = useRef(new THREE.Vector3())
  const dragRef = useRef(null)
  const onToolDragRef = useRef(onToolDrag)
  onToolDragRef.current = onToolDrag
  const onNotchDragRef = useRef(onNotchDrag)
  onNotchDragRef.current = onNotchDrag

  const setView = useCallback((name) => {
    const controls = controlsRef.current
    const camera = cameraRef.current
    if (!controls || !camera) return
    const d = maxDimRef.current * 2.5
    const c = centerRef.current
    controls.target.copy(c)
    if (name === 'top') {
      camera.position.set(c.x, c.y, c.z + d)
      camera.up.set(0, 1, 0)
    } else if (name === 'front') {
      camera.position.set(c.x, c.y - d * 0.97, c.z + d * 0.25)
      camera.up.set(0, 0, 1)
    } else {
      const theta = Math.PI * 0.75, phi = Math.PI * 0.35, sinPhi = Math.sin(phi)
      camera.position.set(c.x + d * sinPhi * Math.cos(theta), c.y + d * sinPhi * Math.sin(theta), c.z + d * Math.cos(phi))
      camera.up.set(0, 0, 1)
    }
    controls.update()
  }, [])

  const getToolAtMouse = useCallback((e) => {
    const renderer = rendererRef.current, camera = cameraRef.current, group = meshGroupRef.current
    if (!renderer || !camera || !group) return null
    const rect = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const vizMeshes = []
    group.traverse(obj => { if (obj.isMesh && obj.userData.vizOnly && (obj.userData.toolIndex !== undefined || obj.userData.notchIndex !== undefined)) vizMeshes.push(obj) })
    const hits = raycaster.intersectObjects(vizMeshes)
    if (hits.length === 0) return null
    // Prioritize notch hits over tool hits - notches sit inside cavities and are hard to click
    const notchHit = hits.find(h => h.object.userData.notchIndex !== undefined)
    if (notchHit) return { notchIndex: notchHit.object.userData.notchIndex }
    const hit = hits[0].object
    return { toolIndex: hit.userData.toolIndex }
  }, [])

  const screenToWorldDelta = useCallback((dx, dy) => {
    const camera = cameraRef.current, renderer = rendererRef.current
    if (!camera || !renderer) return { x: 0, y: 0 }
    const rect = renderer.domElement.getBoundingClientRect()
    const dist = camera.position.distanceTo(centerRef.current)
    const vFov = camera.fov * Math.PI / 180
    const worldH = 2 * Math.tan(vFov / 2) * dist
    const pxToWorld = worldH / rect.height
    const camRight = new THREE.Vector3(), camUp = new THREE.Vector3()
    camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
    camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()
    return {
      x: camRight.x * dx * pxToWorld + camUp.x * (-dy) * pxToWorld,
      y: camRight.y * dx * pxToWorld + camUp.y * (-dy) * pxToWorld,
    }
  }, [])

  const buildScene = useCallback(() => {
    if (!mountRef.current || !contourPoints || contourPoints.length < 3) return
    const el = mountRef.current, w = el.clientWidth, h = el.clientHeight
    const prevCamera = cameraRef.current, prevControls = controlsRef.current
    const savedState = prevCamera ? { position: prevCamera.position.clone(), up: prevCamera.up.clone(), target: prevControls ? prevControls.target.clone() : new THREE.Vector3() } : null

    if (!rendererRef.current) {
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x0a0a0f, 1)
      renderer.localClippingEnabled = true
      el.appendChild(renderer.domElement)
      rendererRef.current = renderer
    }

    const scene = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000)
    cameraRef.current = camera
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dl1 = new THREE.DirectionalLight(0xffffff, 0.8); dl1.position.set(150, -150, 250); scene.add(dl1)
    const dl2 = new THREE.DirectionalLight(0x8888ff, 0.3); dl2.position.set(-100, 100, 100); scene.add(dl2)

    let group
    try { group = createInsertMesh(contourPoints, config || {}) }
    catch (err) {
      console.error('Mesh creation error:', err)
      group = new THREE.Group()
      group.add(new THREE.Mesh(new THREE.BoxGeometry(50, 50, 10), new THREE.MeshPhongMaterial({ color: 0xe8650a, transparent: true, opacity: 0.5 })))
    }
    meshGroupRef.current = group
    scene.add(group)

    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    maxDimRef.current = maxDim
    centerRef.current.copy(center)

    // Grid on the tray top surface for tool alignment
    const gridSize = Math.ceil(maxDim * 1.5 / 10) * 10
    const gridDivisions = Math.round(gridSize / 10)
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0xE8650A33, 0x44445522)
    grid.rotation.x = Math.PI / 2  // rotate to XY plane (Z-up)
    grid.position.set(center.x, center.y, box.max.z + 0.2)
    grid.material.transparent = true
    grid.material.opacity = 0.3
    grid.material.depthWrite = false
    if (Array.isArray(grid.material)) {
      grid.material.forEach(m => { m.transparent = true; m.opacity = 0.3; m.depthWrite = false })
    }
    scene.add(grid)

    if (prevControls) prevControls.dispose()
    const controls = new OrbitControls(camera, rendererRef.current.domElement)
    controls.enableDamping = true; controls.dampingFactor = 0.12
    controls.rotateSpeed = 0.8; controls.panSpeed = 0.8; controls.zoomSpeed = 1.0
    controls.minDistance = 20; controls.maxDistance = 3000
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
    controlsRef.current = controls

    if (savedState) { camera.position.copy(savedState.position); camera.up.copy(savedState.up); controls.target.copy(savedState.target) }
    else { const d = maxDim * 2.5; camera.position.set(center.x, center.y, center.z + d); camera.up.set(0, 1, 0); controls.target.copy(center) }
    controls.update()

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const animate = () => { frameRef.current = requestAnimationFrame(animate); controls.update(); rendererRef.current.render(scene, camera) }
    animate()
  }, [contourPoints, config])

  useEffect(() => { buildScene(); return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); if (controlsRef.current) controlsRef.current.dispose() } }, [buildScene])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const dom = renderer.domElement
    const onDown = (e) => {
      if (e.button !== 0) return
      const hit = getToolAtMouse(e)
      if (!hit) return
      e.stopPropagation(); e.preventDefault()
      if (hit.notchIndex !== undefined) {
        dragRef.current = { notchIndex: hit.notchIndex, startX: e.clientX, startY: e.clientY, accumX: 0, accumY: 0 }
      } else {
        dragRef.current = { toolIndex: hit.toolIndex, startX: e.clientX, startY: e.clientY, accumX: 0, accumY: 0 }
      }
      if (controlsRef.current) controlsRef.current.enabled = false
      dom.style.cursor = 'grabbing'
    }
    const onMove = (e) => {
      if (!dragRef.current) { dom.style.cursor = getToolAtMouse(e) ? 'grab' : ''; return }
      const dx = e.clientX - dragRef.current.startX, dy = e.clientY - dragRef.current.startY
      dragRef.current.startX = e.clientX; dragRef.current.startY = e.clientY
      const wd = screenToWorldDelta(dx, dy)
      dragRef.current.accumX += wd.x; dragRef.current.accumY += wd.y
      if (Math.abs(dragRef.current.accumX) >= 1 || Math.abs(dragRef.current.accumY) >= 1) {
        const sx = Math.round(dragRef.current.accumX), sy = Math.round(dragRef.current.accumY)
        if (dragRef.current.notchIndex !== undefined) {
          if (onNotchDragRef.current) onNotchDragRef.current(dragRef.current.notchIndex, sx, sy)
        } else {
          if (onToolDragRef.current) onToolDragRef.current(dragRef.current.toolIndex, sx, sy)
        }
        dragRef.current.accumX -= sx; dragRef.current.accumY -= sy
      }
    }
    const onUp = () => { if (!dragRef.current) return; dragRef.current = null; if (controlsRef.current) controlsRef.current.enabled = true; dom.style.cursor = '' }
    dom.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { dom.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [getToolAtMouse, screenToWorldDelta])

  useEffect(() => {
    const handleResize = () => { if (!mountRef.current || !rendererRef.current || !cameraRef.current) return; const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight; rendererRef.current.setSize(w, h); cameraRef.current.aspect = w / h; cameraRef.current.updateProjectionMatrix() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const mode = config?.mode || 'object'
  const showLegend = mode === 'custom' || mode === 'gridfinity'
  const btnCls = "bg-[#131318]/90 border border-[#2A2A35] rounded-lg px-2.5 py-1.5 text-[11px] text-[#8888A0] hover:text-white hover:border-[#E8650A]/50 transition-all flex items-center gap-1.5 cursor-pointer"

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {showLegend && (
        <div className="absolute top-4 right-4 bg-[#131318]/90 border border-[#2A2A35] rounded-lg px-3 py-2 text-xs space-y-1.5">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: '#888899' }} /><span className="text-[#8888A0]">Tray</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background: '#E8650A' }} /><span className="text-[#8888A0]">Tool Cavity</span></div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
        <button onClick={() => setView('default')} className={btnCls}><RotateCcw size={11} /> Reset</button>
        <button onClick={() => setView('top')} className={btnCls}><Eye size={11} /> Top</button>
        <button onClick={() => setView('front')} className={btnCls}><Crosshair size={11} /> Front</button>
      </div>
      <div className="absolute bottom-4 right-4 bg-[#131318]/90 border border-[#2A2A35] rounded-lg px-3 py-2 text-xs text-[#8888A0]">
        Click orange to drag &middot; Drag to orbit &middot; Scroll to zoom
      </div>
    </div>
  )
}
