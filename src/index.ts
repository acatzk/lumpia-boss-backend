import { createFiberplane } from '@fiberplane/hono'
import { Hono } from 'hono'
import { openAPISpecs } from 'hono-openapi'

import { corsConfig } from '~/config/cors'
import { dbProvider } from '~/middlewares/dbProvider'
import { errorHandler } from '~/middlewares/errorHandler'
import apiRoutes from '~/routes'
import systemRoutes from '~/routes/systemRoutes'
import type { AppContext, AppVariables, Bindings } from '~/types'

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()
  .use('*', corsConfig)
  .use('*', dbProvider)
  .get('/', (c) => c.text('Honc from above! ☁️🪿'))
  .route('/', systemRoutes)
  .route('/api', apiRoutes)

// Global error handler
app.onError(errorHandler)

/**
 * Generate OpenAPI spec at /openapi.json
 */
app.get(
  '/openapi.json',
  openAPISpecs(app, {
    documentation: {
      info: {
        title: 'Lumpia Boss Backend API',
        version: '1.0.0',
        description: 'HONC Stack API for Lumpia Boss Business Management'
      }
    }
  })
)

/**
 * Mount the Fiberplane api explorer to be able to make requests against your API.
 * Visit the explorer at `/fp`
 */
app.use(
  '/fp/*',
  createFiberplane({
    app,
    openapi: { url: '/openapi.json' }
  })
)

export type { Bindings, AppVariables, AppContext }
export default app
