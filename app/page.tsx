'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import DropZone from './components/DropZone'
import UploadModal from './components/UploadModal'

interface PetImage {
  id: string
  created_at: string
  file_path: string
  image_url?: string
  pet_name: string
  age: string
  gender: string
  social_media_link?: string
  view_count?: number
}

function HomeContent() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [petImages, setPetImages] = useState<PetImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<PetImage | null>(null)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle OAuth code if present in URL
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      console.log(`OAuth code detected: ${code.substring(0, 8)}...`)
      handleOAuthCode(code)
    }
  }, [searchParams])

  const handleOAuthCode = async (code: string) => {
    try {
      setIsProcessingAuth(true)
      console.log('Processing OAuth code...')
      
      // Get current site URL
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://petrank.vercel.app';
      
      // Try the new API route path
      const apiPath = `/api/auth/github?code=${code}`;
      console.log(`Redirecting to API route: ${siteUrl}${apiPath}`)
      
      // Use window.location for a full page redirect instead of router.push
      // This ensures a clean reload and proper cookie handling
      window.location.href = `${siteUrl}${apiPath}`;
      return;
      
    } catch (err) {
      console.error('Error handling OAuth code:', err)
      setError('Unexpected error during authentication. Please try again.')
      setIsProcessingAuth(false)
    }
  }

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('pet-images').createSignedUrl(
        filePath, 
        60 * 60 // 1 hour
      )
      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }
      return data.signedUrl
    } catch (err) {
      console.error('Failed to get signed URL:', err)
      return null
    }
  }

  useEffect(() => {
    async function fetchImages() {
      try {
        const { data, error } = await supabase
          .from('pet_uploads')
          .select('*')
          .eq('status', 'approved')
          .order('view_count', { ascending: false })
        
        if (error) {
          console.error('Error fetching pet images:', error)
          setError('Failed to load pet images')
          return
        }

        console.log('Raw data from database:', data)

        const petsWithUrls = await Promise.all(
          data.map(async (pet) => {
            if (pet.file_path) {
              const signedUrl = await getSignedUrl(pet.file_path)
              return { 
                ...pet, 
                image_url: signedUrl,
                view_count: pet.view_count || 0 // Ensure view_count is always a number
              }
            }
            return { ...pet, view_count: pet.view_count || 0 }
          })
        )

        console.log('Processed images with view counts:', petsWithUrls)
        setPetImages(petsWithUrls)
      } catch (err) {
        console.error('Failed to fetch pet images:', err)
        setError('Failed to load pet images')
      }
    }

    if (!isProcessingAuth) {
      fetchImages()
    }
  }, [isProcessingAuth])

  const handleFileDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles)
    setCurrentFile(acceptedFiles[0])
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setCurrentFile(null)
  }

  const handleImageClick = async (pet: PetImage) => {
    console.log('Image clicked:', pet.id, 'Device type:', /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop')
    setSelectedImage(pet)
    
    try {
      // Use the database function to increment the view count
      const { error: incrementError } = await supabase
        .rpc('increment_view_count', { pet_id: pet.id })

      if (incrementError) {
        console.error('Error incrementing view count:', incrementError)
        return
      }

      // Get the updated view count
      const { data: updatedPet, error: fetchError } = await supabase
        .from('pet_uploads')
        .select('view_count')
        .eq('id', pet.id)
        .single()

      if (fetchError) {
        console.error('Error fetching updated view count:', fetchError)
        return
      }

      const newCount = updatedPet.view_count
      console.log('View count updated successfully for image:', pet.id, 'New count:', newCount)
      
      // Update local state with the new count
      setPetImages(images => 
        images.map(p => 
          p.id === pet.id ? { ...p, view_count: newCount } : p
        )
      )
      setSelectedImage(prev => 
        prev ? { ...prev, view_count: newCount } : null
      )
    } catch (err) {
      console.error('Failed to update view count:', err)
    }
  }

  // Add touch event handler for mobile devices
  const handleTouchStart = (e: React.TouchEvent, pet: PetImage) => {
    e.preventDefault() // Prevent default touch behavior
    console.log('Touch start on image:', pet.id)
    handleImageClick(pet)
  }

  // Add touch end handler to ensure the event is processed
  const handleTouchEnd = (e: React.TouchEvent, pet: PetImage) => {
    e.preventDefault()
    console.log('Touch end on image:', pet.id)
    handleImageClick(pet)
  }

  // Add click handler for desktop devices
  const handleClick = (e: React.MouseEvent, pet: PetImage) => {
    e.preventDefault()
    console.log('Click on image:', pet.id)
    handleImageClick(pet)
  }

  // If processing auth, show loading state
  if (isProcessingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Processing Authentication</h2>
        <p className="text-gray-600">Please wait while we log you in...</p>
      </div>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Pet Rank</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {petImages.length > 0 && petImages[0] && (
        <div className="mb-8">
          <div 
            className="relative bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 mx-auto max-w-4xl"
            onClick={(e) => handleClick(e, petImages[0])}
          >
            {petImages[0].image_url ? (
              <div className="relative">
                <img
                  src={petImages[0].image_url}
                  alt={petImages[0].pet_name}
                  className="w-full h-[400px] object-cover"
                  onError={async () => {
                    if (petImages[0].file_path) {
                      const newUrl = await getSignedUrl(petImages[0].file_path)
                      if (newUrl) {
                        setPetImages(images => 
                          images.map(p => 
                            p.id === petImages[0].id ? { ...p, image_url: newUrl } : p
                          )
                        )
                      }
                    }
                  }}
                />
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 text-lg rounded-full">
                  👁 {petImages[0].view_count || 0}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
                  <h2 className="text-2xl font-bold text-white mb-2">{petImages[0].pet_name}</h2>
                  <div className="text-white/90 flex gap-4">
                    <p>Age: {petImages[0].age}</p>
                    <p>Gender: {petImages[0].gender}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-[400px] bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500">Image not available</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-8 max-w-xl mx-auto">
        <DropZone onDrop={handleFileDrop} />
      </div>

      {petImages.length > 1 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {petImages.slice(1).map((pet) => (
            <div 
              key={pet.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              onClick={(e) => handleClick(e, pet)}
              onTouchStart={(e) => handleTouchStart(e, pet)}
              onTouchEnd={(e) => handleTouchEnd(e, pet)}
              onTouchCancel={(e) => e.preventDefault()}
            >
              {pet.image_url ? (
                <div className="relative">
                  <img
                    src={pet.image_url}
                    alt={pet.pet_name}
                    className="w-full h-40 object-cover"
                    onError={async () => {
                      if (pet.file_path) {
                        const newUrl = await getSignedUrl(pet.file_path)
                        if (newUrl) {
                          setPetImages(images => 
                            images.map(p => 
                              p.id === pet.id ? { ...p, image_url: newUrl } : p
                            )
                          )
                        }
                      }
                    }}
                  />
                  <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded-bl">
                    👁 {pet.view_count || 0}
                  </div>
                </div>
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Image not available</span>
                </div>
              )}
              <div className="p-2">
                <h3 className="text-sm font-semibold truncate">{pet.pet_name}</h3>
                <div className="text-xs text-gray-600">
                  <p className="truncate">Age: {pet.age}</p>
                  <p className="truncate">Gender: {pet.gender}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !petImages[0] && (
          <p className="text-center text-gray-500">
            {error ? 'Error loading images' : 'No approved pet images yet.'}
          </p>
        )
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.pet_name}
                className="w-full h-[500px] object-contain bg-black"
              />
              <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                👁 {selectedImage.view_count || 0} views
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">{selectedImage.pet_name}</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-600">Age: {selectedImage.age}</p>
                  <p className="text-gray-600">Gender: {selectedImage.gender}</p>
                </div>
                {selectedImage.social_media_link && (
                  <div className="text-right">
                    <a 
                      href={selectedImage.social_media_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Social Media
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && currentFile && (
        <UploadModal
          onClose={handleModalClose}
          file={currentFile}
        />
      )}
    </main>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
} 