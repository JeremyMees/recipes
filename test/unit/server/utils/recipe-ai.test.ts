import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  config: { anthropicApiKey: 'sk-test', anthropicModel: '' },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { parse: mocks.parse }
  },
}))
vi.mock('#app', () => ({ useRuntimeConfig: () => mocks.config }))

const { isRecipeAiEnabled, textToRecipeDraft } =
  await import('~~/server/utils/recipe-ai')

const extracted = {
  title: 'Pasta pesto',
  description: 'Snel klaar',
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 12,
  ingredients: ['200 g spaghetti', '3 el pesto'],
  instructions: ['Kook de pasta.', 'Roer de pesto erdoor.'],
  tags: [' Italiaans ', 'SNEL', ''],
  notes: null,
}

beforeEach(() => {
  mocks.config.anthropicApiKey = 'sk-test'
  mocks.config.anthropicModel = ''
  mocks.parse.mockResolvedValue({ parsed_output: extracted })
})

describe('isRecipeAiEnabled', () => {
  it('follows whether a key is configured', () => {
    expect(isRecipeAiEnabled()).toBe(true)

    mocks.config.anthropicApiKey = ''

    expect(isRecipeAiEnabled()).toBe(false)
  })
})

describe('textToRecipeDraft', () => {
  it('turns a caption into a parsed recipe', async () => {
    const draft = await textToRecipeDraft(
      'Pasta pesto 🌿 #lekker',
      'https://www.instagram.com/p/abc/',
    )

    expect(draft).toMatchObject({
      title: 'Pasta pesto',
      servings: 2,
      ingredients: ['200 g spaghetti', '3 el pesto'],
      imageUrl: null,
      sourceUrl: 'https://www.instagram.com/p/abc/',
      sourceName: 'instagram.com',
    })
  })

  it('normalises tags and drops empty ones', async () => {
    const draft = await textToRecipeDraft('tekst', null)

    expect(draft!.tags).toEqual(['italiaans', 'snel'])
    expect(draft!.sourceName).toBeNull()
  })

  it('defaults to haiku but honours a configured model', async () => {
    await textToRecipeDraft('tekst', null)

    expect(mocks.parse.mock.calls[0]![0].model).toBe('claude-haiku-4-5')

    mocks.config.anthropicModel = 'claude-sonnet-5'
    await textToRecipeDraft('tekst', null)

    expect(mocks.parse.mock.calls[1]![0].model).toBe('claude-sonnet-5')
  })

  it('caps how much text it sends', async () => {
    await textToRecipeDraft('a'.repeat(50_000), null)

    expect(mocks.parse.mock.calls[0]![0].messages[0].content).toHaveLength(
      20_000,
    )
  })

  it('skips the call without an api key', async () => {
    mocks.config.anthropicApiKey = ''

    await expect(textToRecipeDraft('tekst', null)).resolves.toBeUndefined()
    expect(mocks.parse).not.toHaveBeenCalled()
  })

  it('skips the call for blank text', async () => {
    await expect(textToRecipeDraft('   ', null)).resolves.toBeUndefined()
    expect(mocks.parse).not.toHaveBeenCalled()
  })

  it('gives up when the model finds no recipe', async () => {
    mocks.parse.mockResolvedValue({
      parsed_output: { ...extracted, title: '' },
    })

    await expect(textToRecipeDraft('hallo', null)).resolves.toBeUndefined()
  })

  it('gives up when parsing fails', async () => {
    mocks.parse.mockResolvedValue({ parsed_output: null })

    await expect(textToRecipeDraft('hallo', null)).resolves.toBeUndefined()
  })

  it('swallows an api error', async () => {
    mocks.parse.mockRejectedValue(new Error('rate limited'))

    await expect(textToRecipeDraft('hallo', null)).resolves.toBeUndefined()
  })
})
