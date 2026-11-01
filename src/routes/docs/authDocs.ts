import { describeRoute } from 'hono-openapi'

export const loginRouteDoc = describeRoute({
  description:
    'Authenticate admin credentials with reCAPTCHA anti-bot validation and rate limiting',
  tags: ['Auth'],
  responses: {
    200: { description: 'Authentication successful. Returns tokens and user details.' },
    400: { description: 'Bad request or reCAPTCHA validation failed.' },
    401: { description: 'Invalid credentials or inactive account.' },
    429: { description: 'Rate limit exceeded. Too many login attempts.' }
  }
})

export const refreshRouteDoc = describeRoute({
  description: 'Rotate refresh token and issue a fresh access/refresh token pair',
  tags: ['Auth'],
  responses: {
    200: { description: 'Token rotation successful.' },
    401: { description: 'Invalid, expired, or reused refresh token.' },
    429: { description: 'Rate limit exceeded.' }
  }
})

export const logoutRouteDoc = describeRoute({
  description: 'Invalidate refresh token and clear session cookies',
  tags: ['Auth'],
  responses: {
    200: { description: 'Successfully signed out.' }
  }
})

export const meRouteDoc = describeRoute({
  description: 'Retrieve profile of currently authenticated user',
  tags: ['Auth'],
  responses: {
    200: { description: 'User profile retrieved successfully.' },
    401: { description: 'Authentication required or token expired.' }
  }
})

export const seedAdminRouteDoc = describeRoute({
  description:
    'Provision initial administrator account (secured by environment secret or dev mode)',
  tags: ['Auth'],
  responses: {
    200: { description: 'Admin user already provisioned.' },
    201: { description: 'Admin user created successfully.' },
    401: { description: 'Unauthorized provisioning request.' }
  }
})
