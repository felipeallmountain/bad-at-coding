export type TGrid = {
  destroy: () => void
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

  // Add class for dynamic grid
  cuttingMat.classList.add('has-dynamic-grid')

  const draw = () => {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Scale canvas buffer to match DPR
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    // Retrieve theme colors dynamically
    const computed = getComputedStyle(canvas)
    const colorMajor =
      computed.getPropertyValue('--color-border-grid') ||
      'rgba(255, 255, 255, 0.1)'
    const colorMinor =
      computed.getPropertyValue('--color-border-mat') ||
      'rgba(255, 255, 255, 0.1)'

    // Compute pixel positions for columns and rows
    const colPositions: number[] = [0]
    let currentX = 0
    cols.forEach((w) => {
      currentX += (w / 100) * rect.width
      colPositions.push(currentX)
    })

    const rowPositions: number[] = [0]
    let currentY = 0
    rows.forEach((h) => {
      currentY += (h / 100) * rect.height
      rowPositions.push(currentY)
    })

    // Draw minor grid lines (5x6 subdivisions in each cell)
    ctx.strokeStyle = colorMinor
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let r = 0; r < rowsCount; r++) {
      const yStart = rowPositions[r]
      const yEnd = rowPositions[r + 1]
      const cellH = yEnd - yStart

      for (let c = 0; c < colsCount; c++) {
        const xStart = colPositions[c]
        const xEnd = colPositions[c + 1]
        const cellW = xEnd - xStart

        // Draw 5 horizontal sub-divisions (6 cells)
        for (let i = 1; i < 6; i++) {
          const y = yStart + (i / 6) * cellH
          ctx.moveTo(xStart, y)
          ctx.lineTo(xEnd, y)
        }

        // Draw 4 vertical sub-divisions (5 cells)
        for (let j = 1; j < 5; j++) {
          const x = xStart + (j / 5) * cellW
          ctx.moveTo(x, yStart)
          ctx.lineTo(x, yEnd)
        }
      }
    }
    ctx.stroke()

    // Draw major grid lines (boundaries between cells)
    ctx.strokeStyle = colorMajor
    ctx.lineWidth = 2
    ctx.beginPath()

    // Vertical major lines
    colPositions.forEach((x) => {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
    })

    // Horizontal major lines
    rowPositions.forEach((y) => {
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
    })
    ctx.stroke()
  }

  // Draw initially
  draw()

  // Handle resizing
  window.addEventListener('resize', draw)

  const destroy = () => {
    window.removeEventListener('resize', draw)
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
