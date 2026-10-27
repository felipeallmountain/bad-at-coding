import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DEFAULT_ASSETS_DIR = path.resolve(ROOT_DIR, 'public', 'assets')
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public')

// Aligned with styles/variables/_primitives.scss breakpoints + 1920w HD lightbox/retina
const DEFAULT_WIDTHS = [480, 768, 1280, 1920]
const DEFAULT_MAX_WIDTH = 2400
const DEFAULT_QUALITY = 82

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  '.avif',
])

const RESPONSIVE_VARIANT_REGEX = /-\d+w\.webp$/i

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

const parseArgs = (argv) => {
  const options = {
    targets: [],
    widths: DEFAULT_WIDTHS,
    maxWidth: DEFAULT_MAX_WIDTH,
    quality: DEFAULT_QUALITY,
    force: false,
    includeOg: true,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--force' || arg === '-f') {
      options.force = true
    } else if (arg === '--no-og') {
      options.includeOg = false
    } else if (arg.startsWith('--widths=')) {
      const parsed = arg
        .slice('--widths='.length)
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
      if (parsed.length > 0) options.widths = parsed
    } else if (arg === '--widths' && argv[i + 1]) {
      const parsed = argv[++i]
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
      if (parsed.length > 0) options.widths = parsed
    } else if (arg.startsWith('--quality=')) {
      const q = parseInt(arg.slice('--quality='.length), 10)
      if (Number.isFinite(q) && q >= 1 && q <= 100) options.quality = q
    } else if (arg === '--quality' && argv[i + 1]) {
      const q = parseInt(argv[++i], 10)
      if (Number.isFinite(q) && q >= 1 && q <= 100) options.quality = q
    } else if (arg.startsWith('--max-width=')) {
      const mw = parseInt(arg.slice('--max-width='.length), 10)
      if (Number.isFinite(mw) && mw > 0) options.maxWidth = mw
    } else if (arg.startsWith('--dir=')) {
      options.targets.push(arg.slice('--dir='.length))
    } else if (arg === '--dir' && argv[i + 1]) {
      options.targets.push(argv[++i])
    } else if (!arg.startsWith('-')) {
      options.targets.push(arg)
    }
  }

  return options
}

const printHelp = () => {
  console.log(`
Usage: npm run optimize:images -- [options] [paths...]

Optimizes images for responsive screen sizes and favors WebP format.
For each source image, generates:
  - <name>.webp           Full/master WebP image (capped at --max-width)
  - <name>-480w.webp      Mobile / xs screen variant (480px wide)
  - <name>-768w.webp      Tablet / md & gallery card variant (768px wide)
  - <name>-1280w.webp     Desktop / xl & 2x retina card variant (1280px wide)
  - <name>-1920w.webp     Full HD lightbox & 2x desktop variant (1920px wide)
  - Compresses the original .jpg/.png fallback in-place if savings are achieved.

Options:
  --dir <path>            Target directory or file (default: public/assets)
  --widths <w1,w2,...>    Comma-separated responsive widths (default: 480,768,1280,1920)
  --quality <1-100>       Base WebP/JPEG compression quality (default: 82)
  --max-width <px>        Max width for master image (default: 2400)
  --force, -f             Regenerate all WebP variants even if up to date
  --no-og                 Skip optimizing public/og-*.jpg social preview images
  --help, -h              Show this help message

Examples:
  npm run optimize:images
  npm run optimize:images -- public/assets/v-feed-06
  npm run optimize:images -- --force --quality=85
`)
}

const collectSourceImages = async (targetPath) => {
  const resolved = path.resolve(ROOT_DIR, targetPath)
  let stat
  try {
    stat = await fs.stat(resolved)
  } catch {
    console.warn(`[WARN] Target path not found: ${resolved}`)
    return []
  }

  if (stat.isFile()) {
    const ext = path.extname(resolved).toLowerCase()
    if (
      SUPPORTED_EXTENSIONS.has(ext) &&
      !RESPONSIVE_VARIANT_REGEX.test(resolved)
    ) {
      return [resolved]
    }
    return []
  }

  const results = []
  const entries = await fs.readdir(resolved, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(resolved, entry.name)
    if (entry.isDirectory()) {
      const nested = await collectSourceImages(fullPath)
      results.push(...nested)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue
      if (RESPONSIVE_VARIANT_REGEX.test(entry.name)) continue

      // If both <name>.jpg/.png and <name>.webp exist, treat the .jpg/.png as the primary source
      // so we don't process <name>.webp a second time in the same pass.
      if (ext === '.webp') {
        const base = fullPath.slice(0, -ext.length)
        const siblingCandidates = ['.jpg', '.jpeg', '.png', '.tiff', '.avif']
        let hasSibling = false
        for (const sibExt of siblingCandidates) {
          try {
            await fs.access(`${base}${sibExt}`)
            hasSibling = true
            break
          } catch {
            // no sibling with this extension
          }
        }
        if (hasSibling) continue
      }

      results.push(fullPath)
    }
  }

  return results.sort()
}

const isUpToDate = async (sourcePath, outputPaths) => {
  try {
    const srcStat = await fs.stat(sourcePath)
    for (const outPath of outputPaths) {
      const outStat = await fs.stat(outPath)
      if (outStat.mtimeMs < srcStat.mtimeMs) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

const optimizeAssetImage = async (filePath, options) => {
  const parsed = path.parse(filePath)
  const ext = parsed.ext.toLowerCase()
  const basePath = path.join(parsed.dir, parsed.name)
  const relPath = path.relative(ROOT_DIR, filePath)

  const masterWebpPath = `${basePath}.webp`
  const variantPaths = options.widths.map((w) => `${basePath}-${w}w.webp`)
  const allWebpOutputs = [masterWebpPath, ...variantPaths]

  if (!options.force && (await isUpToDate(filePath, allWebpOutputs))) {
    console.log(`[SKIP] ${relPath} (WebP variants up to date)`)
    return null
  }

  const originalStat = await fs.stat(filePath)
  const originalBytes = originalStat.size

  const inputBuffer = await fs.readFile(filePath)
  const image = sharp(inputBuffer).rotate()
  const metadata = await image.metadata()
  const srcWidth = metadata.width || options.maxWidth

  // 1. Generate master <name>.webp (capped at maxWidth, without enlargement)
  const masterWidth = Math.min(srcWidth, options.maxWidth)
  const masterWebpBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: masterWidth,
      withoutEnlargement: true,
    })
    .webp({
      quality: options.quality,
      effort: 6,
      smartSubsample: true,
    })
    .toBuffer()

  await fs.writeFile(masterWebpPath, masterWebpBuffer)

  // 2. Generate responsive screen-size WebP variants (<name>-480w.webp, etc.)
  const variantSizes = []
  for (const width of options.widths) {
    const variantPath = `${basePath}-${width}w.webp`
    const variantQuality =
      width <= 768
        ? Math.max(75, options.quality - 2)
        : width >= 1920
          ? Math.min(90, options.quality + 2)
          : options.quality

    const buf = await sharp(inputBuffer)
      .rotate()
      .resize({
        width,
        withoutEnlargement: true,
      })
      .webp({
        quality: variantQuality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer()

    await fs.writeFile(variantPath, buf)
    variantSizes.push({ width, bytes: buf.length })
  }

  // 3. Optimize original fallback (.jpg/.jpeg/.png) in-place if not already .webp
  let fallbackBytes = originalBytes
  if (ext === '.jpg' || ext === '.jpeg') {
    const optimizedJpg = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: masterWidth,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: options.quality,
        mozjpeg: true,
        progressive: true,
      })
      .toBuffer()

    if (optimizedJpg.length < originalBytes) {
      await fs.writeFile(filePath, optimizedJpg)
      fallbackBytes = optimizedJpg.length
    }
  } else if (ext === '.png') {
    const optimizedPng = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: masterWidth,
        withoutEnlargement: true,
      })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        quality: Math.min(95, options.quality + 8),
        effort: 8,
      })
      .toBuffer()

    if (optimizedPng.length < originalBytes) {
      await fs.writeFile(filePath, optimizedPng)
      fallbackBytes = optimizedPng.length
    }
  }

  // Touch WebP outputs so mtime >= source file mtime after in-place fallback optimization
  const now = new Date()
  for (const outPath of allWebpOutputs) {
    await fs.utimes(outPath, now, now)
  }

  const webpSavingsPct = (
    (1 - masterWebpBuffer.length / originalBytes) *
    100
  ).toFixed(1)

  const variantsSummary = variantSizes
    .map((v) => `${v.width}w: ${formatBytes(v.bytes)}`)
    .join(', ')

  console.log(
    `[OK] ${relPath} (${metadata.width}x${metadata.height})\n` +
      `     Original: ${formatBytes(originalBytes)} -> Fallback: ${formatBytes(fallbackBytes)} | Master WebP: ${formatBytes(masterWebpBuffer.length)} (-${webpSavingsPct}%)\n` +
      `     Responsive WebP: [ ${variantsSummary} ]`
  )

  return {
    file: relPath,
    originalBytes,
    fallbackBytes,
    masterWebpBytes: masterWebpBuffer.length,
    variantSizes,
  }
}

const optimizeOgImages = async (options) => {
  let entries
  try {
    entries = await fs.readdir(PUBLIC_DIR, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isFile() || !/^og-.*\.(jpg|jpeg|png)$/i.test(entry.name)) {
      continue
    }
    const fullPath = path.join(PUBLIC_DIR, entry.name)
    const ext = path.extname(entry.name).toLowerCase()
    const stat = await fs.stat(fullPath)
    const inputBuffer = await fs.readFile(fullPath)

    let optimizedBuffer
    if (ext === '.jpg' || ext === '.jpeg') {
      optimizedBuffer = await sharp(inputBuffer)
        .jpeg({
          quality: options.quality,
          mozjpeg: true,
          progressive: true,
        })
        .toBuffer()
    } else {
      optimizedBuffer = await sharp(inputBuffer)
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
        })
        .toBuffer()
    }

    if (optimizedBuffer.length < stat.size) {
      await fs.writeFile(fullPath, optimizedBuffer)
      const savedPct = ((1 - optimizedBuffer.length / stat.size) * 100).toFixed(
        1
      )
      console.log(
        `[OG] public/${entry.name}: ${formatBytes(stat.size)} -> ${formatBytes(optimizedBuffer.length)} (-${savedPct}%)`
      )
    }
  }
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const targets =
    options.targets.length > 0 ? options.targets : [DEFAULT_ASSETS_DIR]

  console.log(
    `:: Optimizing images (widths: ${options.widths.join('w, ')}w | quality: ${options.quality})...`
  )

  const files = []
  for (const target of targets) {
    const found = await collectSourceImages(target)
    files.push(...found)
  }

  const uniqueFiles = Array.from(new Set(files))
  if (uniqueFiles.length === 0) {
    console.log('No source images found to optimize.')
    return
  }

  let totalOriginal = 0
  let totalMasterWebp = 0
  let total768wWebp = 0
  let processedCount = 0

  for (const filePath of uniqueFiles) {
    const stats = await optimizeAssetImage(filePath, options)
    if (stats) {
      processedCount++
      totalOriginal += stats.originalBytes
      totalMasterWebp += stats.masterWebpBytes
      const v768 =
        stats.variantSizes.find((v) => v.width === 768) ||
        stats.variantSizes[Math.floor(stats.variantSizes.length / 2)]
      if (v768) total768wWebp += v768.bytes
    }
  }

  if (options.includeOg && options.targets.length === 0) {
    await optimizeOgImages(options)
  }

  if (processedCount > 0) {
    const masterReduction = (
      (1 - totalMasterWebp / totalOriginal) *
      100
    ).toFixed(1)
    const cardReduction = ((1 - total768wWebp / totalOriginal) * 100).toFixed(1)
    console.log(
      `\n:: Summary (${processedCount} images optimized):\n` +
        `   Source total:       ${formatBytes(totalOriginal)}\n` +
        `   Master WebP total:  ${formatBytes(totalMasterWebp)} (-${masterReduction}%)\n` +
        `   768w WebP total:    ${formatBytes(total768wWebp)} (-${cardReduction}% for typical gallery viewports)`
    )
  } else {
    console.log(
      '\n:: All images are already optimized. Pass --force to regenerate.'
    )
  }
}

main().catch((err) => {
  console.error('[ERROR] Image optimization failed:', err)
  process.exit(1)
})
