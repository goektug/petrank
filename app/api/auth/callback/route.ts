import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Define route configuration using the new format
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  console.log('Google Auth callback route executed')
  console.log('Request URL:', request.url)
  console.log('Search params:', Object.fromEntries(requestUrl.searchParams.entries()))
  
  // Check for error parameters
  const errorCode = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  if (errorCode) {
    console.error(`OAuth error received: ${errorCode}`)
    console.error(`Error description: ${errorDescription}`)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(errorDescription || errorCode)}`)
  }
  
  try {
    // Get code from the URL
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    
    if (!code) {
      console.error('No code parameter found in the request URL')
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Missing authorization code')}`)
    }
    
    console.log('Code received:', code.substring(0, 8) + '...')
    console.log('State parameter:', state || 'MISSING')
    
    // Create a Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange the code for a session
    console.log('Exchanging code for session...')
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError.message)
      
      // Check if it's a state parameter error
      if (exchangeError.message.includes('state') || exchangeError.message.includes('csrf')) {
        console.error('This appears to be a state/CSRF token error')
      }
      
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Auth error: ${exchangeError.message}`)}`)
    }
    
    console.log('Code successfully exchanged for session')
    
    // Verify the session was created
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError?.message || 'No session created')
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Authentication failed')}`)
    }
    
    console.log('Authentication successful for user:', session.user.id)
    console.log('User email:', session.user.email)
    console.log('User metadata:', JSON.stringify(session.user.user_metadata))
    return NextResponse.redirect(`${requestUrl.origin}/admin`)
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Unexpected error: ${error.message}`)}`)
  }
} 