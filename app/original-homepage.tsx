'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [petImages, setPetImages] = useState<PetImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<PetImage | null>(null)
  const supabase = createClientComponentClient()

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
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching pet images:', error)
          setError('Failed to load pet images')
          return
        }

        const petsWithUrls = await Promise.all(
          data.map(async (pet) => {
            if (pet.file_path) {
              const signedUrl = await getSignedUrl(pet.file_path)
              return { ...pet, image_url: signedUrl }
            }
            return pet
          })
        )

        setPetImages(petsWithUrls)
      } catch (err) {
        console.error('Failed to fetch pet images:', err)
        setError('Failed to load pet images')
      }
    }

    fetchImages()
  }, [])

  const handleFileDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles)
    setCurrentFile(acceptedFiles[0])
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setCurrentFile(null)
  }

  const handleImageClick = (pet: PetImage) => {
    setSelectedImage(pet);
    
    // First update UI immediately (optimistic update)
    const newViewCount = (pet.view_count || 0) + 1;
    
    // Update local state
    setPetImages(prevImages => 
      prevImages.map(p => 
        p.id === pet.id ? { ...p, view_count: newViewCount } : p
      )
    );
    
    // Also update the selected image if it's the one being clicked
    setSelectedImage(prev => 
      prev && prev.id === pet.id ? { ...prev, view_count: newViewCount } : prev
    );
    
    // Use a simple image "ping" method that works on all browsers
    // This approach has extremely high compatibility
    const trackingPixel = new Image();
    trackingPixel.onload = () => console.log('View count update successful via ping');
    trackingPixel.onerror = () => console.log('View count update error via ping');
    // Add a timestamp to prevent caching issues
    trackingPixel.src = `/api/ping-view?id=${encodeURIComponent(pet.id)}&t=${new Date().getTime()}`;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Pet Rank</h1>

      {petImages.length > 0 && petImages[0] && (
        <div className="mb-8">
          <div 
            className="relative bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 mx-auto max-w-4xl"
            onClick={() => handleImageClick(petImages[0])}
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

      {error && (
        <p className="text-red-500 text-center mb-4">{error}</p>
      )}

      {petImages.length > 1 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {petImages.slice(1).map((pet) => (
            <div 
              key={pet.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => handleImageClick(pet)}
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

      {/* Image Preview Modal - Compact design for mobile */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          {/* Constrain height to ensure everything fits on screen */}
          <div className="relative max-h-[85vh] flex flex-col items-center overflow-hidden" 
               onClick={(e) => e.stopPropagation()}>
            {/* Image container with reduced negative margin */}
            <div className="relative z-10 mb-[-20px]"> 
              <img
                src={selectedImage.image_url}
                alt={selectedImage.pet_name}
                className="max-h-[55vh] max-w-[90vw] md:max-w-lg object-contain shadow-lg rounded-lg"
              />
              {/* View count overlay */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                👁 {selectedImage.view_count || 0} views
              </div>
            </div>

            {/* Compacted info box with less padding */}
            <div className="bg-white rounded-lg pt-8 px-4 pb-4 shadow-lg max-w-lg w-full overflow-y-auto">
              <h2 className="text-xl font-bold mb-1 text-center">{selectedImage.pet_name}</h2>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">Age: {selectedImage.age}</p>
                <p className="text-gray-700">Gender: {selectedImage.gender}</p>
                {selectedImage.social_media_link && (
                  <p>
                    <a 
                      href={selectedImage.social_media_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visit Social Media
                    </a>
                  </p>
                )}
              </div>
              
              {/* Position the close button higher and with less margin */}
              <button
                className="mt-2 w-full bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-sm mb-safe"
                onClick={() => setSelectedImage(null)}
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