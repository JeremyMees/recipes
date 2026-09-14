import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RecipeGrid from '~/components/recipe-grid.vue'
import { listItemById as makeRecipe } from '~~/test/fixtures/recipes'
import { testId } from '~~/test/unit/stubs/selectors'

const observers: {
  callback: (entries: { isIntersecting: boolean }[]) => void
}[] = []

class IntersectionObserverStub {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    observers.push({ callback })
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)

function mount(props: Record<string, unknown>) {
  return mountSuspended(RecipeGrid, {
    props: { error: null, ...props },
  })
}

describe('RecipeGrid', () => {
  beforeEach(() => {
    observers.length = 0
  })

  it('shows the error state above everything else', async () => {
    const component = await mount({
      error: new Error('boom'),
      pending: true,
      recipes: [makeRecipe('r1')],
    })

    expect(component.find(testId('recipe-grid-error')).exists()).toBe(true)
    expect(component.find(testId('recipe-grid')).exists()).toBe(false)
    expect(component.find(testId('recipe-grid-skeleton')).exists()).toBe(false)
  })

  it('shows skeletons while the first load is pending', async () => {
    const component = await mount({ pending: true, recipes: [] })

    expect(component.findAll(testId('recipe-grid-skeleton'))).toHaveLength(6)
    expect(component.find(testId('recipe-grid-empty')).exists()).toBe(false)
  })

  it('keeps showing results while refetching', async () => {
    const component = await mount({
      pending: true,
      recipes: [makeRecipe('r1')],
    })

    expect(component.find(testId('recipe-grid')).exists()).toBe(true)
    expect(component.find(testId('recipe-grid-skeleton')).exists()).toBe(false)
  })

  it('shows the empty state with the given copy', async () => {
    const component = await mount({
      recipes: [],
      emptyTitle: 'Nog geen recepten',
      emptyDescription: 'Plak een link om te beginnen.',
    })

    const empty = component.get(testId('recipe-grid-empty'))

    expect(empty.text()).toContain('Nog geen recepten')
    expect(empty.text()).toContain('Plak een link om te beginnen.')
  })

  it('renders a card per recipe', async () => {
    const component = await mount({
      recipes: [makeRecipe('r1'), makeRecipe('r2')],
    })

    expect(component.findAll(testId('recipe-card'))).toHaveLength(2)
  })

  it('hides the sentinel when there is nothing left to load', async () => {
    const component = await mount({ recipes: [makeRecipe('r1')] })

    expect(component.find(testId('recipe-grid-sentinel')).exists()).toBe(false)
  })

  it('asks for the next page as soon as the sentinel comes into view', async () => {
    const component = await mount({
      recipes: [makeRecipe('r1')],
      hasMore: true,
    })

    expect(component.find(testId('recipe-grid-sentinel')).exists()).toBe(true)
    expect(component.emitted('loadMore')).toBeUndefined()

    observers.at(-1)!.callback([{ isIntersecting: true }])

    expect(component.emitted('loadMore')).toHaveLength(1)
  })

  it('stays put while the sentinel is off screen', async () => {
    const component = await mount({
      recipes: [makeRecipe('r1')],
      hasMore: true,
    })

    observers.at(-1)!.callback([{ isIntersecting: false }])

    expect(component.emitted('loadMore')).toBeUndefined()
  })

  it('passes showAuthor through to the cards', async () => {
    const hidden = await mount({ recipes: [makeRecipe('r1')] })

    expect(hidden.find(testId('recipe-card-author')).exists()).toBe(false)

    const shown = await mount({
      recipes: [makeRecipe('r1')],
      showAuthor: true,
    })

    expect(shown.get(testId('recipe-card-author')).text()).toBe('Mama')
  })
})
