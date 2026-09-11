import { vi } from 'vitest'

export function respondWith(response: Response | Error) {
  vi.stubGlobal('fetch', async () => {
    if (response instanceof Error) throw response

    return response
  })
}

export function neverFetches() {
  const fetchSpy = vi.fn()

  vi.stubGlobal('fetch', fetchSpy)

  return fetchSpy
}

export function htmlResponse(
  body: string,
  contentType = 'text/html; charset=utf-8',
) {
  return new Response(body, { headers: { 'content-type': contentType } })
}

export function imageResponse(
  bytes: Uint8Array,
  contentType = 'image/jpeg',
  contentLength?: number,
) {
  return new Response(new Blob([bytes]), {
    headers: {
      'content-type': contentType,
      ...(contentLength !== undefined && {
        'content-length': String(contentLength),
      }),
    },
  })
}

export function endlessStream(chunk: string) {
  const counter = { chunks: 0 }

  const body = new ReadableStream({
    pull(controller) {
      counter.chunks += 1
      controller.enqueue(new TextEncoder().encode(chunk))
    },
  })

  return { body, counter }
}
