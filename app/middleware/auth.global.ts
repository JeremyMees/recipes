const publicRoutes = new Set(['/login'])

export default defineNuxtRouteMiddleware(to => {
  const { loggedIn } = useUserSession()

  if (publicRoutes.has(to.path)) {
    return loggedIn.value ? navigateTo('/') : undefined
  }

  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
