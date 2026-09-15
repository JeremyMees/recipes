import type { ParsedRecipe, RecipeDraft } from '../../shared/types/recipe'

export async function toRecipeDraft(
  parsed: ParsedRecipe,
): Promise<RecipeDraft> {
  const { imageUrl, ...rest } = parsed

  const blank = { ...rest, imageKey: null, imageUrl: null }

  if (!imageUrl) return blank

  const image = await fetchRemoteImage(imageUrl)

  if (!image) return blank

  try {
    const key = await putRecipeImage(image.body, image.contentType)

    return { ...rest, imageKey: key, imageUrl: recipeImageUrl(key) }
  } catch {
    return blank
  }
}
