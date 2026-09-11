import { and, arrayContains, desc, eq, ilike, ne, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { recipes, users } from '../database/schema'
import type { RecipeRow } from '../database/schema'
import type { RecipeDetail, RecipeListItem } from '../../shared/types/recipe'
import type { RecipeInput, RecipeQuery } from '../../shared/schemas/recipe'

const listColumns = {
  id: recipes.id,
  userId: recipes.userId,
  title: recipes.title,
  description: recipes.description,
  imageKey: recipes.imageKey,
  sourceName: recipes.sourceName,
  servings: recipes.servings,
  prepMinutes: recipes.prepMinutes,
  cookMinutes: recipes.cookMinutes,
  tags: recipes.tags,
  createdAt: recipes.createdAt,
  authorName: users.name,
}

function filters(query: RecipeQuery): SQL[] {
  const conditions: SQL[] = []

  if (query.q) {
    const term = `%${query.q}%`

    conditions.push(
      or(ilike(recipes.title, term), ilike(recipes.description, term))!,
    )
  }

  if (query.tag) {
    conditions.push(arrayContains(recipes.tags, [query.tag.toLowerCase()]))
  }

  return conditions
}

type ListRow = {
  [K in keyof typeof listColumns]: K extends 'createdAt'
    ? Date
    : K extends 'authorName'
      ? string | null
      : RecipeRow[Extract<K, keyof RecipeRow>]
}

function toListItem(row: ListRow): RecipeListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: recipeImageUrl(row.imageKey),
    sourceName: row.sourceName,
    servings: row.servings,
    prepMinutes: row.prepMinutes,
    cookMinutes: row.cookMinutes,
    tags: row.tags,
    createdAt: row.createdAt.toISOString(),
    authorName: row.authorName,
  }
}

export async function listOwnRecipes(
  userId: string,
  query: RecipeQuery,
): Promise<RecipeListItem[]> {
  const rows = await useDb()
    .select(listColumns)
    .from(recipes)
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(and(eq(recipes.userId, userId), ...filters(query)))
    .orderBy(desc(recipes.createdAt))

  return rows.map(toListItem)
}

export async function listFamilyRecipes(
  userId: string,
  query: RecipeQuery,
): Promise<RecipeListItem[]> {
  const rows = await useDb()
    .select(listColumns)
    .from(recipes)
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(and(ne(recipes.userId, userId), ...filters(query)))
    .orderBy(desc(recipes.createdAt))

  return rows.map(toListItem)
}

export async function findRecipeForUser(
  id: string,
  userId: string,
): Promise<RecipeDetail | undefined> {
  const [row] = await useDb()
    .select({ recipe: recipes, authorName: users.name })
    .from(recipes)
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(eq(recipes.id, id))
    .limit(1)

  if (!row) return undefined

  const { recipe } = row

  return {
    ...toListItem({ ...recipe, authorName: row.authorName }),
    imageKey: recipe.imageKey,
    sourceUrl: recipe.sourceUrl,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    notes: recipe.notes,
    updatedAt: recipe.updatedAt.toISOString(),
    canEdit: recipe.userId === userId,
  }
}

export async function createRecipe(
  userId: string,
  input: RecipeInput,
): Promise<{ id: string }> {
  const [row] = await useDb()
    .insert(recipes)
    .values({ ...input, userId })
    .returning({ id: recipes.id })

  return row!
}

export async function updateOwnRecipe(
  id: string,
  userId: string,
  input: Partial<RecipeInput>,
): Promise<{ id: string } | undefined> {
  const db = useDb()
  const scope = and(eq(recipes.id, id), eq(recipes.userId, userId))

  const [previous] = await db
    .select({ imageKey: recipes.imageKey })
    .from(recipes)
    .where(scope)
    .limit(1)

  const [row] = await db
    .update(recipes)
    .set({ ...input, updatedAt: new Date() })
    .where(scope)
    .returning({ id: recipes.id, imageKey: recipes.imageKey })

  if (!row) return undefined

  if (previous?.imageKey && previous.imageKey !== row.imageKey) {
    await deleteRecipeImage(previous.imageKey)
  }

  return { id: row.id }
}

export async function isRecipeImageKeyInUse(key: string): Promise<boolean> {
  const [row] = await useDb()
    .select({ id: recipes.id })
    .from(recipes)
    .where(eq(recipes.imageKey, key))
    .limit(1)

  return Boolean(row)
}

export async function deleteOwnRecipe(
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await useDb()
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .returning({ id: recipes.id, imageKey: recipes.imageKey })

  await Promise.all(rows.map(row => deleteRecipeImage(row.imageKey)))

  return rows.length > 0
}

export async function listOwnTags(userId: string): Promise<string[]> {
  const rows = await useDb()
    .select({ tags: recipes.tags })
    .from(recipes)
    .where(eq(recipes.userId, userId))

  return [...new Set(rows.flatMap(row => row.tags))].sort()
}
