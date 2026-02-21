import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Upload, Download, ChevronLeft, Pencil, MousePointer, Eye,
  Info, ZoomIn, ZoomOut, Save, FolderOpen, X, Camera, Sun, Contrast, Crop
} from 'lucide-react'
import ThreePreview from '../components/ThreePreview'
import PaywallModal from '../components/PaywallModal'
import { useAuth } from '../components/AuthContext'
import { exportSTL } from '../lib/stlExporter'
import { exportSVG, exportDXF, export3MF, bundleAsZip } from '../lib/exportFormats'
import { hasCredits, useCredit, getCredits, initPurchases } from '../lib/purchases'
import { queryTable } from '../lib/supabase'
import { createProject, updateProject, getProject } from './Dashboard'

const STEPS = ['Upload', 'Trace', 'Configure', 'Preview & Export']

/* ── Tooltip ── */
function Tooltip({ text, position = 'below' }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const iconRef = useRef(null)

  const handleEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setPos({
        top: position === 'above' ? rect.top - 8 : rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 240),
      })
    }
    setShow(true)
  }

  return (
    <span className="inline-flex ml-1 cursor-help" ref={iconRef} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      <Info size={13} className="text-[#8888A0] hover:text-[#E8650A] transition-colors" />
      {show && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, transform: position === 'above' ? 'translateY(-100%)' : '' }}
          className="px-3 py-2 rounded-lg bg-[#2A2A35] border border-[#555] text-xs text-white w-56 shadow-2xl leading-relaxed pointer-events-none">
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}

/* ── Param Row ── */
function ParamRow({ label, tooltip, children, tooltipPos }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center text-sm text-[#C8C8D0] whitespace-nowrap">
        {label}
        {tooltip && <Tooltip text={tooltip} position={tooltipPos} />}
      </div>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════ */
export default function Editor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile, isAuthenticated, refreshProfile, loading } = useAuth()
  const canvasRef = useRef(null)
  const lastThumbnailRef = useRef(null)
  const imageRef = useRef(null)
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const imgOffsetRef = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(null)

  /* ── State ── */
  const [step, setStep] = useState(0)
  const [image, setImage] = useState(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [credits, setCredits] = useState(0)
  const [projectId, setProjectId] = useState(null)
  const [projectName, setProjectName] = useState('Untitled Project')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [exportFormats, setExportFormats] = useState({ stl: true, svg: false, dxf: false, '3mf': false })
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 })
  const [contours, setContours] = useState([])
  const [selectedContour, setSelectedContour] = useState(0)
  const [editMode, setEditMode] = useState('select')
  const [draggingPoint, setDraggingPoint] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  // Output mode
  const [outputMode, setOutputMode] = useState('custom')

  // Shared
  const [realWidth, setRealWidth] = useState(100)
  const [realHeight, setRealHeight] = useState(100)
  const [toolDepth, setToolDepth] = useState(25) // how deep the tool sits in the tray
  const [toolOffsetX, setToolOffsetX] = useState(0)
  const [toolOffsetY, setToolOffsetY] = useState(0)
  const [toolRotation, setToolRotation] = useState(0)
  const [depth, setDepth] = useState(25)
  const [objectEdgeRadius, setObjectEdgeRadius] = useState(0)
  const [tolerance, setTolerance] = useState(1.5)

  // Multi-tool support
  const [tools, setTools] = useState([]) // additional tools: [{name, contours, selectedContour, realWidth, realHeight, toolDepth, tolerance, toolOffsetX, toolOffsetY, toolRotation}]
  const [activeToolIdx, setActiveToolIdx] = useState(0) // 0 = primary tool, 1+ = additional tools

  // Custom tray
  const [trayWidth, setTrayWidth] = useState(200)
  const [trayHeight, setTrayHeight] = useState(150)
  const [trayDepth, setTrayDepth] = useState(35)
  const [wallThickness, setWallThickness] = useState(3)
  const [cornerRadius, setCornerRadius] = useState(2)
  const [floorThickness, setFloorThickness] = useState(2)
  const [edgeProfile, setEdgeProfile] = useState('straight')
  const [edgeSize, setEdgeSize] = useState(2)
  const [cavityBevel, setCavityBevel] = useState(0)
  const [fingerNotches, setFingerNotches] = useState([]) // array of { shape, radius, w, h, x, y }
  const [activeNotchIdx, setActiveNotchIdx] = useState(0)
  const [outerShapeType, setOuterShapeType] = useState('rectangle') // 'rectangle' | 'oval' | 'custom'
  const [outerShapePoints, setOuterShapePoints] = useState(null) // custom polygon points in mm
  const [editingOuter, setEditingOuter] = useState(false) // true when editing outer shape on canvas
  const [draggingOuterPoint, setDraggingOuterPoint] = useState(null)
  const [hoveredOuterPoint, setHoveredOuterPoint] = useState(null)

  // Gridfinity
  const [gridX, setGridX] = useState(2)
  const [gridY, setGridY] = useState(1)
  const [gridHeight, setGridHeight] = useState(21) // mm (was 3 units * 7mm)

  // Detection
  const [threshold, setThreshold] = useState(128)
  const [simplification, setSimplification] = useState(0.5)
  const [sensitivity, setSensitivity] = useState(6)
  const [showPreview, setShowPreview] = useState(false)
  const [showPhotoTips, setShowPhotoTips] = useState(false)
  const [minContourPct, setMinContourPct] = useState(0.05) // % of image area
  const [isCropping, setIsCropping] = useState(false)
  const [cropStart, setCropStart] = useState(null)
  const [cropRect, setCropRect] = useState(null)

  // OpenCV
  const [cvReady, setCvReady] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Initialize RevenueCat with user ID when available
  useEffect(() => { initPurchases(user?.id || null) }, [user])

  // Fetch credits (server-side if logged in)
  useEffect(() => {
    async function fetchCredits() {
      if (user?.id) {
        try {
          const { data, error } = await queryTable('profiles', 'credits', { id: user.id })
          if (!error && data && data[0]) { setCredits(data[0].credits); return }
        } catch (err) { console.error('[TTF] credits fetch failed:', err) }
      }
      const val = parseInt(localStorage.getItem('ttf_credits') || '0', 10)
      setCredits(isNaN(val) ? 0 : val)
    }
    fetchCredits()
  }, [user, profile])

  // Load project from URL param
  useEffect(() => {
    if (loading) return
    const pid = searchParams.get('project')
    if (pid && isAuthenticated && user?.id) loadProjectData(pid)
  }, [searchParams, isAuthenticated, loading])

  async function loadProjectData(pid) {
    try {
      const proj = await getProject(pid)
      if (!proj) return
      setProjectId(proj.id)
      setProjectName(proj.name)
      const cfg = proj.config
      if (cfg.outputMode) setOutputMode(cfg.outputMode)
      if (cfg.realWidth) setRealWidth(cfg.realWidth)
      if (cfg.realHeight) setRealHeight(cfg.realHeight)
      if (cfg.trayDepth) setTrayDepth(cfg.trayDepth)
      if (cfg.trayWidth) setTrayWidth(cfg.trayWidth)
      if (cfg.wallThickness) setWallThickness(cfg.wallThickness)
      if (cfg.floorThickness) setFloorThickness(cfg.floorThickness)
      if (cfg.toolDepth) setToolDepth(cfg.toolDepth)
      if (cfg.depth) setDepth(cfg.depth)
      if (cfg.objectEdgeRadius != null) setObjectEdgeRadius(cfg.objectEdgeRadius)
      if (cfg.tolerance) setTolerance(cfg.tolerance)
      if (cfg.contours) setContours(cfg.contours)
      if (cfg.selectedContour != null) setSelectedContour(cfg.selectedContour)
      if (cfg.cornerRadius != null) setCornerRadius(cfg.cornerRadius)
      if (cfg.cavityBevel != null) setCavityBevel(cfg.cavityBevel)
      if (cfg.toolRotation != null) setToolRotation(cfg.toolRotation)
      if (cfg.toolOffsetX != null) setToolOffsetX(cfg.toolOffsetX)
      if (cfg.toolOffsetY != null) setToolOffsetY(cfg.toolOffsetY)
      if (cfg.fingerNotches) setFingerNotches(cfg.fingerNotches)
      else if (cfg.fingerNotch) {
        // Backward compat: convert old single notch to array
        setFingerNotches([{ shape: cfg.fingerNotchShape || 'circle', radius: cfg.fingerNotchRadius || 12, w: cfg.fingerNotchW || 24, h: cfg.fingerNotchH || 16, x: cfg.fingerNotchX || 0, y: cfg.fingerNotchY || 0 }])
      }
      if (cfg.tools) setTools(cfg.tools)
      if (cfg.step != null) setStep(cfg.step)
      if (cfg.edgeProfile) setEdgeProfile(cfg.edgeProfile)
      if (cfg.edgeSize != null) setEdgeSize(cfg.edgeSize)
      if (cfg.outerShapeType) setOuterShapeType(cfg.outerShapeType)
      if (cfg.gridX) setGridX(cfg.gridX)
      if (cfg.gridY) setGridY(cfg.gridY)
      if (cfg.gridHeight) setGridHeight(cfg.gridHeight)
      else if (cfg.heightUnits) setGridHeight(cfg.heightUnits * 7)
      if (cfg.threshold) setThreshold(cfg.threshold)
      if (cfg.simplification) setSimplification(cfg.simplification)
      if (cfg.sensitivity) setSensitivity(cfg.sensitivity)
      if (cfg.minContourPct != null) setMinContourPct(cfg.minContourPct)
      // Restore image
      if (cfg.image) {
        setImage(cfg.image)
        if (cfg.imageSize) setImageSize(cfg.imageSize)
        const img = new Image()
        img.onload = () => {
          imageRef.current = img
          setZoom(0.4)
        }
        img.src = cfg.image
      }
    } catch (err) { console.error('Error loading project:', err) }
  }

  function buildProjectConfig() {
    return {
      outputMode, realWidth, realHeight, wallThickness, floorThickness,
      toolDepth, tolerance, contours, selectedContour, cornerRadius,
      cavityBevel, toolRotation, toolOffsetX, toolOffsetY,
      fingerNotches,
      tools, step: step, trayWidth, trayDepth, depth, objectEdgeRadius,
      edgeProfile, edgeSize, outerShapeType, gridX, gridY,
      gridHeight, threshold, simplification, sensitivity, minContourPct,
      image: image || null,
      imageSize: imageSize || null,
    }
  }

  function captureThumbnail() {
    try {
      const srcCanvas = canvasRef.current
      if (!srcCanvas || !srcCanvas.width || !srcCanvas.height) return lastThumbnailRef.current
      const maxW = 400, maxH = 300
      const scale = Math.min(maxW / srcCanvas.width, maxH / srcCanvas.height, 1)
      const w = Math.round(srcCanvas.width * scale)
      const h = Math.round(srcCanvas.height * scale)
      const tmp = document.createElement('canvas')
      tmp.width = w
      tmp.height = h
      const ctx = tmp.getContext('2d')
      ctx.fillStyle = '#0D0D12'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(srcCanvas, 0, 0, w, h)
      const dataUrl = tmp.toDataURL('image/jpeg', 0.7)
      lastThumbnailRef.current = dataUrl
      return dataUrl
    } catch (e) {
      console.warn('Thumbnail capture failed:', e)
      return lastThumbnailRef.current
    }
  }

  async function handleSaveProject() {
    if (!isAuthenticated || !user?.id) {
      console.warn('[Save] Not authenticated or no user ID', { isAuthenticated, userId: user?.id })
      navigate('/login')
      return
    }
    setSaving(true)
    setSaveMsg('')
    try {
      const cfg = buildProjectConfig()
      const thumbnail = captureThumbnail()
      console.log('[Save] Attempting save...', { projectId, userId: user.id, projectName })
      if (projectId) {
        const updates = { name: projectName, config: cfg }
        if (thumbnail) updates.thumbnail = thumbnail
        const result = await updateProject(projectId, updates)
        console.log('[Save] Update result:', result)
        setSaveMsg('Saved!')
      } else {
        let name = projectName
        if (name === 'Untitled Project') {
          const input = prompt('Project name:', name)
          if (!input) { setSaving(false); return }
          name = input
          setProjectName(name)
        }
        const proj = await createProject(user.id, name, cfg, thumbnail)
        console.log('[Save] Create result:', proj)
        setProjectId(proj.id)
        window.history.replaceState(null, '', `/editor?project=${proj.id}`)
        setSaveMsg('Saved!')
      }
      setTimeout(() => setSaveMsg(''), 4000)
    } catch (err) {
      console.error('[Save] Error:', err?.message || err, err)
      setSaveMsg(`Save failed: ${err?.message || 'Unknown error'}`)
      setTimeout(() => setSaveMsg(''), 8000)
    }
    setSaving(false)
  }

  // Export with disclaimer
  async function handleConfirmExport() {
    setShowDisclaimer(false)
    // Always use tool 0 as primary
    const tool0 = activeToolIdx === 0
      ? { contours, selectedContour, realWidth, realHeight }
      : tools[0]
    const pts = tool0?.contours?.[tool0?.selectedContour ?? 0]
    if (!pts || pts.length < 3) return
    const scaledPts = scaleToolPoints(pts, tool0.realWidth ?? realWidth, tool0.realHeight ?? realHeight)
    const config = buildConfig()

    // Ensure at least one format is selected
    const selectedFormats = Object.entries(exportFormats).filter(([, v]) => v).map(([k]) => k)
    if (selectedFormats.length === 0) return

    try {
      // Deduct credit first (server-side for logged-in, localStorage for guest)
      if (user?.id) {
        const spent = await useCredit(user.id, { outputMode })
        if (!spent) {
          setShowPaywall(true)
          return
        }
      } else {
        const spent = await useCredit(null, { outputMode })
        if (!spent) {
          navigate('/login')
          return
        }
        setCredits(prev => Math.max(0, prev - 1))
      }

      const timestamp = Date.now()
      const baseName = `tracetoforge-${outputMode}-${timestamp}`

      // Always generate STL buffer (needed for STL and 3MF)
      const stlBuffer = exportSTL(scaledPts, config)

      // If only one format selected, download directly
      if (selectedFormats.length === 1) {
        const fmt = selectedFormats[0]
        let blob, ext

        if (fmt === 'stl') {
          blob = new Blob([stlBuffer], { type: 'application/octet-stream' })
          ext = 'stl'
        } else if (fmt === 'svg') {
          const svgStr = exportSVG(scaledPts, config)
          blob = new Blob([svgStr], { type: 'image/svg+xml' })
          ext = 'svg'
        } else if (fmt === 'dxf') {
          const dxfStr = exportDXF(scaledPts, config)
          blob = new Blob([dxfStr], { type: 'application/dxf' })
          ext = 'dxf'
        } else if (fmt === '3mf') {
          blob = await export3MF(stlBuffer, scaledPts, config)
          ext = '3mf'
        }

        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.style.display = 'none'
          a.href = url
          a.download = `${baseName}.${ext}`
          document.body.appendChild(a)
          a.click()
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
        }
      } else {
        // Multiple formats: bundle as zip
        const files = {}

        if (exportFormats.stl) {
          files[`${baseName}.stl`] = stlBuffer
        }
        if (exportFormats.svg) {
          files[`${baseName}.svg`] = exportSVG(scaledPts, config)
        }
        if (exportFormats.dxf) {
          files[`${baseName}.dxf`] = exportDXF(scaledPts, config)
        }
        if (exportFormats['3mf']) {
          const threemfBlob = await export3MF(stlBuffer, scaledPts, config)
          files[`${baseName}.3mf`] = threemfBlob
        }

        const zipBlob = await bundleAsZip(files)
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `${baseName}.zip`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
      }

      // Update local credit display for logged-in users
      if (user?.id) {
        getCredits(user.id).then(c => setCredits(c))
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  useEffect(() => {
    if (window.cv && window.cv.Mat) { setCvReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.9.0/opencv.js'
    script.async = true
    script.onload = () => {
      const check = setInterval(() => {
        if (window.cv && window.cv.Mat) { setCvReady(true); clearInterval(check) }
      }, 100)
    }
    document.head.appendChild(script)
  }, [])

  /* ── Image Upload ── */
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        setImage(ev.target.result)
        setImageSize({ w: img.width, h: img.height })
        imageRef.current = img
        setStep(1)
        setZoom(0.4)
        setContours([])
        setShowPreview(false)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    handleImageUpload({ target: { files: [file] } })
  }, [handleImageUpload])

  /* ── Crop ── */
  const applyCrop = useCallback(() => {
    if (!cropRect || !imageRef.current) return
    const img = imageRef.current
    const { x, y, w, h } = cropRect
    if (w < 10 || h < 10) return
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = w
    tmpCanvas.height = h
    const ctx = tmpCanvas.getContext('2d')
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h)
    const dataUrl = tmpCanvas.toDataURL('image/png')
    const croppedImg = new Image()
    croppedImg.onload = () => {
      setImage(dataUrl)
      setImageSize({ w: croppedImg.width, h: croppedImg.height })
      imageRef.current = croppedImg
      setCropRect(null)
      setCropStart(null)
      setIsCropping(false)
      setContours([])
    }
    croppedImg.src = dataUrl
  }, [cropRect])

  /* ── Edge Detection ── */
  const runEdgeDetection = useCallback(() => {
    if (!cvReady || !imageRef.current) return
    setProcessing(true)
    setTimeout(() => {
      try {
        const cv = window.cv
        const img = imageRef.current

        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = img.width
        tmpCanvas.height = img.height
        const ctx = tmpCanvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const src = cv.imread(tmpCanvas)
        const gray = new cv.Mat()
        const binary = new cv.Mat()
        const edges = new cv.Mat()
        const contoursMat = new cv.MatVector()
        const hierarchy = new cv.Mat()

        // Grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

        // Adaptive blur based on sensitivity - less blur = more detail kept
        const blurSize = sensitivity <= 3 ? 3 : sensitivity <= 6 ? 5 : sensitivity <= 10 ? 7 : 9
        cv.GaussianBlur(gray, gray, new cv.Size(blurSize, blurSize), 0)

        // Multi-strategy detection based on sensitivity (1-14 scale, displayed as -5 to +8)
        // Center (6) = Canny with balanced thresholds - best general purpose
        // Lower (1-5) = tighter detection, ignores faint edges, cleaner outlines
        // Higher (7-14) = looser detection, picks up more detail and faint edges
        
        if (sensitivity <= 2) {
          // Otsu threshold - strictest, only works on high-contrast
          cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
          const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3))
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, k)
          k.delete()
        } else if (sensitivity <= 8) {
          // Canny edge detection - the workhorse (sens 3-8)
          // Map 3-8 to Canny low threshold: 100 down to 15
          const cannyLow = Math.round(100 - (sensitivity - 3) * 14)
          const cannyHigh = Math.round(cannyLow * 2.5)
          cv.Canny(gray, edges, cannyLow, cannyHigh)
          // Dilate more at higher sensitivity to close gaps
          const dilateSize = sensitivity <= 5 ? 3 : 5
          const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(dilateSize, dilateSize))
          cv.dilate(edges, binary, k)
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, k)
          k.delete()
        } else if (sensitivity <= 10) {
          // Adaptive threshold + Canny combo for low contrast (9-10)
          const blockSize = sensitivity === 9 ? 21 : 31
          const adaptC = sensitivity === 9 ? 5 : 3
          cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, blockSize, adaptC)
          cv.Canny(gray, edges, 15, 40)
          const k = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5))
          cv.dilate(edges, edges, k)
          cv.bitwise_or(binary, edges, binary)
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, k)
          const k2 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7))
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, k2)
          k.delete()
          k2.delete()
        } else {
          // Ultra-sensitive: aggressive adaptive threshold + heavy morphology (11-14)
          // For very low contrast tools (metallic on light backgrounds, etc.)
          const blockSize = Math.min(51, 21 + (sensitivity - 11) * 10) // 21, 31, 41, 51
          const adaptC = Math.max(1, 5 - (sensitivity - 11))           // 5, 4, 3, 2
          cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, blockSize | 1, adaptC)
          // Very loose Canny to catch any remaining edges
          cv.Canny(gray, edges, 8, 25)
          const dilateK = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7))
          cv.dilate(edges, edges, dilateK)
          cv.bitwise_or(binary, edges, binary)
          // Heavy morphological closing to merge fragmented regions
          const closeSize = 7 + (sensitivity - 11) * 2 // 7, 9, 11, 13
          const closeK = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(closeSize, closeSize))
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, closeK)
          // Second pass with even larger kernel to fill gaps
          const closeK2 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(closeSize + 4, closeSize + 4))
          cv.morphologyEx(binary, binary, cv.MORPH_CLOSE, closeK2)
          dilateK.delete()
          closeK.delete()
          closeK2.delete()
        }

        // Find contours
        cv.findContours(binary, contoursMat, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        const minArea = img.width * img.height * (minContourPct / 100)
        const detected = []
        for (let i = 0; i < contoursMat.size(); i++) {
          const contour = contoursMat.get(i)
          const area = cv.contourArea(contour)

          if (area < minArea) {
            contour.delete()
            continue
          }

          // Skip contours that span nearly the full image (border artifacts from crop)
          const br = cv.boundingRect(contour)
          if (br.width > img.width * 0.9 && br.height > img.height * 0.9) {
            contour.delete()
            continue
          }

          // Simplify contour - scale epsilon with simplification slider
          const epsilon = simplification * 0.002 * cv.arcLength(contour, true)
          const approx = new cv.Mat()
          cv.approxPolyDP(contour, approx, epsilon, true)

          const points = []
          for (let j = 0; j < approx.rows; j++) {
            points.push({
              x: approx.data32S[j * 2],
              y: approx.data32S[j * 2 + 1],
            })
          }

          if (points.length >= 3) detected.push(points)
          approx.delete()
          contour.delete()
        }

        // Sort largest first
        detected.sort((a, b) => {
          const areaOf = (pts) => Math.abs(pts.reduce((s, p, i) => {
            const n = pts[(i + 1) % pts.length]
            return s + (p.x * n.y - n.x * p.y)
          }, 0) / 2)
          return areaOf(b) - areaOf(a)
        })

        setContours(detected)
        setSelectedContour(0)
        setStep(2)
        setEditMode('edit')

        src.delete(); gray.delete(); binary.delete(); edges.delete()
        contoursMat.delete(); hierarchy.delete()
      } catch (err) {
        console.error('Edge detection error:', err)
      }
      setProcessing(false)
    }, 50)
  }, [cvReady, simplification, sensitivity, minContourPct])

  // Auto re-detect when settings change (after first detection)
  useEffect(() => {
    if (step < 2 || !cvReady || !imageRef.current) return
    const timer = setTimeout(() => {
      runEdgeDetection()
    }, 300)
    return () => clearTimeout(timer)
  }, [simplification, sensitivity, minContourPct])

  /* ── Canvas Drawing ── */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return
    const ctx = canvas.getContext('2d')
    const img = imageRef.current

    // Calculate canvas size: expand if outer shape extends beyond image
    let canvasW = img.naturalWidth || img.width
    let canvasH = img.naturalHeight || img.height
    let imgOffsetX = 0
    let imgOffsetY = 0

    if (editingOuter && outerShapePoints && outerShapePoints.length >= 3 && contours[selectedContour]) {
      const pts = contours[selectedContour]
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const pixelWidth = bounds.maxX - bounds.minX
      const mmToPixel = pixelWidth / realWidth
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2

      // Find the pixel extent of the outer shape
      let oMinX = Infinity, oMaxX = -Infinity, oMinY = Infinity, oMaxY = -Infinity
      outerShapePoints.forEach(p => {
        const px = cx + p.x * mmToPixel
        const py = cy - p.y * mmToPixel
        oMinX = Math.min(oMinX, px)
        oMaxX = Math.max(oMaxX, px)
        oMinY = Math.min(oMinY, py)
        oMaxY = Math.max(oMaxY, py)
      })

      // Add padding around outer shape
      const pad = 60
      const needLeft = Math.max(0, -(oMinX - pad))
      const needRight = Math.max(0, (oMaxX + pad) - img.width)
      const needTop = Math.max(0, -(oMinY - pad))
      const needBottom = Math.max(0, (oMaxY + pad) - img.height)

      imgOffsetX = needLeft
      imgOffsetY = needTop
      canvasW = img.width + needLeft + needRight
      canvasH = img.height + needTop + needBottom
    }

    imgOffsetRef.current = { x: imgOffsetX, y: imgOffsetY }

    canvas.width = canvasW
    canvas.height = canvasH
    setCanvasSize(prev => (prev.w === canvasW && prev.h === canvasH) ? prev : { w: canvasW, h: canvasH })

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Fill expanded area with dark background
    if (imgOffsetX > 0 || imgOffsetY > 0) {
      ctx.fillStyle = '#0D0D12'
      ctx.fillRect(0, 0, canvasW, canvasH)
    }

    ctx.drawImage(img, imgOffsetX, imgOffsetY)

    contours.forEach((pts, ci) => {
      if (pts.length < 2) return
      const isSel = ci === selectedContour

      // Draw tolerance zone for selected contour (green band around the outline)
      if (isSel && tolerance > 0 && realWidth > 0 && pts.length >= 3) {
        const bounds = pts.reduce(
          (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )
        const pixelWidth = bounds.maxX - bounds.minX
        if (pixelWidth > 0) {
          const mmToPixel = pixelWidth / realWidth
          const tolerancePx = tolerance * mmToPixel
          // Draw the contour with thick stroke representing the tolerance gap
          ctx.beginPath()
          ctx.moveTo(pts[0].x + imgOffsetX, pts[0].y + imgOffsetY)
          pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x + imgOffsetX, p.y + imgOffsetY) })
          ctx.closePath()
          ctx.strokeStyle = 'rgba(232, 101, 10, 0.15)'
          ctx.lineWidth = tolerancePx * 2
          ctx.stroke()
        }
      }

      // Main contour outline (on top of tolerance band)
      ctx.beginPath()
      ctx.moveTo(pts[0].x + imgOffsetX, pts[0].y + imgOffsetY)
      pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x + imgOffsetX, p.y + imgOffsetY) })
      ctx.closePath()
      ctx.strokeStyle = isSel ? '#E8650A' : '#FF853480'
      ctx.lineWidth = isSel ? 3 : 2
      ctx.stroke()

      if (isSel && editMode === 'edit' && !editingOuter) {
        ctx.fillStyle = 'rgba(232, 101, 10, 0.08)'
        ctx.fill()
        pts.forEach((p, pi) => {
          const hov = hoveredPoint === pi
          const drag = draggingPoint === pi
          ctx.beginPath()
          ctx.arc(p.x + imgOffsetX, p.y + imgOffsetY, drag ? 8 : hov ? 7 : 5, 0, Math.PI * 2)
          ctx.fillStyle = drag ? '#FF8534' : hov ? '#E8650A' : '#E8650Acc'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
        })
      }
    })

    // Draw outer shape overlay when editing
    if (editingOuter && outerShapePoints && outerShapePoints.length >= 3) {
      // Convert mm outer points to pixel space for overlay
      const pts = contours[selectedContour]
      if (pts && pts.length >= 3) {
        const bounds = pts.reduce(
          (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        )
        const pixelWidth = bounds.maxX - bounds.minX
        const scale = pixelWidth / realWidth
        const cx = (bounds.minX + bounds.maxX) / 2 + imgOffsetX
        const cy = (bounds.minY + bounds.maxY) / 2 + imgOffsetY

        // Draw outer shape
        ctx.beginPath()
        outerShapePoints.forEach((p, i) => {
          const px = cx + p.x * scale
          const py = cy - p.y * scale
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.closePath()
        ctx.strokeStyle = '#4488FF'
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(68, 136, 255, 0.05)'
        ctx.fill()

        // Draw edge measurements (mm distance between consecutive points)
        ctx.font = 'bold 13px "Space Grotesk", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const n = outerShapePoints.length
        for (let i = 0; i < n; i++) {
          const a = outerShapePoints[i]
          const b = outerShapePoints[(i + 1) % n]
          const ax = cx + a.x * scale, ay = cy - a.y * scale
          const bx = cx + b.x * scale, by = cy - b.y * scale
          const mx = (ax + bx) / 2, my = (ay + by) / 2
          const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
          const label = dist.toFixed(1) + 'mm'

          // Offset label away from center of shape
          const edgeDx = bx - ax, edgeDy = by - ay
          const normLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1
          // Normal pointing outward (away from shape center)
          let nx = -edgeDy / normLen, ny = edgeDx / normLen
          const toCenterX = cx - mx, toCenterY = cy - my
          if (nx * toCenterX + ny * toCenterY > 0) { nx = -nx; ny = -ny }
          const labelX = mx + nx * 18, labelY = my + ny * 18

          // Draw label background
          const tw = ctx.measureText(label).width + 8
          ctx.fillStyle = 'rgba(13, 13, 18, 0.85)'
          ctx.beginPath()
          ctx.roundRect(labelX - tw / 2, labelY - 10, tw, 20, 4)
          ctx.fill()

          ctx.fillStyle = '#4488FF'
          ctx.fillText(label, labelX, labelY)
        }

        // Draw outer shape edit points with coordinate labels
        outerShapePoints.forEach((p, pi) => {
          const px = cx + p.x * scale
          const py = cy - p.y * scale
          const hov = hoveredOuterPoint === pi
          const drag = draggingOuterPoint === pi
          ctx.beginPath()
          ctx.arc(px, py, drag ? 8 : hov ? 7 : 5, 0, Math.PI * 2)
          ctx.fillStyle = drag ? '#66AAFF' : hov ? '#4488FF' : '#4488FFcc'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()

          // Show mm coordinates on hover or drag
          if (hov || drag) {
            const coordLabel = `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
            ctx.font = 'bold 12px "Space Grotesk", system-ui, sans-serif'
            ctx.textAlign = 'center'
            const cw = ctx.measureText(coordLabel).width + 10
            ctx.fillStyle = 'rgba(13, 13, 18, 0.9)'
            ctx.beginPath()
            ctx.roundRect(px - cw / 2, py - 28, cw, 20, 4)
            ctx.fill()
            ctx.fillStyle = '#66AAFF'
            ctx.fillText(coordLabel, px, py - 18)
          }
        })
      }
    }

    // ─── Dimension measurement overlay ───
    if (step >= 2 && contours[selectedContour] && realWidth > 0 && realHeight > 0) {
      const pts = contours[selectedContour]
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const ox = imgOffsetX || 0
      const oy = imgOffsetY || 0

      ctx.save()

      // Width dimension line (bottom) - black dashed
      ctx.setLineDash([8, 5])
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      const wY = bounds.maxY + oy + 35
      ctx.beginPath()
      ctx.moveTo(bounds.minX + ox, wY)
      ctx.lineTo(bounds.maxX + ox, wY)
      ctx.stroke()
      // End ticks
      ctx.setLineDash([])
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(bounds.minX + ox, wY - 10)
      ctx.lineTo(bounds.minX + ox, wY + 10)
      ctx.moveTo(bounds.maxX + ox, wY - 10)
      ctx.lineTo(bounds.maxX + ox, wY + 10)
      ctx.stroke()

      // Width label - large orange pill with white text
      const wLabel = `${realWidth} mm`
      ctx.font = 'bold 48px "Space Grotesk", system-ui, sans-serif'
      ctx.textAlign = 'center'
      const wLabelX = (bounds.minX + bounds.maxX) / 2 + ox
      const wLW = ctx.measureText(wLabel).width + 40
      const wLH = 64
      ctx.fillStyle = '#E8650A'
      ctx.beginPath()
      ctx.roundRect(wLabelX - wLW / 2, wY + 12, wLW, wLH, 14)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(wLabel, wLabelX, wY + 53)

      // Height dimension line (right) - black dashed
      ctx.setLineDash([8, 5])
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      const hX = bounds.maxX + ox + 35
      ctx.beginPath()
      ctx.moveTo(hX, bounds.minY + oy)
      ctx.lineTo(hX, bounds.maxY + oy)
      ctx.stroke()
      // End ticks
      ctx.setLineDash([])
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(hX - 10, bounds.minY + oy)
      ctx.lineTo(hX + 10, bounds.minY + oy)
      ctx.moveTo(hX - 10, bounds.maxY + oy)
      ctx.lineTo(hX + 10, bounds.maxY + oy)
      ctx.stroke()

      // Height label - large orange pill with white text (rotated)
      const hLabel = `${realHeight} mm`
      ctx.font = 'bold 48px "Space Grotesk", system-ui, sans-serif'
      const hLabelY = (bounds.minY + bounds.maxY) / 2 + oy
      ctx.save()
      ctx.translate(hX + 30, hLabelY)
      ctx.rotate(-Math.PI / 2)
      const hLW = ctx.measureText(hLabel).width + 40
      const hLH = 64
      ctx.fillStyle = '#E8650A'
      ctx.beginPath()
      ctx.roundRect(-hLW / 2, -38, hLW, hLH, 14)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.fillText(hLabel, 0, 4)
      ctx.restore()

      ctx.restore()
    }

    // Draw crop overlay
    if (isCropping && cropRect) {
      const { x, y, w, h } = cropRect
      // Dim everything outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, canvas.width, y)
      ctx.fillRect(0, y, x, h)
      ctx.fillRect(x + w, y, canvas.width - x - w, h)
      ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h)
      // Crop border
      ctx.strokeStyle = '#E8650A'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
      // Corner handles
      const hs = 8
      ctx.fillStyle = '#E8650A'
      ;[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs)
      })
    }

    ctx.restore()
  }, [image, zoom, contours, selectedContour, editMode, hoveredPoint, draggingPoint, editingOuter, outerShapePoints, hoveredOuterPoint, draggingOuterPoint, realWidth, realHeight, tolerance, step, isCropping, cropRect])

  useEffect(() => { drawCanvas() }, [drawCanvas])

  /* ── Canvas Mouse Events ── */
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const off = imgOffsetRef.current
    return { x: (e.clientX - rect.left) * scaleX - off.x, y: (e.clientY - rect.top) * scaleY - off.y }
  }

  const getRawCanvasPoint = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) }
  }

  const findNearestPoint = (pos, maxDist = 15) => {
    const pts = contours[selectedContour]
    if (!pts) return -1
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scale = canvas.width / rect.width
    const thresh = maxDist * scale
    let nearest = -1, minDist = thresh
    pts.forEach((p, i) => {
      const d = Math.hypot(p.x - pos.x, p.y - pos.y)
      if (d < minDist) { minDist = d; nearest = i }
    })
    return nearest
  }

  const findNearestEdge = (pos) => {
    const pts = contours[selectedContour]
    if (!pts) return -1
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scale = canvas.width / rect.width
    const thresh = 20 * scale
    let nearest = -1, minDist = thresh
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]
      const dx = b.x - a.x, dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      let t = ((pos.x - a.x) * dx + (pos.y - a.y) * dy) / len2
      t = Math.max(0, Math.min(1, t))
      const px = a.x + t * dx, py = a.y + t * dy
      const d = Math.hypot(pos.x - px, pos.y - py)
      if (d < minDist) { minDist = d; nearest = i }
    }
    return nearest
  }

  const handleCanvasMouseDown = (e) => {
    if (isCropping) {
      const pos = getRawCanvasPoint(e)
      if (!pos) return
      setCropStart(pos)
      setCropRect(null)
      return
    }
    if (editMode !== 'edit') return
    const pos = getCanvasPoint(e)
    if (!pos) return

    if (editingOuter && outerShapePoints) {
      // Find nearest outer shape point
      const pts = contours[selectedContour]
      if (!pts) return
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const pixelWidth = bounds.maxX - bounds.minX
      const scale = pixelWidth / realWidth
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const canvasScale = canvas.width / rect.width
      const thresh = 15 * canvasScale

      let nearest = -1, minDist = thresh
      outerShapePoints.forEach((p, i) => {
        const px = cx + p.x * scale
        const py = cy - p.y * scale
        const d = Math.hypot(pos.x - px, pos.y - py)
        if (d < minDist) { minDist = d; nearest = i }
      })
      if (nearest >= 0) setDraggingOuterPoint(nearest)
      return
    }

    if (!contours[selectedContour]) return
    const pi = findNearestPoint(pos)
    if (pi >= 0) setDraggingPoint(pi)
  }

  const handleCanvasMouseMove = (e) => {
    if (isCropping && cropStart) {
      const pos = getRawCanvasPoint(e)
      if (!pos) return
      const x = Math.min(cropStart.x, pos.x)
      const y = Math.min(cropStart.y, pos.y)
      const w = Math.abs(pos.x - cropStart.x)
      const h = Math.abs(pos.y - cropStart.y)
      setCropRect({ x, y, w, h })
      drawCanvas()
      return
    }
    if (editMode !== 'edit') return
    const pos = getCanvasPoint(e)
    if (!pos) return

    if (editingOuter && outerShapePoints) {
      const pts = contours[selectedContour]
      if (!pts) return
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const pixelWidth = bounds.maxX - bounds.minX
      const scale = pixelWidth / realWidth
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2

      if (draggingOuterPoint !== null) {
        const mmX = (pos.x - cx) / scale
        const mmY = -(pos.y - cy) / scale
        setOuterShapePoints(prev => {
          const updated = [...prev]
          updated[draggingOuterPoint] = { x: Math.round(mmX * 10) / 10, y: Math.round(mmY * 10) / 10 }
          return updated
        })
        return
      }

      // Hover detection for outer points
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const canvasScale = canvas.width / rect.width
      const thresh = 15 * canvasScale
      let nearest = -1, minDist = thresh
      outerShapePoints.forEach((p, i) => {
        const px = cx + p.x * scale
        const py = cy - p.y * scale
        const d = Math.hypot(pos.x - px, pos.y - py)
        if (d < minDist) { minDist = d; nearest = i }
      })
      setHoveredOuterPoint(nearest >= 0 ? nearest : null)
      return
    }

    if (!contours[selectedContour]) return
    if (draggingPoint !== null) {
      setContours(prev => {
        const updated = [...prev]
        const pts = [...updated[selectedContour]]
        pts[draggingPoint] = { x: Math.round(pos.x), y: Math.round(pos.y) }
        updated[selectedContour] = pts
        return updated
      })
      return
    }
    const pi = findNearestPoint(pos)
    setHoveredPoint(pi >= 0 ? pi : null)
  }

  const handleCanvasMouseUp = () => {
    if (isCropping) {
      setCropStart(null)
      return
    }
    setDraggingPoint(null)
    setDraggingOuterPoint(null)
  }

  // Double click to add point on edge
  const handleCanvasDoubleClick = (e) => {
    if (editMode !== 'edit') return
    const pos = getCanvasPoint(e)
    if (!pos) return

    if (editingOuter && outerShapePoints) {
      // Add point on nearest outer edge
      const pts = contours[selectedContour]
      if (!pts) return
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const pixelWidth = bounds.maxX - bounds.minX
      const scale = pixelWidth / realWidth
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2

      const mmX = (pos.x - cx) / scale
      const mmY = -(pos.y - cy) / scale

      // Find nearest edge
      let nearest = -1, minDist = 30
      for (let i = 0; i < outerShapePoints.length; i++) {
        const a = outerShapePoints[i]
        const b = outerShapePoints[(i + 1) % outerShapePoints.length]
        const dx = b.x - a.x, dy = b.y - a.y
        const len2 = dx * dx + dy * dy
        if (len2 === 0) continue
        let t = ((mmX - a.x) * dx + (mmY - a.y) * dy) / len2
        t = Math.max(0, Math.min(1, t))
        const px = a.x + t * dx, py = a.y + t * dy
        const d = Math.hypot(mmX - px, mmY - py)
        if (d < minDist) { minDist = d; nearest = i }
      }
      if (nearest >= 0) {
        setOuterShapePoints(prev => {
          const updated = [...prev]
          updated.splice(nearest + 1, 0, { x: Math.round(mmX * 10) / 10, y: Math.round(mmY * 10) / 10 })
          return updated
        })
      }
      return
    }

    if (!contours[selectedContour]) return
    const edgeIdx = findNearestEdge(pos)
    if (edgeIdx >= 0) {
      setContours(prev => {
        const updated = [...prev]
        const pts = [...updated[selectedContour]]
        pts.splice(edgeIdx + 1, 0, { x: Math.round(pos.x), y: Math.round(pos.y) })
        updated[selectedContour] = pts
        return updated
      })
    }
  }

  // Right click to delete point
  const handleCanvasRightClick = (e) => {
    e.preventDefault()
    if (editMode !== 'edit') return
    const pos = getCanvasPoint(e)
    if (!pos) return

    if (editingOuter && outerShapePoints && outerShapePoints.length > 3) {
      const pts = contours[selectedContour]
      if (!pts) return
      const bounds = pts.reduce(
        (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      )
      const pixelWidth = bounds.maxX - bounds.minX
      const scale = pixelWidth / realWidth
      const cx = (bounds.minX + bounds.maxX) / 2
      const cy = (bounds.minY + bounds.maxY) / 2

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const canvasScale = canvas.width / rect.width
      const thresh = 15 * canvasScale

      let nearest = -1, minDist = thresh
      outerShapePoints.forEach((p, i) => {
        const px = cx + p.x * scale
        const py = cy - p.y * scale
        const d = Math.hypot(pos.x - px, pos.y - py)
        if (d < minDist) { minDist = d; nearest = i }
      })
      if (nearest >= 0) {
        setOuterShapePoints(prev => {
          const updated = [...prev]
          updated.splice(nearest, 1)
          return updated
        })
      }
      return
    }

    if (!contours[selectedContour]) return
    const pi = findNearestPoint(pos)
    if (pi >= 0 && contours[selectedContour].length > 3) {
      setContours(prev => {
        const updated = [...prev]
        const pts = [...updated[selectedContour]]
        pts.splice(pi, 1)
        updated[selectedContour] = pts
        return updated
      })
    }
  }

  // Ctrl+scroll = zoom, regular scroll = pan around zoomed image
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        setZoom(z => Math.max(0.2, Math.min(5, z + (e.deltaY > 0 ? -0.1 : 0.1))))
      }
      // Otherwise let it scroll naturally within the overflow container
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  })

  /* ── Config builder ── */
  const scaleToolPoints = (pts, w, h) => {
    const bounds = pts.reduce(
      (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    )
    const pw = bounds.maxX - bounds.minX, ph = bounds.maxY - bounds.minY
    if (pw === 0 || ph === 0) return pts
    return pts.map(p => ({ x: p.x * (w / pw), y: p.y * (h / ph) }))
  }

  // Save current top-level state into a tool object
  const saveCurrentToolState = useCallback(() => ({
    image, imageSize, imageEl: imageRef.current,
    contours, selectedContour,
    realWidth, realHeight, toolDepth, tolerance,
    toolOffsetX, toolOffsetY, toolRotation, cavityBevel,
    sensitivity, simplification, minContourPct,
    step: Math.max(step, 0),
  }), [image, imageSize, contours, selectedContour, realWidth, realHeight, toolDepth, tolerance, toolOffsetX, toolOffsetY, toolRotation, cavityBevel, sensitivity, simplification, minContourPct, step])

  // Restore a tool object into top-level state
  const restoreToolState = useCallback((t) => {
    setImage(t.image || null)
    setImageSize(t.imageSize || { w: 0, h: 0 })
    imageRef.current = t.imageEl || null
    setContours(t.contours || [])
    setSelectedContour(t.selectedContour || 0)
    setRealWidth(t.realWidth ?? 100)
    setRealHeight(t.realHeight ?? 100)
    setToolDepth(t.toolDepth ?? 25)
    setTolerance(t.tolerance ?? 1.5)
    setToolOffsetX(t.toolOffsetX ?? 0)
    setToolOffsetY(t.toolOffsetY ?? 0)
    setToolRotation(t.toolRotation ?? 0)
    setCavityBevel(t.cavityBevel ?? 0)
    setSensitivity(t.sensitivity ?? 6)
    setSimplification(t.simplification ?? 0.5)
    setMinContourPct(t.minContourPct ?? 0.05)
    setStep(t.step ?? 0)
  }, [])

  // Switch active tool - save current, restore target
  const switchTool = useCallback((targetIdx) => {
    if (targetIdx === activeToolIdx) return
    const currentState = saveCurrentToolState()
    // Save current tool state back into tools array
    setTools(prev => {
      const updated = [...prev]
      if (activeToolIdx >= 0 && activeToolIdx < prev.length) {
        updated[activeToolIdx] = { ...updated[activeToolIdx], ...currentState }
      }
      return updated
    })
    // Restore target tool state
    setTools(prev => {
      const targetTool = prev[targetIdx]
      if (targetTool) {
        // Use setTimeout to batch with setActiveToolIdx
        setTimeout(() => restoreToolState(targetTool), 0)
      }
      return prev
    })
    setActiveToolIdx(targetIdx)
  }, [activeToolIdx, saveCurrentToolState, restoreToolState])

  const addTool = () => {
    // If this is the first add, save primary tool as tools[0]
    if (tools.length === 0) {
      const primaryState = saveCurrentToolState()
      setTools([
        { ...primaryState, name: 'Tool 1' },
        {
          name: 'Tool 2',
          contours: [], selectedContour: 0,
          image: null, imageSize: { w: 0, h: 0 }, imageEl: null,
          realWidth: 100, realHeight: 100, toolDepth: 25, tolerance: 1.5,
          toolOffsetX: 0, toolOffsetY: 0, toolRotation: 0, cavityBevel: 0,
          sensitivity: 6, simplification: 0.5, minContourPct: 0.05, step: 0,
        }
      ])
    } else {
      setTools(prev => [...prev, {
        name: `Tool ${prev.length + 1}`,
        contours: [], selectedContour: 0,
        image: null, imageSize: { w: 0, h: 0 }, imageEl: null,
        realWidth: 100, realHeight: 100, toolDepth: 25, tolerance: 1.5,
        toolOffsetX: 0, toolOffsetY: 0, toolRotation: 0, cavityBevel: 0,
        sensitivity: 6, simplification: 0.5, minContourPct: 0.05, step: 0,
      }])
    }
  }

  const removeTool = (idx) => {
    if (activeToolIdx === idx) {
      // Switch to tool 1 first, then remove
      switchTool(0)
    }
    setTools(prev => prev.filter((_, i) => i !== idx))
    if (activeToolIdx > idx) setActiveToolIdx(activeToolIdx - 1)
  }

  const updateTool = (idx, key, val) => {
    setTools(prev => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t))
  }

  const addNotch = () => {
    if (fingerNotches.length >= 5) return
    setFingerNotches(prev => [...prev, { shape: 'circle', radius: 12, w: 24, h: 16, x: 0, y: 0, depth: 0 }])
    setActiveNotchIdx(fingerNotches.length)
  }
  const removeNotch = (idx) => {
    setFingerNotches(prev => prev.filter((_, i) => i !== idx))
    if (activeNotchIdx >= fingerNotches.length - 1) setActiveNotchIdx(Math.max(0, fingerNotches.length - 2))
  }
  const updateNotch = (idx, key, val) => {
    setFingerNotches(prev => prev.map((n, i) => i === idx ? { ...n, [key]: val } : n))
  }

  const buildConfig = () => {
    // Tool 0's values for the primary cavity
    const t0 = activeToolIdx === 0
      ? { toolDepth, tolerance, realWidth, toolOffsetX, toolOffsetY, toolRotation, cavityBevel }
      : (tools[0] || { toolDepth, tolerance, realWidth, toolOffsetX, toolOffsetY, toolRotation, cavityBevel })
    const base = { mode: outputMode, depth: outputMode === 'object' ? depth : t0.toolDepth, tolerance: t0.tolerance, realWidth: t0.realWidth, toolDepth: t0.toolDepth, toolOffsetX: t0.toolOffsetX, toolOffsetY: t0.toolOffsetY, toolRotation: t0.toolRotation, objectEdgeRadius }

    // Build additional tools array from all tools except tool 0
    const allTools = tools.map((t, i) => {
      if (i === activeToolIdx) {
        return { contours, selectedContour, realWidth, realHeight, toolDepth, tolerance, toolOffsetX, toolOffsetY, toolRotation, cavityBevel }
      }
      return t
    })
    const additionalTools = allTools.slice(1).filter(t => t.contours[t.selectedContour] && t.contours[t.selectedContour].length >= 3).map(t => ({
      points: scaleToolPoints(t.contours[t.selectedContour], t.realWidth, t.realHeight),
      toolDepth: t.toolDepth,
      tolerance: t.tolerance,
      toolOffsetX: t.toolOffsetX,
      toolOffsetY: t.toolOffsetY,
      toolRotation: t.toolRotation,
      cavityBevel: t.cavityBevel || 0,
    }))

    // If active tool is not tool 0, the primary contour in the 3D preview
    // should come from tools[0], and current active goes into additionalTools
    // Actually - the 3D preview uses `contourPoints` (top-level) as the primary cavity.
    // When we switch tools, top-level contours become the active tool's.
    // So we need to pass tools[0]'s contours as primary when tool 0 is not active.
    // For now, just pass all non-primary tools as additional.

    if (outputMode === 'custom') {
      let outerPts = null
      if (outerShapeType === 'custom' && outerShapePoints && outerShapePoints.length >= 3) {
        outerPts = outerShapePoints
      }
      return { ...base, trayWidth, trayHeight, trayDepth, wallThickness, cornerRadius, floorThickness, edgeProfile, edgeSize, cavityBevel, fingerNotches, outerShapeType, outerShapePoints: outerPts, additionalTools }
    }
    if (outputMode === 'gridfinity') {
      return { ...base, gridX, gridY, gridHeight, cavityBevel, fingerNotches, additionalTools }
    }
    return { ...base, additionalTools }
  }

  /* ── Computed tool height from aspect ratio ── */
  /* ── Scale points to mm ── */
  const scalePoints = (pts) => {
    const bounds = pts.reduce(
      (acc, p) => ({ minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x), minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y) }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    )
    const pixelWidth = bounds.maxX - bounds.minX
    const pixelHeight = bounds.maxY - bounds.minY
    if (pixelWidth === 0 || pixelHeight === 0) return pts
    const scaleX = realWidth / pixelWidth
    const scaleY = realHeight / pixelHeight
    return pts.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }))
  }

  /* ── Export ── */
  const handleExport = () => {
    // Check that tool 0 (primary) has valid contours
    const tool0 = activeToolIdx === 0
      ? { contours, selectedContour }
      : tools[0]
    const pts = tool0?.contours?.[tool0?.selectedContour ?? 0]
    if (!pts || pts.length < 3) return
    if (credits <= 0) {
      if (!isAuthenticated) { navigate('/login'); return }
      setShowPaywall(true)
      return
    }
    setShowDisclaimer(true)
  }

  /* ── Preview points ── */
  const getPreviewPoints = () => {
    // Always use tool 0 (primary tool) as the base cavity for 3D preview
    const tool0 = activeToolIdx === 0
      ? { contours, selectedContour, realWidth, realHeight }
      : tools[0]
    if (!tool0) return null
    const pts = tool0.contours?.[tool0.selectedContour ?? 0]
    if (!pts || pts.length < 3) return null
    const w = tool0.realWidth ?? realWidth, h = tool0.realHeight ?? realHeight
    return scaleToolPoints(pts, w, h)
  }

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A35]/50 bg-surface/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-[#8888A0] hover:text-white transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="w-px h-5 bg-[#2A2A35]" />
          <div className="flex items-center gap-2">
            <img src="/logo-nav.png" alt="TracetoForge" className="h-6 object-contain" />
          </div>
        </div>
        {/* Steps */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                ${i === step ? 'bg-brand/15 text-brand' : i < step ? 'text-[#8888A0]' : 'text-[#555566]'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${i === step ? 'bg-brand text-white' : i < step ? 'bg-[#2A2A35] text-[#8888A0]' : 'bg-[#1C1C24] text-[#555566]'}`}>
                  {i + 1}
                </span>
                <span className="hidden md:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-[#2A2A35]" />}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button onClick={handleSaveProject} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#2A2A35] hover:bg-[#3A3A45] text-[#C8C8D0] rounded-lg transition-colors">
                <Save size={13} /> {saving ? 'Saving...' : 'Save'}
              </button>
              {saveMsg && <span className={`text-xs ${saveMsg.includes('failed') ? 'text-red-400 font-bold' : 'text-green-400'}`}>{saveMsg}</span>}
              <button onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-[#8888A0] hover:text-white transition-colors">
                <FolderOpen size={13} /> Projects
              </button>
              <span className="text-xs text-[#8888A0]">{credits} credits</span>
              <button onClick={() => setShowPaywall(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand/20 hover:bg-brand/30 text-brand rounded-lg transition-colors">
                Buy Credits
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')}
                className="px-3 py-1.5 text-xs text-[#C8C8D0] hover:text-white border border-[#444] rounded-lg transition-colors">
                Sign In
              </button>
              <span className="text-xs text-[#8888A0]">{credits} credits</span>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-72 border-r border-[#2A2A35]/50 bg-surface/30 overflow-y-auto flex-shrink-0">
          <div className="p-4 pb-32 space-y-5">

            {/* Tool selector tabs - at top of sidebar */}
            {step >= 2 && outputMode !== 'object' && tools.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-2">Tools</h3>
                <div className="flex flex-wrap gap-1">
                  {tools.map((t, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <button onClick={() => switchTool(i)}
                        className={`text-[11px] px-2.5 py-1 ${i > 0 ? 'rounded-l-md' : 'rounded-md'} transition-colors ${activeToolIdx === i ? 'bg-brand text-white' : 'bg-[#1C1C24] text-[#8888A0] hover:text-white'}`}>
                        {t.name}
                      </button>
                      {i > 0 && (
                        <button onClick={() => removeTool(i)}
                          className="text-[11px] px-1.5 py-1 rounded-r-md bg-[#1C1C24] text-[#555] hover:text-red-400 hover:bg-red-900/20 transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {tools.length < 5 && (
                    <button onClick={addTool}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-[#1C1C24] text-brand hover:bg-brand/20 transition-colors font-bold">
                      + Add Tool
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Crop */}
            {step >= 1 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-3">Crop</h3>
                {!isCropping ? (
                  <button onClick={() => { setIsCropping(true); setCropRect(null) }}
                    className="w-full py-2 rounded-lg bg-[#2A2A35] hover:bg-[#3A3A45] text-[#C8C8D0] text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Crop size={14} /> Crop Image
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[#8888A0]">Drag on the image to select the area to keep.</p>
                    <div className="flex gap-2">
                      <button onClick={applyCrop} disabled={!cropRect || cropRect.w < 10 || cropRect.h < 10}
                        className="flex-1 py-2 rounded-lg bg-brand hover:bg-brand-light disabled:bg-[#2A2A35] disabled:text-[#555566] text-white text-sm font-medium transition-colors">
                        Apply Crop
                      </button>
                      <button onClick={() => { setIsCropping(false); setCropRect(null); setCropStart(null); drawCanvas() }}
                        className="px-3 py-2 rounded-lg bg-[#2A2A35] hover:bg-[#3A3A45] text-[#C8C8D0] text-sm font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Detection */}
            {step >= 1 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-3">Detection</h3>
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center text-sm text-[#C8C8D0] mb-1">Sensitivity <Tooltip text="Adjust edge detection sensitivity. Slide left for fewer edges, right for more." /></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSensitivity(s => Math.max(1, s - 1))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">-</button>
                        <input type="range" min="1" max="14" step="1" value={sensitivity} onChange={e => setSensitivity(+e.target.value)} className="flex-1 min-w-0" />
                        <button onClick={() => setSensitivity(s => Math.min(14, s + 1))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">+</button>
                        <span className="text-xs text-[#8888A0] w-7 text-right flex-shrink-0">{sensitivity < 6 ? `${sensitivity - 6}` : sensitivity > 6 ? `+${sensitivity - 6}` : '0'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-sm text-[#C8C8D0] mb-1">Simplify <Tooltip text="Adjust outline smoothing. Slide left for more detail, right for smoother." /></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSimplification(s => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">-</button>
                        <input type="range" min="0.5" max="8" step="0.5" value={simplification} onChange={e => setSimplification(+e.target.value)} className="flex-1 min-w-0" />
                        <button onClick={() => setSimplification(s => Math.min(8, Math.round((s + 0.5) * 10) / 10))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">+</button>
                        <span className="text-xs text-[#8888A0] w-7 text-right flex-shrink-0">{simplification < 0.5 ? `${simplification - 0.5}` : simplification > 0.5 ? `+${Math.round((simplification - 0.5) * 10) / 10}` : '0'}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center text-sm text-[#C8C8D0] mb-1">Min Size <Tooltip text="Filter out small detected shapes. Increase to ignore noise and tiny contours, decrease to keep fine details." /></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setMinContourPct(s => Math.max(0, Math.round((s - 0.05) * 100) / 100))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">-</button>
                        <input type="range" min="0" max="5" step="0.05" value={minContourPct} onChange={e => setMinContourPct(+e.target.value)} className="flex-1 min-w-0" />
                        <button onClick={() => setMinContourPct(s => Math.min(5, Math.round((s + 0.05) * 100) / 100))} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-[#1C1C24] hover:bg-[#2A2A35] text-[#8888A0] hover:text-white text-sm font-bold transition-colors">+</button>
                        <span className="text-xs text-[#8888A0] w-7 text-right flex-shrink-0">{minContourPct}%</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={runEdgeDetection} disabled={!cvReady || processing}
                    className="w-full py-2 rounded-lg bg-brand hover:bg-brand-light disabled:bg-[#2A2A35] disabled:text-[#555566] text-white text-sm font-medium transition-colors">
                    {processing ? 'Detecting...' : !cvReady ? 'Loading OpenCV...' : 'Detect Edges'}
                  </button>
                </div>
              </div>
            )}

            {/* Dimensions */}
            {step >= 2 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-1">Tool Dimensions</h3>
                <p className="text-[10px] text-[#666680] mb-3 italic">* Measure your tool and enter exact dimensions</p>


                {/* Tool dimensions for active tool */}
                <div className="space-y-3">
                  <div className="bg-[#1A1A22] rounded-lg p-3 space-y-3 border border-[#2A2A35]/50">
                    <ParamRow label="Width" tooltip="Real-world width of your tool in mm.">
                      <input type="number" value={realWidth}
                        onChange={e => setRealWidth(+e.target.value)}
                        className="w-[4.5rem] text-right" min="1" />
                      <span className="text-xs text-[#8888A0] w-7">mm</span>
                    </ParamRow>
                    <ParamRow label="Height" tooltip="Real-world height of your tool in mm.">
                      <input type="number" value={realHeight}
                        onChange={e => setRealHeight(+e.target.value)}
                        className="w-[4.5rem] text-right" min="1" />
                      <span className="text-xs text-[#8888A0] w-7">mm</span>
                    </ParamRow>
                    <ParamRow label="Depth" tooltip="How deep the tool sits in the tray (Z height of the cavity).">
                      <input type="number" value={toolDepth}
                        onChange={e => setToolDepth(+e.target.value)}
                        className="w-[4.5rem] text-right" min="1" />
                      <span className="text-xs text-[#8888A0] w-7">mm</span>
                    </ParamRow>
                  </div>
                  <ParamRow label="Tolerance" tooltip="Extra clearance around the tool cavity.">
                    <input type="number" value={tolerance}
                      onChange={e => setTolerance(+e.target.value)}
                      className="w-[4.5rem] text-right" min="0" step="0.25" />
                    <span className="text-xs text-[#8888A0] w-7">mm</span>
                  </ParamRow>
                  {outputMode !== 'object' && (
                    <>
                      <ParamRow label="Offset X" tooltip="Shift tool cavity left/right within the tray.">
                        <input type="number" value={toolOffsetX}
                          onChange={e => setToolOffsetX(+e.target.value)}
                          className="w-[4.5rem] text-right" step="1" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <ParamRow label="Offset Y" tooltip="Shift tool cavity forward/back within the tray.">
                        <input type="number" value={toolOffsetY}
                          onChange={e => setToolOffsetY(+e.target.value)}
                          className="w-[4.5rem] text-right" step="1" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <ParamRow label="Rotate" tooltip="Rotate tool cavity in degrees.">
                        <input type="number" value={toolRotation}
                          onChange={e => setToolRotation(+e.target.value)}
                          className="w-[4.5rem] text-right" step="0.5" />
                        <span className="text-xs text-[#8888A0] w-7">°</span>
                      </ParamRow>
                    </>
                  )}

                  {/* Object mode */}
                  {outputMode === 'object' && (
                    <>
                    <ParamRow label="Extrude" tooltip="Extrusion thickness for standalone 3D object.">
                      <input type="number" value={depth} onChange={e => setDepth(+e.target.value)} className="w-[4.5rem] text-right" min="1" />
                      <span className="text-xs text-[#8888A0] w-7">mm</span>
                    </ParamRow>
                    <ParamRow label="Edge R" tooltip="Rounded edge radius. 0 = sharp edges. Higher values create smoother, more rounded edges on the extruded object.">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setObjectEdgeRadius(Math.max(0, +(objectEdgeRadius - 0.5).toFixed(1)))}
                          className="w-6 h-6 rounded bg-[#2A2A35] hover:bg-[#3A3A45] text-white text-sm flex items-center justify-center"
                          disabled={objectEdgeRadius <= 0}
                        >-</button>
                        <input
                          type="range" min="0" max="5" step="0.5"
                          value={objectEdgeRadius}
                          onChange={e => setObjectEdgeRadius(+e.target.value)}
                          className="w-20 accent-brand"
                        />
                        <button
                          onClick={() => setObjectEdgeRadius(Math.min(5, +(objectEdgeRadius + 0.5).toFixed(1)))}
                          className="w-6 h-6 rounded bg-[#2A2A35] hover:bg-[#3A3A45] text-white text-sm flex items-center justify-center"
                          disabled={objectEdgeRadius >= 5}
                        >+</button>
                        <span className="text-xs text-[#8888A0] ml-1 w-12">{objectEdgeRadius} mm</span>
                      </div>
                    </ParamRow>
                    </>
                  )}

                  {/* ── Custom Tray ── */}
                  {outputMode === 'custom' && (
                    <>
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3">Custom Tray</h4>
                      </div>
                      <ParamRow label="Width" tooltip="Total tray width (left to right) in mm.">
                        <input type="number" value={trayWidth} onChange={e => setTrayWidth(+e.target.value)} className="w-[4.5rem] text-right" min="10" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <ParamRow label="Height" tooltip="Total tray height (front to back) in mm.">
                        <input type="number" value={trayHeight} onChange={e => setTrayHeight(+e.target.value)} className="w-[4.5rem] text-right" min="10" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <ParamRow label="Depth" tooltip="Total tray thickness (Z axis) in mm.">
                        <input type="number" value={trayDepth} onChange={e => setTrayDepth(+e.target.value)} className="w-[4.5rem] text-right" min="5" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <ParamRow label="Corner R" tooltip="Outer corner radius. 0 = sharp." tooltipPos="above">
                        <input type="number" value={cornerRadius} onChange={e => setCornerRadius(+e.target.value)} className="w-[4.5rem] text-right" min="0" step="0.5" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>

                      {/* Edge Profile */}
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3 flex items-center">
                          Edge Profile
                          <Tooltip text="Bottom edge treatment for the tray insert. Straight = sharp bottom edges, Chamfer = 45-degree cut on bottom edges, Fillet = rounded bottom edges. Helps the insert slide into drawers and bins." position="above" />
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-[#131318] rounded-lg p-1">
                        {['straight', 'chamfer', 'fillet'].map(key => (
                          <button key={key} onClick={() => setEdgeProfile(key)}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all capitalize
                              ${edgeProfile === key ? 'bg-[#2A2A35] text-white' : 'text-[#8888A0] hover:text-white'}`}>
                            {key}
                          </button>
                        ))}
                      </div>
                      {edgeProfile !== 'straight' && (
                        <ParamRow label={edgeProfile === 'chamfer' ? 'Chamfer' : 'Fillet R'} tooltip={edgeProfile === 'chamfer' ? 'Size of 45-degree cut on bottom edges.' : 'Radius of rounded bottom edges.'} tooltipPos="above">
                          <input type="number" value={edgeSize} onChange={e => setEdgeSize(+e.target.value)} className="w-[4.5rem] text-right" min="0.5" step="0.5" max="10" />
                          <span className="text-xs text-[#8888A0] w-7">mm</span>
                        </ParamRow>
                      )}


                      {/* Cavity Bevel */}
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3 flex items-center">
                          Cavity Bevel
                          <Tooltip text="Adds a chamfer around the top opening of the tool cavity. Makes it easier to drop tools into the insert. Set to 0 for no bevel." position="above" />
                        </h4>
                      </div>
                      <ParamRow label="Bevel" tooltip="Size of the 45-degree chamfer around the cavity opening. 0 = no bevel." tooltipPos="above">
                        <input type="number" value={cavityBevel} onChange={e => setCavityBevel(Math.max(0, +e.target.value))} className="w-[4.5rem] text-right" min="0" step="0.5" max="5" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3 flex items-center">
                          Finger Notches
                          <Tooltip text="Cutouts so you can grab tools out of the tray. Add up to 5. Drag them in 3D preview to reposition." position="above" />
                        </h4>
                      </div>
                      {/* Notch tabs */}
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        {fingerNotches.map((_, ni) => (
                          <button key={ni} onClick={() => setActiveNotchIdx(ni)}
                            className={`px-2 py-1 text-[10px] rounded-md transition-colors ${activeNotchIdx === ni ? 'bg-brand text-white' : 'bg-[#1C1C24] text-[#8888A0] hover:text-white'}`}>
                            {ni + 1}
                          </button>
                        ))}
                        {fingerNotches.length < 5 && (
                          <button onClick={addNotch} className="px-2.5 py-1.5 text-sm font-bold rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 transition-colors">+ Add</button>
                        )}
                      </div>
                      {fingerNotches.length > 0 && fingerNotches[activeNotchIdx] && (() => {
                        const n = fingerNotches[activeNotchIdx]; const ni = activeNotchIdx
                        return (
                        <>
                          <div className="grid grid-cols-3 gap-1 bg-[#131318] rounded-lg p-1 mb-2">
                            {['circle', 'square', 'rectangle'].map(key => (
                              <button key={key} onClick={() => updateNotch(ni, 'shape', key)}
                                className={`text-xs py-1.5 rounded-md capitalize transition-colors
                                  ${n.shape === key ? 'bg-brand text-white shadow-sm' : 'text-[#8888A0] hover:text-white'}`}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </button>
                            ))}
                          </div>
                          {n.shape === 'circle' && (
                            <ParamRow label="Radius" tooltip="Radius of the finger notch circle.">
                              <input type="number" value={n.radius} onChange={e => updateNotch(ni, 'radius', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                              <span className="text-xs text-[#8888A0] w-7">mm</span>
                            </ParamRow>
                          )}
                          {n.shape === 'square' && (
                            <ParamRow label="Size" tooltip="Side length of the square notch.">
                              <input type="number" value={n.w} onChange={e => { const v = Math.max(5, +e.target.value); updateNotch(ni, 'w', v); updateNotch(ni, 'h', v) }} className="w-[4.5rem] text-right" min="5" step="1" />
                              <span className="text-xs text-[#8888A0] w-7">mm</span>
                            </ParamRow>
                          )}
                          {n.shape === 'rectangle' && (
                            <>
                              <ParamRow label="Width" tooltip="Width of the rectangle notch.">
                                <input type="number" value={n.w} onChange={e => updateNotch(ni, 'w', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                                <span className="text-xs text-[#8888A0] w-7">mm</span>
                              </ParamRow>
                              <ParamRow label="Height" tooltip="Height of the rectangle notch.">
                                <input type="number" value={n.h} onChange={e => updateNotch(ni, 'h', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                                <span className="text-xs text-[#8888A0] w-7">mm</span>
                              </ParamRow>
                            </>
                          )}
                          <ParamRow label="Depth" tooltip="Independent depth for this finger cutout. 0 = same as tool cavity depth.">
                            <input type="number" value={n.depth || 0} onChange={e => updateNotch(ni, 'depth', Math.max(0, +e.target.value))} className="w-[4.5rem] text-right" min="0" step="1" />
                            <span className="text-xs text-[#8888A0] w-7">mm</span>
                          </ParamRow>
                          <button onClick={() => removeNotch(ni)} className="w-full text-xs text-red-400 hover:text-red-300 py-1 transition-colors">Remove Notch {ni + 1}</button>
                        </>
                        )
                      })()}

                      {/* Outer Shape */}
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3 flex items-center">
                          Outer Shape
                          <Tooltip text="Change the tray's outer perimeter. Rectangle and Oval use the Width/Height values. Custom lets you draw any polygon shape on the canvas." position="above" />
                        </h4>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-[#131318] rounded-lg p-1">
                        {['rectangle', 'oval', 'custom'].map(key => (
                          <button key={key} onClick={() => {
                            setOuterShapeType(key)
                            setEditingOuter(false)
                            if (key === 'custom' && (!outerShapePoints || outerShapePoints.length < 3)) {
                              // Initialize with a rectangle in mm
                              const hw = trayWidth / 2, hh = trayHeight / 2
                              setOuterShapePoints([
                                { x: -hw, y: -hh },
                                { x: hw, y: -hh },
                                { x: hw, y: hh },
                                { x: -hw, y: hh },
                              ])
                            }
                          }}
                            className={`py-1.5 text-xs font-medium rounded-md transition-all capitalize
                              ${outerShapeType === key ? 'bg-[#2A2A35] text-white' : 'text-[#8888A0] hover:text-white'}`}>
                            {key}
                          </button>
                        ))}
                      </div>
                      {outerShapeType === 'custom' && (
                        <button
                          onClick={() => { setEditingOuter(!editingOuter); setEditMode('edit') }}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors border
                            ${editingOuter
                              ? 'bg-[#4488FF]/15 border-[#4488FF]/40 text-[#4488FF]'
                              : 'bg-[#1C1C24] border-[#2A2A35] text-[#8888A0] hover:text-white'}`}>
                          <Pencil size={13} />
                          {editingOuter ? 'Editing Outer Shape (click to stop)' : 'Edit Outer Shape on Canvas'}
                        </button>
                      )}
                      {outerShapeType === 'custom' && outerShapePoints && (
                        <p className="text-[10px] text-[#8888A0] leading-relaxed">
                          {outerShapePoints.length} points. Blue outline on canvas. Drag to move, double-click edge to add, right-click to delete.
                        </p>
                      )}
                      {outerShapeType !== 'rectangle' && outerShapeType !== 'custom' && (
                        <p className="text-[10px] text-[#8888A0]">Uses Width/Height values above for oval dimensions.</p>
                      )}
                    </>
                  )}

                  {/* ── Gridfinity ── */}
                  {outputMode === 'gridfinity' && (
                    <>
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3">Gridfinity</h4>
                      </div>
                      <ParamRow label="Grid X" tooltip="Grid units wide (42mm each).">
                        <input type="number" value={gridX} onChange={e => setGridX(+e.target.value)} className="w-[4.5rem] text-right" min="1" max="16" />
                        <span className="text-xs text-[#8888A0] w-7">units</span>
                      </ParamRow>
                      <ParamRow label="Grid Y" tooltip="Grid units deep (42mm each).">
                        <input type="number" value={gridY} onChange={e => setGridY(+e.target.value)} className="w-[4.5rem] text-right" min="1" max="16" />
                        <span className="text-xs text-[#8888A0] w-7">units</span>
                      </ParamRow>
                      <ParamRow label="Height" tooltip="Wall height in mm (excludes the 4.75mm base)." tooltipPos="above">
                        <input type="number" value={gridHeight} onChange={e => setGridHeight(Math.max(7, +e.target.value))} className="w-[4.5rem] text-right" min="7" step="1" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>

                      {/* Cavity Bevel */}
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3">Cavity Bevel</h4>
                      </div>
                      <ParamRow label="Size" tooltip="Chamfer size on the top edge of the tool cavity.">
                        <input type="number" value={cavityBevel} onChange={e => setCavityBevel(Math.max(0, +e.target.value))} className="w-[4.5rem] text-right" min="0" step="0.5" max="5" />
                        <span className="text-xs text-[#8888A0] w-7">mm</span>
                      </ParamRow>

                      {/* Finger Notches */}
                      <div className="border-t border-[#2A2A35]/50 pt-3 mt-1">
                        <h4 className="text-[11px] font-semibold text-brand/80 uppercase tracking-wider mb-3 flex items-center">
                          Finger Notches
                          <Tooltip text="Cutouts so you can grab tools out of the bin. Add up to 5. Drag them in 3D preview to reposition." position="above" />
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        {fingerNotches.map((_, ni) => (
                          <button key={ni} onClick={() => setActiveNotchIdx(ni)}
                            className={`px-2 py-1 text-[10px] rounded-md transition-colors ${activeNotchIdx === ni ? 'bg-brand text-white' : 'bg-[#1C1C24] text-[#8888A0] hover:text-white'}`}>
                            {ni + 1}
                          </button>
                        ))}
                        {fingerNotches.length < 5 && (
                          <button onClick={addNotch} className="px-2.5 py-1.5 text-sm font-bold rounded-md bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/30 transition-colors">+ Add</button>
                        )}
                      </div>
                      {fingerNotches.length > 0 && fingerNotches[activeNotchIdx] && (() => {
                        const n = fingerNotches[activeNotchIdx]; const ni = activeNotchIdx
                        return (
                        <>
                          <div className="grid grid-cols-3 gap-1 bg-[#131318] rounded-lg p-1 mb-2">
                            {['circle', 'square', 'rectangle'].map(key => (
                              <button key={key} onClick={() => updateNotch(ni, 'shape', key)}
                                className={`text-xs py-1.5 rounded-md capitalize transition-colors
                                  ${n.shape === key ? 'bg-brand text-white shadow-sm' : 'text-[#8888A0] hover:text-white'}`}>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </button>
                            ))}
                          </div>
                          {n.shape === 'circle' && (
                            <ParamRow label="Radius" tooltip="Radius of the finger notch circle.">
                              <input type="number" value={n.radius} onChange={e => updateNotch(ni, 'radius', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                              <span className="text-xs text-[#8888A0] w-7">mm</span>
                            </ParamRow>
                          )}
                          {n.shape === 'square' && (
                            <ParamRow label="Size" tooltip="Side length of the square notch.">
                              <input type="number" value={n.w} onChange={e => { const v = Math.max(5, +e.target.value); updateNotch(ni, 'w', v); updateNotch(ni, 'h', v) }} className="w-[4.5rem] text-right" min="5" step="1" />
                              <span className="text-xs text-[#8888A0] w-7">mm</span>
                            </ParamRow>
                          )}
                          {n.shape === 'rectangle' && (
                            <>
                              <ParamRow label="Width" tooltip="Width of the rectangle notch.">
                                <input type="number" value={n.w} onChange={e => updateNotch(ni, 'w', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                                <span className="text-xs text-[#8888A0] w-7">mm</span>
                              </ParamRow>
                              <ParamRow label="Height" tooltip="Height of the rectangle notch.">
                                <input type="number" value={n.h} onChange={e => updateNotch(ni, 'h', Math.max(5, +e.target.value))} className="w-[4.5rem] text-right" min="5" step="1" />
                                <span className="text-xs text-[#8888A0] w-7">mm</span>
                              </ParamRow>
                            </>
                          )}
                          <ParamRow label="Depth" tooltip="Independent depth for this finger cutout. 0 = same as tool cavity depth.">
                            <input type="number" value={n.depth || 0} onChange={e => updateNotch(ni, 'depth', Math.max(0, +e.target.value))} className="w-[4.5rem] text-right" min="0" step="1" />
                            <span className="text-xs text-[#8888A0] w-7">mm</span>
                          </ParamRow>
                          <button onClick={() => removeNotch(ni)} className="w-full text-xs text-red-400 hover:text-red-300 py-1 transition-colors">Remove Notch {ni + 1}</button>
                        </>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contour list */}
            {contours.length > 1 && (
              <div>
                <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-2">Detected Shapes</h3>
                <div className="space-y-1">
                  {contours.map((c, i) => (
                    <button key={i} onClick={() => setSelectedContour(i)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors
                        ${i === selectedContour ? 'bg-brand/15 text-brand' : 'text-[#8888A0] hover:text-white hover:bg-[#1C1C24]'}`}>
                      Shape {i + 1} ({c.length} pts)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Output Mode */}
            <div>
              <h3 className="text-xs font-semibold text-[#8888A0] uppercase tracking-wider mb-2">Output Mode</h3>
                <div className="grid grid-cols-3 gap-1 bg-[#131318] rounded-lg p-1">
                  {[
                    { key: 'object', label: 'Object' },
                    { key: 'custom', label: 'Tray' },
                    { key: 'gridfinity', label: 'Gridfinity' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setOutputMode(key)}
                      className={`py-1.5 text-xs font-medium rounded-md transition-all
                        ${outputMode === key ? 'bg-brand text-white shadow-sm' : 'text-[#8888A0] hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
            </div>

            {/* Actions */}
            {step >= 2 && (
              <div className="space-y-2 pt-2 border-t border-[#2A2A35]/50">
                <button onClick={() => { captureThumbnail(); setShowPreview(true); setStep(3) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1C1C24] hover:bg-[#2A2A35] text-sm font-medium transition-colors border border-[#2A2A35]">
                  <Eye size={15} /> 3D Preview
                </button>
                <button onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand hover:bg-brand-light text-white text-sm font-medium transition-colors">
                  <Download size={15} /> Export {credits > 0 ? `(${credits} credits)` : ''}
                </button>
              </div>
            )}

            {/* Paywall Modal */}
            {showPaywall && ReactDOM.createPortal(
              <PaywallModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                onCreditsChanged={(c) => { setCredits(c); refreshProfile && refreshProfile() }}
                userId={user?.id}
              />,
              document.body
            )}

            {/* Disclaimer Modal */}
            {showDisclaimer && ReactDOM.createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl">
                  <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      ⚠️ Confirm Export
                    </h2>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <p className="text-zinc-300 text-sm leading-relaxed">Before exporting, please verify:</p>
                    <ul className="space-y-2 text-sm text-zinc-300">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">✓</span>
                        <span>Your <strong className="text-white">real-world dimensions</strong> (width, height, depth) are correct</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">✓</span>
                        <span>Your <strong className="text-white">tolerance</strong> is set appropriately for your tool fit</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">✓</span>
                        <span>The <strong className="text-white">3D preview</strong> looks correct</span>
                      </li>
                    </ul>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3">
                      <p className="text-zinc-300 text-xs font-medium mb-2">Export Formats</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'stl', label: 'STL', desc: '3D Print' },
                          { key: '3mf', label: '3MF', desc: '3D Print (modern)' },
                          { key: 'svg', label: 'SVG', desc: 'Laser / Vector' },
                          { key: 'dxf', label: 'DXF', desc: 'CAD / CNC' },
                        ].map(fmt => (
                          <label key={fmt.key} className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-xs ${exportFormats[fmt.key] ? 'bg-orange-600/20 border border-orange-500/40' : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600'}`}>
                            <input type="checkbox" checked={exportFormats[fmt.key]}
                              onChange={e => {
                                const next = { ...exportFormats, [fmt.key]: e.target.checked }
                                if (!Object.values(next).some(v => v)) return
                                setExportFormats(next)
                              }}
                              className="accent-orange-500 w-3.5 h-3.5" />
                            <span>
                              <span className="text-white font-medium">{fmt.label}</span>
                              <span className="text-zinc-500 ml-1">{fmt.desc}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      {Object.values(exportFormats).filter(v => v).length > 1 && (
                        <p className="text-zinc-500 text-xs mt-2">Multiple formats will download as a .zip file</p>
                      )}
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                      <p className="text-red-300 text-xs leading-relaxed">
                        <strong>This will use 1 export credit.</strong> Credits are non-refundable. Please double-check your settings before proceeding.
                      </p>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setShowDisclaimer(false)}
                        className="flex-1 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm font-medium transition-colors">
                        Go Back
                      </button>
                      <button onClick={handleConfirmExport}
                        className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors">
                        Confirm Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </aside>

        {/* ── Main Canvas / Preview ── */}
        <main className="flex-1 relative overflow-hidden bg-[#0D0D12]">

          {/* Upload */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8"
              onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
              <div className="w-24 h-24 rounded-2xl bg-[#131318] border-2 border-dashed border-[#2A2A35] flex items-center justify-center hover:border-brand/50 transition-colors cursor-pointer"
                onClick={() => setShowPhotoTips(true)}>
                <Upload className="text-[#8888A0]" size={32} />
              </div>
              <div className="text-center">
                <p className="text-[#C8C8D0] font-medium mb-1">Upload a photo of your tool</p>
                <p className="text-sm text-[#8888A0]">Drag and drop or click to browse</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

              {/* Photo Tips Popup */}
              {showPhotoTips && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPhotoTips(false)}>
                  <div className="bg-[#1A1A24] border border-[#2A2A35] rounded-2xl max-w-md w-full mx-4 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Camera className="text-brand" size={20} />
                        <h3 className="text-white font-semibold text-lg">Photo Tips</h3>
                      </div>
                      <button onClick={() => setShowPhotoTips(false)} className="text-[#8888A0] hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                    </div>

                    <p className="text-[#8888A0] text-sm mb-4">Better photos mean cleaner edge detection. A few quick tips:</p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Contrast className="text-brand" size={16} />
                        </div>
                        <div>
                          <p className="text-[#C8C8D0] text-sm font-medium">Use a contrasting background</p>
                          <p className="text-[#6666A0] text-xs">Dark tools on white paper. Metallic/silver tools on dark paper or a black surface.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sun className="text-brand" size={16} />
                        </div>
                        <div>
                          <p className="text-[#C8C8D0] text-sm font-medium">Even lighting, no harsh shadows</p>
                          <p className="text-[#6666A0] text-xs">Indirect or overhead light works best. Shadows confuse edge detection.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Camera className="text-brand" size={16} />
                        </div>
                        <div>
                          <p className="text-[#C8C8D0] text-sm font-medium">Shoot straight down</p>
                          <p className="text-[#6666A0] text-xs">Hold your camera directly above the tool. Angles distort the outline.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-brand text-xs font-bold">!</span>
                        </div>
                        <div>
                          <p className="text-[#C8C8D0] text-sm font-medium">Avoid textured surfaces</p>
                          <p className="text-[#6666A0] text-xs">No cloth, towels, or wood grain. Flat paper, cutting mats, or solid surfaces only.</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => { setShowPhotoTips(false); fileInputRef.current?.click(); }}
                      className="w-full py-3 bg-brand hover:bg-brand/90 text-white font-semibold rounded-xl transition-colors">
                      Got it, choose photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas view */}
          {step >= 1 && !showPreview && (
            <div className="relative h-full" ref={containerRef}>
              {/* Edit toolbar */}
              {step >= 2 && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-[#131318]/90 border border-[#2A2A35] rounded-lg p-1 backdrop-blur-sm">
                  <button onClick={() => setEditMode('select')} title="Select"
                    className={`p-2 rounded-md transition-colors ${editMode === 'select' ? 'bg-brand text-white' : 'text-[#8888A0] hover:text-white'}`}>
                    <MousePointer size={16} />
                  </button>
                  <button onClick={() => setEditMode('edit')} title="Edit points (drag to move, double-click edge to add, right-click to delete)"
                    className={`p-2 rounded-md transition-colors ${editMode === 'edit' ? 'bg-brand text-white' : 'text-[#8888A0] hover:text-white'}`}>
                    <Pencil size={16} />
                  </button>
                </div>
              )}

              {/* Edit help text */}
              {step >= 2 && editMode === 'edit' && (
                <div className="absolute top-4 left-28 z-10 bg-[#131318]/90 border border-[#2A2A35] rounded-lg px-3 py-2 text-xs text-[#8888A0] backdrop-blur-sm">
                  {editingOuter
                    ? <><span className="text-[#4488FF]">Editing outer shape</span> &middot; Drag to move &middot; Dbl-click to add &middot; Right-click to delete</>
                    : <>Drag point to move &middot; Double-click edge to add &middot; Right-click to delete</>
                  }
                </div>
              )}

              {/* Zoom controls - fixed position in viewport */}
              <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 bg-[#131318]/95 border border-[#2A2A35] rounded-lg p-1 shadow-lg">
                  <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-1.5 text-[#8888A0] hover:text-white rounded transition-colors">
                    <ZoomIn size={16} />
                  </button>
                  <span className="text-xs text-[#8888A0] w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 text-[#8888A0] hover:text-white rounded transition-colors">
                    <ZoomOut size={16} />
                  </button>
                  <div className="w-px h-4 bg-[#2A2A35] mx-0.5" />
                  <button onClick={() => setZoom(1)} className="px-2 py-1.5 text-[10px] text-[#8888A0] hover:text-white rounded transition-colors font-medium">
                    FIT
                  </button>
                </div>
                <span className="text-[10px] text-[#8888A0]/60 pr-1">Ctrl + scroll to zoom</span>
              </div>

              {/* Canvas */}
              <div className="h-full overflow-auto p-8 pt-96" ref={scrollRef}>
                <div style={{ minWidth: `${Math.max(100, canvasSize.w * zoom + 800 * zoom)}px`, minHeight: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingBottom: `${Math.max(400, 800 * zoom)}px` }}>
                  <canvas
                    ref={canvasRef}
                    className="max-w-none shadow-2xl rounded-lg"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top center',
                      cursor: isCropping ? 'crosshair' : editMode === 'edit'
                        ? draggingPoint !== null ? 'grabbing' : hoveredPoint !== null ? 'grab' : 'crosshair'
                        : 'default',
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onDoubleClick={handleCanvasDoubleClick}
                    onContextMenu={handleCanvasRightClick}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3D Preview */}
          {showPreview && (
            <div className="relative h-full">
              <button onClick={() => setShowPreview(false)}
                className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 bg-[#131318]/90 border border-[#2A2A35] rounded-lg text-sm text-[#8888A0] hover:text-white transition-colors backdrop-blur-sm">
                <ChevronLeft size={14} /> Back to Editor
              </button>
              <ThreePreview contourPoints={getPreviewPoints()} config={buildConfig()}
                onToolDrag={(meshToolIdx, dx, dy) => {
                  // meshToolIdx: -1 = primary cavity (tool 0), 0+ = additional tools (tool 1+)
                  const toolIdx = meshToolIdx === -1 ? 0 : meshToolIdx + 1
                  if (toolIdx === activeToolIdx) {
                    // Active tool - update top-level state directly
                    setToolOffsetX(x => Math.round(x + dx))
                    setToolOffsetY(y => Math.round(y + dy))
                  } else if (tools[toolIdx]) {
                    updateTool(toolIdx, 'toolOffsetX', Math.round((tools[toolIdx].toolOffsetX || 0) + dx))
                    updateTool(toolIdx, 'toolOffsetY', Math.round((tools[toolIdx].toolOffsetY || 0) + dy))
                  }
                }}
                onNotchDrag={(notchIdx, dx, dy) => {
                  if (fingerNotches[notchIdx]) {
                    updateNotch(notchIdx, 'x', Math.round((fingerNotches[notchIdx].x || 0) + dx))
                    updateNotch(notchIdx, 'y', Math.round((fingerNotches[notchIdx].y || 0) + dy))
                  }
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
