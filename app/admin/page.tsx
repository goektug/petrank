'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface PetUpload {
  id: string
  pet_name: string
  age: string
  gender: string
  social_media_link: string | null
  image_url: string
  file_path: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface UserProfile {
  email: string | null | undefined
  avatarUrl: string | null
  name: string | null
  id: string
  lastSignIn: string | null | undefined
}

function AdminDashboard() {
  const [pendingUploads, setPendingUploads] = useState<PetUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (sessionChecked && userProfile) {
      fetchPendingUploads()
    }
  }, [sessionChecked, userProfile])

  const checkUser = async () => {
    try {
      console.log('Checking user session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        router.push('/auth?error=Session error. Please sign in again.')
        return
      }
      
      if (!session) {
        console.log('No session found, redirecting to auth')
        router.push('/auth')
        return
      }
      
      // Extract user info from session
      const { user } = session
      console.log('User authenticated:', user.email)
      
      // Get user metadata and profile information
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user details:', userError)
      }
      
      // Set user profile information
      setUserProfile({
        email: user.email,
        avatarUrl: user.user_metadata?.avatar_url || null,
        name: user.user_metadata?.user_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
        id: user.id,
        lastSignIn: user.last_sign_in_at
      })
      
      console.log('User profile set:', userData?.user)
      setSessionChecked(true)
    } catch (err) {
      console.error('Error checking session:', err)
      setError('Authentication error. Please try signing in again.')
      setTimeout(() => {
        router.push('/auth')
      }, 3000)
    }
  }

  const fetchPendingUploads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pet_uploads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const uploadsWithUrls = await Promise.all(
        data.map(async (upload) => {
          if (upload.file_path) {
            const { data: urlData } = await supabase.storage
              .from('pet-images')
              .createSignedUrl(upload.file_path, 60 * 60)
            return { ...upload, image_url: urlData?.signedUrl }
          }
          return upload
        })
      )

      setPendingUploads(uploadsWithUrls)
    } catch (err) {
      setError('Failed to fetch uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('pet_uploads')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      setPendingUploads(current =>
        current.filter(upload => upload.id !== id)
      )
    } catch (err) {
      setError('Failed to update status')
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      console.log('User signed out successfully')
      router.push('/auth')
    } catch (err) {
      console.error('Error during sign out:', err)
      setError('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        
        {userProfile && (
          <div className="flex items-center">
            {userProfile.avatarUrl && (
              <img 
                src={userProfile.avatarUrl} 
                alt={userProfile.name || 'User'} 
                className="w-10 h-10 rounded-full mr-3"
              />
            )}
            <div className="mr-4 text-right">
              <p className="font-medium">{userProfile.name}</p>
              <p className="text-sm text-gray-600">{userProfile.email}</p>
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <Link 
            href="/"
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Home
          </Link>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">All Uploads</h2>
          <button
            onClick={fetchPendingUploads}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUploads.map((upload) => (
            <div key={upload.id} className="border rounded-lg p-4">
              {upload.image_url ? (
                <img 
                  src={upload.image_url} 
                  alt={upload.pet_name} 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-lg mb-4">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
              <h3 className="font-medium">{upload.pet_name}</h3>
              <div className="mt-2 space-x-2">
                {upload.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(upload.id, 'approved')}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(upload.id, 'rejected')}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AdminDashboard />
    </Suspense>
  )
} 