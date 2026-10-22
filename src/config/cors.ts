import { cors } from 'hono/cors'

export const corsConfig = cors({
  origin: (origin, c) => c.env?.FRONTEND_URL || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-API-Key'],
  credentials: true
})
