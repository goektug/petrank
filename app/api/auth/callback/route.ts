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
  
  try {
    // Create a Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Get code and state from the URL
    const code = requestUrl.searchParams.get('code')
    
    if (!code) {
      console.error('No code parameter found in the request URL')
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Missing authorization code')}`)
    }
    
    // Exchange the code for a session
    // Supabase will automatically validate the state parameter
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError.message)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(exchangeError.message)}`)
    }
    
    if (!session) {
      console.error('No session created')
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Authentication failed')}`)
    }
    
    console.log('Authentication successful for user:', session.user.id)
    return NextResponse.redirect(`${requestUrl.origin}/admin`)
    
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Unexpected error: ${error.message}`)}`)
  }
} 