import { afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { createMiddleware } from 'hono/factory'

import * as schema from '../src/db/schema'
import { createTestBranch, deleteBranch } from './helpers'

const branch = await createTestBranch()

const FALLBACK_TEST_DB_URL =
  'postgresql://neondb_owner:npg_mO4G6TMiuUYl@ep-sweet-term-aoptnwiz.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

vi.mock('../src/middlewares/dbProvider.ts', () => {
  return {
    dbProvider: createMiddleware(async (c, next) => {
      const uri = branch?.uri || c.env?.DATABASE_URL || FALLBACK_TEST_DB_URL
      const db = drizzle(neon(uri), {
        schema,
        casing: 'snake_case'
      })

      c.set('db', db)
      await next()
    })
  }
})

afterAll(async () => {
  if (branch.id) {
    await deleteBranch(branch.id)
  }
})
