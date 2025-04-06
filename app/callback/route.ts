import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(new URL('/auth?error=' + encodeURIComponent(error.message), requestUrl.origin))
      }

      // Redirect to admin page after successful authentication
      return NextResponse.redirect(new URL('/admin', requestUrl.origin))
    } catch (err) {
      console.error('Error in callback:', err)
      return NextResponse.redirect(new URL('/auth?error=' + encodeURIComponent('Failed to authenticate'), requestUrl.origin))
    }
  }

  // If no code, redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin))
} 