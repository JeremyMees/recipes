export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!

  const deleted = await deleteOwnRecipe(id, user.id)

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recept niet gevonden',
    })
  }

  return { id }
})
