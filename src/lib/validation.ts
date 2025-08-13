import { z } from 'zod'

export const csrfHeaderName = 'x-csrf-token'

export function createJsonParser<T extends z.ZodTypeAny>(schema: T) {
  return async function parse(request: Request): Promise<z.infer<T> | null> {
    try {
      const json = await request.json()
      const parsed = schema.safeParse(json)
      if (!parsed.success) return null
      return parsed.data
    } catch {
      return null
    }
  }
}

export function pickAllowedMimeTypes(allowed: ReadonlyArray<string>) {
  const allowedSet = new Set(allowed.map(t => t.toLowerCase()))
  return function isAllowed(mime: string | null | undefined) {
    if (!mime) return false
    return allowedSet.has(mime.toLowerCase())
  }
}

export function enforceMaxSize(maxBytes: number) {
  return function isWithinSize(size: number | undefined | null) {
    if (!Number.isFinite(size)) return false
    return (size as number) <= maxBytes
  }
}

export const AllowedUploadMime = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]

export const isAllowedUploadMime = pickAllowedMimeTypes(AllowedUploadMime)

export function parseFormFields<T extends z.ZodRawShape>(form: FormData, schema: z.ZodObject<T>) {
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(schema.shape)) {
    const v = form.get(key)
    if (typeof v === 'string') obj[key] = v
  }
  const parsed = schema.safeParse(obj)
  if (!parsed.success) return null
  return parsed.data
}


