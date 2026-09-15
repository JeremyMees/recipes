import { recipeTextImportSchema } from '../../../shared/schemas/recipe'
import type { RecipeImportResult } from '../../../shared/types/recipe'

export default defineEventHandler(
  async (event): Promise<RecipeImportResult> => {
    await requireUserSession(event)

    const { text, sourceUrl } = await readValidatedBody(
      event,
      recipeTextImportSchema.parse,
    )

    const source = sourceUrl ?? null
    const parsed = await textToRecipeDraft(text, source)

    if (!parsed) {
      return { source: 'none', draft: await toRecipeDraft(emptyDraft(source)) }
    }

    return { source: 'ai', draft: await toRecipeDraft(parsed) }
  },
)
