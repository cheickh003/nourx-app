import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const ratelimit = redisUrl && redisToken
  ? new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'nourx:rl',
    })
  : null

const csrfAllowedOrigins = (process.env.CSRF_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    // Refresh session if expired - required for Server Components
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    console.error('Middleware auth error:', error)
    // Continue without user if auth fails
  }

  // Rate limiting (exclure le webhook CinetPay)
  if (ratelimit && request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/webhooks/cinetpay')) {
    // NextRequest n'expose pas toujours .ip selon l'environnement
  const ip = (request as unknown as { ip?: string }).ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const key = `${ip}:${request.nextUrl.pathname}`
    const { success, limit, reset, remaining } = await ratelimit.limit(key)
    if (!success) {
      const res = new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 })
      res.headers.set('X-RateLimit-Limit', String(limit))
      res.headers.set('X-RateLimit-Remaining', String(remaining))
      res.headers.set('X-RateLimit-Reset', String(reset))
      return res
    }
  }

  // CSRF basique sur requêtes mutatives via cookies (POST/PATCH/PUT/DELETE)
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !request.nextUrl.pathname.startsWith('/api/webhooks/cinetpay')
  ) {
    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''
    const allowed = csrfAllowedOrigins.length === 0 || csrfAllowedOrigins.some(o => origin.startsWith(o) || referer.startsWith(o))
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: 'CSRF protection: origin not allowed' }), { status: 403 })
    }
  }

  // Protection des routes authentifiées
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/projet') ||
    request.nextUrl.pathname.startsWith('/feuille-de-route') ||
    request.nextUrl.pathname.startsWith('/taches') ||
    request.nextUrl.pathname.startsWith('/factures-devis') ||
    request.nextUrl.pathname.startsWith('/documents') ||
    request.nextUrl.pathname.startsWith('/reclamations') ||
    request.nextUrl.pathname.startsWith('/parametres') ||
    request.nextUrl.pathname.startsWith('/admin')
  )) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
