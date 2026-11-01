import { afterAll, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/neon-http'
import { createMiddleware } from 'hono/factory'
import { neon } from '@neondatabase/serverless'

import type { Db } from '~/db/client'
import * as schema from '~/db/schema'

import { createTestBranch, deleteBranch } from './helpers'

const branch = await createTestBranch()

const createOfflineDbProxy = (): Db => {
  return new Proxy(
    {},
    {
      get: (_target: object, prop: string | symbol) => {
        if (prop === 'then') return undefined
        return () => {
          throw new Error(
            'Database operations require DATABASE_URL to be set in environment variables or GitHub Secrets.'
          )
        }
      }
    }
  ) as unknown as Db
}

vi.mock('../src/middlewares/dbProvider.ts', () => {
  return {
    dbProvider: createMiddleware(async (c, next) => {
      const uri = branch?.uri || c.env?.DATABASE_URL || process.env.DATABASE_URL
      if (uri) {
        const db = drizzle(neon(uri), {
          schema,
          casing: 'snake_case'
        })
        c.set('db', db)
      } else {
        c.set('db', createOfflineDbProxy())
      }

      await next()
    })
  }
})

afterAll(async () => {
  if (branch.id) {
    await deleteBranch(branch.id)
  }
})
