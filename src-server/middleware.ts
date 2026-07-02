import { Request, Response, NextFunction } from 'express'
import { config } from './config.js'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404)

  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Not Found</title>
        <style>
          body {
            background-color: #0b0c10;
            color: #45f3ff;
            font-family: 'Courier New', Courier, monospace;
            padding: 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            margin: 0;
          }
          .terminal-box {
            border: 2px solid #1f2833;
            background-color: #121212;
            padding: 2rem;
            border-radius: 4px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            max-width: 600px;
            width: 100%;
          }
          h1 {
            color: #ff3e3e;
            font-size: 1.8rem;
            border-bottom: 2px solid #ff3e3e;
            padding-bottom: 0.5rem;
            margin-top: 0;
          }
          p {
            line-height: 1.6;
            color: #c5c6c7;
          }
          .cursor {
            animation: blink 1s infinite;
          }
          @keyframes blink {
            50% { opacity: 0; }
          }
          a {
            color: #66fcf1;
            text-decoration: none;
            border: 1px solid #66fcf1;
            padding: 0.5rem 1rem;
            display: inline-block;
            margin-top: 1rem;
            transition: all 0.3s ease;
          }
          a:hover {
            background-color: #66fcf1;
            color: #0b0c10;
          }
        </style>
      </head>
      <body>
        <div class="terminal-box">
          <h1>[ ERROR ] CODE 404: ROUTE NOT FOUND</h1>
          <p>> Attempted to fetch: ${req.originalUrl}</p>
          <p>> Status: The requested resource is missing, vaporized, or was never written due to chronic procrastination.</p>
          <p>> Advice: Go back to home or read a book.</p>
          <p>> <span class="cursor">_</span></p>
          <a href="/">&lt;-- RETURN TO SAFETY</a>
        </div>
      </body>
      </html>
    `)
    return
  }

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('Server error:', err)
  const statusCode = err.status || err.statusCode || 500

  res.status(statusCode)

  if (req.accepts('html')) {
    const showStack = config.isDev && err.stack
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>500 - Server Error</title>
        <style>
          body {
            background-color: #0b0c10;
            color: #ff3e3e;
            font-family: 'Courier New', Courier, monospace;
            padding: 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            margin: 0;
          }
          .terminal-box {
            border: 2px solid #ff3e3e;
            background-color: #121212;
            padding: 2rem;
            border-radius: 4px;
            box-shadow: 0 10px 30px rgba(255,62,62,0.15);
            max-width: 800px;
            width: 100%;
            overflow-x: auto;
          }
          h1 {
            font-size: 1.8rem;
            border-bottom: 2px solid #ff3e3e;
            padding-bottom: 0.5rem;
            margin-top: 0;
          }
          p {
            line-height: 1.6;
            color: #c5c6c7;
          }
          pre {
            background-color: #1e1e1e;
            color: #ff79c6;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            border: 1px solid #333;
          }
          a {
            color: #66fcf1;
            text-decoration: none;
            border: 1px solid #66fcf1;
            padding: 0.5rem 1rem;
            display: inline-block;
            margin-top: 1rem;
            transition: all 0.3s ease;
          }
          a:hover {
            background-color: #66fcf1;
            color: #0b0c10;
          }
        </style>
      </head>
      <body>
        <div class="terminal-box">
          <h1>[ FATAL ] SERVER EXCEPTION (${statusCode})</h1>
          <p>> Message: ${err.message || 'An unexpected error occurred.'}</p>
          ${showStack ? `<p>> Stack Trace:</p><pre>${err.stack}</pre>` : ''}
          <a href="/">&lt;-- RETURN TO SAFETY</a>
        </div>
      </body>
      </html>
    `)
    return
  }

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
