'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function TestAuth() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const testGoogleAuth = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'email profile'
      }
    })

    if (error) {
      return { success: false, error }
    }

    if (data?.url) {
      window.location.href = data.url
    }

    return { success: true, data }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <button
          onClick={testGoogleAuth}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
} 