<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()
const colorMode = useColorMode()
const themeTrigger = useTemplateRef<{ $el: HTMLElement }>('themeTrigger')

const links = computed(() => [
  { label: 'Mijn recepten', to: '/', icon: 'i-ri-book-2-line' },
  { label: 'Familie', to: '/family', icon: 'i-ri-group-line' },
])

const userMenuItems = computed(() => [
  [{ label: user.value?.email ?? '', type: 'label' as const }],
  [
    {
      label: colorMode.value === 'dark' ? 'Licht thema' : 'Donker thema',
      icon: colorMode.value === 'dark' ? 'i-ri-sun-line' : 'i-ri-moon-line',
      onSelect: (event: Event) => {
        event.preventDefault()

        revealTransition(() => {
          colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
        }, themeTrigger.value?.$el)
      },
    },
  ],
  [
    {
      label: 'Uitloggen',
      icon: 'i-ri-logout-box-line',
      onSelect: async () => {
        await clear()
        await navigateTo('/login')
      },
    },
  ],
])

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  htmlAttrs: {
    lang: 'nl',
  },
})

useSeoMeta({
  titleTemplate: title =>
    title ? `${title} · Familierecepten` : 'Familierecepten',
  title: 'Familierecepten',
})
</script>

<template>
  <NuxtPwaAssets />
  <SplashScreen />

  <UApp>
    <UHeader
      :ui="{
        content:
          'data-[state=open]:animate-[slide-in-from-top_200ms_var(--ease-out)] data-[state=closed]:animate-[slide-out-to-top_200ms_var(--ease-out)]',
        overlay:
          'data-[state=open]:animate-[fade-in_200ms_var(--ease-out)] data-[state=closed]:animate-[fade-out_200ms_var(--ease-out)]',
      }"
    >
      <template #left>
        <NuxtLink
          to="/"
          class="focus-visible:outline-3 outline-primary/25 rounded-md p-1 -ms-1"
        >
          <Logo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <UNavigationMenu v-if="loggedIn" :items="links" />

      <template #right>
        <ThemeToggle v-if="!loggedIn" />

        <UDropdownMenu v-if="loggedIn" :items="userMenuItems">
          <UButton ref="themeTrigger" variant="ghost" color="neutral" square>
            <UAvatar
              :src="user?.avatarUrl ?? undefined"
              :alt="user?.name ?? user?.email"
              size="xs"
            />
          </UButton>
        </UDropdownMenu>
      </template>

      <template #body>
        <UNavigationMenu
          v-if="loggedIn"
          :items="links"
          orientation="vertical"
        />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-6">
        <NuxtPage />
      </UContainer>
    </UMain>
  </UApp>
</template>
