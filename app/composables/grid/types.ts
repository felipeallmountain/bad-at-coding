export type TGrid = {
  destroy: () => void
}

export type TNode = {
  pos: number // Absolute position along the line (Y for vertical, X for horizontal)
  u: number // Current displacement (X offset for vertical, Y offset for horizontal)
  v: number // Velocity of displacement
}

export type TLine = {
  relativeCoord: number
  isMajor: boolean
  baseCoord: number
  nodes: TNode[]
  history?: number[][] // history of displacements: number[frameCount][nodeIndex]
}
