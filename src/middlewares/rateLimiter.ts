import type { Context, MiddlewareHandler } from 'hono'

import { tooManyRequestsJson } from '~/utils/response'

type RateLimiterOptions = {
  windowMs: number
  max: number
  message?: string
  keyGenerator?: (c: Context) => string
  skip?: (c: Context) => boolean
}

type RateLimitRecord = {
  count: number
  resetTime: number
}

export const getClientIp = (c: Context): string => {
  const cfConnectingIp = c.req.header('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const xForwardedFor = c.req.header('x-forwarded-for')
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]
    if (firstIp) return firstIp.trim()
  }

  const xRealIp = c.req.header('x-real-ip')
  if (xRealIp) return xRealIp.trim()

  return '127.0.0.1'
}

export const createRateLimiter = (options: RateLimiterOptions): MiddlewareHandler => {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = (c) => `${c.req.path}:${getClientIp(c)}`,
    skip = () => false
  } = options

  const store = new Map<string, RateLimitRecord>()

  // Periodic cleanup helper to prevent memory accumulation
  const pruneExpired = (now: number) => {
    if (store.size > 1000) {
      for (const [key, record] of store.entries()) {
        if (record.resetTime <= now) {
          store.delete(key)
        }
      }
    }
  }

  return async (c, next) => {
    if (skip(c)) {
      return next()
    }

    const key = keyGenerator(c)
    const now = Date.now()

    pruneExpired(now)

    let record = store.get(key)

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs
      }
      store.set(key, record)
    } else {
      record.count += 1
    }

    const remaining = Math.max(0, max - record.count)
    const resetSeconds = Math.ceil(record.resetTime / 1000)

    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', resetSeconds.toString())

    if (record.count > max) {
      const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000))
      return tooManyRequestsJson(c, message, retryAfter)
    }

    await next()
  }
}

/**
 * Strict Rate Limiter for Login Endpoint:
 * Maximum 5 failed/total attempts per 15-minute window per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    'Too many login attempts. Your IP has been temporarily rate-limited. Please try again in 15 minutes.'
})

/**
 * Refresh Token Rate Limiter:
 * Maximum 30 requests per 15-minute window per IP
 */
export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many token refresh requests. Please try again later.'
})
