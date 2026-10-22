import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

type CacheOptions = {
  maxAge?: number
  sMaxAge?: number
  staleWhileRevalidate?: number
}

export const successJson = <T>(c: Context, data: T, status = 200) => {
  return c.json(data, status as ContentfulStatusCode)
}

export const messageJson = (c: Context, message: string, status = 200) => {
  return c.json({ message }, status as ContentfulStatusCode)
}

export const cachedJson = <T>(c: Context, data: T, options?: CacheOptions) => {
  const maxAge = options?.maxAge ?? 60
  const sMaxAge = options?.sMaxAge ?? 300
  const staleWhileRevalidate = options?.staleWhileRevalidate ?? 600

  return c.json(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  })
}

export const errorJson = (
  c: Context,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) => {
  return c.json({ error: message, ...extra }, status as ContentfulStatusCode)
}

export const notFoundJson = (c: Context, message = 'Resource not found') => {
  return c.json({ message }, 404)
}

export const unauthorizedJson = (c: Context, message = 'Unauthorized') => {
  return c.json({ error: message }, 401)
}

export const forbiddenJson = (c: Context, message = 'Forbidden') => {
  return c.json({ error: message, code: 'FORBIDDEN' }, 403)
}

export const serverErrorJson = (
  c: Context,
  message = 'Internal server error',
  extra?: Record<string, unknown>
) => {
  return c.json({ message, ...extra }, 500)
}

export const tooManyRequestsJson = (
  c: Context,
  message = 'Too many requests. Please slow down and try again later.',
  retryAfter?: number
) => {
  if (retryAfter !== undefined) {
    c.header('Retry-After', retryAfter.toString())
  }
  return c.json({ error: message, code: 'TOO_MANY_REQUESTS', retryAfter }, 429)
}
