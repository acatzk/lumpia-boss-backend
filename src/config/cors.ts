import { cors } from 'hono/cors'

export const corsConfig = cors({
  origin: (origin, c) => {
    if (!origin) return c.env?.FRONTEND_URL || 'http://localhost:3000'
    const allowed = [c.env?.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(
      Boolean
    )
    if (allowed.includes(origin) || c.env?.ENVIRONMENT !== 'production') {
      return origin
    }
    return c.env?.FRONTEND_URL || origin
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-Key'],
  credentials: true
})
