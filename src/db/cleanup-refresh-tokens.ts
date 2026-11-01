import { desc, eq, inArray, isNotNull, lt, or } from 'drizzle-orm'

import { createDb } from '~/db/client'
import { refreshTokens } from '~/db/schema'

const runCleanup = async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is missing.')
    process.exit(1)
  }

  const db = createDb(databaseUrl)
  console.log('🧹 Starting cleanup of refresh tokens in database...')

  try {
    const allBefore = await db.select().from(refreshTokens)
    console.log(`📊 Found ${allBefore.length} total refresh token records currently in database.`)

    const now = new Date()

    // 1. Delete all expired or revoked tokens
    const deletedStale = await db
      .delete(refreshTokens)
      .where(or(lt(refreshTokens.expiresAt, now), isNotNull(refreshTokens.revokedAt)))

    console.log(`🗑️ Deleted ${deletedStale.rowCount ?? 0} expired or revoked tokens.`)

    // 2. Prune old active sessions per user (keep max 3 latest)
    const remaining = await db.select().from(refreshTokens)
    const tokensByUser = new Map<string, typeof remaining>()

    for (const token of remaining) {
      const list = tokensByUser.get(token.userId) || []
      list.push(token)
      tokensByUser.set(token.userId, list)
    }

    let prunedCount = 0
    for (const [userId, tokens] of tokensByUser) {
      if (tokens.length > 3) {
        // Sort descending by createdAt
        const sorted = tokens.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const excessIds = sorted.slice(3).map((t) => t.id)
        if (excessIds.length > 0) {
          const res = await db.delete(refreshTokens).where(inArray(refreshTokens.id, excessIds))
          prunedCount += res.rowCount ?? 0
        }
      }
    }

    if (prunedCount > 0) {
      console.log(`✂️ Pruned ${prunedCount} excess active sessions (kept 3 latest per user).`)
    }

    const allAfter = await db.select().from(refreshTokens)
    console.log(`✅ Cleanup complete! Remaining active tokens in database: ${allAfter.length}`)
  } catch (error: unknown) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

runCleanup()
