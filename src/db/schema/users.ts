import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'MANAGING_PARTNER',
  'OPERATOR',
  'SHAREHOLDER_VIEWER'
])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('SUPER_ADMIN').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
