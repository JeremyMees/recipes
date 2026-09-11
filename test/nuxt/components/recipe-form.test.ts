import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import RecipeForm from '~/components/recipe-form.vue'
import { stubObjectUrls } from '~~/test/unit/stubs/canvas'
import { testId } from '~~/test/unit/stubs/selectors'

vi.mock('~/utils/image', () => ({
  toWebpBlob: async () => new Blob(['webp'], { type: 'image/webp' }),
}))

stubObjectUrls()

function mount(props: Record<string, unknown> = {}) {
  return mountSuspended(RecipeForm, {
    props,
    global: {
      plugins: [
        [
          VueQueryPlugin,
          {
            queryClient: new QueryClient({
              defaultOptions: { mutations: { retry: false } },
            }),
          },
        ],
      ],
    },
  })
}

async function submit(component: Awaited<ReturnType<typeof mount>>) {
  await component.get(testId('recipe-form')).trigger('submit')
  await expect.poll(() => component.emitted('submit')).toBeDefined()

  return component.emitted('submit')!.at(-1)![0] as Record<string, unknown>
}

describe('RecipeForm', () => {
  it('starts blank when there is nothing to prefill', async () => {
    const component = await mount()

    expect(
      (component.get(testId('recipe-form-title')).element as HTMLInputElement)
        .value,
    ).toBe('')
  })

  it('prefills from the initial recipe', async () => {
    const component = await mount({ initial: { title: 'Spaghetti' } })

    expect(
      (component.get(testId('recipe-form-title')).element as HTMLInputElement)
        .value,
    ).toBe('Spaghetti')
  })

  it('refills when the initial recipe arrives later', async () => {
    const component = await mount({ initial: null })

    await component.setProps({ initial: { title: 'Pas ingelezen' } })
    await component.vm.$nextTick()

    expect(
      (component.get(testId('recipe-form-title')).element as HTMLInputElement)
        .value,
    ).toBe('Pas ingelezen')
  })

  it('clears fields the new recipe does not set', async () => {
    const component = await mount({
      initial: { title: 'Eerste', notes: 'Oude notitie' },
    })

    await component.setProps({ initial: { title: 'Tweede' } })

    expect(await submit(component)).toMatchObject({
      title: 'Tweede',
      notes: null,
    })
  })

  it('submits the schema defaults for a minimal recipe', async () => {
    const component = await mount({ initial: { title: 'Soep' } })

    expect(await submit(component)).toMatchObject({
      title: 'Soep',
      description: null,
      imageKey: null,
      servings: null,
      ingredients: [],
      instructions: [],
      tags: [],
    })
  })

  it('submits the lists it was given', async () => {
    const component = await mount({
      initial: {
        title: 'Soep',
        ingredients: ['1 ui', '2 wortels'],
        instructions: ['Snijden.'],
        tags: ['soep'],
      },
    })

    expect(await submit(component)).toMatchObject({
      ingredients: ['1 ui', '2 wortels'],
      instructions: ['Snijden.'],
      tags: ['soep'],
    })
  })

  it('will not submit a recipe with no name', async () => {
    const component = await mount()

    await component.get(testId('recipe-form')).trigger('submit')
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(component.emitted('submit')).toBeUndefined()
  })

  it('uses the given submit label', async () => {
    const component = await mount({ submitLabel: 'Wijzigingen bewaren' })

    expect(component.get(testId('recipe-form-submit')).text()).toContain(
      'Wijzigingen bewaren',
    )
  })

  it('renders an editor for ingredients and one for instructions', async () => {
    const component = await mount({
      initial: {
        title: 'Soep',
        ingredients: ['1 ui'],
        instructions: ['Snij.'],
      },
    })

    expect(component.findAll(testId('list-row'))).toHaveLength(2)
  })
})
