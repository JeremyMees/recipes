import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StringListEditor from '~/components/string-list-editor.vue'
import { testId } from '~~/test/unit/stubs/selectors'

function mount(props: Record<string, unknown> = {}) {
  return mountSuspended(StringListEditor, {
    props: { modelValue: ['1 ui', '2 tl zout', '150 gr wortel'], ...props },
  })
}

function lastEmit(component: Awaited<ReturnType<typeof mount>>) {
  const events = component.emitted('update:modelValue')

  return events?.at(-1)?.[0]
}

describe('StringListEditor', () => {
  it('renders one row per entry', async () => {
    const component = await mount()

    expect(component.findAll(testId('list-row'))).toHaveLength(3)
  })

  it('renders nothing but the add button when empty', async () => {
    const component = await mount({ modelValue: [] })

    expect(component.findAll(testId('list-row'))).toHaveLength(0)
    expect(component.find(testId('list-add')).exists()).toBe(true)
  })

  it('appends an empty entry when adding', async () => {
    const component = await mount()

    await component.get(testId('list-add')).trigger('click')

    expect(lastEmit(component)).toEqual([
      '1 ui',
      '2 tl zout',
      '150 gr wortel',
      '',
    ])
  })

  it('removes the entry at the clicked row', async () => {
    const component = await mount()

    await component.findAll(testId('list-remove'))[1]!.trigger('click')

    expect(lastEmit(component)).toEqual(['1 ui', '150 gr wortel'])
  })

  it('moves an entry up', async () => {
    const component = await mount()

    await component.findAll(testId('list-move-up'))[1]!.trigger('click')

    expect(lastEmit(component)).toEqual(['2 tl zout', '1 ui', '150 gr wortel'])
  })

  it('moves an entry down', async () => {
    const component = await mount()

    await component.findAll(testId('list-move-down'))[0]!.trigger('click')

    expect(lastEmit(component)).toEqual(['2 tl zout', '1 ui', '150 gr wortel'])
  })

  it('disables moving past either end', async () => {
    const component = await mount()

    const up = component.findAll(testId('list-move-up'))
    const down = component.findAll(testId('list-move-down'))

    expect(up[0]!.attributes('disabled')).toBeDefined()
    expect(up[2]!.attributes('disabled')).toBeUndefined()
    expect(down[2]!.attributes('disabled')).toBeDefined()
    expect(down[0]!.attributes('disabled')).toBeUndefined()
  })

  it('emits the edited entry without touching its neighbours', async () => {
    const component = await mount()

    await component.findAll(testId('list-field'))[1]!.setValue('1 tl peper')

    expect(lastEmit(component)).toEqual(['1 ui', '1 tl peper', '150 gr wortel'])
  })

  it('numbers the rows when asked to', async () => {
    const plain = await mount()

    expect(plain.findAll(testId('list-position'))).toHaveLength(0)

    const numbered = await mount({ numbered: true })

    expect(
      numbered.findAll(testId('list-position')).map(row => row.text()),
    ).toEqual(['1', '2', '3'])
  })

  it('uses a textarea in multiline mode', async () => {
    const single = await mount()

    expect(single.get(testId('list-field')).element.tagName).toBe('INPUT')

    const multi = await mount({ multiline: true })

    expect(multi.get(testId('list-field')).element.tagName).toBe('TEXTAREA')
  })

  it('labels the add button', async () => {
    const component = await mount({ addLabel: 'Ingrediënt toevoegen' })

    expect(component.get(testId('list-add')).text()).toBe(
      'Ingrediënt toevoegen',
    )
  })
})
