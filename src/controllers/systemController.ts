import { sql } from 'drizzle-orm'

import { createDb } from '~/db/client'
import type { AppContext } from '~/types'
import { serverErrorJson, successJson } from '~/utils/response'

export const systemController = {
  healthCheck: async (c: AppContext) => {
    try {
      const db = createDb(c.env)
      await db.execute(sql`SELECT 1`)

      return successJson(c, {
        service: 'lumpia-boss-backend',
        status: 'healthy',
        database: 'connected',
        environment: c.env.ENVIRONMENT || 'development',
        timestamp: new Date().toISOString()
      })
    } catch (error: unknown) {
      console.error('Health check failed:', error)
      const message = error instanceof Error ? error.message : 'Database check failed'
      return serverErrorJson(c, message, {
        service: 'lumpia-boss-backend',
        status: 'degraded',
        database: 'disconnected',
        environment: c.env.ENVIRONMENT || 'development',
        timestamp: new Date().toISOString()
      })
    }
  },

  ping: async (c: AppContext) => {
    return successJson(c, {
      message: 'pong',
      service: 'lumpia-boss-backend',
      timestamp: new Date().toISOString()
    })
  },

  robotsTxt: async (c: AppContext) => {
    return c.text('User-agent: *\nDisallow: /\n', 200, {
      'Content-Type': 'text/plain; charset=utf-8'
    })
  }
}
