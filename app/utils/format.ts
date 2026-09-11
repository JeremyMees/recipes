export function formatMinutes(
  minutes: number | null | undefined,
): string | null {
  if (!minutes || minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (!hours) return `${rest} min`

  return rest ? `${hours} u ${rest} min` : `${hours} u`
}

export function totalMinutes(
  prep: number | null | undefined,
  cook: number | null | undefined,
): number | null {
  const total = (prep ?? 0) + (cook ?? 0)

  return total > 0 ? total : null
}

export function formatServings(
  servings: number | null | undefined,
): string | null {
  if (!servings || servings <= 0) return null

  return servings === 1 ? '1 persoon' : `${servings} personen`
}
