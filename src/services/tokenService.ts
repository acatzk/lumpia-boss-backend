import { desc, eq, inArray, lt, or } from 'drizzle-orm'
import { sign, verify } from 'hono/jwt'

import { refreshTokens, users } from '~/db/schema'
import type { AppContext, JwtAccessPayload, SafeUser } from '~/types'

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60 // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 7 // 7 days
const REMEMBER_ME_EXPIRY_DAYS = 30 // 30 days
const MAX_CONCURRENT_SESSIONS_PER_USER = 5
const REVOKED_TOKEN_GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes retention for replay detection

export const generateRandomToken = (bytes = 32): string => {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const hashToken = async (token: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const tokenService = {
  /**
   * Auto cleanup expired, revoked, and excess active sessions.
   * Matches Filipino Reels Studio architecture by purging stale database rows.
   */
  autoCleanupTokens: async (c: AppContext, userId?: string): Promise<number> => {
    try {
      const now = new Date()
      const staleRevokedThreshold = new Date(Date.now() - REVOKED_TOKEN_GRACE_PERIOD_MS)

      // 1. Delete all expired tokens and revoked tokens past grace period
      const deletedStale = await c.var.db
        .delete(refreshTokens)
        .where(
          or(lt(refreshTokens.expiresAt, now), lt(refreshTokens.revokedAt, staleRevokedThreshold))
        )

      // 2. Limit active concurrent sessions per user (keep at most 5 latest active tokens)
      if (userId) {
        const userTokens = await c.var.db
          .select({ id: refreshTokens.id })
          .from(refreshTokens)
          .where(eq(refreshTokens.userId, userId))
          .orderBy(desc(refreshTokens.createdAt))

        if (userTokens.length > MAX_CONCURRENT_SESSIONS_PER_USER) {
          const excessIds = userTokens.slice(MAX_CONCURRENT_SESSIONS_PER_USER).map((t) => t.id)

          if (excessIds.length > 0) {
            await c.var.db.delete(refreshTokens).where(inArray(refreshTokens.id, excessIds))
          }
        }
      }

      return deletedStale.rowCount ?? 0
    } catch (error: unknown) {
      console.warn('[tokenService] autoCleanupTokens warning:', error)
      return 0
    }
  },

  generateAccessToken: async (user: SafeUser, secret: string): Promise<string> => {
    const now = Math.floor(Date.now() / 1000)
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      type: 'access',
      exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
      iat: now
    }
    return sign(payload, secret, 'HS256')
  },

  verifyAccessToken: async (token: string, secret: string): Promise<JwtAccessPayload> => {
    const payload = (await verify(token, secret, 'HS256')) as unknown as JwtAccessPayload
    if (!payload || payload.type !== 'access') {
      throw new Error('Invalid token payload type')
    }
    return payload
  },

  createRefreshToken: async (
    c: AppContext,
    userId: string,
    rememberMe = false,
    reqInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ token: string; expiresAt: Date }> => {
    // Proactive auto-cleanup: delete stale/expired/revoked sessions for this user and system
    await tokenService.autoCleanupTokens(c, userId)

    const token = generateRandomToken(48)
    const tokenHash = await hashToken(token)

    const expiryDays = rememberMe ? REMEMBER_ME_EXPIRY_DAYS : REFRESH_TOKEN_EXPIRY_DAYS
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

    await c.var.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
      userAgent: reqInfo?.userAgent,
      ipAddress: reqInfo?.ipAddress
    })

    return { token, expiresAt }
  },

  rotateRefreshToken: async (
    c: AppContext,
    oldToken: string,
    reqInfo?: { userAgent?: string; ipAddress?: string }
  ): Promise<{
    accessToken: string
    refreshToken: string
    user: SafeUser
  }> => {
    const hashed = await hashToken(oldToken)

    const [tokenRecord] = await c.var.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashed))
      .limit(1)

    if (!tokenRecord) {
      throw new Error('Refresh token not found or invalid')
    }

    // Threat detection: Replay attack on an already revoked refresh token!
    if (tokenRecord.revokedAt !== null) {
      // Invalidate ALL active refresh tokens for this user immediately as defensive measure
      await c.var.db.delete(refreshTokens).where(eq(refreshTokens.userId, tokenRecord.userId))

      throw new Error('Compromised refresh token reuse detected. All sessions terminated.')
    }

    if (tokenRecord.expiresAt < new Date()) {
      await c.var.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id))
      throw new Error('Refresh token expired')
    }

    const [userRecord] = await c.var.db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1)

    if (!userRecord || !userRecord.isActive) {
      await c.var.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id))
      throw new Error('Associated user account is deactivated or deleted')
    }

    // Revoke old token (kept temporarily for replay attack detection, cleaned up automatically by autoCleanupTokens)
    await c.var.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRecord.id))

    const safeUser: SafeUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt,
      createdAt: userRecord.createdAt,
      updatedAt: userRecord.updatedAt
    }

    const jwtSecret = c.env.JWT_SECRET || 'lumpia-boss-fallback-secret-development'
    const accessToken = await tokenService.generateAccessToken(safeUser, jwtSecret)
    const { token: newRefreshToken } = await tokenService.createRefreshToken(
      c,
      safeUser.id,
      false,
      reqInfo
    )

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: safeUser
    }
  },

  revokeRefreshToken: async (c: AppContext, token: string): Promise<boolean> => {
    const hashed = await hashToken(token)

    const [tokenRecord] = await c.var.db
      .select({ id: refreshTokens.id, userId: refreshTokens.userId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashed))
      .limit(1)

    if (!tokenRecord) {
      return false
    }

    // Delete all tokens for this user upon logout (matches Filipino Reels studio behavior)
    const result = await c.var.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, tokenRecord.userId))

    await tokenService.autoCleanupTokens(c)

    return (result.rowCount ?? 0) > 0
  }
}
