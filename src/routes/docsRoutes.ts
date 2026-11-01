import { swaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

import type { AppContext, AppVariables, Bindings } from '~/types'
import { apiDocsHtml } from '~/views/apiDocs'

const docsRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()

// Basic Authentication protecting Swagger UI and API docs with admin/admin credentials
const docsAuth = (c: AppContext, next: () => Promise<void>) => {
  const username = c.env.SWAGGER_USERNAME || 'admin'
  const password = c.env.SWAGGER_PASSWORD || 'admin'
  const auth = basicAuth({ username, password })
  return auth(c, next)
}

docsRoutes.use('/api-docs', docsAuth)
docsRoutes.use('/api-docs/*', docsAuth)
docsRoutes.use('/swagger', docsAuth)
docsRoutes.use('/swagger/*', docsAuth)

docsRoutes.get('/api-docs', (c) => c.html(apiDocsHtml))
docsRoutes.get('/api-docs/swagger', swaggerUI({ url: '/openapi.json' }))
docsRoutes.get('/swagger', (c) => c.redirect('/api-docs/swagger'))
docsRoutes.get('/swagger/*', swaggerUI({ url: '/openapi.json' }))

export default docsRoutes
