import dotenv from 'dotenv'
import express from 'express'
import { config } from './src-server/config.js'
import { initRenderer } from './src-server/renderer.js'
import { router } from './src-server/routes.js'
import { notFoundHandler, errorHandler } from './src-server/middleware.js'

dotenv.config()

const app = express()

async function startServer() {
  // Initialize Pug renderer and register dev/prod static assets middlewares
  await initRenderer(app)

  // Register all application routes
  app.use(router)

  // Error handling middlewares
  app.use(notFoundHandler)
  app.use(errorHandler)

  app.listen(config.port, () => {
    console.log(
      `LISTENING on port ${config.port} (${config.isDev ? 'development' : 'production'} mode)`
    )
  })
}

startServer()
