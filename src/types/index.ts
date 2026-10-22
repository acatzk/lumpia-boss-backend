import type { Context } from 'hono'

import type { Db } from '~/db/client'

export type Bindings = {
  DATABASE_URL: string
  ENVIRONMENT?: string
  FRONTEND_URL?: string
  NEON_PROJECT_ID?: string
  NEON_API_TOKEN?: string
}

export type AppVariables = {
  db: Db
}

export type AppContext = Context<{ Bindings: Bindings; Variables: AppVariables }>

export type ApiResponse<T> = {
  data: T
  message?: string
}

export type ApiMessageResponse = {
  message: string
}

export type ApiErrorResponse = {
  error: string
  code?: string
  details?: unknown
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: PaginationMeta
}
