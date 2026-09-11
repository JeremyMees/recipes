import { recipeQuerySchema } from '../../../shared/schemas/recipe'

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const query = await getValidatedQuery(event, recipeQuerySchema.parse)

  return listOwnRecipes(user.id, query)
})
