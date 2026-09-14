import { z } from 'zod'

const blankToNull = (value: unknown) =>
  typeof value === 'string' ? value.trim() || null : (value ?? null)

const nullableText = (max: number) =>
  z.preprocess(blankToNull, z.string().max(max).nullable())

const nullableUrl = () =>
  z.preprocess(
    blankToNull,
    z
      .url({ protocol: /^https?$/ })
      .max(2000)
      .nullable(),
  )

const RECIPE_IMAGE_KEY =
  /^recipes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/

export const recipeImageKeySchema = z.string().regex(RECIPE_IMAGE_KEY)

const nullableImageKey = () =>
  z.preprocess(blankToNull, recipeImageKeySchema.nullable())

const nullableInt = (min: number, max: number) =>
  z.preprocess(
    value => (value === '' || value === undefined ? null : value),
    z.number().int().min(min).max(max).nullable(),
  )

const textList = (maxItems: number, maxLength: number) =>
  z.preprocess(
    value => (Array.isArray(value) ? value : []),
    z
      .array(z.string().trim().min(1).max(maxLength))
      .max(maxItems)
      .transform(items => items.filter(Boolean)),
  )

export const recipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Geef het recept een naam')
    .max(200, 'Naam is te lang'),
  description: nullableText(2000),
  imageKey: nullableImageKey(),
  sourceUrl: nullableUrl(),
  sourceName: nullableText(120),
  servings: nullableInt(1, 200),
  prepMinutes: nullableInt(0, 10_000),
  cookMinutes: nullableInt(0, 10_000),
  ingredients: textList(200, 300),
  instructions: textList(100, 4000),
  tags: textList(20, 40),
  notes: nullableText(4000),
})

export const recipeUpdateSchema = recipeInputSchema.partial()

export const recipeImportSchema = z.object({
  url: z.url({ protocol: /^https?$/ }).max(2000),
})

export const RECIPE_PAGE_SIZE = 2

export const recipeQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(40).optional(),
  cursor: z.string().trim().max(80).optional(),
})

export type RecipeInput = z.infer<typeof recipeInputSchema>
export type RecipeUpdate = z.infer<typeof recipeUpdateSchema>
export type RecipeQuery = z.infer<typeof recipeQuerySchema>
