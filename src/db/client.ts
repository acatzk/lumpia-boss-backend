import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

type EnvWithDb = {
  DATABASE_URL?: string
}

export type Db = ReturnType<typeof drizzle>

const dbCache = new Map<string, Db>()

/**
 * Resilient fetch function with retry mechanism to gracefully handle
 * Neon compute cold starts (scale-to-zero wake-up) and transient edge gateway drops (502, 503, 504, 530).
 */
const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 2,
  baseDelayMs = 400
): Promise<Response> => {
  let attempt = 0
  while (attempt <= retries) {
    try {
      const res = await fetch(input, init)
      if (!res.ok && [502, 503, 504, 530].includes(res.status) && attempt < retries) {
        attempt++
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt))
        continue
      }
      return res
    } catch (err: unknown) {
      if (attempt < retries) {
        attempt++
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt))
        continue
      }
      throw err
    }
  }
  return fetch(input, init)
}

neonConfig.fetchFunction = fetchWithRetry

export const getConnectionString = (target: string | EnvWithDb): string => {
  let raw = typeof target === 'string' ? target : target.DATABASE_URL || ''
  if (!raw) return ''

  // Strip channel_binding (only applicable to raw TCP sockets, causes issues over Neon HTTP proxy)
  raw = raw.replace(/([?&])channel_binding=[^&]*(&|$)/g, '$1')
  raw = raw.replace(/[?&]$/, '')

  return raw
}

export const createDb = (target: string | EnvWithDb): Db => {
  const databaseUrl = getConnectionString(target)
  let db = dbCache.get(databaseUrl)
  if (!db) {
    const sql = neon(databaseUrl)
    db = drizzle(sql, { casing: 'snake_case' })
    dbCache.set(databaseUrl, db)
  }
  return db
}
