export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!

  const recipe = await findRecipeForUser(id, user.id)

  if (!recipe) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recept niet gevonden',
    })
  }

  return recipe
})
