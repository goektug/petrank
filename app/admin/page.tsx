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
  view_count?: number
}

function AdminDashboard() {
  const [pendingUploads, setPendingUploads] = useState<PetUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchPendingUploads()
  }, [])

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('pet-images')
        .createSignedUrl(filePath, 24 * 60 * 60) // 24 hours

      if (error) {
        return null
      }

      return data.signedUrl
    } catch (err) {
      return null
    }
  }

  const fetchPendingUploads = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: uploads, error } = await supabase
        .from('pet_uploads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!uploads || uploads.length === 0) {
        setPendingUploads([])
        return
      }

      // Get fresh signed URLs for all images
      const updatedUploads = await Promise.all(uploads.map(async (upload) => {
        if (!upload.file_path) {
          return upload
        }

        const signedUrl = await getSignedUrl(upload.file_path)
        return {
          ...upload,
          image_url: signedUrl || upload.image_url
        }
      }))

      setPendingUploads(updatedUploads)
    } catch (err) {
      setError('Failed to load uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setError(null)
      
      const { error } = await supabase
        .from('pet_uploads')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', id)
        .select()

      if (error) throw error

      // Refresh the list
      await fetchPendingUploads()
    } catch (err) {
      setError(`Failed to ${action} upload`)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth')
    } catch (err) {
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
            href="/?refresh=true"
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </Link>
          <button
            onClick={handleSignOut}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
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
                <div className="text-sm text-gray-500 mt-2">
                  <div className="space-y-1">
                    <p>Age: {upload.age}</p>
                    <p>Gender: {upload.gender}</p>
                    <p>Status: <span className={`font-medium ${
                      upload.status === 'pending' ? 'text-yellow-600' : 
                      upload.status === 'approved' ? 'text-green-600' : 
                      'text-red-600'
                    }`}>{upload.status}</span></p>
                    {upload.view_count !== undefined && (
                      <p>Views: {upload.view_count}</p>
                    )}
                    {upload.social_media_link && (
                      <p className="mt-4 text-center">
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
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  {upload.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(upload.id, 'approve')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(upload.id, 'reject')}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {upload.status === 'approved' && (
                    <button
                      onClick={() => handleAction(upload.id, 'reject')}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  )}
                  {upload.status === 'rejected' && (
                    <button
                      onClick={() => handleAction(upload.id, 'approve')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return <AdminDashboard />
} 