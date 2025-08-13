export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: FetchWithTimeoutOptions = {}) {
  const { timeoutMs = 10000, signal: externalSignal, ...rest } = init
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const signal = externalSignal
    ? (mergeAbortSignals(externalSignal, controller.signal))
    : controller.signal

  try {
    const res = await fetch(input, { ...rest, signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

function mergeAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a
  if (b.aborted) return b
  const controller = new AbortController()
  const onAbortA = () => controller.abort()
  const onAbortB = () => controller.abort()
  a.addEventListener('abort', onAbortA)
  b.addEventListener('abort', onAbortB)
  // When consumer observes `aborted`, listeners become irrelevant
  controller.signal.addEventListener('abort', () => {
    a.removeEventListener('abort', onAbortA)
    b.removeEventListener('abort', onAbortB)
  })
  return controller.signal
}


