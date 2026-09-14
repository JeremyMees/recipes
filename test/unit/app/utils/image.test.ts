import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toWebpBlob } from '~/utils/image'
import {
  createCanvasStub,
  stubDocumentCanvas,
  stubImageBitmap,
  type CanvasStub,
} from '~~/test/unit/stubs/canvas'

let canvas: CanvasStub

beforeEach(() => {
  canvas = createCanvasStub()
  stubDocumentCanvas(canvas)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function withSource(width: number, height: number) {
  stubImageBitmap(canvas, width, height)

  return toWebpBlob(new File([], 'photo.jpg'))
}

describe('toWebpBlob', () => {
  it('caps the long edge and keeps the aspect ratio', async () => {
    await withSource(4000, 3000)

    expect(canvas.drawn).toEqual([{ width: 1200, height: 900 }])
  })

  it('caps on height when the image is portrait', async () => {
    await withSource(3000, 4000)

    expect(canvas.drawn).toEqual([{ width: 900, height: 1200 }])
  })

  it('leaves images smaller than the cap alone', async () => {
    await withSource(800, 600)

    expect(canvas.drawn).toEqual([{ width: 800, height: 600 }])
  })

  it('never scales below a single pixel', async () => {
    await withSource(4000, 1)

    expect(canvas.drawn).toEqual([{ width: 1200, height: 1 }])
  })

  it('encodes webp at the configured quality', async () => {
    await withSource(100, 100)

    expect(canvas.blobArgs).toEqual({ type: 'image/webp', quality: 0.8 })
  })

  it('returns the encoded blob', async () => {
    const blob = await withSource(100, 100)

    expect(blob).toBe(canvas.blobResult)
  })

  it('releases the bitmap', async () => {
    await withSource(100, 100)

    expect(canvas.closed).toBe(1)
  })

  it('releases the bitmap when the canvas has no context', async () => {
    canvas.contextAvailable = false

    await expect(withSource(100, 100)).rejects.toThrow('canvas unavailable')
    expect(canvas.closed).toBe(1)
  })

  it('fails when the browser cannot encode webp', async () => {
    canvas.blobResult = null

    await expect(withSource(100, 100)).rejects.toThrow('webp encoding failed')
  })
})
