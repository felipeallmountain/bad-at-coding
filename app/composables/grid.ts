export type TGrid = {
  destroy: () => void
}

type TNode = {
  pos: number // Absolute position along the line (Y for vertical, X for horizontal)
  u: number // Current displacement (X offset for vertical, Y offset for horizontal)
  v: number // Velocity of displacement
}

type TLine = {
  relativeCoord: number
  isMajor: boolean
  baseCoord: number
  nodes: TNode[]
}

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
  }

  const handleMouseLeave = () => {
    mouseX = -1000
    mouseY = -1000
  }

  cuttingMat.addEventListener('mousemove', handleMouseMove)
  cuttingMat.addEventListener('mouseleave', handleMouseLeave)

  let animationFrameId: number

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

    const computed = getComputedStyle(canvas)
    const colorMajor =
      computed.getPropertyValue('--color-border-grid') ||
      'rgba(255, 255, 255, 0.1)'
    const colorMinor =
      computed.getPropertyValue('--color-border-mat') ||
      'rgba(255, 255, 255, 0.1)'

    // Update coordinates and nodes positions
    verticalLines.forEach((line) => {
      line.baseCoord = (line.relativeCoord / 100) * rect.width
      for (let i = 0; i <= segmentCount; i++) {
        line.nodes[i].pos = (i / segmentCount) * rect.height
      }
    })

    horizontalLines.forEach((line) => {
      line.baseCoord = (line.relativeCoord / 100) * rect.height
      for (let i = 0; i <= segmentCount; i++) {
        line.nodes[i].pos = (i / segmentCount) * rect.width
      }
    })

    const forceRadius = 80 // Pixel distance for cursor influence
    const baseForceStrength = 0.5

    // 1. Update Physics for Vertical Lines
    verticalLines.forEach((line) => {
      const forceStrength = line.isMajor
        ? baseForceStrength * 0.4
        : baseForceStrength
      const springTension = line.isMajor ? 0.25 : 0.12
      const neighborTension = line.isMajor ? 0.08 : 0.15
      const damping = line.isMajor ? 0.78 : 0.84

      for (let i = 0; i <= segmentCount; i++) {
        const node = line.nodes[i]

        // Keep ends anchored at top and bottom edges (0 displacement)
        if (i === 0 || i === segmentCount) {
          node.u = 0
          node.v = 0
          continue
        }

        let force = 0
        if (mouseX !== -1000) {
          const dx = line.baseCoord - mouseX
          const dy = node.pos - mouseY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < forceRadius) {
            const factor = 1 - dist / forceRadius
            const dir = dx / (dist || 1)
            // Magnetic force pushing lines away from the cursor
            force = factor * factor * dir * forceStrength * 10
          }
        }

        const prevU = line.nodes[i - 1].u
        const nextU = line.nodes[i + 1].u
        const springForce = -node.u * springTension
        const neighborForce = neighborTension * (prevU + nextU - 2 * node.u)

        const accel = springForce + neighborForce + force
        node.v = (node.v + accel) * damping
        node.u += node.v
      }
    })

    // 2. Update Physics for Horizontal Lines
    horizontalLines.forEach((line) => {
      const forceStrength = line.isMajor
        ? baseForceStrength * 0.4
        : baseForceStrength
      const springTension = line.isMajor ? 0.25 : 0.12
      const neighborTension = line.isMajor ? 0.08 : 0.15
      const damping = line.isMajor ? 0.78 : 0.84

      for (let i = 0; i <= segmentCount; i++) {
        const node = line.nodes[i]

        // Keep ends anchored at left and right edges
        if (i === 0 || i === segmentCount) {
          node.u = 0
          node.v = 0
          continue
        }

        let force = 0
        if (mouseY !== -1000) {
          const dy = line.baseCoord - mouseY
          const dx = node.pos - mouseX
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < forceRadius) {
            const factor = 1 - dist / forceRadius
            const dir = dy / (dist || 1)
            force = factor * factor * dir * forceStrength * 10
          }
        }

        const prevU = line.nodes[i - 1].u
        const nextU = line.nodes[i + 1].u
        const springForce = -node.u * springTension
        const neighborForce = neighborTension * (prevU + nextU - 2 * node.u)

        const accel = springForce + neighborForce + force
        node.v = (node.v + accel) * damping
        node.u += node.v
      }
    })

    // Helper to determine if a line has active vibrations (displacement > 0.05px)
    const isLineVibrating = (line: TLine) => {
      for (let i = 0; i <= segmentCount; i++) {
        if (Math.abs(line.nodes[i].u) > 0.05) return true
      }
      return false
    }

    // 3. Draw Minor Lines
    ctx.strokeStyle = colorMinor
    ctx.lineWidth = 1
    ctx.beginPath()

    verticalLines.forEach((line) => {
      if (line.isMajor) return
      if (!isLineVibrating(line)) {
        ctx.moveTo(line.baseCoord, 0)
        ctx.lineTo(line.baseCoord, rect.height)
      } else {
        ctx.moveTo(line.baseCoord + line.nodes[0].u, line.nodes[0].pos)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.baseCoord + line.nodes[i].u, line.nodes[i].pos)
        }
      }
    })

    horizontalLines.forEach((line) => {
      if (line.isMajor) return
      if (!isLineVibrating(line)) {
        ctx.moveTo(0, line.baseCoord)
        ctx.lineTo(rect.width, line.baseCoord)
      } else {
        ctx.moveTo(line.nodes[0].pos, line.baseCoord + line.nodes[0].u)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.nodes[i].pos, line.baseCoord + line.nodes[i].u)
        }
      }
    })
    ctx.stroke()

    // 4. Draw Major Lines
    ctx.strokeStyle = colorMajor
    ctx.lineWidth = 2
    ctx.beginPath()

    verticalLines.forEach((line) => {
      if (!line.isMajor) return
      if (!isLineVibrating(line)) {
        ctx.moveTo(line.baseCoord, 0)
        ctx.lineTo(line.baseCoord, rect.height)
      } else {
        ctx.moveTo(line.baseCoord + line.nodes[0].u, line.nodes[0].pos)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.baseCoord + line.nodes[i].u, line.nodes[i].pos)
        }
      }
    })

    horizontalLines.forEach((line) => {
      if (!line.isMajor) return
      if (!isLineVibrating(line)) {
        ctx.moveTo(0, line.baseCoord)
        ctx.lineTo(rect.width, line.baseCoord)
      } else {
        ctx.moveTo(line.nodes[0].pos, line.baseCoord + line.nodes[0].u)
        for (let i = 1; i <= segmentCount; i++) {
          ctx.lineTo(line.nodes[i].pos, line.baseCoord + line.nodes[i].u)
        }
      }
    })
    ctx.stroke()

    animationFrameId = requestAnimationFrame(tick)
  }

  animationFrameId = requestAnimationFrame(tick)

  const destroy = () => {
    cancelAnimationFrame(animationFrameId)
    cuttingMat.removeEventListener('mousemove', handleMouseMove)
    cuttingMat.removeEventListener('mouseleave', handleMouseLeave)
    cuttingMat.classList.remove('has-dynamic-grid')
    bgGrid.style.removeProperty('--grid-cols')
    bgGrid.style.removeProperty('--grid-rows')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return {
    destroy,
  }
}

function generateNormalizedTracks(
  count: number,
  min: number,
  max: number,
  targetSum: number
): number[] {
  const tracks = []
  let sum = 0
  for (let i = 0; i < count; i++) {
    const val = min + Math.random() * (max - min)
    tracks.push(val)
    sum += val
  }
  return tracks.map((t) => (t / sum) * targetSum)
}
