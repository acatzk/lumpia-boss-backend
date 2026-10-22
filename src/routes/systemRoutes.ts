import { Hono } from 'hono'

import { systemController } from '~/controllers/systemController'
import type { AppVariables, Bindings } from '~/types'

const systemRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>()
  .get('/health', (c) => systemController.healthCheck(c))
  .get('/ping', (c) => systemController.ping(c))
  .get('/robots.txt', (c) => systemController.robotsTxt(c))

export default systemRoutes
