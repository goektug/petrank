import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    console.log('Callback URL:', requestUrl.toString())
    console.log('Search params:', Object.fromEntries(requestUrl.searchParams.entries()))
    
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/admin'
    
    if (!code) {
      console.error('No code in search params:', requestUrl.search)
      throw new Error('No code provided')
    }

    // Create a cookies instance
    const cookieStore = cookies()
    
    // Create a Supabase client with the cookies instance
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error.message)
      throw error
    }

    if (!session) {
      throw new Error('No session created')
    }

    console.log('Session created successfully for user:', session.user.id)
    
    // Successfully authenticated, redirect to next page or admin
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  } catch (error: any) {
    console.error('Auth callback error:', error.message)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
    )
  }
} 