import { recipeUpdateSchema } from '../../../shared/schemas/recipe'

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const id = getRouterParam(event, 'id')!
  const input = await readValidatedBody(event, recipeUpdateSchema.parse)

  const updated = await updateOwnRecipe(id, user.id, input)

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recept niet gevonden',
    })
  }

  return updated
})
