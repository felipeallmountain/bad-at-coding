import { Request, Response, NextFunction } from 'express'
import { config } from './config.js'
import { renderView } from './renderer.js'

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.accepts('html')) {
    void renderView(
      '404',
      { attemptedUrl: req.originalUrl },
      404
    )(req, res, next)
    return
  }

  res.status(404)

  if (req.accepts('json')) {
    res.json({ error: 'Not found', path: req.originalUrl })
    return
  }

  res.type('txt').send('Not found')
}

export function errorHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Server error:', err)
  const statusCode = err.status || err.statusCode || 500

  if (req.accepts('html')) {
    void renderView(
      '500',
      {
        statusCode,
        errorMessage: err.message || 'An unexpected error occurred.',
        ...(config.isDev && err.stack ? { errorStack: err.stack } : {}),
      },
      statusCode
    )(req, res, next)
    return
  }

  res.status(statusCode)

  if (req.accepts('json')) {
    res.json({
      error: {
        message: err.message || 'An unexpected error occurred.',
        status: statusCode,
        ...(config.isDev ? { stack: err.stack } : {}),
      },
    })
    return
  }

  res.type('txt').send(err.message || 'An unexpected error occurred.')
}
