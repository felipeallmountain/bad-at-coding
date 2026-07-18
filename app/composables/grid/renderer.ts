import { TLine } from './types.js'

export function getLineVibration(line: TLine, segmentCount: number) {
  let maxU = 0
  for (let i = 0; i <= segmentCount; i++) {
    const u = Math.abs(line.nodes[i].u)
    if (u > maxU) maxU = u
  }
  return maxU
}

export function hasActiveTrails(
  line: TLine,
  segmentCount: number,
  glitchEase: number,
  clickAmplitude: number
) {
  if (glitchEase < 0.01 && clickAmplitude < 0.01) return false
  const vibration = getLineVibration(line, segmentCount)
  if (vibration > 0.05) return true
  if (line.history) {
    for (let f = 0; f < line.history.length; f++) {
      const frame = line.history[f]
      for (let i = 0; i <= segmentCount; i++) {
        if (Math.abs(frame[i]) > 0.05) return true
      }
    }
  }
  return false
}

export function getHistoricalDisplacement(
  line: TLine,
  delay: number
): number[] | null {
  if (!line.history || line.history.length === 0) return null
  const index = Math.min(delay, line.history.length - 1)
  return line.history[index]
}

export function drawTrailsForLine(
  ctx: CanvasRenderingContext2D,
  line: TLine,
  isVertical: boolean,
  opacityBase: number,
  segmentCount: number,
  glitchEase: number,
  clickAmplitude: number,
  redDelay: number,
  greenDelay: number,
  blueDelay: number
) {
  const vibration = getLineVibration(line, segmentCount)
  let intensity = Math.min(1.0, vibration / 6) * glitchEase

  if (vibration > 0.05) {
    intensity += clickAmplitude * 0.7
  }

  if (intensity < 0.01) return

  // Add a random static shiver effect during the click burst
  let clickJitter = 0
  if (clickAmplitude > 0.1 && vibration > 0.05) {
    clickJitter = (Math.random() - 0.5) * clickAmplitude * 6.0
  }

  const opacityFactor = 0.3 + 0.7 * Math.min(1.0, intensity)
  const spatialOffset = 5.0 * Math.min(1.0, intensity) + clickJitter

  // Red Trail
  const dispRed = getHistoricalDisplacement(line, redDelay)
  if (dispRed) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 0, 80, ${opacityBase * 0.85 * opacityFactor})`
    if (isVertical) {
      ctx.moveTo(line.baseCoord + dispRed[0] - spatialOffset, line.nodes[0].pos)
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(
          line.baseCoord + dispRed[i] - spatialOffset,
          line.nodes[i].pos
        )
      }
    } else {
      ctx.moveTo(line.nodes[0].pos, line.baseCoord + dispRed[0] - spatialOffset)
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(
          line.nodes[i].pos,
          line.baseCoord + dispRed[i] - spatialOffset
        )
      }
    }
    ctx.stroke()
  }

  // Green Trail
  const dispGreen = getHistoricalDisplacement(line, greenDelay)
  if (dispGreen) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(0, 255, 80, ${opacityBase * 0.65 * opacityFactor})`
    if (isVertical) {
      ctx.moveTo(line.baseCoord + dispGreen[0], line.nodes[0].pos)
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(line.baseCoord + dispGreen[i], line.nodes[i].pos)
      }
    } else {
      ctx.moveTo(line.nodes[0].pos, line.baseCoord + dispGreen[0])
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(line.nodes[i].pos, line.baseCoord + dispGreen[i])
      }
    }
    ctx.stroke()
  }

  // Blue Trail
  const dispBlue = getHistoricalDisplacement(line, blueDelay)
  if (dispBlue) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(0, 80, 255, ${opacityBase * 0.5 * opacityFactor})`
    if (isVertical) {
      ctx.moveTo(
        line.baseCoord + dispBlue[0] + spatialOffset,
        line.nodes[0].pos
      )
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(
          line.baseCoord + dispBlue[i] + spatialOffset,
          line.nodes[i].pos
        )
      }
    } else {
      ctx.moveTo(
        line.nodes[0].pos,
        line.baseCoord + dispBlue[0] + spatialOffset
      )
      for (let i = 1; i <= segmentCount; i++) {
        ctx.lineTo(
          line.nodes[i].pos,
          line.baseCoord + dispBlue[i] + spatialOffset
        )
      }
    }
    ctx.stroke()
  }
}
