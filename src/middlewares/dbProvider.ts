import { createMiddleware } from 'hono/factory'

import { type Db, createDb } from '~/db/client'
import type { Bindings } from '~/types'

export const dbProvider = createMiddleware<{
  Bindings: Bindings
  Variables: {
    db: Db
  }
}>(async (c, next) => {
  const db = createDb(c.env)
  c.set('db', db)
  await next()
})
