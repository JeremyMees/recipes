export function useRuntimeConfig() {
  return { public: {} }
}

export interface HttpErrorInput {
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: unknown
  fatal?: boolean
}

export function createError(input: HttpErrorInput | string) {
  const options = typeof input === 'string' ? { statusMessage: input } : input
  const error = new Error(options.statusMessage ?? options.message ?? 'Error')

  return Object.assign(error, options)
}
