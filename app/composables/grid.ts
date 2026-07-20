import Tempus from 'tempus'
import type { TGrid, TNode, TLine } from './grid/types.js'
import { generateNormalizedTracks } from './grid/utils.js'
import { updateLinePhysics, recordDisplacementHistory } from './grid/physics.js'
import { hasActiveTrails, drawTrailsForLine } from './grid/renderer.js'

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
    return { destroy: () => {} }
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { destroy: () => {} }
  }

  const colsCount = 20
  const rowsCount = 10
  const segmentCount = 15 // Number of simulation points per string line

  const RED_DELAY = 2
  const GREEN_DELAY = 5
  const BLUE_DELAY = 8
  const MAX_HISTORY = 9

  let ticksSinceLastMouseMove = 100
  let clickAmplitude = 0

  // Generate normalized random column and row tracks
  const cols = generateNormalizedTracks(colsCount, 2.5, 7.5, 100)
  const rows = generateNormalizedTracks(rowsCount, 6.0, 14.0, 100)

  // Apply to grid style custom properties
  bgGrid.style.setProperty(
    '--grid-cols',
    cols.map((c) => `${c.toFixed(4)}%`).join(' ')
  )
  bgGrid.style.setProperty(
    '--grid-rows',
    rows.map((r) => `${r.toFixed(4)}%`).join(' ')
  )

  // Enable dynamic grid class
  cuttingMat.classList.add('has-dynamic-grid')

  const createLineNodes = (): TNode[] => {
    const nodes: TNode[] = []
    for (let i = 0; i <= segmentCount; i++) {
      nodes.push({ pos: 0, u: 0, v: 0 })
    }
    return nodes
  }

  // Generate all vertical lines (101 total)
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

  // Generate all horizontal lines (61 total)
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

  // Mouse tracking
  let mouseX = -1000
  let mouseY = -1000

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
    ticksSinceLastMouseMove = 0
  }

  const handleMouseLeave = () => {
    mouseX = -1000
    mouseY = -1000
  }

  const handleMouseDown = () => {
    clickAmplitude = 1.0
  }

  cuttingMat.addEventListener('mousemove', handleMouseMove)
  cuttingMat.addEventListener('mouseleave', handleMouseLeave)
  cuttingMat.addEventListener('mousedown', handleMouseDown)

  const tick = () => {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Sync canvas buffer size
    if (
      canvas.width !== rect.width * dpr ||
      canvas.height !== rect.height * dpr
    ) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    ctx.clearRect(0, 0, rect.width, rect.height)

    ticksSinceLastMouseMove++
    const easeFrames = 90
    const mouseMoveFactor = Math.max(
      0,
      1 - ticksSinceLastMouseMove / easeFrames
    )
    const glitchEase = mouseMoveFactor * mouseMoveFactor

    if (clickAmplitude > 0) {
      clickAmplitude -= 0.018
      if (clickAmplitude < 0) {
        clickAmplitude = 0
      }
    }

    const computed = getComputedStyle(canvas)
    const colorMajor =
      computed.getPropertyValue('--color-border-grid') ||
      'rgba(255, 255, 255, 0.1)'
    const colorMinor =
      computed.getPropertyValue('--color-border-mat') ||
      'rgba(255, 255, 255, 0.1)'

    const canvasRect = canvas.getBoundingClientRect()
    const matRect = cuttingMat.getBoundingClientRect()
    const startX = matRect.left - canvasRect.left
    const startY = matRect.top - canvasRect.top
    const gridWidth = matRect.width
    const gridHeight = matRect.height

    // Update coordinates and nodes positions
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

    const forceRadius = 80 // Pixel distance for cursor influence
    const baseForceStrength = 0.5

    // 1. Update Physics for Vertical Lines
    updateLinePhysics(
      verticalLines,
      true,
      mouseX,
      mouseY,
      segmentCount,
      forceRadius,
      baseForceStrength
    )

    // 2. Update Physics for Horizontal Lines
    updateLinePhysics(
      horizontalLines,
      false,
      mouseY,
      mouseX,
      segmentCount,
      forceRadius,
      baseForceStrength
    )

    // Record displacement history for all lines
    recordDisplacementHistory(verticalLines, MAX_HISTORY)
    recordDisplacementHistory(horizontalLines, MAX_HISTORY)

    const checkActiveTrails = (line: TLine) =>
      hasActiveTrails(line, segmentCount, glitchEase, clickAmplitude)

    // 3. Draw Minor Lines
    ctx.strokeStyle = colorMinor
    ctx.lineWidth = 1

    // Draw all minor normal lines (where hasActiveTrails is false) in a single path
    ctx.beginPath()
    verticalLines.forEach((line) => {
      if (line.isMajor) return
      if (checkActiveTrails(line)) return

      ctx.moveTo(line.baseCoord, 0)
      ctx.lineTo(line.baseCoord, rect.height)
    })

    horizontalLines.forEach((line) => {
      if (line.isMajor) return
      if (checkActiveTrails(line)) return

      ctx.moveTo(0, line.baseCoord)
      ctx.lineTo(rect.width, line.baseCoord)
    })
    ctx.stroke()

    // Draw active minor lines and their Red, Green, Blue trails
    let hasMinorTrails = false
    verticalLines.forEach((line) => {
      if (line.isMajor) return
      if (checkActiveTrails(line)) hasMinorTrails = true
    })
    horizontalLines.forEach((line) => {
      if (line.isMajor) return
      if (checkActiveTrails(line)) hasMinorTrails = true
    })

    if (hasMinorTrails) {
      // 3a. Draw the main active minor lines (drawn normally using source-over)
      ctx.beginPath()
      verticalLines.forEach((line) => {
        if (line.isMajor) return
        if (!checkActiveTrails(line)) return

        ctx.moveTo(line.baseCoord + line.nodes[0].u, line.nodes[0].pos)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.baseCoord + line.nodes[i].u, line.nodes[i].pos)
        }
      })

      horizontalLines.forEach((line) => {
        if (line.isMajor) return
        if (!checkActiveTrails(line)) return

        ctx.moveTo(line.nodes[0].pos, line.baseCoord + line.nodes[0].u)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.nodes[i].pos, line.baseCoord + line.nodes[i].u)
        }
      })
      ctx.stroke()

      // 3b. Draw the trails behind them using lighter blending
      const originalGCO = ctx.globalCompositeOperation
      ctx.globalCompositeOperation = 'lighter'

      verticalLines.forEach((line) => {
        if (line.isMajor) return
        if (!checkActiveTrails(line)) return
        drawTrailsForLine(
          ctx,
          line,
          true,
          0.7,
          segmentCount,
          glitchEase,
          clickAmplitude,
          RED_DELAY,
          GREEN_DELAY,
          BLUE_DELAY
        )
      })

      horizontalLines.forEach((line) => {
        if (line.isMajor) return
        if (!checkActiveTrails(line)) return
        drawTrailsForLine(
          ctx,
          line,
          false,
          0.7,
          segmentCount,
          glitchEase,
          clickAmplitude,
          RED_DELAY,
          GREEN_DELAY,
          BLUE_DELAY
        )
      })

      ctx.globalCompositeOperation = originalGCO
    }

    // 4. Draw Major Lines
    ctx.strokeStyle = colorMajor
    ctx.lineWidth = 2

    // Draw all major normal lines (where hasActiveTrails is false) in a single path
    ctx.beginPath()
    verticalLines.forEach((line) => {
      if (!line.isMajor) return
      if (checkActiveTrails(line)) return

      ctx.moveTo(line.baseCoord, 0)
      ctx.lineTo(line.baseCoord, rect.height)
    })

    horizontalLines.forEach((line) => {
      if (!line.isMajor) return
      if (checkActiveTrails(line)) return

      ctx.moveTo(0, line.baseCoord)
      ctx.lineTo(rect.width, line.baseCoord)
    })
    ctx.stroke()

    // Draw active major lines and their Red, Green, Blue trails
    let hasMajorTrails = false
    verticalLines.forEach((line) => {
      if (!line.isMajor) return
      if (checkActiveTrails(line)) hasMajorTrails = true
    })
    horizontalLines.forEach((line) => {
      if (!line.isMajor) return
      if (checkActiveTrails(line)) hasMajorTrails = true
    })

    if (hasMajorTrails) {
      // 4a. Draw the main active major lines (drawn normally using source-over)
      ctx.beginPath()
      verticalLines.forEach((line) => {
        if (!line.isMajor) return
        if (!checkActiveTrails(line)) return

        ctx.moveTo(line.baseCoord + line.nodes[0].u, line.nodes[0].pos)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.baseCoord + line.nodes[i].u, line.nodes[i].pos)
        }
      })

      horizontalLines.forEach((line) => {
        if (!line.isMajor) return
        if (!checkActiveTrails(line)) return

        ctx.moveTo(line.nodes[0].pos, line.baseCoord + line.nodes[0].u)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.nodes[i].pos, line.baseCoord + line.nodes[i].u)
        }
      })
      ctx.stroke()

      // 4b. Draw the trails behind them using lighter blending
      const originalGCO = ctx.globalCompositeOperation
      ctx.globalCompositeOperation = 'lighter'

      verticalLines.forEach((line) => {
        if (!line.isMajor) return
        if (!checkActiveTrails(line)) return
        drawTrailsForLine(
          ctx,
          line,
          true,
          0.8,
          segmentCount,
          glitchEase,
          clickAmplitude,
          RED_DELAY,
          GREEN_DELAY,
          BLUE_DELAY
        )
      })

      horizontalLines.forEach((line) => {
        if (!line.isMajor) return
        if (!checkActiveTrails(line)) return
        drawTrailsForLine(
          ctx,
          line,
          false,
          0.8,
          segmentCount,
          glitchEase,
          clickAmplitude,
          RED_DELAY,
          GREEN_DELAY,
          BLUE_DELAY
        )
      })

      ctx.globalCompositeOperation = originalGCO
    }
  }

  const unsubscribe = Tempus.add(tick)

  const destroy = () => {
    unsubscribe?.()
    cuttingMat.removeEventListener('mousemove', handleMouseMove)
    cuttingMat.removeEventListener('mouseleave', handleMouseLeave)
    cuttingMat.removeEventListener('mousedown', handleMouseDown)
    cuttingMat.classList.remove('has-dynamic-grid')
    bgGrid.style.removeProperty('--grid-cols')
    bgGrid.style.removeProperty('--grid-rows')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return {
    destroy,
  }
}
