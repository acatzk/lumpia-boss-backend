import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import app from '../src'

const MOCK_RECAPTCHA = 'mock-recaptcha-token-for-dev-and-testing'

describe('Admin Authentication & Security API', () => {
  it('rejects login requests missing required fields with 400', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email' })
      },
      env
    )

    expect(res.status).toBe(400)
    const data = (await res.json()) as { error: string; code: string }
    expect(data.error).toBe('Invalid Request')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('rejects login when reCAPTCHA token is missing or empty with 400', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: ''
        })
      },
      env
    )

    expect(res.status).toBe(400)
  })

  it('accepts requests mounted under the /api/v1 prefix', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.99'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    expect(res.status).toBe(200)
    const data = (await res.json()) as { accessToken: string; user: { email: string } }
    expect(data.accessToken).toBeDefined()
    expect(data.user.email).toBe('admin@lumpiaboss.ph')
  })

  it('rejects non-existent user with generic 401 error to prevent user enumeration', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.1'
        },
        body: JSON.stringify({
          email: 'nonexistent@lumpiaboss.ph',
          password: 'RandomPassword123!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    expect(res.status).toBe(401)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('Invalid corporate email or password. Access denied.')
  })

  it('rejects incorrect password with generic 401 error', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.2'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'WrongPassword999!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    expect(res.status).toBe(401)
    const data = (await res.json()) as { error: string }
    expect(data.error).toBe('Invalid corporate email or password. Access denied.')
  })

  it('authenticates valid credentials, sets HTTP-only cookies, and returns token pair', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.3',
          'user-agent': 'Vitest-Test-Agent/1.0'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: MOCK_RECAPTCHA,
          rememberMe: true
        })
      },
      env
    )

    expect(res.status).toBe(200)

    const cookieHeader = res.headers.get('set-cookie')
    expect(cookieHeader).toBeTruthy()
    expect(cookieHeader).toContain('lbs_refresh_token=')

    const data = (await res.json()) as {
      accessToken: string
      refreshToken: string
      user: { email: string; role: string }
      expiresIn: number
    }

    expect(data.accessToken).toBeDefined()
    expect(data.refreshToken).toBeDefined()
    expect(data.user.email).toBe('admin@lumpiaboss.ph')
    expect(data.user.role).toBe('SUPER_ADMIN')
    expect(data.expiresIn).toBe(900)
  })

  it('protects /api/v1/auth/me against unauthenticated access with 401', async () => {
    const res = await app.request('/api/v1/auth/me', { method: 'GET' }, env)
    expect(res.status).toBe(401)
  })

  it('protects /api/v1/auth/me against tampered or invalid token with 401', async () => {
    const res = await app.request(
      '/api/v1/auth/me',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid.tampered.token' }
      },
      env
    )
    expect(res.status).toBe(401)
  })

  it('allows access to /api/v1/auth/me with valid Bearer token', async () => {
    // 1. Login to get valid token
    const loginRes = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.4'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    const loginData = (await loginRes.json()) as { accessToken: string }

    // 2. Access /api/v1/auth/me
    const meRes = await app.request(
      '/api/v1/auth/me',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginData.accessToken}` }
      },
      env
    )

    expect(meRes.status).toBe(200)
    const meData = (await meRes.json()) as {
      user: { email: string; role: string; name: string }
    }
    expect(meData.user.email).toBe('admin@lumpiaboss.ph')
    expect(meData.user.role).toBe('SUPER_ADMIN')
  })

  it('rotates refresh token and invalidates previous token to prevent replay attacks', async () => {
    // 1. Initial Login
    const loginRes = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.5'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    const { refreshToken: token1 } = (await loginRes.json()) as {
      refreshToken: string
    }

    // 2. Rotate token
    const refreshRes = await app.request(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token1 })
      },
      env
    )

    expect(refreshRes.status).toBe(200)
    const { accessToken: access2, refreshToken: token2 } = (await refreshRes.json()) as {
      accessToken: string
      refreshToken: string
    }

    expect(access2).toBeDefined()
    expect(token2).toBeDefined()
    expect(token2).not.toBe(token1)

    // 3. Security Check: Attempting to reuse revoked token1 triggers replay threat defense
    const replayRes = await app.request(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token1 })
      },
      env
    )

    expect(replayRes.status).toBe(401)
    const replayData = (await replayRes.json()) as { error: string }
    expect(replayData.error).toContain('Compromised refresh token reuse detected')
  })

  it('logs out and revokes refresh token session', async () => {
    // 1. Login
    const loginRes = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '10.0.0.6'
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'CrispyShanghai2026!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    const { refreshToken } = (await loginRes.json()) as { refreshToken: string }

    // 2. Logout
    const logoutRes = await app.request(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      },
      env
    )

    expect(logoutRes.status).toBe(200)

    // 3. Trying to refresh with logged-out token fails
    const postLogoutRefresh = await app.request(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      },
      env
    )

    expect(postLogoutRefresh.status).toBe(401)
  })

  it('rate limiting middleware blocks repeated requests from abusive IP with 429', async () => {
    const abusiveIp = '198.51.100.99'

    // Make 5 requests (the allowed threshold)
    for (let i = 0; i < 5; i++) {
      await app.request(
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cf-connecting-ip': abusiveIp
          },
          body: JSON.stringify({
            email: 'admin@lumpiaboss.ph',
            password: 'WrongPassword!',
            recaptchaToken: MOCK_RECAPTCHA
          })
        },
        env
      )
    }

    // 6th request must be intercepted by rate limiter middleware with 429 Too Many Requests
    const blockedRes = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': abusiveIp
        },
        body: JSON.stringify({
          email: 'admin@lumpiaboss.ph',
          password: 'WrongPassword!',
          recaptchaToken: MOCK_RECAPTCHA
        })
      },
      env
    )

    expect(blockedRes.status).toBe(429)
    expect(blockedRes.headers.get('Retry-After')).toBeTruthy()
    const blockedData = (await blockedRes.json()) as { code: string; error: string }
    expect(blockedData.code).toBe('TOO_MANY_REQUESTS')
    expect(blockedData.error).toContain('Too many login attempts')
  })
})
