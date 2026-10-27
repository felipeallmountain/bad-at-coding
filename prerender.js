import fs from 'fs'
import path from 'path'
import pug from 'pug'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const distDir = path.resolve(rootDir, 'dist')

const manifestPath = path.resolve(distDir, '.vite', 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error(`Manifest file not found at ${manifestPath}`)
  process.exit(1)
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

const pages = [
  { view: 'home', output: 'index.html', canonicalPath: '/' },
  {
    view: 'fail-cases',
    output: 'fail-cases.html',
    canonicalPath: '/fail-cases',
  },
  {
    view: 'fail-cases',
    output: 'fail-cases/index.html',
    canonicalPath: '/fail-cases',
  },
  {
    view: 'fail-cases/v-feed-06',
    output: 'fail-cases/v-feed-06.html',
    canonicalPath: '/fail-cases/v-feed-06',
  },
  {
    view: 'fail-cases/v-feed-06',
    output: 'fail-cases/v-feed-06/index.html',
    canonicalPath: '/fail-cases/v-feed-06',
  },
  {
    view: 'who-i-am-not',
    output: 'who-i-am-not.html',
    canonicalPath: '/who-i-am-not',
  },
  {
    view: 'who-i-am-not',
    output: 'who-i-am-not/index.html',
    canonicalPath: '/who-i-am-not',
  },
  { view: 'annoy-me', output: 'annoy-me.html', canonicalPath: '/annoy-me' },
  {
    view: 'annoy-me',
    output: 'annoy-me/index.html',
    canonicalPath: '/annoy-me',
  },
  { view: '404', output: '404.html', canonicalPath: '/404' },
  { view: '500', output: '500.html', canonicalPath: '/500' },
]

pages.forEach(({ view, output, canonicalPath }) => {
  const templatePath = path.resolve(rootDir, 'views', 'pages', `${view}.pug`)
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found at ${templatePath}`)
    return
  }
  const compiledTemplate = pug.compileFile(templatePath)
  const htmlTemplate = compiledTemplate({
    siteUrl: (process.env.SITE_URL || 'https://bad-at-coding.com').replace(
      /\/$/,
      ''
    ),
    siteName: 'bad at coding',
    canonicalPath,
  })

  // Rewrite paths using the production manifest
  const mainTs = manifest['app/main.ts']
  const jsFile = mainTs ? `/${mainTs.file}` : ''
  const cssFile = mainTs?.css?.[0] ? `/${mainTs.css[0]}` : ''
  const bs500 = manifest['fonts/big-shoulders-stencil-v4-latin-500.woff2']?.file
    ? `/${manifest['fonts/big-shoulders-stencil-v4-latin-500.woff2'].file}`
    : ''
  const jm400 = manifest['fonts/jetbrains-mono-v24-latin-regular.woff2']?.file
    ? `/${manifest['fonts/jetbrains-mono-v24-latin-regular.woff2'].file}`
    : ''
  const jm500 = manifest['fonts/jetbrains-mono-v24-latin-500.woff2']?.file
    ? `/${manifest['fonts/jetbrains-mono-v24-latin-500.woff2'].file}`
    : ''

  const finalHtml = htmlTemplate
    .replace('../app/main.ts', jsFile)
    .replace('../styles/main.scss', cssFile)
    .replace('../fonts/big-shoulders-stencil-v4-latin-500.woff2', bs500)
    .replace('../fonts/jetbrains-mono-v24-latin-regular.woff2', jm400)
    .replace('../fonts/jetbrains-mono-v24-latin-500.woff2', jm500)

  const outputPath = path.resolve(distDir, output)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, finalHtml, 'utf-8')
  console.log(`Prerendered ${view} -> ${output}`)
})
