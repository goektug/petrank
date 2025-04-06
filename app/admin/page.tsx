'use client'

import React, { useEffect, useState } from 'react'
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

export default function AdminPage() {
  const [pendingUploads, setPendingUploads] = useState<PetUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    fetchPendingUploads()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        router.push('/auth')
        return
      }
      if (!session) {
        console.log('No session found, redirecting to auth')
        router.push('/auth')
        return
      }
      console.log('User authenticated:', session.user.email)
    } catch (err) {
      console.error('Error checking session:', err)
      router.push('/auth')
    }
  }

  const getSignedUrl = async (filePath: string) => {
    try {
      console.log('Getting signed URL for:', filePath)
      const { data, error } = await supabase.storage
        .from('pet-images')
        .createSignedUrl(filePath, 24 * 60 * 60) // 24 hours

      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }

      console.log('Signed URL created:', data.signedUrl)
      return data.signedUrl
    } catch (err) {
      console.error('Error in getSignedUrl:', err)
      return null
    }
  }

  const fetchPendingUploads = async () => {
    try {
      setLoading(true)
      setError(null)

      // First, check if we can access the table at all
      console.log('Checking table access...')
      const { data: tableCheck, error: tableError } = await supabase
        .from('pet_uploads')
        .select('count')
        .single()

      if (tableError) {
        console.error('Table access error:', tableError)
        throw new Error('Cannot access pet_uploads table. Please check database permissions.')
      }

      console.log('Table access successful, fetching uploads...')
      const { data: uploads, error } = await supabase
        .from('pet_uploads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching uploads:', error)
        throw error
      }

      console.log('Raw uploads data:', uploads)

      if (!uploads || uploads.length === 0) {
        console.log('No uploads found in database')
        setPendingUploads([])
        return
      }

      // Get fresh signed URLs for all images
      const updatedUploads = await Promise.all(uploads.map(async (upload) => {
        console.log('Processing upload:', upload)
        if (!upload.file_path) {
          console.error('No file path for upload:', upload.id)
          return upload
        }

        const signedUrl = await getSignedUrl(upload.file_path)
        return {
          ...upload,
          image_url: signedUrl || upload.image_url
        }
      }))

      console.log('Final processed uploads:', updatedUploads)
      setPendingUploads(updatedUploads)
    } catch (err) {
      console.error('Error in fetchPendingUploads:', err)
      setError(err instanceof Error ? err.message : 'Failed to load uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setError(null)
      console.log(`Starting ${action} process for upload:`, id)
      
      const { data, error } = await supabase
        .from('pet_uploads')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', id)
        .select()

      if (error) {
        console.error(`Error ${action}ing upload:`, error)
        throw error
      }

      console.log(`Successfully ${action}ed upload. Updated data:`, data)
      // Refresh the list
      await fetchPendingUploads()
      console.log('Refreshed uploads list after action')
    } catch (err) {
      console.error(`Error ${action}ing upload:`, err)
      setError(`Failed to ${action} upload`)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      router.push('/auth')
    } catch (err) {
      console.error('Error during sign out:', err)
      setError('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
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
            Refresh List
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUploads.length === 0 ? (
            <p className="text-gray-500">No uploads found</p>
          ) : (
            pendingUploads.map((upload) => (
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
                <div className="text-sm text-gray-500 space-y-1 mt-2">
                  <p>Age: {upload.age}</p>
                  <p>Gender: {upload.gender}</p>
                  {upload.social_media_link && (
                    <p>
                      <a 
                        href={upload.social_media_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Social Media
                      </a>
                    </p>
                  )}
                  <p>Status: {upload.status}</p>
                </div>
                {upload.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => handleAction(upload.id, 'approve')}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleAction(upload.id, 'reject')}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 