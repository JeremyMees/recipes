import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RecipeCard from '~/components/recipe-card.vue'
import { listItem as makeRecipe } from '~~/test/fixtures/recipes'
import type { RecipeListItem } from '#shared/types/recipe'
import { testId } from '~~/test/unit/stubs/selectors'

function mount(
  props: Partial<{ recipe: RecipeListItem; showAuthor: boolean }>,
) {
  return mountSuspended(RecipeCard, {
    props: { recipe: makeRecipe(), ...props },
  })
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
