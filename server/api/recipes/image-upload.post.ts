import { z } from 'zod'

const bodySchema = z.object({
  contentType: z.literal('image/webp'),
})

export default defineEventHandler(async event => {
  await requireUserSession(event)

  const { contentType } = await readValidatedBody(event, bodySchema.parse)
  const key = recipeImageKey(contentType)
  const url = recipeImageUrl(key)

  if (!url) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Object storage is not configured',
    })
  }

  return {
    key,
    url,
    uploadUrl: await presignRecipeImageUpload(key, contentType),
    headers: uploadHeaders(contentType),
  }
})
