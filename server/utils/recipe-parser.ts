import type {
  ParsedRecipe,
  ParsedRecipeResult,
} from '../../shared/types/recipe'

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  egrave: 'è',
  euml: 'ë',
  agrave: 'à',
  ccedil: 'ç',
  ouml: 'ö',
  uuml: 'ü',
  iuml: 'ï',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z][a-z0-9]*);/gi, (match, name) => {
      return NAMED_ENTITIES[String(name).toLowerCase()] ?? match
    })
}

export function stripHtml(input: unknown): string {
  if (typeof input !== 'string') return ''

  return decodeEntities(
    input
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function toNodeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(toNodeArray)

  if (value && typeof value === 'object') {
    const graph = (value as Record<string, unknown>)['@graph']

    if (graph) return [value, ...toNodeArray(graph)]

    return [value]
  }

  return []
}

export function extractJsonLd(html: string): Record<string, unknown>[] {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  const nodes: Record<string, unknown>[] = []

  for (const block of blocks) {
    const raw = block[1]?.trim()

    if (!raw) continue

    try {
      for (const node of toNodeArray(JSON.parse(raw))) {
        nodes.push(node as Record<string, unknown>)
      }
    } catch {
      continue
    }
  }

  return nodes
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  const value = node['@type']

  if (typeof value === 'string') return value.toLowerCase() === type

  if (Array.isArray(value)) {
    return value.some(
      entry => typeof entry === 'string' && entry.toLowerCase() === type,
    )
  }

  return false
}

export function findRecipeNode(
  nodes: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  return nodes.find(node => hasType(node, 'recipe'))
}

export function parseDuration(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null
  }

  if (typeof value !== 'string') return null

  const text = value.trim()

  if (!text) return null

  const iso = text.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
  )

  if (iso) {
    const [, days, hours, minutes, seconds] = iso
    const total =
      Number(days ?? 0) * 1440 +
      Number(hours ?? 0) * 60 +
      Number(minutes ?? 0) +
      Number(seconds ?? 0) / 60

    return total > 0 ? Math.round(total) : null
  }

  const hourMinute = text.match(/(\d+)\s*(?:u|uur|h|hour|hours)\b/i)
  const minute = text.match(/(\d+)\s*(?:min|minute|minuten|minutes)\b/i)

  if (hourMinute || minute) {
    const total = Number(hourMinute?.[1] ?? 0) * 60 + Number(minute?.[1] ?? 0)

    return total > 0 ? total : null
  }

  const bare = text.match(/^(\d+)$/)

  return bare ? Number(bare[1]) : null
}

export function parseServings(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseServings(entry)

      if (parsed !== null) return parsed
    }

    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null
  }

  if (value && typeof value === 'object') {
    return parseServings((value as Record<string, unknown>).value)
  }

  if (typeof value !== 'string') return null

  const match = stripHtml(value).match(/\d+/)

  if (!match) return null

  const parsed = Number(match[0])

  return parsed > 0 ? parsed : null
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return stripHtml(value)

  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>

    return stripHtml(node.text ?? node.name ?? node.description ?? '')
  }

  return ''
}

export function parseIngredients(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value]

  return entries
    .flatMap(entry => textOf(entry).split('\n'))
    .map(line => line.trim())
    .filter(Boolean)
}

export function parseInstructions(value: unknown): string[] {
  if (typeof value === 'string') {
    return stripHtml(value)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value.flatMap(entry => parseInstructions(entry))
  }

  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>

    if (node.itemListElement) return parseInstructions(node.itemListElement)

    const text = textOf(node)

    return text ? [text] : []
  }

  return []
}

export function parseImage(value: unknown): string | null {
  if (typeof value === 'string') {
    const url = value.trim()

    return url.startsWith('http') ? url : null
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = parseImage(entry)

      if (parsed) return parsed
    }

    return null
  }

  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>

    return parseImage(node.url ?? node.contentUrl)
  }

  return null
}

export function parseTags(node: Record<string, unknown>): string[] {
  const raw = [node.recipeCategory, node.recipeCuisine, node.keywords]

  const tags = raw.flatMap(entry => {
    const values = Array.isArray(entry) ? entry : [entry]

    return values.flatMap(value =>
      typeof value === 'string' ? stripHtml(value).split(',') : [],
    )
  })

  const seen = new Set<string>()

  return tags
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => {
      if (!tag || tag.length > 40 || seen.has(tag)) return false

      seen.add(tag)

      return true
    })
    .slice(0, 12)
}

const VOID_TAGS = new Set([
  'meta',
  'img',
  'link',
  'input',
  'br',
  'hr',
  'source',
  'area',
  'base',
  'col',
  'embed',
  'param',
  'track',
  'wbr',
])

const LIST_PROPS = new Set([
  'recipeIngredient',
  'ingredients',
  'recipeInstructions',
  'recipeCategory',
  'recipeCuisine',
  'keywords',
])

const RECIPE_PROPS = new Set([
  'name',
  'description',
  'image',
  'prepTime',
  'cookTime',
  'totalTime',
  'recipeYield',
  'author',
  'publisher',
  ...LIST_PROPS,
])

function attributeOf(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
}

function innerHtmlFrom(html: string, tag: string, start: number): string {
  const pattern = new RegExp(`<(/?)${tag}\\b`, 'gi')

  pattern.lastIndex = start

  let depth = 1
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html))) {
    depth += match[1] ? -1 : 1

    if (depth === 0) return html.slice(start, match.index)
  }

  return html.slice(start)
}

export function resolveUrl(value: string, base: string): string {
  try {
    return new URL(value, base).toString()
  } catch {
    return value
  }
}

export function extractMicrodata(
  html: string,
  sourceUrl: string,
): Record<string, unknown> | undefined {
  const scope = html.search(/itemtype\s*=\s*["'][^"']*schema\.org\/Recipe["']/i)

  if (scope === -1) return undefined

  const region = html.slice(scope)
  const collected: Record<string, string[]> = {}

  for (const tag of region.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const element = tag[1]!.toLowerCase()
    const attributes = tag[2] ?? ''
    const prop = attributeOf(attributes, 'itemprop')

    if (!prop || !RECIPE_PROPS.has(prop)) continue

    const attributeValue =
      attributeOf(attributes, 'content') ??
      attributeOf(attributes, 'datetime') ??
      (prop === 'image'
        ? (attributeOf(attributes, 'src') ?? attributeOf(attributes, 'href'))
        : undefined)

    const raw = VOID_TAGS.has(element)
      ? attributeValue
      : (attributeValue ??
        stripHtml(innerHtmlFrom(region, element, tag.index + tag[0].length)))

    const value = raw?.trim()

    if (!value) continue

    ;(collected[prop] ??= []).push(
      prop === 'image' ? resolveUrl(value, sourceUrl) : value,
    )
  }

  const node: Record<string, unknown> = {}

  for (const [prop, values] of Object.entries(collected)) {
    node[prop] = LIST_PROPS.has(prop) ? values : values[0]
  }

  return Object.keys(node).length ? node : undefined
}

export function parseMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {}

  for (const tag of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const attributes = tag[0]
    const key = attributes.match(
      /(?:property|name)\s*=\s*["']([^"']+)["']/i,
    )?.[1]
    const content = attributes.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]

    if (key && content && !meta[key.toLowerCase()]) {
      meta[key.toLowerCase()] = decodeEntities(content).trim()
    }
  }

  return meta
}

export function parsePageTitle(html: string): string {
  return stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function publisherName(node: Record<string, unknown>): string | null {
  for (const key of ['publisher', 'author']) {
    const value = node[key]
    const entries = Array.isArray(value) ? value : [value]

    for (const entry of entries) {
      if (typeof entry === 'string' && entry.trim()) return stripHtml(entry)

      if (entry && typeof entry === 'object') {
        const name = (entry as Record<string, unknown>).name

        if (typeof name === 'string' && name.trim()) return stripHtml(name)
      }
    }
  }

  return null
}

export function emptyDraft(sourceUrl: string | null): ParsedRecipe {
  return {
    title: '',
    description: null,
    imageUrl: null,
    sourceUrl,
    sourceName: sourceUrl ? hostnameOf(sourceUrl) : null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: null,
  }
}

function nodeToDraft(
  node: Record<string, unknown>,
  draft: ParsedRecipe,
): ParsedRecipe | undefined {
  const title = stripHtml(node.name)
  const ingredients = parseIngredients(
    node.recipeIngredient ?? node.ingredients,
  )
  const instructions = parseInstructions(node.recipeInstructions)

  if (!title && !ingredients.length && !instructions.length) return undefined

  return {
    ...draft,
    title,
    description: stripHtml(node.description) || null,
    imageUrl: parseImage(node.image),
    sourceName: publisherName(node) ?? draft.sourceName,
    servings: parseServings(node.recipeYield),
    prepMinutes: parseDuration(node.prepTime),
    cookMinutes: parseDuration(node.cookTime ?? node.totalTime),
    ingredients,
    instructions,
    tags: parseTags(node),
  }
}

export function htmlToRecipeDraft(
  html: string,
  sourceUrl: string,
): ParsedRecipeResult {
  const blank = emptyDraft(sourceUrl)
  const jsonLd = findRecipeNode(extractJsonLd(html))
  const fromJsonLd = jsonLd && nodeToDraft(jsonLd, blank)

  if (fromJsonLd) return { source: 'jsonld', draft: fromJsonLd }

  const microdata = extractMicrodata(html, sourceUrl)
  const fromMicrodata = microdata && nodeToDraft(microdata, blank)

  if (fromMicrodata) return { source: 'microdata', draft: fromMicrodata }

  const meta = parseMetaTags(html)
  const title = meta['og:title'] ?? parsePageTitle(html)

  if (title) {
    return {
      source: 'opengraph',
      draft: {
        ...blank,
        title,
        description: meta['og:description'] ?? null,
        imageUrl: parseImage(meta['og:image']),
        sourceName: meta['og:site_name'] ?? blank.sourceName,
      },
    }
  }

  return { source: 'none', draft: blank }
}
