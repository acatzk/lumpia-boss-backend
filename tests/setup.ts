import { drizzle } from 'drizzle-orm/neon-http'
import { createMiddleware } from 'hono/factory'
import { afterAll, beforeAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'

import * as schema from '../src/db/schema'
import { createTestBranch, deleteBranch } from './helpers'

const branch = await createTestBranch()

beforeAll(async () => {
  if (branch.uri) {
    vi.mock('../src/middlewares/dbProvider.ts', () => {
      return {
        dbProvider: createMiddleware(async (c, next) => {
          const db = drizzle(neon(branch.uri), {
            schema,
            casing: 'snake_case'
          })

          c.set('db', db)
          await next()
        })
      }
    })
  }
})

afterAll(async () => {
  if (branch.id) {
    await deleteBranch(branch.id)
  }
})
