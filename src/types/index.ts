import type { Context } from 'hono'

import type { Db } from '~/db/client'
import type { User, UserRole } from '~/db/schema'

export type { User, UserRole }
export type SafeUser = Omit<User, 'passwordHash'>

export type JwtAccessPayload = {
  sub: string
  email: string
  name: string
  role: UserRole
  type: 'access'
  exp: number
  iat?: number
}

export type Bindings = {
  DATABASE_URL: string
  ENVIRONMENT?: string
  FRONTEND_URL?: string
  JWT_SECRET?: string
  JWT_REFRESH_SECRET?: string
  RECAPTCHA_SECRET_KEY?: string
  RECAPTCHA_BYPASS_DEV?: string
  SWAGGER_USERNAME?: string
  SWAGGER_PASSWORD?: string
  NEON_PROJECT_ID?: string
  NEON_API_TOKEN?: string
}

export type AppVariables = {
  db: Db
  user?: SafeUser
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
