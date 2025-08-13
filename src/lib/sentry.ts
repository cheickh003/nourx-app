export async function reportError(error: unknown, context?: Record<string, unknown>) {
  try {
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(error, { extra: context })
    } else {
      console.error('error', error, context)
    }
  } catch {
    // no-op
  }
}


