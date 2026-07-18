export function generateNormalizedTracks(
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
