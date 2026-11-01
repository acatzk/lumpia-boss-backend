import { Hono } from 'hono'

import authRoutes from '~/routes/authRoutes'
import systemRoutes from '~/routes/systemRoutes'
import type { AppVariables, Bindings } from '~/types'

const apiRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()
  .route('/', systemRoutes)
  .route('/auth', authRoutes)

export default apiRoutes
