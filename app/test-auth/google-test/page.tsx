'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

// Create a separate client component for the content that uses useSearchParams
function GoogleOAuthContent() {
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
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
    
    log('Google OAuth test page loaded')
  }, [searchParams])

  const testGoogleAuth = async () => {
    try {
      setError(null)
      log('Starting test with explicit state parameter...')
      
      // Generate a fixed state parameter for testing
      const stateParam = 'test_state_' + Date.now()
      log(`Generated test state parameter: ${stateParam}`)
      
      // The redirectTo must be a full URL to your API endpoint
      const redirectTo = `https://petrank.vercel.app/api/auth/callback`
      log(`Setting redirect to: ${redirectTo}`)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
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
        log(`URL contains state parameter: ${data.url.includes('state=')}`)
        log('Redirecting to Google authorization...')
        window.location.href = data.url
      }
      
    } catch (err) {
      log(`Test error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Test error:', err)
      setError(err instanceof Error ? err.message : 'Failed to run test')
    }
  }

  const testDirectUrl = () => {
    try {
      setError(null)
      log('Testing direct OAuth URL construction...')
      
      // Supabase project URL
      const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
      
      // Generate a fixed state parameter for testing
      const stateParam = 'direct_test_state_' + Date.now()
      log(`Generated direct test state parameter: ${stateParam}`)
      
      // Full URL to the API endpoint that will handle the code
      const redirectUrl = 'https://petrank.vercel.app/api/auth/callback'
      const encodedRedirect = encodeURIComponent(redirectUrl)
      
      log(`Supabase URL: ${supabaseUrl}`)
      log(`Redirect URL: ${redirectUrl}`)
      log(`State parameter: ${stateParam}`)
      
      // Create the direct Google authorization URL
      const directUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodedRedirect}&state=${stateParam}`
      log(`Full authorization URL: ${directUrl}`)
      
      // Navigate to the authorization URL
      window.location.href = directUrl
    } catch (err) {
      log(`Direct URL test error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Direct URL test error:', err)
      setError(err instanceof Error ? err.message : 'Failed to run direct URL test')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-600 p-6">
          <h1 className="text-2xl font-bold text-white">Google OAuth Test</h1>
          <p className="text-blue-100 mt-2">
            This page tests Google OAuth integration with explicit state parameters
          </p>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <button
                onClick={testGoogleAuth}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition duration-200"
              >
                Login with Explicit State Parameter
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Tests Google OAuth with an explicit state parameter to prevent CSRF attacks
              </p>
            </div>
            
            <div>
              <button
                onClick={testDirectUrl}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-md transition duration-200"
              >
                Test Direct URL Construction
              </button>
              <p className="mt-2 text-sm text-gray-500">
                Tests direct URL construction for Google OAuth authorization
              </p>
            </div>
            
            <div>
              <button
                onClick={() => router.push('/auth')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-md transition duration-200"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
        
        {/* Logs display */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-3">Debug Logs:</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
            {logs.length > 0 ? 
              logs.map((log, index) => <div key={index} className="mb-1">{log}</div>) : 
              <div className="opacity-50">No logs yet. Run a test to generate logs.</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function GoogleOAuthTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <GoogleOAuthContent />
    </Suspense>
  )
} 