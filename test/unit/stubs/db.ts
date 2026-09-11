export interface DbCall {
  method: string
  args: unknown[]
}

export interface DbStub {
  db: unknown
  calls: DbCall[]
  results: unknown[][]
  reset: () => void
  called: (method: string) => DbCall | undefined
}

export function createDbStub(): DbStub {
  const stub: DbStub = {
    db: undefined,
    calls: [],
    results: [],
    reset() {
      stub.calls.length = 0
      stub.results.length = 0
    },
    called(method) {
      return stub.calls.find(call => call.method === method)
    },
  }

  const chain: unknown = new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property === 'symbol') return undefined

        if (property === 'then') {
          return (resolve: (value: unknown) => void) =>
            resolve(stub.results.shift() ?? [])
        }

        return (...args: unknown[]) => {
          stub.calls.push({ method: String(property), args })

          return chain
        }
      },
    },
  )

  stub.db = chain

  return stub
}
