const BLOCKED_HOSTNAMES =
  /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i

export function isFetchableUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)

    if (protocol !== 'http:' && protocol !== 'https:') return false

    return !BLOCKED_HOSTNAMES.test(hostname)
  } catch {
    return false
  }
}
