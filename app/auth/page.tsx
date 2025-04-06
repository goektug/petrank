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

  const handleGitHubLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      log('Starting GitHub OAuth flow...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/api/github`,
          skipBrowserRedirect: false // Ensure browser is redirected
        }
      })

      if (error) {
        log(`OAuth error: ${error.message}`)
        console.error('OAuth error:', error)
        throw error
      }

      log(`OAuth initiated: ${JSON.stringify(data)}`)
      log('Redirecting to GitHub for authorization...')
      
    } catch (err) {
      log(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to login with GitHub')
    } finally {
      setLoading(false)
    }
  }

  const handleDirectLogin = () => {
    log('Using direct OAuth URL...')
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    const redirectTo = encodeURIComponent(`${window.location.origin}/api/github`)
    const directUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${redirectTo}`
    log(`Redirecting to: ${directUrl}`)
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
            Make sure your GitHub OAuth app has this callback URL:<br />
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
            onClick={handleGitHubLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.163 20 14.418 20 10c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
                Sign in with GitHub
              </span>
            )}
          </button>
          
          <div className="mt-3">
            <button
              onClick={handleDirectLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Try Direct GitHub Login
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