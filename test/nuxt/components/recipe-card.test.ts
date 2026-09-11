import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RecipeCard from '~/components/recipe-card.vue'
import { listItem as makeRecipe, listItemById } from '~~/test/fixtures/recipes'
import type { RecipeListItem } from '#shared/types/recipe'
import { testId } from '~~/test/unit/stubs/selectors'
import { injectHead } from '#imports'

function mount(
  props: Partial<{
    recipe: RecipeListItem
    index: number
    showAuthor: boolean
  }>,
) {
  return mountSuspended(RecipeCard, {
    props: { recipe: makeRecipe(), index: 0, ...props },
  })
}

function preloadMediaFor(recipeId: string) {
  return [...injectHead().entries.values()]
    .flatMap(entry => {
      const input = entry.input as { link?: { key: string; media: string }[] }
      return typeof input === 'object' && input !== null
        ? (input.link ?? [])
        : []
    })
    .filter(link => link.key.endsWith(`-${recipeId}`))
    .map(link => link.media)
}

describe('RecipeCard', () => {
  it('links to the recipe detail page', async () => {
    const component = await mount({})

    expect(component.get(testId('recipe-card')).attributes('href')).toBe(
      '/recipes/r1',
    )
  })

  it('shows the title and description', async () => {
    const component = await mount({})

    expect(component.get(testId('recipe-card-title')).text()).toBe(
      'Spaghetti bolognese',
    )
    expect(component.get(testId('recipe-card-description')).text()).toBe(
      'Klassieke pastasaus',
    )
  })

  it('hides the description when there is none', async () => {
    const component = await mount({ recipe: makeRecipe({ description: null }) })

    expect(component.find(testId('recipe-card-description')).exists()).toBe(
      false,
    )
  })

  it('sums prep and cook time into one duration', async () => {
    const component = await mount({
      recipe: makeRecipe({ prepMinutes: 15, cookMinutes: 30 }),
    })

    expect(component.get(testId('recipe-card-duration')).text()).toBe('45 min')
    expect(component.get(testId('recipe-card-servings')).text()).toBe(
      '4 personen',
    )
  })

  it('omits the duration and servings when unknown', async () => {
    const component = await mount({
      recipe: makeRecipe({
        prepMinutes: null,
        cookMinutes: null,
        servings: null,
      }),
    })

    expect(component.find(testId('recipe-card-duration')).exists()).toBe(false)
    expect(component.find(testId('recipe-card-servings')).exists()).toBe(false)
  })

  it('renders the image when there is one', async () => {
    const component = await mount({
      recipe: makeRecipe({ imageUrl: 'https://x.test/a.jpg' }),
    })

    expect(component.get(testId('recipe-card-image')).attributes('src')).toBe(
      'https://x.test/a.jpg',
    )
    expect(component.find(testId('recipe-card-image-fallback')).exists()).toBe(
      false,
    )
  })

  it('eager loads the first six images and lazy loads the rest', async () => {
    const early = await mount({
      recipe: makeRecipe({ imageUrl: 'https://x.test/a.jpg' }),
      index: 5,
    })
    const late = await mount({
      recipe: makeRecipe({ imageUrl: 'https://x.test/a.jpg' }),
      index: 6,
    })

    expect(early.get(testId('recipe-card-image')).attributes('loading')).toBe(
      'eager',
    )
    expect(late.get(testId('recipe-card-image')).attributes('loading')).toBe(
      'lazy',
    )
  })

  it('preloads for both mobile and larger screens within the first two cards', async () => {
    const component = await mount({
      recipe: listItemById('preload-1', { imageUrl: 'https://x.test/a.jpg' }),
      index: 1,
    })

    expect(preloadMediaFor('preload-1')).toEqual(
      expect.arrayContaining(['(max-width: 639px)', '(min-width: 640px)']),
    )

    component.unmount()
  })

  it('preloads for larger screens only between the third and fourth cards', async () => {
    const component = await mount({
      recipe: listItemById('preload-2', { imageUrl: 'https://x.test/a.jpg' }),
      index: 3,
    })
    const media = preloadMediaFor('preload-2')

    expect(media).toContain('(min-width: 640px)')
    expect(media).not.toContain('(max-width: 639px)')

    component.unmount()
  })

  it('does not preload past the first four cards', async () => {
    const component = await mount({
      recipe: listItemById('preload-3', { imageUrl: 'https://x.test/a.jpg' }),
      index: 4,
    })

    expect(preloadMediaFor('preload-3')).toHaveLength(0)

    component.unmount()
  })

  it('does not preload an image when there is none', async () => {
    const component = await mount({
      recipe: listItemById('preload-4', { imageUrl: null }),
      index: 0,
    })

    expect(preloadMediaFor('preload-4')).toHaveLength(0)

    component.unmount()
  })

  it('falls back to a placeholder without an image', async () => {
    const component = await mount({ recipe: makeRecipe({ imageUrl: null }) })

    expect(component.find(testId('recipe-card-image')).exists()).toBe(false)
    expect(component.find(testId('recipe-card-image-fallback')).exists()).toBe(
      true,
    )
  })

  it('only shows the author when asked to', async () => {
    const hidden = await mount({})

    expect(hidden.find(testId('recipe-card-author')).exists()).toBe(false)

    const shown = await mount({ showAuthor: true })

    expect(shown.get(testId('recipe-card-author')).text()).toBe('Mama')
  })

  it('names the image and title for a shared view transition with the detail page', async () => {
    const component = await mount({
      recipe: makeRecipe({ imageUrl: 'https://x.test/a.jpg' }),
    })

    expect(
      component.get(testId('recipe-card-image')).attributes('style'),
    ).toContain('view-transition-name: recipe-image-r1')
    expect(
      component.get(testId('recipe-card-title')).attributes('style'),
    ).toContain('view-transition-name: recipe-title-r1')
  })

  it('shows at most three tags', async () => {
    const component = await mount({
      recipe: makeRecipe({
        tags: ['pasta', 'italiaans', 'snel', 'hoofdgerecht'],
      }),
    })

    const tags = component.findAll(testId('recipe-card-tag'))

    expect(tags).toHaveLength(3)
    expect(tags.map(tag => tag.text())).toEqual(['pasta', 'italiaans', 'snel'])
  })
})
