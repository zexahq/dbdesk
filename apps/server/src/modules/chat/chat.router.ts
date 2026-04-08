import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { chatRequestBodySchema } from './chat.schema.js'
import { streamChat } from './chat.service.js'

export const chatRouter = new Hono()
  .post('/', zValidator('json', chatRequestBodySchema), async (c) => {
    try {
      const { messages } = c.req.valid('json')
      const response = await streamChat(messages)
      return response
    } catch (error) {
      console.error('Chat error:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })
