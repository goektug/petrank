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
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError.message)
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Authentication error: ${exchangeError.message}`)}`)
    }
    
    console.log('Code successfully exchanged for session')

    // Get the session to verify authentication worked
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      console.error('Error retrieving session:', sessionError?.message || 'No session created')
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Authentication failed: No session created')}`)
    }
    
    console.log('Successfully authenticated user:', session.user.email)
    
    // Check if the user has access to the admin section
    // You can add more checks here based on GitHub email domains or other criteria
    try {
      // Query your database for admin roles if needed
      // For example: const { data: roleData } = await supabase.from('user_roles').select('*').eq('user_id', session.user.id).single()
      // If you want to restrict by email domain:
      const email = session.user.email || ''
      console.log(`Checking access for user: ${email}`)
      
      // Check if user has admin status in database or use the GitHub email for verification
      // For now, we'll assume the GitHub authentication is sufficient
      
      // Redirect to admin page after successful authentication
      console.log('Redirecting to admin dashboard')
      return NextResponse.redirect(`${requestUrl.origin}/admin`)
    } catch (roleError: any) {
      console.error('Error checking user access:', roleError.message)
      // If there's an error checking roles, redirect to unauthorized page
      return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent('Unauthorized: You do not have access to the admin area')}`)
    }
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    return NextResponse.redirect(`${requestUrl.origin}/auth?error=${encodeURIComponent(`Unexpected error: ${error.message}`)}`)
  }
} 