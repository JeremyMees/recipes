import type { H3Event } from 'h3'

export async function completeOAuthLogin(
  event: H3Event,
  profile: OAuthProfile,
) {
  const { familyEmails } = useRuntimeConfig(event)

  if (!isAllowedEmail(profile.email, familyEmails)) {
    return sendRedirect(event, '/login?error=not_allowed')
  }

  const user = await upsertOAuthUser(profile)

  await setUserSession(event, {
    user: toSessionUser(user),
    loggedInAt: new Date().toISOString(),
  })

  return sendRedirect(event, '/')
}

export function failOAuthLogin(event: H3Event, error: unknown) {
  console.error('OAuth login failed', error)

  return sendRedirect(event, '/login?error=oauth_failed')
}
