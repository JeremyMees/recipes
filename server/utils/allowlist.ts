export function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return []

  return raw
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedEmail(
  email: string | undefined | null,
  raw: string | undefined,
): boolean {
  if (!email) return false

  const allowlist = parseAllowlist(raw)

  if (!allowlist.length) return false

  return allowlist.includes(email.trim().toLowerCase())
}
