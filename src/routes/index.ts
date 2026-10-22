import { Hono } from 'hono'

import systemRoutes from '~/routes/systemRoutes'
import type { AppVariables, Bindings } from '~/types'

const apiRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>().route(
  '/',
  systemRoutes
)

export default apiRoutes
