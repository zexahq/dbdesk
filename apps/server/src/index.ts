import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth.js'
import { authMiddleware, type AuthVariables } from './middleware/auth.js'
import { chatRouter } from './modules/chat/chat.router.js'

const allowedWebOrigins =
  process.env.NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:5173']
    : [process.env.WEB_URL || '']

const app = new Hono<{ Variables: AuthVariables }>()
  .use(
    '*',
    cors({
      origin: (origin) => {
        if (allowedWebOrigins.includes(origin)) return origin
        if (origin?.startsWith('http://localhost:') || origin === 'null') return origin
        return allowedWebOrigins[0] || null
      },
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
      exposeHeaders: ['Content-Length'],
      maxAge: 86400,
      credentials: true
    })
  )
  .use('*', authMiddleware)
  .on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw)
  })
  .get('/', (c) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DBDesk API</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f0f0f; color: #fff; }
    .container { text-align: center; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    a { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>dbdesk.zexa.app</h1>
    <p>Please visit <a href="https://dbdesk.zexa.app">dbdesk.zexa.app</a> to access the application.</p>
  </div>
</body>
</html>`)
  })
  .get('/api/session', (c) => {
    const session = c.get('session')
    const user = c.get('user')

    if (!user) return c.json({ error: 'Unauthorized' as const }, 401)

    return c.json({ session, user })
  })
  .route('/api/chat', chatRouter)

const routes = app

export type AppType = typeof routes

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server is running on port ${port}`)
  })
}

export default app
