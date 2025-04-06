'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import DropZone from './components/DropZone'
import UploadModal from './components/UploadModal'

interface PetImage {
  id: string
  pet_name: string
  age: string
  gender: string
  social_media_link: string | null
  image_url: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  file_path: string
  view_count: number
}

function HomeContent() {
  const [logs, setLogs] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [petImages, setPetImages] = useState<PetImage[]>([])
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<PetImage | null>(null)

  const log = (message: string) => {
    console.log(message)
    setLogs((prevLogs) => [...prevLogs, `${new Date().toISOString().slice(11, 19)}: ${message}`])
  }

  useEffect(() => {
    // Check for code in URL params
    const code = searchParams.get('code')
    if (code) {
      log(`Code detected: ${code.slice(0, 8)}...`)
      handleCode(code)
    } else {
      log('No code parameter found in URL')
    }
  }, [searchParams])

  const handleCode = async (code: string) => {
    try {
      setProcessing(true)
      log('Attempting to exchange code for session...')
      
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        log(`Error exchanging code: ${error.message}`)
        console.error('Code exchange error:', error)
        return
      }
      
      log('Code exchanged successfully, checking session...')
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        log(`Session error: ${sessionError.message}`)
        console.error('Session error:', sessionError)
        return
      }
      
      if (session) {
        log(`Session found for user: ${session.user.id}`)
        log('Redirecting to admin...')
        router.push('/admin')
      } else {
        log('No session found after code exchange')
      }
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Error handling code:', err)
    } finally {
      setProcessing(false)
    }
  }

  const getSignedUrl = async (filePath: string) => {
    console.log('Getting signed URL for:', filePath)
    try {
      const { data, error } = await supabase.storage
        .from('pet-images')
        .createSignedUrl(filePath, 24 * 60 * 60) // 24 hours

      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }

      if (!data?.signedUrl) {
        console.error('No signed URL returned')
        return null
      }

      console.log('Got signed URL successfully')
      return data.signedUrl
    } catch (err) {
      console.error('Error in getSignedUrl:', err)
      return null
    }
  }

  const incrementViewCount = async (imageId: string) => {
    try {
      const { error } = await supabase.rpc('increment_views', { image_id: imageId })
      if (error) {
        console.error('Error incrementing view count:', error)
      }
    } catch (err) {
      console.error('Error in incrementViewCount:', err)
    }
  }

  const handleImageClick = (image: PetImage) => {
    setSelectedImage(image)
    incrementViewCount(image.id)
    // Update local state to show immediate feedback
    setPetImages(prevImages =>
      prevImages.map(img =>
        img.id === image.id
          ? { ...img, view_count: (img.view_count || 0) + 1 }
          : img
      )
    )
  }

  const fetchPetImages = async () => {
    try {
      console.log('Fetching approved pet images...')
      const { data, error } = await supabase
        .from('pet_uploads')
        .select('*')
        .eq('status', 'approved')
        .order('view_count', { ascending: false }) // Order by views
        .order('created_at', { ascending: false }) // Secondary sort by date

      if (error) {
        console.error('Error fetching pet images:', error)
        setError('Failed to load pet images')
        return
      }

      console.log('Raw approved images data:', data)

      // Get fresh signed URLs for all images
      const updatedImages = await Promise.all((data || []).map(async (pet) => {
        console.log('Processing pet image:', pet)
        if (!pet.file_path) {
          console.error('No file path for pet:', pet.id)
          return pet
        }

        const signedUrl = await getSignedUrl(pet.file_path)
        console.log(`Signed URL for ${pet.id}:`, signedUrl)
        return {
          ...pet,
          image_url: signedUrl || pet.image_url
        }
      }))

      console.log('Final processed images:', updatedImages)
      setPetImages(updatedImages.filter(pet => pet.image_url))
      setError(null)
    } catch (err) {
      console.error('Error in fetchPetImages:', err)
      setError('Failed to load pet images')
    }
  }

  const handleFileDrop = (files: File[]) => {
    console.log('Files dropped:', files)
    setUploadedFiles(files)
    if (files.length > 0) {
      console.log('Opening modal with file:', files[0])
      setCurrentFile(files[0])
      setIsModalOpen(true)
    }
  }

  const handleModalClose = () => {
    console.log('Modal closing')
    setIsModalOpen(false)
    setCurrentFile(null)
    setUploadedFiles([])
    fetchPetImages()
  }

  // Initial load
  useEffect(() => {
    fetchPetImages()
  }, [])

  // Refresh signed URLs periodically (every 12 hours)
  useEffect(() => {
    const interval = setInterval(fetchPetImages, 12 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            PetRank
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            The best way to rate and rank your favorite pets!
          </p>
          <div className="flex justify-center space-x-4 mb-12">
            {processing ? (
              <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 opacity-50">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              <>
                <Link href="/upload" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  Upload a Pet
                </Link>
                <Link href="/admin" className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Admin Login
                </Link>
              </>
            )}
          </div>
        </div>
        
        {/* Logs display */}
        {logs.length > 0 && (
          <div className="mt-8 border border-gray-200 rounded-md p-4 bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-2">Auth Debug Logs:</h3>
            <div className="bg-gray-50 p-4 rounded text-sm font-mono h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Pet image grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Pets</h2>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {petImages.map((pet) => (
              <div 
                key={pet.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => handleImageClick(pet)}
              >
                <div className="relative pb-2/3">
                  <img 
                    src={pet.image_url} 
                    alt={pet.pet_name} 
                    className="absolute h-full w-full object-cover"
                    style={{ height: '300px', width: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900">{pet.pet_name}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-gray-600">
                      {pet.age} • {pet.gender}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {pet.view_count || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {petImages.length === 0 && !error && (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600">No approved pet images yet. Be the first to upload one!</p>
            </div>
          )}
        </div>
        
        {/* Upload zone */}
        <div className="mt-16 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Your Pet</h2>
          <DropZone onFileDrop={handleFileDrop} />
        </div>
        
        {/* Upload modal */}
        {isModalOpen && currentFile && (
          <UploadModal 
            file={currentFile} 
            onClose={handleModalClose} 
          />
        )}
        
        {/* Selected image modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-bold">{selectedImage.pet_name}</h3>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <img 
                  src={selectedImage.image_url} 
                  alt={selectedImage.pet_name} 
                  className="w-full max-h-96 object-contain mb-4"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500">Details</h4>
                    <p className="mt-1">Age: {selectedImage.age}</p>
                    <p className="mt-1">Gender: {selectedImage.gender}</p>
                    <p className="mt-1">Views: {selectedImage.view_count || 0}</p>
                  </div>
                  <div>
                    {selectedImage.social_media_link && (
                      <div className="mt-4 md:mt-0">
                        <h4 className="text-sm font-semibold text-gray-500">Social Media</h4>
                        <a 
                          href={selectedImage.social_media_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                        >
                          {selectedImage.social_media_link.replace(/^https?:\/\//i, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
} 