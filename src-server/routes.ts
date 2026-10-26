import { Router } from 'express'
import { renderView } from './renderer.js'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'

export const router = Router()

// Static/explicit routes
router.get('/', renderView('home'))

// API health endpoint (new feature)
router.get('/api/health', (_, res) => {
  res.json({
    status: 'OK',
    environment: config.isDev ? 'development' : 'production',
    uptime: process.uptime(),
    timestamp: Date.now(),
  })
})

// Nested dynamic view router matching views/pages/:section/:slug.pug
router.get('/:section/:slug', (req, res, next) => {
  const { section, slug } = req.params

  if (/[^a-zA-Z0-9_-]/.test(section) || /[^a-zA-Z0-9_-]/.test(slug)) {
    next()
    return
  }

  const nestedView = `${section}/${slug}`
  const templatePath = path.resolve(
    config.paths.views,
    'pages',
    section,
    `${slug}.pug`
  )

  if (fs.existsSync(templatePath)) {
    renderView(nestedView)(req, res, next)
  } else {
    next()
  }
})

// Dynamic view router matching views/pages/:page.pug (new feature)
router.get('/:page', (req, res, next) => {
  const pageName = req.params.page

  // Prevent directory traversal attacks by limiting chars
  if (/[^a-zA-Z0-9_-]/.test(pageName)) {
    next()
    return
  }

  const templatePath = path.resolve(
    config.paths.views,
    'pages',
    `${pageName}.pug`
  )

  if (fs.existsSync(templatePath)) {
    renderView(pageName)(req, res, next)
  } else {
    next()
  }
})
