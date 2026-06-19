import dotenv from 'dotenv'
import path from 'path'
import express from 'express'
import { fileURLToPath } from 'url'
import { createServer as createViteServer } from 'vite'
import pug from 'pug'

dotenv.config()
const app = express()
const isDev = process.env.NODE_ENV !== 'production'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const viteServer = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
})

app.get('/', async (request, resolve) => {
  const url = request.originalUrl

  const templatePath = path.resolve(__dirname, 'views/pages/home.pug')
  const compiledTemplate = pug.compileFile(templatePath)
  const htmlTemplate = compiledTemplate({
    title: 'bad at coding!!',
    message: 'hi from da backandd!!!',
  })
  const finalTemplate = await viteServer.transformIndexHtml(url, htmlTemplate)

  resolve.status(200).set({ 'Content-type': 'text/html' }).end(finalTemplate)
})

app.get('/fail-cases', async (request, resolve) => {
  const url = request.originalUrl

  const templatePath = path.resolve(__dirname, 'views/pages/fail-cases.pug')
  const compiledTemplate = pug.compileFile(templatePath)
  const htmlTemplate = compiledTemplate({})
  const finalTemplate = await viteServer.transformIndexHtml(url, htmlTemplate)

  resolve.status(200).set({ 'Content-type': 'text/html' }).end(finalTemplate)
})

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
