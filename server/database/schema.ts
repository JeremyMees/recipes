import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  name: text(),
  avatarUrl: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  t => [unique().on(t.provider, t.providerAccountId), index().on(t.userId)],
)

export const recipes = pgTable(
  'recipes',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text(),
    imageKey: text(),
    sourceUrl: text(),
    sourceName: text(),
    servings: integer(),
    prepMinutes: integer(),
    cookMinutes: integer(),
    ingredients: jsonb().$type<string[]>().notNull().default([]),
    instructions: jsonb().$type<string[]>().notNull().default([]),
    tags: text().array().notNull().default([]),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  t => [index().on(t.userId), index().on(t.createdAt)],
)

export type UserRow = typeof users.$inferSelect
export type RecipeRow = typeof recipes.$inferSelect
