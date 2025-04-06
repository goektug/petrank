import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)

  // Log all requests that pass through middleware
  console.log(`Middleware handling request to: ${requestUrl.pathname}`)

  // If we detect a code parameter in the root URL, redirect to our code-redirect route
  if (requestUrl.pathname === '/' && requestUrl.searchParams.has('code')) {
    console.log('Code parameter detected at root, redirecting to code-redirect route')
    return NextResponse.redirect(new URL('/code-redirect', requestUrl.origin))
  }

  // For admin routes, check if user is authenticated
  if (requestUrl.pathname.startsWith('/admin')) {
    console.log('Admin route detected, checking session')
    
    try {
      const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session in middleware:', error)
        return NextResponse.redirect(new URL('/auth?error=Session error', requestUrl.origin))
      }

      if (!session) {
        console.log('No session found, redirecting to auth page')
        return NextResponse.redirect(new URL('/auth', requestUrl.origin))
      }

      console.log('Session found, allowing access to admin page')
      console.log(`User ID: ${session.user.id}, Email: ${session.user.email}`)
    } catch (err) {
      console.error('Middleware error:', err)
      return NextResponse.redirect(new URL('/auth?error=Middleware error', requestUrl.origin))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/' // Match root path to detect 'code' parameter
  ]
} 