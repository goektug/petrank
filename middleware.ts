import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // If there's a code parameter in the URL, it's an OAuth callback
  if (code) {
    try {
      const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
      
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)

      // Redirect to admin page after successful authentication
      return NextResponse.redirect(new URL('/admin', requestUrl.origin))
    } catch (error) {
      console.error('Error in OAuth callback:', error)
      return NextResponse.redirect(new URL('/auth?error=Authentication failed', requestUrl.origin))
    }
  }

  // For admin routes, check if user is authenticated
  if (requestUrl.pathname.startsWith('/admin')) {
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(new URL('/auth', requestUrl.origin))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/',  // Match root path and handle code parameter in middleware function
    '/auth/callback'
  ]
} 