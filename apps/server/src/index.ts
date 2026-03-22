import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './auth'
import { authMiddleware, type AuthVariables } from './middleware/auth'
import { chatRouter } from './modules/chat/chat.router'

const allowedWebOrigins = process.env.NODE_ENV === "development"
  ? ["http://localhost:3000", "http://localhost:5173"]
  : [process.env.WEB_URL || '']

const app = new Hono<{ Variables: AuthVariables }>()
  .use("*", cors({
    origin: (origin) => {
      if (allowedWebOrigins.includes(origin)) return origin
      if (origin?.startsWith('http://localhost:') || origin === 'null') return origin
      return allowedWebOrigins[0] || null
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  }))
  .use("*", authMiddleware)
  .on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw)
  })
  .get('/', (c) => {
    return c.json({
      message: 'Welcome to DBDesk API',
      endpoints: { chat: '/api/chat', auth: '/api/auth/*', session: '/api/session' },
    })
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

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server is running on port ${port}`)
})

export default app
