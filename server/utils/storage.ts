import { randomUUID } from 'node:crypto'
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = 'recipes-images'
const UPLOAD_EXPIRY_SECONDS = 300
const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const EXTENSIONS = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const

export type RecipeImageType = keyof typeof EXTENSIONS

let client: S3Client | undefined

function useS3(): S3Client {
  client ??= new S3Client({ forcePathStyle: true })

  return client
}

export function isRecipeImageType(value: string): value is RecipeImageType {
  return value in EXTENSIONS
}

export function recipeImageKey(contentType: RecipeImageType): string {
  return `recipes/${randomUUID()}.${EXTENSIONS[contentType]}`
}

export function recipeImageUrl(key: string | null): string | null {
  if (!key) return null

  const endpoint = useRuntimeConfig().s3Endpoint

  if (!endpoint) return null

  return `${endpoint.replace(/\/+$/, '')}/${BUCKET}/${key}`
}

export function presignRecipeImageUpload(
  key: string,
  contentType: RecipeImageType,
): Promise<string> {
  return getSignedUrl(
    useS3(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    }),
    { expiresIn: UPLOAD_EXPIRY_SECONDS },
  )
}

export async function putRecipeImage(
  body: Uint8Array,
  contentType: RecipeImageType,
): Promise<string> {
  const key = recipeImageKey(contentType)

  await useS3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
    }),
  )

  return key
}

export async function deleteRecipeImage(key: string | null): Promise<void> {
  if (!key) return

  try {
    await useS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch {
    return
  }
}

export function uploadHeaders(
  contentType: RecipeImageType,
): Record<string, string> {
  return { 'content-type': contentType, 'cache-control': CACHE_CONTROL }
}
