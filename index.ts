import dotenv from 'dotenv'
import path from 'path'
import express, { Request, Response, NextFunction } from 'express'
import type { ViteDevServer } from 'vite'
import pug from 'pug'
import fs from 'fs'

dotenv.config()
const app = express()
const isDev = process.env.NODE_ENV !== 'production'

interface ManifestEntry {
  file: string
  css?: string[]
  src?: string
}

let viteServer: ViteDevServer
let manifest: Record<string, ManifestEntry> = {}

if (isDev) {
  const { createServer: createViteServer } = await import('vite')
  viteServer = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
} else {
  try {
    const manifestPath = path.resolve(
      process.cwd(),
      'dist',
      '.vite',
      'manifest.json'
    )
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    console.error('Failed to load production manifest:', error)
  }
}

const renderView = (viewName: string, locals: Record<string, unknown> = {}) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const url = req.originalUrl
      const templatePath = path.resolve(
        process.cwd(),
        'views',
        'pages',
        `${viewName}.pug`
      )
      const compiledTemplate = pug.compileFile(templatePath)
      const htmlTemplate = compiledTemplate(locals)

      let finalHtml = htmlTemplate
      if (isDev) {
        finalHtml = await viteServer.transformIndexHtml(url, htmlTemplate)
      } else {
        // Rewrite paths using the production manifest
        const mainTs = manifest['app/main.ts']
        const jsFile = mainTs ? `/${mainTs.file}` : ''
        const cssFile = mainTs?.css?.[0] ? `/${mainTs.css[0]}` : ''
        const bs500 = manifest['fonts/big-shoulders-stencil-v4-latin-500.woff2']
          ?.file
          ? `/${manifest['fonts/big-shoulders-stencil-v4-latin-500.woff2'].file}`
          : ''
        const jm400 = manifest['fonts/jetbrains-mono-v24-latin-regular.woff2']
          ?.file
          ? `/${manifest['fonts/jetbrains-mono-v24-latin-regular.woff2'].file}`
          : ''
        const jm500 = manifest['fonts/jetbrains-mono-v24-latin-500.woff2']?.file
          ? `/${manifest['fonts/jetbrains-mono-v24-latin-500.woff2'].file}`
          : ''

        finalHtml = htmlTemplate
          .replace('../app/main.ts', jsFile)
          .replace('../styles/main.scss', cssFile)
          .replace('../fonts/big-shoulders-stencil-v4-latin-500.woff2', bs500)
          .replace('../fonts/jetbrains-mono-v24-latin-regular.woff2', jm400)
          .replace('../fonts/jetbrains-mono-v24-latin-500.woff2', jm500)
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
    } catch (error) {
      next(error)
    }
  }
}

app.get('/', renderView('home'))

app.get('/fail-cases', renderView('fail-cases'))

app.get('/who-i-am-not', renderView('who-i-am-not'))

async function startServer() {
  if (isDev) {
    app.use(viteServer.middlewares)
  } else {
    app.use(express.static('dist'))
  }

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`LISTENING on port ${port}`)
  })
}

startServer()
