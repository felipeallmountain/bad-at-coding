export type TGrid = {
  destroy: () => void
}

export const createGrid = (): TGrid => {
  const cuttingMat = document.querySelector(
    '.cutting-mat'
  ) as HTMLElement | null
  const bgGrid = document.querySelector('.bg-grid') as HTMLElement | null

  if (!cuttingMat || !bgGrid) {
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

  // Generate cells and position them explicitly to avoid grid auto-placement conflicts
  const container = bgGrid.querySelector('.container')
  const fragment = document.createDocumentFragment()

  for (let r = 1; r <= rowsCount; r++) {
    for (let c = 1; c <= colsCount; c++) {
      const cell = document.createElement('div')
      cell.className = 'grid-cell'
      cell.style.gridColumn = `${c}`
      cell.style.gridRow = `${r}`
      fragment.appendChild(cell)
    }
  }

  if (container) {
    bgGrid.insertBefore(fragment, container)
  } else {
    bgGrid.appendChild(fragment)
  }

  const destroy = () => {
    bgGrid.querySelectorAll('.grid-cell').forEach((cell) => cell.remove())
    cuttingMat.classList.remove('has-dynamic-grid')
    bgGrid.style.removeProperty('--grid-cols')
    bgGrid.style.removeProperty('--grid-rows')
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
