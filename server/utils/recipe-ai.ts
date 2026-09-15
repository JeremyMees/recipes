import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { ParsedRecipe } from '../../shared/types/recipe'

const MAX_INPUT_CHARS = 20_000
const DEFAULT_MODEL = 'claude-haiku-4-5'

const extractedRecipeSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  servings: z.number().int().nullable(),
  prepMinutes: z.number().int().nullable(),
  cookMinutes: z.number().int().nullable(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
})

const SYSTEM = `Je zet vrije tekst om in een gestructureerd recept.

De tekst komt meestal van een social-mediabijschrift (Instagram, Facebook) of van een gekopieerde webpagina, en bevat vaak rommel: emoji, hashtags, "link in bio", reacties, cookiemeldingen, navigatie.

Regels:
- Schrijf het recept in dezelfde taal als de brontekst.
- Laat hoeveelheden staan zoals ze er staan, één ingrediënt per regel, zonder opsommingstekens.
- Elke bereidingsstap is één zin of alinea, zonder nummering vooraan.
- Neem alleen over wat er echt staat. Verzin geen hoeveelheden, tijden of stappen.
- Zet onbekende velden op null en gebruik lege lijsten waar niets staat.
- tags: hooguit zes korte kleine-letter-trefwoorden (keukenstijl, gang, dieet). Geen hashtags.
- notes: alleen losse tips die geen bereidingsstap zijn.
- Staat er geen recept in de tekst, geef dan een lege title en lege lijsten terug.`

let client: Anthropic | undefined

function anthropic(apiKey: string): Anthropic {
  client ??= new Anthropic({ apiKey })

  return client
}

export function isRecipeAiEnabled(): boolean {
  return Boolean(useRuntimeConfig().anthropicApiKey)
}

export async function textToRecipeDraft(
  text: string,
  sourceUrl: string | null,
): Promise<ParsedRecipe | undefined> {
  const config = useRuntimeConfig()

  if (!config.anthropicApiKey) return undefined

  const input = text.trim().slice(0, MAX_INPUT_CHARS)

  if (!input) return undefined

  try {
    const response = await anthropic(config.anthropicApiKey).messages.parse({
      model: config.anthropicModel || DEFAULT_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: 'user', content: input }],
      output_config: { format: zodOutputFormat(extractedRecipeSchema) },
    })

    const parsed = response.parsed_output

    if (!parsed?.title) return undefined

    return {
      ...parsed,
      imageUrl: null,
      sourceUrl,
      sourceName: sourceUrl ? hostnameOf(sourceUrl) : null,
      tags: parsed.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean),
    }
  } catch {
    return undefined
  }
}
