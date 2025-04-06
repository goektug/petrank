'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [testResult, setTestResult] = useState<string>('')
  const supabase = createClientComponentClient()

  const log = (message: string) => {
    console.log(message)
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().slice(11, 19)}: ${message}`])
  }

  useEffect(() => {
    log('Test auth page loaded')
    checkSupabaseConfig()
  }, [])

  async function checkSupabaseConfig() {
    log('Checking Supabase configuration...')
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        log(`Error getting session: ${error.message}`)
        setTestResult('Error')
        return
      }
      
      log(`Session check successful: ${data.session ? 'Session exists' : 'No session'}`)
      
      // Check the auth settings and providers
      log('Getting auth settings...')
      const { data: authSettings, error: authError } = await supabase.from('_config').select('*')
      
      if (authError) {
        log(`Error getting auth settings: ${authError.message}`)
      } else {
        log(`Auth settings retrieved: ${JSON.stringify(authSettings)}`)
      }
      
      setTestResult('Complete')
    } catch (err) {
      log(`Error during config check: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setTestResult('Error')
    }
  }

  const testDirectOAuth = async () => {
    try {
      log('Testing direct OAuth URL...')
      
      // Directly construct the OAuth URL
      const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
      const redirectTo = encodeURIComponent(`${window.location.origin}/admin`)
      
      const githubOAuthUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${redirectTo}`
      
      log(`Opening OAuth URL directly: ${githubOAuthUrl}`)
      window.location.href = githubOAuthUrl
      
    } catch (err) {
      log(`Error testing direct OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Test Status: {testResult || 'Running...'}</h2>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={testDirectOAuth}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Test Direct OAuth URL
        </button>
      </div>
      
      <div className="border border-gray-200 rounded-md p-4 mb-4">
        <h3 className="font-semibold mb-2">Debug Logs:</h3>
        <div className="bg-gray-100 p-2 rounded text-sm font-mono h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
} 