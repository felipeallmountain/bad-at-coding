import * as THREE from 'three'
import { GUI } from 'lil-gui'
import Tempus from 'tempus'
import gsap from 'gsap'
import type { TGrid, TNode, TLine } from './grid/types.js'
import { generateNormalizedTracks } from './grid/utils.js'
import {
  updateLinePhysics,
  recordDisplacementHistory,
  TPhysicsParams,
} from './grid/physics.js'

export type { TGrid } from './grid/types.js'

export const createGrid = (): TGrid => {
  const cuttingMat = document.querySelector(
    '.cutting-mat'
  ) as HTMLElement | null
  const bgGrid = document.querySelector('.bg-grid') as HTMLElement | null
  const canvas = document.querySelector(
    '.cutting-mat-canvas'
  ) as HTMLCanvasElement | null

  if (!cuttingMat || !bgGrid || !canvas) {
    return { destroy: () => { } }
  }

  // --- 1. CSS Track Sizing Setup (Kept for layout alignment) ---
  const colsCount = 20
  const rowsCount = 10
  const segmentCount = 15

  const cols = generateNormalizedTracks(colsCount, 2.5, 7.5, 100)
  const rows = generateNormalizedTracks(rowsCount, 6.0, 14.0, 100)

  bgGrid.style.setProperty(
    '--grid-cols',
    cols.map((c) => `${c.toFixed(4)}%`).join(' ')
  )
  bgGrid.style.setProperty(
    '--grid-rows',
    rows.map((r) => `${r.toFixed(4)}%`).join(' ')
  )
  cuttingMat.classList.add('has-dynamic-grid')

  // --- 2. Physics Simulation State & lil-gui setup ---
  const MAX_HISTORY = 12
  let clickAmplitude = 0

  // Helper to assign random pen stroke properties
  const setupPenStroke = (lines: TLine[]) => {
    lines.forEach((line) => {
      line.randomDelay = Math.random() * 0.55
      line.strokeSpeed = 0.25 + Math.random() * 0.35
      line.reversed = Math.random() < 0.5
    })
  }

  const drawState = { progress: 0 }

  const animateIn = () => {
    setupPenStroke(verticalLines)
    setupPenStroke(horizontalLines)
    drawState.progress = 0
    gsap.to(drawState, {
      progress: 1.0,
      duration: 1.2,
      ease: 'power1.inOut',
    })
  }

  const physicsParams: TPhysicsParams = {
    forceRadius: 150,
    baseForceStrength: 0.5,
    springTensionMajor: 0.25,
    springTensionMinor: 0.68,
    neighborTensionMajor: 0.08,
    neighborTensionMinor: 0.15,
    dampingMajor: 0.6,
    dampingMinor: 0.6,
    zDepthFactor: 100,
    zRadius: 185,
    cameraParallax: false,
    parallaxStrength: 40,
  }

  const gui = new GUI({ title: 'Grid 3D Physics' })

  const forceFolder = gui.addFolder('Force & Interaction')
  forceFolder.add(physicsParams, 'forceRadius', 10, 400, 1).name('Force Radius')
  forceFolder
    .add(physicsParams, 'baseForceStrength', 0.05, 3.0, 0.05)
    .name('Force Strength')

  const springFolder = gui.addFolder('Spring & Tension')
  springFolder
    .add(physicsParams, 'springTensionMajor', 0.01, 1.0, 0.01)
    .name('Spring (Major)')
  springFolder
    .add(physicsParams, 'springTensionMinor', 0.01, 1.0, 0.01)
    .name('Spring (Minor)')
  springFolder
    .add(physicsParams, 'neighborTensionMajor', 0.001, 0.5, 0.005)
    .name('Neighbor (Major)')
  springFolder
    .add(physicsParams, 'neighborTensionMinor', 0.001, 0.5, 0.005)
    .name('Neighbor (Minor)')
  springFolder
    .add(physicsParams, 'dampingMajor', 0.5, 0.99, 0.01)
    .name('Damping (Major)')
  springFolder
    .add(physicsParams, 'dampingMinor', 0.5, 0.99, 0.01)
    .name('Damping (Minor)')

  const depthFolder = gui.addFolder('3D Volume & Camera')
  depthFolder.add(physicsParams, 'zDepthFactor', 0, 200, 1).name('Z Depth')
  depthFolder.add(physicsParams, 'zRadius', 20, 400, 1).name('Z Radius')
  depthFolder.add(physicsParams, 'cameraParallax').name('Camera Parallax')
  depthFolder
    .add(physicsParams, 'parallaxStrength', 0, 150, 1)
    .name('Parallax Power')

  const createLineNodes = (): TNode[] => {
    const nodes: TNode[] = []
    for (let i = 0; i <= segmentCount; i++) {
      nodes.push({ pos: 0, u: 0, v: 0 })
    }
    return nodes
  }

  const verticalLines: TLine[] = []
  let currentRelX = 0
  cols.forEach((colW) => {
    verticalLines.push({
      relativeCoord: currentRelX,
      isMajor: true,
      baseCoord: 0,
      nodes: createLineNodes(),
    })
    for (let k = 1; k < 5; k++) {
      verticalLines.push({
        relativeCoord: currentRelX + (k / 5) * colW,
        isMajor: false,
        baseCoord: 0,
        nodes: createLineNodes(),
      })
    }
    currentRelX += colW
  })
  verticalLines.push({
    relativeCoord: 100,
    isMajor: true,
    baseCoord: 0,
    nodes: createLineNodes(),
  })

  const horizontalLines: TLine[] = []
  let currentRelY = 0
  rows.forEach((rowH) => {
    horizontalLines.push({
      relativeCoord: currentRelY,
      isMajor: true,
      baseCoord: 0,
      nodes: createLineNodes(),
    })
    for (let m = 1; m < 6; m++) {
      horizontalLines.push({
        relativeCoord: currentRelY + (m / 6) * rowH,
        isMajor: false,
        baseCoord: 0,
        nodes: createLineNodes(),
      })
    }
    currentRelY += rowH
  })
  horizontalLines.push({
    relativeCoord: 100,
    isMajor: true,
    baseCoord: 0,
    nodes: createLineNodes(),
  })

  setupPenStroke(verticalLines)
  setupPenStroke(horizontalLines)

  // Mouse coordinates (pixel-based)
  let mouseX = -1000
  let mouseY = -1000

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
  }

  const handleMouseLeave = () => {
    mouseX = -1000
    mouseY = -1000
  }

  const handleMouseDown = () => {
    clickAmplitude = 1.0
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseleave', handleMouseLeave)
  window.addEventListener('mousedown', handleMouseDown)

  // --- 3. Three.js Scene Setup ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  })
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 2000)
  scene.add(camera)

  // Setup camera distance to map coordinates exactly to pixel space at z=0
  const syncViewport = () => {
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const dpr = Math.min(window.devicePixelRatio, 2)

    renderer.setSize(width, height, false)
    renderer.setPixelRatio(dpr)
    camera.aspect = width / height

    // Distance calculation to map 1 3D unit = 1 pixel at z = 0
    const fovRad = (camera.fov * Math.PI) / 180
    const cameraDistance = height / (2 * Math.tan(fovRad / 2))
    camera.position.set(0, 0, cameraDistance)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }
  syncViewport()

  const createMaterial = (color: number, opacity: number) =>
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    })

  const computed = getComputedStyle(cuttingMat || canvas)

  const parseCSSColor = (
    colorStr: string
  ): { color: number; opacity: number } => {
    const trimmed = colorStr.trim()
    if (trimmed.startsWith('rgba')) {
      const match = trimmed.match(
        /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/
      )
      if (match) {
        const r = parseInt(match[1], 10)
        const g = parseInt(match[2], 10)
        const b = parseInt(match[3], 10)
        const a = parseFloat(match[4])
        const colorHex = (r << 16) + (g << 8) + b
        return { color: colorHex, opacity: a }
      }
    }
    if (trimmed.startsWith('#')) {
      if (trimmed.length === 9) {
        const r = parseInt(trimmed.substring(1, 3), 16)
        const g = parseInt(trimmed.substring(3, 5), 16)
        const b = parseInt(trimmed.substring(5, 7), 16)
        const a = parseInt(trimmed.substring(7, 9), 16) / 255
        const colorHex = (r << 16) + (g << 8) + b
        return { color: colorHex, opacity: a }
      }
      if (trimmed.length === 7) {
        const r = parseInt(trimmed.substring(1, 3), 16)
        const g = parseInt(trimmed.substring(3, 5), 16)
        const b = parseInt(trimmed.substring(5, 7), 16)
        const colorHex = (r << 16) + (g << 8) + b
        return { color: colorHex, opacity: 1.0 }
      }
      if (trimmed.length === 5) {
        const r = parseInt(
          trimmed.substring(1, 2) + trimmed.substring(1, 2),
          16
        )
        const g = parseInt(
          trimmed.substring(2, 3) + trimmed.substring(2, 3),
          16
        )
        const b = parseInt(
          trimmed.substring(3, 4) + trimmed.substring(3, 4),
          16
        )
        const a =
          parseInt(trimmed.substring(4, 5) + trimmed.substring(4, 5), 16) / 255
        const colorHex = (r << 16) + (g << 8) + b
        return { color: colorHex, opacity: a }
      }
    }
    return { color: 0xffffff, opacity: 0.15 }
  }

  const cssColorStr =
    computed.getPropertyValue('--color-border-grid') ||
    'rgba(255, 255, 255, 0.15)'
  const parsed = parseCSSColor(cssColorStr)
  const baseColor = parsed.color
  const baseMajorOpacity = parsed.opacity
  // Minor lines are 0.5px wide ($line-thin), so to simulate thinness compared to 2px ($line-focus)
  // we set its base opacity to be 25% of major opacity
  const baseMinorOpacity = baseMajorOpacity * 0.5

  const materials = {
    liveMajor: createMaterial(baseColor, baseMajorOpacity),
    liveMinor: createMaterial(baseColor, baseMinorOpacity),
    trailMajor: createMaterial(baseColor, baseMajorOpacity * 0.4),
    trailMinor: createMaterial(baseColor, baseMinorOpacity * 0.4),
  }

  // Count total segments
  let majorSegmentCount = 0
  let minorSegmentCount = 0
  verticalLines.forEach((l) => {
    if (l.isMajor)
      majorSegmentCount += segmentCount * 2 // Doubled for 2px thickness
    else minorSegmentCount += segmentCount
  })
  horizontalLines.forEach((l) => {
    if (l.isMajor)
      majorSegmentCount += segmentCount * 2 // Doubled for 2px thickness
    else minorSegmentCount += segmentCount
  })

  // Initialize geometries
  const createLineGeometry = (count: number) => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 2 * 3) // 2 vertices per segment, 3 coordinates (x,y,z)
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }

  // Geometries for Live and Delayed Trail
  const geometries = {
    liveMajor: createLineGeometry(majorSegmentCount),
    liveMinor: createLineGeometry(minorSegmentCount),
    trailMajor: createLineGeometry(majorSegmentCount),
    trailMinor: createLineGeometry(minorSegmentCount),
  }

  // Meshes
  const lineSystems = [
    new THREE.LineSegments(geometries.liveMajor, materials.liveMajor),
    new THREE.LineSegments(geometries.liveMinor, materials.liveMinor),
    new THREE.LineSegments(geometries.trailMajor, materials.trailMajor),
    new THREE.LineSegments(geometries.trailMinor, materials.trailMinor),
  ]
  lineSystems.forEach((sys) => scene.add(sys))

  // Helper to fill position buffers from a historical snapshot
  const updateGeometryBuffers = (
    majorGeom: THREE.BufferGeometry,
    minorGeom: THREE.BufferGeometry,
    width: number,
    height: number,
    startX: number,
    startY: number,
    gridWidth: number,
    gridHeight: number,
    getHistCoord: (line: TLine, nodeIndex: number) => number
  ) => {
    const posMajor = majorGeom.attributes.position.array as Float32Array
    const posMinor = minorGeom.attributes.position.array as Float32Array
    let idxMajor = 0
    let idxMinor = 0

    const halfW = width / 2
    const halfH = height / 2

    const mouseActive = mouseX !== -1000

    const computeZ = (x: number, y: number, disp: number): number => {
      let z = 0
      if (physicsParams.zDepthFactor > 0 && mouseActive) {
        const dx = x - mouseX
        const dy = y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const radius = physicsParams.zRadius
        if (dist < radius) {
          const norm = dist / radius
          const factor = Math.cos(norm * Math.PI * 0.5)
          const factorSq = factor * factor
          z -= factorSq * physicsParams.zDepthFactor
          if (clickAmplitude > 0) {
            const wave = Math.sin(dist * 0.08 - (1 - clickAmplitude) * 12)
            z +=
              wave *
              clickAmplitude *
              (physicsParams.zDepthFactor * 0.75) *
              factor
          }
        }
      }
      if (physicsParams.zDepthFactor > 0) {
        z += Math.sign(disp) * Math.min(Math.abs(disp) * 0.8, 30)
      }
      return z
    }

    const isDrawing = drawState.progress < 1.0

    // Fill vertical lines
    verticalLines.forEach((line) => {
      const isMajor = line.isMajor
      const posArr = isMajor ? posMajor : posMinor
      let idx = isMajor ? idxMajor : idxMinor

      const lineBaseX = line.baseCoord

      let lineProgress = 1.0
      if (isDrawing) {
        const delay = line.randomDelay ?? 0
        const speed = line.strokeSpeed ?? 0.4
        lineProgress = Math.max(
          0,
          Math.min(1, (drawState.progress - delay) / speed)
        )
      }

      const lineDrawLength = lineProgress * gridHeight
      const isReversed = line.reversed ?? false
      const minY = isReversed ? startY + gridHeight - lineDrawLength : startY
      const maxY = isReversed ? startY + gridHeight : startY + lineDrawLength

      for (let i = 0; i < segmentCount; i++) {
        const nodeA = line.nodes[i]
        const nodeB = line.nodes[i + 1]

        const dispA = getHistCoord(line, i)
        const dispB = getHistCoord(line, i + 1)

        const yA_orig = nodeA.pos
        const yB_orig = nodeB.pos

        if (isDrawing) {
          const segMin = Math.max(yA_orig, minY)
          const segMax = Math.min(yB_orig, maxY)

          if (segMin >= segMax) {
            const yZero = segMin
            const xZero = lineBaseX
            if (isMajor) {
              posArr[idx++] = xZero - 0.5 - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
              posArr[idx++] = xZero - 0.5 - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
              posArr[idx++] = xZero + 0.5 - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
              posArr[idx++] = xZero + 0.5 - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
            } else {
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
            }
            continue
          }

          const tA = (segMin - yA_orig) / (yB_orig - yA_orig || 1)
          const tB = (segMax - yA_orig) / (yB_orig - yA_orig || 1)

          const yA = yA_orig + tA * (yB_orig - yA_orig)
          const xA = lineBaseX + dispA + tA * (dispB - dispA)

          const yB = yA_orig + tB * (yB_orig - yA_orig)
          const xB = lineBaseX + dispA + tB * (dispB - dispA)

          const zA = computeZ(xA, yA, dispA)
          const zB = computeZ(xB, yB, dispB)

          if (isMajor) {
            posArr[idx++] = xA - 0.5 - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - 0.5 - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
            posArr[idx++] = xA + 0.5 - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB + 0.5 - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          } else {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          }
        } else {
          const xA = lineBaseX + dispA
          const yA = yA_orig
          const xB = lineBaseX + dispB
          const yB = yB_orig

          const zA = computeZ(xA, yA, dispA)
          const zB = computeZ(xB, yB, dispB)

          if (isMajor) {
            posArr[idx++] = xA - 0.5 - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - 0.5 - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
            posArr[idx++] = xA + 0.5 - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB + 0.5 - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          } else {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          }
        }
      }

      if (isMajor) idxMajor = idx
      else idxMinor = idx
    })

    // Fill horizontal lines
    horizontalLines.forEach((line) => {
      const isMajor = line.isMajor
      const posArr = isMajor ? posMajor : posMinor
      let idx = isMajor ? idxMajor : idxMinor

      const lineBaseY = line.baseCoord

      let lineProgress = 1.0
      if (isDrawing) {
        const delay = line.randomDelay ?? 0
        const speed = line.strokeSpeed ?? 0.4
        lineProgress = Math.max(
          0,
          Math.min(1, (drawState.progress - delay) / speed)
        )
      }

      const lineDrawLength = lineProgress * gridWidth
      const isReversed = line.reversed ?? false
      const minX = isReversed ? startX + gridWidth - lineDrawLength : startX
      const maxX = isReversed ? startX + gridWidth : startX + lineDrawLength

      for (let i = 0; i < segmentCount; i++) {
        const nodeA = line.nodes[i]
        const nodeB = line.nodes[i + 1]

        const dispA = getHistCoord(line, i)
        const dispB = getHistCoord(line, i + 1)

        const xA_orig = nodeA.pos
        const xB_orig = nodeB.pos

        if (isDrawing) {
          const segMin = Math.max(xA_orig, minX)
          const segMax = Math.min(xB_orig, maxX)

          if (segMin >= segMax) {
            const xZero = segMin
            const yZero = lineBaseY
            if (isMajor) {
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - (yZero - 0.5)
              posArr[idx++] = 0
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - (yZero - 0.5)
              posArr[idx++] = 0
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - (yZero + 0.5)
              posArr[idx++] = 0
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - (yZero + 0.5)
              posArr[idx++] = 0
            } else {
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
              posArr[idx++] = xZero - halfW
              posArr[idx++] = halfH - yZero
              posArr[idx++] = 0
            }
            continue
          }

          const tA = (segMin - xA_orig) / (xB_orig - xA_orig || 1)
          const tB = (segMax - xA_orig) / (xB_orig - xA_orig || 1)

          const xA = xA_orig + tA * (xB_orig - xA_orig)
          const yA = lineBaseY + dispA + tA * (dispB - dispA)

          const xB = xA_orig + tB * (xB_orig - xA_orig)
          const yB = lineBaseY + dispA + tB * (dispB - dispA)

          const zA = computeZ(xA, yA, dispA)
          const zB = computeZ(xB, yB, dispB)

          if (isMajor) {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - (yA - 0.5)
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - (yB - 0.5)
            posArr[idx++] = zB
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - (yA + 0.5)
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - (yB + 0.5)
            posArr[idx++] = zB
          } else {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          }
        } else {
          const xA = xA_orig
          const yA = lineBaseY + dispA
          const xB = xB_orig
          const yB = lineBaseY + dispB

          const zA = computeZ(xA, yA, dispA)
          const zB = computeZ(xB, yB, dispB)

          if (isMajor) {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - (yA - 0.5)
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - (yB - 0.5)
            posArr[idx++] = zB
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - (yA + 0.5)
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - (yB + 0.5)
            posArr[idx++] = zB
          } else {
            posArr[idx++] = xA - halfW
            posArr[idx++] = halfH - yA
            posArr[idx++] = zA
            posArr[idx++] = xB - halfW
            posArr[idx++] = halfH - yB
            posArr[idx++] = zB
          }
        }
      }

      if (isMajor) idxMajor = idx
      else idxMinor = idx
    })

    majorGeom.attributes.position.needsUpdate = true
    minorGeom.attributes.position.needsUpdate = true
  }

  const tick = () => {
    const canvasRect = canvas.getBoundingClientRect()
    const width = canvasRect.width
    const height = canvasRect.height

    const matRect = cuttingMat.getBoundingClientRect()
    const startX = matRect.left - canvasRect.left
    const startY = matRect.top - canvasRect.top
    const gridWidth = matRect.width
    const gridHeight = matRect.height

    // Sync buffer dimensions if needed
    if (
      canvas.width !== width * devicePixelRatio ||
      canvas.height !== height * devicePixelRatio
    ) {
      syncViewport()
    }

    if (clickAmplitude > 0) {
      clickAmplitude -= 0.018
      if (clickAmplitude < 0) clickAmplitude = 0
    }

    // Set base coords for physics with padding offset from cuttingMat
    verticalLines.forEach((line) => {
      line.baseCoord = startX + (line.relativeCoord / 100) * gridWidth
      for (let i = 0; i <= segmentCount; i++) {
        line.nodes[i].pos = startY + (i / segmentCount) * gridHeight
      }
    })

    horizontalLines.forEach((line) => {
      line.baseCoord = startY + (line.relativeCoord / 100) * gridHeight
      for (let i = 0; i <= segmentCount; i++) {
        line.nodes[i].pos = startX + (i / segmentCount) * gridWidth
      }
    })

    // Run physics updates using GUI parameters
    updateLinePhysics(
      verticalLines,
      true,
      mouseX,
      mouseY,
      segmentCount,
      physicsParams.forceRadius,
      physicsParams.baseForceStrength,
      physicsParams
    )
    updateLinePhysics(
      horizontalLines,
      false,
      mouseY,
      mouseX,
      segmentCount,
      physicsParams.forceRadius,
      physicsParams.baseForceStrength,
      physicsParams
    )
    recordDisplacementHistory(verticalLines, MAX_HISTORY)
    recordDisplacementHistory(horizontalLines, MAX_HISTORY)

    // Helper functions for position lookups with temporal delay
    const getGreenCoord = (line: TLine, nodeIndex: number) =>
      line.nodes[nodeIndex].u

    const getHistCoordWithFallback = (
      line: TLine,
      nodeIndex: number,
      delay: number
    ) => {
      if (!line.history || line.history.length === 0)
        return line.nodes[nodeIndex].u
      const idx = Math.min(delay, line.history.length - 1)
      return line.history[idx][nodeIndex]
    }

    // Update geometry position buffers
    updateGeometryBuffers(
      geometries.liveMajor,
      geometries.liveMinor,
      width,
      height,
      startX,
      startY,
      gridWidth,
      gridHeight,
      getGreenCoord
    )
    updateGeometryBuffers(
      geometries.trailMajor,
      geometries.trailMinor,
      width,
      height,
      startX,
      startY,
      gridWidth,
      gridHeight,
      (l, i) => getHistCoordWithFallback(l, i, 4)
    )

    // Optional 3D Camera Parallax
    if (physicsParams.cameraParallax) {
      const mouseActive = mouseX !== -1000
      const targetCamX = mouseActive
        ? ((mouseX - width / 2) / (width / 2)) * physicsParams.parallaxStrength
        : 0
      const targetCamY = mouseActive
        ? -((mouseY - height / 2) / (height / 2)) *
        physicsParams.parallaxStrength
        : 0

      camera.position.x += (targetCamX - camera.position.x) * 0.05
      camera.position.y += (targetCamY - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.x += (0 - camera.position.x) * 0.05
      camera.position.y += (0 - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)
    }

    // Render scene
    renderer.render(scene, camera)
  }

  const unsubscribe = Tempus.add(tick)

  const handleResize = () => {
    syncViewport()
  }
  window.addEventListener('resize', handleResize)

  const destroy = () => {
    unsubscribe?.()
    gui.destroy()
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseleave', handleMouseLeave)
    window.removeEventListener('mousedown', handleMouseDown)
    cuttingMat.classList.remove('has-dynamic-grid')
    bgGrid.style.removeProperty('--grid-cols')
    bgGrid.style.removeProperty('--grid-rows')

    // Dispose WebGL resources
    lineSystems.forEach((sys) => scene.remove(sys))
    Object.values(geometries).forEach((g) => g.dispose())
    Object.values(materials).forEach((m) => m.dispose())
    renderer.dispose()
  }

  return {
    animateIn,
    destroy,
  }
}
