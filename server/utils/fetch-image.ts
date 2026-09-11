const MAX_BYTES = 5_000_000
const TIMEOUT_MS = 10_000

export interface FetchedImage {
  body: Uint8Array
  contentType: RecipeImageType
}

export async function fetchRemoteImage(
  url: string,
): Promise<FetchedImage | undefined> {
  if (!isFetchableUrl(url)) return undefined

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'image/*' },
    })

    if (!response.ok) return undefined

    const contentType = response.headers.get('content-type')?.split(';')[0]

    if (!contentType || !isRecipeImageType(contentType)) return undefined

    if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) {
      return undefined
    }

    const body = new Uint8Array(await response.arrayBuffer())

    if (body.byteLength > MAX_BYTES) return undefined

    return { body, contentType }
  } catch {
    return undefined
  }
}
