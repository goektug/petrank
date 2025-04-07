import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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

    console.log('Code received:', code.substring(0, 8) + '...')
    
    // Create a cookies instance
    const cookieStore = cookies()
    
    // Create a Supabase client with the cookies instance
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error.message)
      console.error('Error details:', JSON.stringify(error))
      throw error
    }

    if (!session) {
      throw new Error('No session created')
    }

    console.log('Session created successfully for user:', session.user.id)
    console.log('User email:', session.user.email)
    
    // Successfully authenticated, redirect to next page or admin
    return NextResponse.redirect(`${requestUrl.origin}${next}`)
  } catch (error: any) {
    console.error('Auth callback error:', error.message)
    console.error('Error stack:', error.stack)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
    )
  }
} 