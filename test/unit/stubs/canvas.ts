import { vi } from 'vitest'

export interface DrawCall {
  width: number
  height: number
}

export interface CanvasStub {
  drawn: DrawCall[]
  blobArgs?: { type: string; quality: number }
  blobResult: Blob | null
  contextAvailable: boolean
  closed: number
}

export function createCanvasStub(): CanvasStub {
  return {
    drawn: [],
    blobArgs: undefined,
    blobResult: new Blob(['encoded'], { type: 'image/webp' }),
    contextAvailable: true,
    closed: 0,
  }
}

export function canvasElement(stub: CanvasStub) {
  const context = {
    drawImage: (
      _bitmap: unknown,
      _x: number,
      _y: number,
      width: number,
      height: number,
    ) => {
      stub.drawn.push({ width, height })
    },
  }

  return {
    width: 0,
    height: 0,
    getContext: () => (stub.contextAvailable ? context : null),
    toBlob: (cb: (b: Blob | null) => void, type: string, quality: number) => {
      stub.blobArgs = { type, quality }
      cb(stub.blobResult)
    },
  }
}

export function stubDocumentCanvas(stub: CanvasStub) {
  vi.stubGlobal('document', { createElement: () => canvasElement(stub) })
}

export function spyOnCanvasElement(stub: CanvasStub) {
  const createElement = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
    tag === 'canvas'
      ? (canvasElement(stub) as unknown as HTMLElement)
      : createElement(tag),
  )
}

export function stubImageBitmap(
  stub: CanvasStub,
  width: number,
  height: number,
) {
  vi.stubGlobal('createImageBitmap', async () => ({
    width,
    height,
    close: () => {
      stub.closed += 1
    },
  }))
}

export function stubUndecodableImage(message = 'decode failed') {
  vi.stubGlobal('createImageBitmap', async () => {
    throw new Error(message)
  })
}

export function stubObjectUrls() {
  Object.assign(URL, {
    createObjectURL: () => 'blob:preview',
    revokeObjectURL: () => {},
  })
}
