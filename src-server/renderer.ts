import express, { Request, Response, NextFunction } from 'express'
import type { ViteDevServer } from 'vite'
import path from 'path'
import pug from 'pug'
import fs from 'fs'
import { config } from './config.js'

type ManifestEntry = {
  file: string
  css?: string[]
  src?: string
}

let viteServer: ViteDevServer | null = null
let manifest: Record<string, ManifestEntry> = {}

export async function initRenderer(app: express.Express): Promise<void> {
  if (config.isDev) {
    const { createServer: createViteServer } = await import('vite')
    viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(viteServer.middlewares)
  } else {
    try {
      const manifestPath = path.resolve(
        config.paths.dist,
        '.vite',
        'manifest.json'
      )
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      console.error('Failed to load production manifest:', error)
    }
    app.use(express.static(config.paths.dist))
  }
}

export function getViteServer(): ViteDevServer | null {
  return viteServer
}

export const renderView = (
  viewName: string,
  locals: Record<string, unknown> = {}
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const url = req.originalUrl
      const templatePath = path.resolve(
        config.paths.views,
        'pages',
        `${viewName}.pug`
      )
      const compiledTemplate = pug.compileFile(templatePath)
      const htmlTemplate = compiledTemplate(locals)

      let finalHtml = htmlTemplate
      if (config.isDev && viteServer) {
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
