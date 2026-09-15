const MAX_BYTES = 2_000_000
const TIMEOUT_MS = 10_000
const READER_TIMEOUT_MS = 25_000
const READER_ORIGIN = 'https://r.jina.ai/'

const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'nl-BE,nl;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua':
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
}

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

function looksLikeHtml(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type') ?? ''

  if (/html|xml/i.test(contentType)) return true

  return /<\s*(html|head|body|meta|script)\b/i.test(body.slice(0, 4000))
}

async function fetchDirect(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { ...BROWSER_HEADERS, referer: new URL(url).origin + '/' },
    })

    if (!response.ok) return undefined

    const body = await readCapped(response)

    return looksLikeHtml(response, body) ? body : undefined
  } catch {
    return undefined
  }
}

async function fetchViaReader(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${READER_ORIGIN}${url}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(READER_TIMEOUT_MS),
      headers: {
        accept: 'text/html,text/plain',
        'x-respond-with': 'html',
      },
    })

    if (!response.ok) return undefined

    const body = await readCapped(response)

    return looksLikeHtml(response, body) ? body : undefined
  } catch {
    return undefined
  }
}

export async function fetchPageHtml(url: string): Promise<string | undefined> {
  if (!isFetchableUrl(url)) return undefined

  return (await fetchDirect(url)) ?? (await fetchViaReader(url))
}
