import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

import { getClientIp } from '~/middlewares/rateLimiter'
import { authService } from '~/services/authService'
import type { AppContext } from '~/types'
import { errorJson, messageJson, successJson, unauthorizedJson } from '~/utils/response'
import type { LoginInput, LogoutInput, RefreshTokenInput, SeedAdminInput } from '~/validation/auth'

const COOKIE_NAME_REFRESH = 'lbs_refresh_token'
const COOKIE_NAME_ACCESS = 'lbs_access_token'

export const authController = {
  login: async (c: AppContext) => {
    const body = (await c.req.json()) as LoginInput
    const ip = getClientIp(c)
    const userAgent = c.req.header('user-agent')

    const result = await authService.login(c, body, { ip, userAgent })

    if (!result.success) {
      if (result.status === 400) {
        return errorJson(c, result.error, 400)
      }
      return unauthorizedJson(c, result.error)
    }

    const isProduction = c.env.ENVIRONMENT === 'production'
    const maxAge = result.data.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60

    setCookie(c, COOKIE_NAME_REFRESH, result.data.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge
    })

    setCookie(c, COOKIE_NAME_ACCESS, result.data.accessToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge: 15 * 60
    })

    return successJson(c, result.data, 200)
  },

  refresh: async (c: AppContext) => {
    let refreshToken = getCookie(c, COOKIE_NAME_REFRESH)

    if (!refreshToken) {
      try {
        const body = (await c.req.json()) as RefreshTokenInput
        refreshToken = body.refreshToken
      } catch {
        // Body was empty or invalid JSON
      }
    }

    if (!refreshToken) {
      return unauthorizedJson(c, 'Refresh token is required via cookie or request body.')
    }

    const ip = getClientIp(c)
    const userAgent = c.req.header('user-agent')

    try {
      const result = await authService.refresh(c, refreshToken, { ip, userAgent })
      const isProduction = c.env.ENVIRONMENT === 'production'

      setCookie(c, COOKIE_NAME_REFRESH, result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'Lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      })

      setCookie(c, COOKIE_NAME_ACCESS, result.accessToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'Lax',
        path: '/',
        maxAge: 15 * 60
      })

      return successJson(
        c,
        {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: 900
        },
        200
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid refresh token'
      return unauthorizedJson(c, `Token refresh failed: ${message}`)
    }
  },

  logout: async (c: AppContext) => {
    let refreshToken = getCookie(c, COOKIE_NAME_REFRESH)

    if (!refreshToken) {
      try {
        const body = (await c.req.json()) as LogoutInput
        refreshToken = body.refreshToken
      } catch {
        // Optional body
      }
    }

    if (refreshToken) {
      await authService.logout(c, refreshToken)
    }

    deleteCookie(c, COOKIE_NAME_REFRESH, { path: '/' })
    deleteCookie(c, COOKIE_NAME_ACCESS, { path: '/' })

    return messageJson(c, 'Successfully signed out. Session invalidated.', 200)
  },

  getMe: async (c: AppContext) => {
    const user = c.get('user')
    if (!user) {
      return unauthorizedJson(c, 'Authentication required.')
    }
    return successJson(c, { user }, 200)
  },

  seedAdmin: async (c: AppContext) => {
    let body: SeedAdminInput = {}
    try {
      body = (await c.req.json()) as SeedAdminInput
    } catch {
      // Body is optional
    }

    // Require authorization or valid environment setup
    const isDev = c.env.ENVIRONMENT !== 'production'
    const expectedSecret = c.env.JWT_SECRET || 'lumpia-boss-dev-jwt-access-secret-32-chars-key-2026'

    if (!isDev && body.secretKey !== expectedSecret) {
      return unauthorizedJson(c, 'Unauthorized to execute admin provisioning.')
    }

    const result = await authService.seedDefaultAdmin(c, body)
    return successJson(c, result, result.created ? 201 : 200)
  }
}
