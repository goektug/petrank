import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  
  console.log('Code redirect route triggered')
  
  if (code) {
    console.log(`Redirecting code parameter from root to /handle-auth: ${code.slice(0, 8)}...`)
    
    // Create a new URL for the handle-auth page
    const redirectUrl = new URL('/handle-auth', url.origin)
    redirectUrl.searchParams.set('code', code)
    
    // Redirect to our handle-auth page
    return NextResponse.redirect(redirectUrl)
  }
  
  // If no code is present, just redirect to the home page
  return NextResponse.redirect(new URL('/', url.origin))
} 