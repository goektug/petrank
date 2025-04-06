'use client'

import React, { useEffect, useState } from 'react'
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

export default function Home() {
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
      </div>
    </div>
  )
} 