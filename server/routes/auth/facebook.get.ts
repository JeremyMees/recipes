export default defineOAuthFacebookEventHandler({
  config: {
    scope: ['email'],
    fields: ['id', 'name', 'email', 'picture'],
  },
  async onSuccess(event, { user }) {
    return completeOAuthLogin(event, {
      provider: 'facebook',
      providerAccountId: String(user.id),
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.picture?.data?.url ?? null,
    })
  },
  onError: failOAuthLogin,
})
