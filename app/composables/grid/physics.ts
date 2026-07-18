import { TLine } from './types.js'

export function updateLinePhysics(
  lines: TLine[],
  isVertical: boolean,
  cursorCoord: number,
  crossCursorCoord: number,
  segmentCount: number,
  forceRadius: number,
  baseForceStrength: number
) {
  const isMouseActive = cursorCoord !== -1000

  lines.forEach((line) => {
    const forceStrength = line.isMajor
      ? baseForceStrength * 0.4
      : baseForceStrength
    const springTension = line.isMajor ? 0.25 : 0.12
    const neighborTension = line.isMajor ? 0.08 : 0.15
    const damping = line.isMajor ? 0.78 : 0.84

    for (let i = 0; i <= segmentCount; i++) {
      const node = line.nodes[i]

      // Keep ends anchored at edges (0 displacement)
      if (i === 0 || i === segmentCount) {
        node.u = 0
        node.v = 0
        continue
      }

      let force = 0
      if (isMouseActive) {
        const dPrimary = line.baseCoord - cursorCoord
        const dSecondary = node.pos - crossCursorCoord
        const dist = Math.sqrt(dPrimary * dPrimary + dSecondary * dSecondary)

        if (dist < forceRadius) {
          const factor = 1 - dist / forceRadius
          const dir = dPrimary / (dist || 1)
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
}

export function recordDisplacementHistory(lines: TLine[], maxHistory: number) {
  lines.forEach((line) => {
    if (!line.history) {
      line.history = []
    }
    line.history.unshift(line.nodes.map((node) => node.u))
    if (line.history.length > maxHistory) {
      line.history.pop()
    }
  })
}
