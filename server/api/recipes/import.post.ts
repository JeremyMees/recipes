import { recipeImportSchema } from '../../../shared/schemas/recipe'
import type {
  ParsedRecipe,
  RecipeDraft,
  RecipeImportResult,
} from '../../../shared/types/recipe'

async function toDraft(parsed: ParsedRecipe): Promise<RecipeDraft> {
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

export default defineEventHandler(
  async (event): Promise<RecipeImportResult> => {
    await requireUserSession(event)

    const { url } = await readValidatedBody(event, recipeImportSchema.parse)

    const html = await fetchPageHtml(url)

    if (!html) {
      return {
        source: 'unreachable',
        draft: await toDraft(htmlToRecipeDraft('', url).draft),
      }
    }

    const { draft, source } = htmlToRecipeDraft(html, url)

    return { source, draft: await toDraft(draft) }
  },
)
