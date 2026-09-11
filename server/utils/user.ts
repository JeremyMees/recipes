import { and, eq } from 'drizzle-orm'
import { oauthAccounts, users } from '../database/schema'
import type { UserRow } from '../database/schema'

export interface OAuthProfile {
  provider: string
  providerAccountId: string
  email: string
  name?: string | null
  avatarUrl?: string | null
}

export async function findUserByEmail(
  email: string,
): Promise<UserRow | undefined> {
  const db = useDb()

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)

  return user
}

async function findUserByOAuthAccount(
  provider: string,
  providerAccountId: string,
): Promise<UserRow | undefined> {
  const db = useDb()

  const [row] = await db
    .select({ user: users })
    .from(oauthAccounts)
    .innerJoin(users, eq(users.id, oauthAccounts.userId))
    .where(
      and(
        eq(oauthAccounts.provider, provider),
        eq(oauthAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1)

  return row?.user
}

export async function upsertOAuthUser(profile: OAuthProfile): Promise<UserRow> {
  const db = useDb()
  const email = profile.email.trim().toLowerCase()

  const linked = await findUserByOAuthAccount(
    profile.provider,
    profile.providerAccountId,
  )

  if (linked) return linked

  const existing = await findUserByEmail(email)

  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({
          email,
          name: profile.name ?? null,
          avatarUrl: profile.avatarUrl ?? null,
        })
        .returning()
    )[0]!

  await db
    .insert(oauthAccounts)
    .values({
      userId: user.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
    })
    .onConflictDoNothing()

  return user
}

export function toSessionUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  }
}
