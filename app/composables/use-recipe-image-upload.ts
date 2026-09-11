import { useMutation } from '@tanstack/vue-query'

interface UploadTicket {
  key: string
  url: string
  uploadUrl: string
  headers: Record<string, string>
}

export interface UploadedImage {
  key: string
  url: string
}

export function useRecipeImageUpload() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedImage> => {
      const blob = await toWebpBlob(file)

      const ticket = await $fetch<UploadTicket>('/api/recipes/image-upload', {
        method: 'POST',
        body: { contentType: 'image/webp' },
      })

      const response = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: ticket.headers,
      })

      if (!response.ok) throw new Error('upload failed')

      return { key: ticket.key, url: ticket.url }
    },
  })
}

export function useRecipeImageDelete() {
  return useMutation({
    mutationFn: (key: string) =>
      $fetch<{ key: string }>('/api/recipes/image-delete', {
        method: 'POST',
        body: { key },
      }),
  })
}
