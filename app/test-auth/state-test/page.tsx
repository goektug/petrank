'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function StateTestPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [stateValue, setStateValue] = useState('')
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    // Generate a random state value when the component mounts
    const randomState = Math.random().toString(36).substring(2, 15)
    setStateValue(randomState)
    log(`Generated state value: ${randomState}`)
  }, [])
  
  const log = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, message])
  }
  
  const handleSupabaseLogin = async () => {
    try {
      log('Starting Supabase OAuth flow with explicit state...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'https://petrank.vercel.app/api/github',
          skipBrowserRedirect: true // Don't redirect automatically
        }
      })
      
      if (error) {
        log(`ERROR: ${error.message}`)
        return
      }
      
      log(`OAuth URL: ${data?.url || 'No URL'}`)
      
      // Show the URL but don't redirect yet
      if (data?.url) {
        log('OAuth URL generated successfully')
      }
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
  
  const handleDirectLoginWithState = () => {
    if (!stateValue) {
      log('ERROR: No state value generated')
      return
    }
    
    // Create a manual OAuth URL with explicit state parameter
    const supabaseUrl = 'https://cblsslcreohsrhnurfev.supabase.co'
    const redirectUrl = 'https://petrank.vercel.app/api/github'
    const encodedRedirect = encodeURIComponent(redirectUrl)
    
    // Include state parameter explicitly
    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=github&redirect_to=${encodedRedirect}&state=${stateValue}`
    
    log(`Using manual OAuth URL with state: ${stateValue}`)
    log(`URL: ${oauthUrl}`)
    
    // Navigate to GitHub
    window.location.href = oauthUrl
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">GitHub OAuth State Parameter Test</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          This page tests OAuth with explicit state parameters to fix the "OAuth state parameter missing" error.
        </p>
      </div>
      
      <div className="mb-6 space-y-4">
        <div className="mb-4">
          <p className="mb-2 font-semibold">Current state value:</p>
          <code className="bg-gray-100 p-2 rounded block">{stateValue || 'Generating...'}</code>
        </div>
        
        <button 
          onClick={handleSupabaseLogin}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Generate OAuth URL (Just Show URL)
        </button>
        
        <button
          onClick={handleDirectLoginWithState}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 block"
          disabled={!stateValue}
        >
          Login with Explicit State Parameter
        </button>
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