import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)

  // Log all requests that pass through middleware
  console.log(`Middleware handling request to: ${requestUrl.pathname}`)

  // If we detect a code parameter in the URL, redirect to our API route
  if (requestUrl.searchParams.has('code')) {
    console.log(`Code parameter detected in URL: ${requestUrl.pathname}`)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    console.log(`Redirecting code ${code?.substring(0, 8)}... to API route`)
    
    // Redirect to our Google OAuth callback API route
    const redirectUrl = new URL(`/api/auth/callback?code=${code}`, requestUrl.origin)
    if (state) {
      redirectUrl.searchParams.append('state', state)
    }
    return NextResponse.redirect(redirectUrl)
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
    '/', // Match root path to detect 'code' parameter
    '/:path*' // Match all paths to catch code parameter anywhere
  ]
} 