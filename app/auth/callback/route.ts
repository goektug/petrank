import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    if (!code) {
      throw new Error('No code provided')
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      throw error
    }
    
    return NextResponse.redirect(`${requestUrl.origin}/admin`)
  } catch (error: any) {
    console.error('Auth callback error:', error.message)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth?error=${encodeURIComponent(error.message)}`
    )
  }
} 