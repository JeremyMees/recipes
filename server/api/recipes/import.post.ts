import { recipeImportSchema } from '../../../shared/schemas/recipe'
import type { RecipeImportResult } from '../../../shared/types/recipe'

function pageText(html: string): string {
  return stripHtml(html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html)
}

export default defineEventHandler(
  async (event): Promise<RecipeImportResult> => {
    await requireUserSession(event)

    const { url } = await readValidatedBody(event, recipeImportSchema.parse)

    if (isSocialUrl(url)) {
      return { source: 'social', draft: await toRecipeDraft(emptyDraft(url)) }
    }

    const html = await fetchPageHtml(url)

    if (!html) {
      return {
        source: 'unreachable',
        draft: await toRecipeDraft(emptyDraft(url)),
      }
    }

    const { draft, source } = htmlToRecipeDraft(html, url)

    if (draft.ingredients.length) {
      return { source, draft: await toRecipeDraft(draft) }
    }

    const rescued = await textToRecipeDraft(pageText(html), url)

    if (rescued) {
      return {
        source: 'ai',
        draft: await toRecipeDraft({ ...rescued, imageUrl: draft.imageUrl }),
      }
    }

    return { source, draft: await toRecipeDraft(draft) }
  },
)
