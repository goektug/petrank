'use client'

import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function TestAuthPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()
  
  const log = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, message])
  }
  
  const handleSupabaseLogin = async () => {
    try {
      setLoading(true)
      log('Starting Supabase OAuth flow...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'https://petrank.vercel.app/api/github'
        }
      })
      
      if (error) {
        log(`ERROR: ${error.message}`)
        return
      }
      
      log(`OAuth URL: ${data?.url || 'No URL'}`)
      
      // Redirect if URL exists
      if (data?.url) {
        log('Redirecting to GitHub...')
        window.location.href = data.url
      }
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleDirectLoginMethod1 = () => {
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    const redirectUrl = 'https://petrank.vercel.app/api/github'
    const encodedRedirect = encodeURIComponent(redirectUrl)
    
    log(`Method 1 - Using redirect: ${redirectUrl}`)
    
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodedRedirect}`
  }
  
  const handleDirectLoginMethod2 = () => {
    // Try without encoding
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    const redirectUrl = 'https://petrank.vercel.app/api/github'
    
    log(`Method 2 - Using redirect without encoding: ${redirectUrl}`)
    
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${redirectUrl}`
  }
  
  const handleDirectLoginMethod3 = () => {
    // Try with specific callback
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    
    log(`Method 3 - Let Supabase use default callback`)
    
    window.location.href = `${supabaseUrl}/auth/v1/authorize?provider=github`
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">GitHub OAuth Test Page</h1>
      
      <div className="mb-6 space-y-4">
        <button 
          onClick={handleSupabaseLogin}
          disabled={loading}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign in with Supabase SDK'}
        </button>
        
        <div className="border-t pt-4 mt-4">
          <p className="font-semibold mb-2">Direct URL Methods:</p>
          <div className="space-y-2">
            <button
              onClick={handleDirectLoginMethod1}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Method 1: Encoded Redirect
            </button>
            
            <button
              onClick={handleDirectLoginMethod2}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 block"
            >
              Method 2: Direct Redirect
            </button>
            
            <button
              onClick={handleDirectLoginMethod3}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 block"
            >
              Method 3: Default Callback
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 p-4 rounded border">
        <h2 className="font-semibold mb-2">Logs:</h2>
        <div className="bg-white p-3 rounded text-sm font-mono h-64 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          ) : (
            <div className="text-gray-400">No logs yet. Click a button to test.</div>
          )}
        </div>
      </div>
    </div>
  )
} 