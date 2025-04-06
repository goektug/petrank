import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)

  // For admin routes, check if user is authenticated
  if (requestUrl.pathname.startsWith('/admin')) {
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.log('No session found, redirecting to auth page')
      return NextResponse.redirect(new URL('/auth', requestUrl.origin))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*'
  ]
} 