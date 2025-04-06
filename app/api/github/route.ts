import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  console.log('GitHub API route called')
  
  // Get the authorization code from the URL
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    console.error('No code provided in the request')
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('No authorization code provided')}`)
  }
  
  console.log(`Received code: ${code.slice(0, 8)}...`)
  
  try {
    // Create a Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange the code for a session
    console.log('Exchanging code for session...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error.message)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Authentication error: ${error.message}`)}`)
    }
    
    console.log('Code successfully exchanged for session')
    
    // Redirect to admin page after successful authentication
    return NextResponse.redirect(`${requestUrl.origin}/admin`)
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Unexpected error: ${error.message}`)}`)
  }
} 