'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // Custom log function that both logs to console and adds to visible logs
  const log = (message: string) => {
    console.log(message)
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().slice(11, 19)}: ${message}`])
  }

  useEffect(() => {
    // Check for error in URL params
    const errorMsg = searchParams.get('error')
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg))
      log(`Error from URL: ${errorMsg}`)
    }
    
    // Check for code in URL params
    const code = searchParams.get('code')
    if (code) {
      log(`Code detected in URL: ${code.slice(0, 8)}...`)
    }
    
    log('Page loaded, checking user session')
    checkUser()
  }, [searchParams])

  const checkUser = async () => {
    try {
      log('Checking for existing session')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        log(`Session check error: ${sessionError.message}`)
        console.error('Session check error:', sessionError)
        return
      }

      if (session) {
        log('Session found, redirecting to admin...')
        router.push('/admin')
      } else {
        log('No session found')
      }
    } catch (err) {
      log(`Error checking session: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Error checking session:', err)
      setError(err instanceof Error ? err.message : 'Failed to authenticate')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      log('Starting Google OAuth flow...')
      
      // Generate a state parameter for security
      const stateParam = Math.random().toString(36).substring(2, 15)
      log(`Generated state parameter: ${stateParam}`)
      
      // The redirectTo must be a full URL to your API endpoint
      const redirectTo = `https://petrank.vercel.app/api/auth/callback`
      log(`Setting redirect to: ${redirectTo}`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            // Add optional query params for the OAuth provider
            // This helps ensure the state parameter is properly handled
            state: stateParam
          }
        }
      })

      if (error) {
        log(`OAuth error: ${error.message}`)
        console.error('OAuth error:', error)
        throw error
      }

      log(`OAuth initiated. URL: ${data?.url || 'No URL returned'}`)
      if (data?.url) {
        log(`State parameter should be included in the URL`)
        log('Redirecting to Google for authorization...')
        window.location.href = data.url
      }
      
    } catch (err) {
      log(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to login with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleDirectLogin = () => {
    log('Using direct OAuth URL...')
    
    // Supabase project URL
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    
    // Generate a state parameter for security
    const stateParam = Math.random().toString(36).substring(2, 15)
    log(`Generated state parameter: ${stateParam}`)
    
    // Full URL to the API endpoint that will handle the code
    const redirectUrl = 'https://petrank.vercel.app/api/auth/callback'
    const encodedRedirect = encodeURIComponent(redirectUrl)
    
    log(`Supabase URL: ${supabaseUrl}`)
    log(`Redirect URL: ${redirectUrl}`)
    log(`State parameter: ${stateParam}`)
    
    // Create the direct Google authorization URL with state parameter
    const directUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodedRedirect}&state=${stateParam}`
    log(`Full authorization URL: ${directUrl}`)
    
    // Navigate to the authorization URL
    window.location.href = directUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to access the admin panel
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            Make sure your Google OAuth app has this callback URL:<br />
            <code className="bg-gray-100 p-1 rounded text-xs">https://cblsslcreohsrhnurfev.supabase.co/auth/v1/callback</code>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Sign in with Google
              </span>
            )}
          </button>
          
          <div className="mt-3">
            <button
              onClick={handleDirectLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Try Direct Google Login
              </span>
            </button>
          </div>
        </div>

        {/* Logs display */}
        <div className="mt-6 border border-gray-200 rounded-md p-2 bg-gray-50">
          <h3 className="text-sm font-semibold mb-2">Debug Logs:</h3>
          <div className="bg-white p-2 rounded text-xs font-mono h-40 overflow-y-auto">
            {logs.length > 0 ? 
              logs.map((log, index) => <div key={index} className="mb-1">{log}</div>) : 
              <div className="text-gray-400">No logs yet...</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}