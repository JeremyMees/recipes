const MAX_BYTES = 2_000_000
const TIMEOUT_MS = 10_000

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function readCapped(response: Response): Promise<string> {
  const body = response.body

  if (!body) return ''

  const decoder = new TextDecoder('utf-8')
  const reader = body.getReader()

  let received = 0
  let html = ''

  while (received < MAX_BYTES) {
    const { done, value } = await reader.read()

    if (done) break

    received += value.byteLength
    html += decoder.decode(value, { stream: true })
  }

  await reader.cancel().catch(() => {})

  return html
}

export async function fetchPageHtml(url: string): Promise<string | undefined> {
  if (!isFetchableUrl(url)) return undefined

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'user-agent': BROWSER_USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'nl,en;q=0.8',
      },
    })

    if (!response.ok) return undefined

    if (!response.headers.get('content-type')?.includes('html')) {
      return undefined
    }

    return await readCapped(response)
  } catch {
    return undefined
  }
}
