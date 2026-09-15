export interface ParsedRecipe {
  title: string
  description: string | null
  imageUrl: string | null
  sourceUrl: string | null
  sourceName: string | null
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  ingredients: string[]
  instructions: string[]
  tags: string[]
  notes: string | null
}

export type RecipeDraftSource =
  | 'jsonld'
  | 'microdata'
  | 'opengraph'
  | 'ai'
  | 'social'
  | 'none'
  | 'unreachable'

export interface ParsedRecipeResult {
  draft: ParsedRecipe
  source: RecipeDraftSource
}

export interface RecipeDraft extends Omit<ParsedRecipe, 'imageUrl'> {
  imageKey: string | null
  imageUrl: string | null
}

export interface RecipeImportResult {
  draft: RecipeDraft
  source: RecipeDraftSource
}

export interface RecipeListItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  sourceName: string | null
  servings: number | null
  prepMinutes: number | null
  cookMinutes: number | null
  tags: string[]
  createdAt: string
  authorName: string | null
}

export interface RecipeListPage {
  items: RecipeListItem[]
  nextCursor: string | null
}

export interface RecipeDetail extends RecipeListItem {
  imageKey: string | null
  sourceUrl: string | null
  ingredients: string[]
  instructions: string[]
  notes: string | null
  updatedAt: string
  canEdit: boolean
}
