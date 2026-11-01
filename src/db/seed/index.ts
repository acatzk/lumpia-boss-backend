import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from '~/db/schema'

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
    const db = drizzle(client, { schema, casing: 'snake_case' })

    const defaultAdminEmail = 'admin@lumpiaboss.ph'
    const defaultAdminPassword = 'admin'
    const defaultAdminName = 'Lumpia Boss Administrator'

    console.log(`Checking if default admin (${defaultAdminEmail}) exists...`)

    const [existingAdmin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, defaultAdminEmail))
      .limit(1)

    if (existingAdmin) {
      console.log(`ℹ️ Admin user already exists (ID: ${existingAdmin.id}).`)
    } else {
      console.log('Seeding initial admin account...')
      const passwordHash = await bcrypt.hash(defaultAdminPassword, 12)

      const [newAdmin] = await db
        .insert(schema.users)
        .values({
          email: defaultAdminEmail,
          passwordHash,
          name: defaultAdminName,
          role: 'SUPER_ADMIN',
          isActive: true
        })
        .returning()

      console.log(`✅ Default admin successfully seeded: ${newAdmin.email} (ID: ${newAdmin.id})`)
    }
  } catch (error: unknown) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seedDatabase()
