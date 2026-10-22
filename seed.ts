import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const seedDatabase = async () => {
  try {
    if (process.env.ENVIRONMENT === 'production') {
      config({ path: './.prod.vars' })
    } else {
      config({ path: './.dev.vars' })
    }

    const DATABASE_URL = process.env.DATABASE_URL
    if (!DATABASE_URL) {
      throw new Error('Missing Environment Variable: DATABASE_URL')
    }

    const client = neon(DATABASE_URL)
    drizzle(client, { casing: 'snake_case' })

    console.log('ℹ️ No domain tables configured yet for seeding. Seeding placeholder ready.')
  } catch (error: unknown) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seedDatabase()
