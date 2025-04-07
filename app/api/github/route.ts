import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Define route configuration using the new format
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Get URL details for debugging
  const requestUrl = new URL(request.url)
  
  console.log('GitHub API route executed')
  console.log('Request URL:', request.url)
  console.log('Path:', requestUrl.pathname)
  console.log('Search params:', Object.fromEntries(requestUrl.searchParams.entries()))
  
  // Check for error parameters (which GitHub/Supabase might return)
  const errorCode = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  if (errorCode) {
    console.error(`OAuth error received: ${errorCode}`)
    console.error(`Error description: ${errorDescription}`)
    
    // Handle the specific "missing state" error
    if (errorCode === 'invalid_request' && errorDescription?.includes('state parameter missing')) {
      console.error('This is a state parameter error - redirecting to specialized test page')
      return NextResponse.redirect(`${requestUrl.origin}/test-auth/state-test?error=${encodeURIComponent(errorDescription || 'State parameter missing')}`)
    }
    
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
    
    // Create a Supabase client with cookie store
    const cookieStore = cookies()
    console.log('Cookie store created')
    
    try {
      // Create route handler client
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      console.log('Supabase client created')
      
      // Exchange the code for a session
      console.log('Attempting to exchange code for session...')
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError.message)
        console.error('Error details:', JSON.stringify(exchangeError))
        
        // Try to analyze the error
        if (exchangeError.message.includes('invalid')) {
          console.error('This may be due to an invalid or expired code')
        }
        
        if (exchangeError.message.includes('state') || exchangeError.message.includes('csrf')) {
          console.error('This appears to be a state/CSRF token error')
          return NextResponse.redirect(`${requestUrl.origin}/test-auth/state-test?error=${encodeURIComponent(`Auth error: ${exchangeError.message}`)}`)
        }
        
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Auth error: ${exchangeError.message}`)}`)
      }
      
      console.log('Code successfully exchanged for session')
      
      // Verify the session was created
      console.log('Verifying session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Error getting session:', sessionError.message)
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Session error: ${sessionError.message}`)}`)
      }
      
      if (!session) {
        console.error('No session found after code exchange')
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Authentication failed: No session created')}`)
      }
      
      // Success - user is authenticated
      console.log('Authentication successful for user:', session.user.id)
      console.log('User email:', session.user.email)
      console.log('User metadata:', JSON.stringify(session.user.user_metadata))
      console.log('Redirecting to admin dashboard')
      
      return NextResponse.redirect(`${requestUrl.origin}/admin`)
    } catch (supabaseError: any) {
      console.error('Supabase client error:', supabaseError.message)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Supabase client error: ${supabaseError.message}`)}`)
    }
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Unexpected error: ${error.message}`)}`)
  }
} 