import { recipeInputSchema } from '../../../shared/schemas/recipe'

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event)
  const input = await readValidatedBody(event, recipeInputSchema.parse)

  return createRecipe(user.id, input)
})
