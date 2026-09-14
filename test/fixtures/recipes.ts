import type {
  ParsedRecipe,
  RecipeDetail,
  RecipeListItem,
  RecipeListPage,
} from '#shared/types/recipe'

export const RECIPE_IMAGE_KEY =
  'recipes/00000000-0000-0000-0000-000000000000.webp'

export const OTHER_IMAGE_KEY =
  'recipes/11111111-1111-1111-1111-111111111111.webp'

export function listItem(
  overrides: Partial<RecipeListItem> = {},
): RecipeListItem {
  return {
    id: 'r1',
    title: 'Spaghetti bolognese',
    description: 'Klassieke pastasaus',
    imageUrl: null,
    sourceName: 'leukerecepten.nl',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    tags: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    authorName: 'Mama',
    ...overrides,
  }
}

export function listItemById(
  id: string,
  overrides: Partial<RecipeListItem> = {},
): RecipeListItem {
  return listItem({
    id,
    title: `Recept ${id}`,
    description: null,
    sourceName: null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    ...overrides,
  })
}

export function listPage(
  items: RecipeListItem[] = [listItem()],
  nextCursor: string | null = null,
): RecipeListPage {
  return { items, nextCursor }
}

export function detail(overrides: Partial<RecipeDetail> = {}): RecipeDetail {
  return {
    ...listItem(),
    imageKey: null,
    sourceUrl: 'https://www.leukerecepten.nl/recepten/x/',
    ingredients: ['500 gr gehakt', '1 ui'],
    instructions: ['Bak het gehakt.', 'Voeg de saus toe.'],
    notes: null,
    updatedAt: '2026-09-01T10:00:00.000Z',
    canEdit: true,
    ...overrides,
  }
}

export function parsed(overrides: Partial<ParsedRecipe> = {}): ParsedRecipe {
  return {
    title: 'Spaghetti bolognese',
    description: null,
    imageUrl: null,
    sourceUrl: 'https://www.leukerecepten.nl/recepten/x/',
    sourceName: 'leukerecepten.nl',
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [],
    instructions: [],
    tags: [],
    notes: null,
    ...overrides,
  }
}

export function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    userId: 'u1',
    title: 'Spaghetti bolognese',
    description: 'Klassieke pastasaus',
    imageKey: null,
    sourceUrl: 'https://www.leukerecepten.nl/recepten/x/',
    sourceName: 'leukerecepten.nl',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    ingredients: ['500 gr gehakt'],
    instructions: ['Bak het gehakt.'],
    tags: ['pasta'],
    notes: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  }
}
