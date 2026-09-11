export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['openid', 'email', 'profile'],
  },
  async onSuccess(event, { user }) {
    return completeOAuthLogin(event, {
      provider: 'google',
      providerAccountId: String(user.sub),
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.picture ?? null,
    })
  },
  onError: failOAuthLogin,
})
