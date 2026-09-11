<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    placeholder?: string
    addLabel?: string
    multiline?: boolean
    numbered?: boolean
  }>(),
  {
    placeholder: '',
    addLabel: 'Regel toevoegen',
    multiline: false,
    numbered: false,
  },
)

const model = defineModel<string[]>({ default: () => [] })

const entries = computed((): string[] => model.value ?? [])

interface Row {
  value: string
  index: number
  position: number
}

const rows = computed((): Row[] =>
  entries.value.map((value: string, index: number) => ({
    value,
    index,
    position: index + 1,
  })),
)

function update(index: number, value: string) {
  const next = [...entries.value]

  next[index] = value
  model.value = next
}

function add() {
  model.value = [...entries.value, '']
}

function remove(index: number) {
  model.value = entries.value.filter(
    (_: string, current: number) => current !== index,
  )
}

function move(index: number, offset: number) {
  const target = index + offset

  if (target < 0 || target >= entries.value.length) return

  const next = [...entries.value]
  const moved = next[index]!

  next[index] = next[target]!
  next[target] = moved
  model.value = next
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="row in rows"
      :key="row.index"
      data-test-id="list-row"
      class="flex items-start gap-2"
    >
      <span
        v-if="props.numbered"
        data-test-id="list-position"
        class="mt-2 w-5 shrink-0 text-right text-sm text-muted tabular-nums"
      >
        {{ row.position }}
      </span>

      <UTextarea
        v-if="props.multiline"
        :model-value="row.value"
        :placeholder="props.placeholder"
        :rows="2"
        autoresize
        class="flex-1"
        data-test-id="list-field"
        @update:model-value="
          (value: string | number) => update(row.index, String(value))
        "
      />
      <UInput
        v-else
        :model-value="row.value"
        :placeholder="props.placeholder"
        class="flex-1"
        data-test-id="list-field"
        @update:model-value="
          (value: string | number) => update(row.index, String(value))
        "
      />

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          icon="i-ri-arrow-up-line"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="row.index === 0"
          :aria-label="`Regel ${row.position} omhoog`"
          data-test-id="list-move-up"
          @click="move(row.index, -1)"
        />
        <UButton
          icon="i-ri-arrow-down-line"
          color="neutral"
          variant="ghost"
          size="sm"
          :disabled="row.index === rows.length - 1"
          :aria-label="`Regel ${row.position} omlaag`"
          data-test-id="list-move-down"
          @click="move(row.index, 1)"
        />
        <UButton
          icon="i-ri-delete-bin-line"
          color="error"
          variant="ghost"
          size="sm"
          :aria-label="`Regel ${row.position} verwijderen`"
          data-test-id="list-remove"
          @click="remove(row.index)"
        />
      </div>
    </div>

    <UButton
      icon="i-ri-add-line"
      :label="props.addLabel"
      color="neutral"
      variant="soft"
      size="sm"
      class="self-start"
      data-test-id="list-add"
      @click="add"
    />
  </div>
</template>
