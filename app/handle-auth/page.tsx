'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

function HandleAuthContent() {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing authentication...')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  const log = (message: string) => {
    console.log(message)
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().slice(11, 19)}: ${message}`])
  }

  useEffect(() => {
    const code = searchParams.get('code')
    
    if (!code) {
      log('No code parameter found in URL')
      setStatus('error')
      setMessage('Authentication failed: No code parameter found')
      return
    }
    
    log(`Code found: ${code.slice(0, 8)}...`)
    handleAuthCode(code)
  }, [searchParams])

  const handleAuthCode = async (code: string) => {
    try {
      log('Attempting to exchange code for session...')
      
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        log(`Error exchanging code: ${exchangeError.message}`)
        setStatus('error')
        setMessage(`Authentication failed: ${exchangeError.message}`)
        return
      }
      
      log('Code exchanged successfully')
      
      // Check if we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        log(`Error checking session: ${sessionError.message}`)
        setStatus('error')
        setMessage(`Session error: ${sessionError.message}`)
        return
      }
      
      if (!session) {
        log('No session found after code exchange')
        setStatus('error')
        setMessage('Authentication failed: No session created')
        return
      }
      
      log(`Session established for user ID: ${session.user.id}`)
      setStatus('success')
      setMessage('Authentication successful! Redirecting...')
      
      // Redirect to admin page
      setTimeout(() => {
        router.push('/admin')
      }, 2000)
      
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setStatus('error')
      setMessage(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Authentication {status === 'success' ? 'Successful' : status === 'error' ? 'Failed' : 'in Progress'}</h1>
          <p className={`${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-green-600' : 'text-gray-600'}`}>
            {message}
          </p>
        </div>
        
        <div className="mb-6 flex justify-center">
          {status === 'processing' && (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          )}
          {status === 'success' && (
            <div className="bg-green-100 text-green-800 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-100 text-red-800 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        
        {status === 'error' && (
          <div className="flex justify-center">
            <button 
              onClick={() => router.push('/auth')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Return to Login
            </button>
          </div>
        )}
        
        {/* Logs display */}
        <div className="mt-8 border border-gray-200 rounded-md p-4">
          <h3 className="text-sm font-semibold mb-2">Debug Logs:</h3>
          <div className="bg-gray-50 p-2 rounded text-xs font-mono h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HandleAuth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <HandleAuthContent />
    </Suspense>
  )
} 