import { z } from 'zod'
import { recipeImageKeySchema } from '../../../shared/schemas/recipe'

const bodySchema = z.object({ key: recipeImageKeySchema })

export default defineEventHandler(async event => {
  await requireUserSession(event)

  const { key } = await readValidatedBody(event, bodySchema.parse)

  if (await isRecipeImageKeyInUse(key)) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Image is still attached to a recipe',
    })
  }

  await deleteRecipeImage(key)

  return { key }
})
