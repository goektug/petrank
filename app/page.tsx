'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import DropZone from './components/DropZone'
import UploadModal from './components/UploadModal'
import { getCachedImageUrl, prefetchImageUrls } from './utils/imageCache'
import viewCountBatcher from './utils/viewCountBatcher'

// Add styles for notification animation
const notificationStyles = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

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

// Create an inline notification component
const Notification = ({ message, subMessage, onClose }: { message: string; subMessage?: string; onClose?: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 max-w-sm z-50" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          {subMessage && <p className="mt-1 text-sm text-gray-500">{subMessage}</p>}
        </div>
        <button 
          onClick={onClose} 
          className="ml-4 text-gray-400 hover:text-gray-500"
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

function HomeContent() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [petImages, setPetImages] = useState<PetImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<PetImage | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [isProcessingAuth, setIsProcessingAuth] = useState(false)
  const [touchStartPos, setTouchStartPos] = useState<{x: number, y: number} | null>(null)
  const [clickStartTime, setClickStartTime] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [showNotification, setShowNotification] = useState(false)
  const [showUploadSuccessNotification, setShowUploadSuccessNotification] = useState(false)
  const PAGE_SIZE = 10
  
  const supabase = createClientComponentClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle OAuth code if present in URL
  useEffect(() => {
    const runOnce = () => {
      // Save the current URL search params to avoid re-triggering this effect
      const code = searchParams.get('code')
      if (code) {
        console.log(`OAuth code detected: ${code.substring(0, 8)}...`)
        handleOAuthCode(code)
        return true;
      }

      // Check for refresh parameter and force data refresh
      const refresh = searchParams.get('refresh')
      if (refresh === 'true') {
        console.log('Refresh parameter detected, forcing data refresh')
        
        // Remove the refresh parameter from the URL to prevent unnecessary refreshes
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('refresh')
        window.history.replaceState({}, '', newUrl)
        return true;
      }
      
      return false;
    }
    
    // Only run the special URL parameter handling once
    runOnce();
  }, []); // Empty dependency array - only run once on mount

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

  // Get total count of approved images - moved outside fetchImages to simplify
  const fetchTotalCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('pet_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        
      if (error) {
        console.error('Error fetching total count:', error)
        return 0
      }
      
      return count || 0
    } catch (err) {
      console.error('Failed to fetch total count:', err)
      return 0
    }
  }, [supabase]);

  // Add a flag to control sorting behavior
  const USE_VIEW_COUNT_SORT = true; // Set to TRUE to use view count sorting
  
  // Convert to useCallback to prevent recreation on every render
  const fetchImages = useCallback(async (page = 1) => {
    try {
      // Don't refetch if already loading
      if (isLoading) {
        console.log('Already loading, skipping fetch');
        return;
      }
      
      setIsLoading(true)
      console.log(`Fetching images page ${page}, limit ${PAGE_SIZE}...`)
      
      // Get total count for pagination
      if (page === 1 || totalCount === 0) {
        const count = await fetchTotalCount()
        console.log(`Total approved images count: ${count}`)
        setTotalCount(count)
        setHasMore(count > PAGE_SIZE * (page - 1))
      }
      
      // Calculate offset
      const offset = (page - 1) * PAGE_SIZE
      
      // For first page, get top image separately 
      if (page === 1) {
        // First get the top-ranked image by view count
        const { data: topImage, error: topError } = await supabase
          .from('pet_uploads')
          .select('id, pet_name, age, gender, social_media_link, file_path, view_count, created_at, image_url')
          .eq('status', 'approved')
          .order('view_count', { ascending: false, nullsFirst: false })
          .limit(1)
        
        if (topError) {
          console.error('Error fetching top image:', topError)
          return
        }
        
        console.log('Top image:', topImage?.[0]?.pet_name, 'with view count:', topImage?.[0]?.view_count)
        
        // Get all approved images for random selection
        const { data: allImages, error: allError } = await supabase
          .from('pet_uploads')
          .select('id, pet_name, age, gender, social_media_link, file_path, view_count, created_at, image_url')
          .eq('status', 'approved')
          .neq('id', topImage?.[0]?.id) // Exclude the top image
          
        if (allError) {
          console.error('Error fetching all images for random selection:', allError)
          return
        }
        
        // Shuffle the remaining images for random selection
        const shuffledImages = allImages ? shuffleArray([...allImages]) : []
        
        // Take only what we need for this page (PAGE_SIZE - 1, since we already have the top image)
        const randomSelection = shuffledImages.slice(0, PAGE_SIZE - 1)
        
        // Combine top image with random selection
        const data = topImage ? [...topImage, ...randomSelection] : randomSelection
        
        console.log(`Selected ${data.length} images (1 top + ${randomSelection.length} random)`)
      
        // Process the data as before...
        if (!data || data.length === 0) {
          console.log('No approved images found')
          setPetImages([])
          setHasMore(false)
          return
        }

        console.log(`Fetched ${data.length} images for page ${page}`)
        data.forEach(pet => {
          console.log(`Pet ${pet.id} (${pet.pet_name}) has view_count: ${pet.view_count === null ? 'NULL' : pet.view_count}`)
        })
        
        // Initialize view_count as 0 for any null values
        const processedData = data.map(pet => ({
          ...pet,
          view_count: typeof pet.view_count === 'number' ? pet.view_count : 0
        }))
    
        // Get cached image URLs in parallel
        const petsWithUrls = await Promise.all(
          processedData.map(async (pet) => {
            // If the pet already has an image_url, use it directly
            if (pet.image_url) {
              return pet;
            }
            
            // Otherwise, get a signed URL from storage
            if (pet.file_path) {
              const signedUrl = await getCachedImageUrl(pet.file_path, pet.id)
              return { 
                ...pet, 
                image_url: signedUrl || pet.image_url || undefined
              }
            }
            return pet
          })
        )
    
        // Set the images
        setPetImages(petsWithUrls as PetImage[])
      } else {
        // For subsequent pages, just get random images
        try {
          // Get all approved images without trying to exclude using 'not in' which causes SQL errors
          const { data: allImages, error: allError } = await supabase
            .from('pet_uploads')
            .select('id, pet_name, age, gender, social_media_link, file_path, view_count, created_at, image_url')
            .eq('status', 'approved')
            
          if (allError) {
            console.error('Error fetching images for additional pages:', allError)
            return
          }
          
          if (!allImages || allImages.length === 0) {
            console.log('No more images found')
            setHasMore(false)
            return
          }
          
          // Filter out already shown images on the client side
          const alreadyShownIds = new Set(petImages.map(p => p.id))
          const remainingImages = allImages.filter(img => !alreadyShownIds.has(img.id))
          
          console.log(`Filtered ${allImages.length} total images to ${remainingImages.length} remaining images`)
          
          if (remainingImages.length === 0) {
            console.log('No new images to show')
            setHasMore(false)
            return
          }
          
          // Shuffle the remaining images for random selection
          const shuffledImages = shuffleArray([...remainingImages])
          
          // Take only what we need for this page
          const randomSelection = shuffledImages.slice(0, PAGE_SIZE)
          
          console.log(`Selected ${randomSelection.length} random images for page ${page}`)
          
          // Initialize view_count as 0 for any null values
          const processedData = randomSelection.map(pet => ({
            ...pet,
            view_count: typeof pet.view_count === 'number' ? pet.view_count : 0
          }))
      
          // Get cached image URLs in parallel
          const petsWithUrls = await Promise.all(
            processedData.map(async (pet) => {
              // If the pet already has an image_url, use it directly
              if (pet.image_url) {
                return pet;
              }
              
              // Otherwise, get a signed URL from storage
              if (pet.file_path) {
                const signedUrl = await getCachedImageUrl(pet.file_path, pet.id)
                return { 
                  ...pet, 
                  image_url: signedUrl || pet.image_url || undefined
                }
              }
              return pet
            })
          )
      
          // Update hasMore flag based on remaining images
          setHasMore(remainingImages.length > randomSelection.length)
          setCurrentPage(page)
          
          // Append the new images
          setPetImages(prevImages => [...prevImages, ...(petsWithUrls as PetImage[])])
        } catch (err) {
          console.error('Error in pagination:', err)
          setError('Failed to load more images')
        }
      }
    } catch (err) {
      console.error('Failed to fetch pet images:', err)
      setError('Failed to load pet images')
    } finally {
      setIsLoading(false)
    }
  }, [
    isLoading, 
    totalCount, 
    fetchTotalCount, 
    PAGE_SIZE,
    setIsLoading,
    setTotalCount,
    setHasMore,
    setError,
    supabase,
    setPetImages
  ]);

  // Load more images when user clicks "Load More"
  const loadMoreImages = () => {
    if (!isLoading && hasMore) {
      fetchImages(currentPage + 1)
    }
  }

  // Always fetch images when component mounts, but only once
  useEffect(() => {
    let isMounted = true;
    
    if (!isProcessingAuth && isMounted) {
      // Always fetch from page 1 on initial load
      console.log('Initial fetch of images')
      fetchImages(1)
    }
    
    return () => {
      isMounted = false;
    };
  }, [isProcessingAuth, fetchImages]); // Include fetchImages in dependencies

  const handleFileDrop = (acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles)
    setCurrentFile(acceptedFiles[0])
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setCurrentFile(null)
    
    // If we just closed after a successful upload, show notification
    if (showUploadSuccessNotification) {
      setShowNotification(true)
      setShowUploadSuccessNotification(false)
    }
  }

  // Update view counts with batching system
  useEffect(() => {
    // Start the view count batcher with 1-minute interval
    viewCountBatcher.startBatching(60 * 1000)
    
    // Set up a listener to update UI when counts change
    const removeListener = viewCountBatcher.addListener((petId, newCount) => {
      setPetImages(images => 
        images.map(p => 
          p.id === petId ? { ...p, view_count: newCount } : p
        )
      )
      
      // Also update selected image if it's the one being updated
      setSelectedImage(prev => 
        prev && prev.id === petId ? { ...prev, view_count: newCount } : prev
      )
    })
    
    // Clean up on unmount
    return () => {
      viewCountBatcher.stopBatching()
      removeListener()
    }
  }, [])

  // Modified handleImageClick to use the batcher
  const handleImageClick = useCallback((pet: PetImage, index: number) => {
    console.log('Image clicked:', pet.id, 'at index:', index)
    setSelectedImage(pet)
    setSelectedImageIndex(index)
    
    // Add to view count batch instead of immediately updating DB
    viewCountBatcher.incrementViewCount(pet.id)
    
    // Optimistically update the UI right away
    setPetImages(images => 
      images.map(p => 
        p.id === pet.id ? { ...p, view_count: (p.view_count || 0) + 1 } : p
      )
    )
  }, [])

  // Modified touch event handler for mobile devices
  const handleTouchStart = (e: React.TouchEvent, pet: PetImage) => {
    // Record touch start position
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setClickStartTime(Date.now());
    // Don't call handleImageClick here - wait for touch end
  }

  // Modified touch end handler with movement detection
  const handleTouchEnd = (e: React.TouchEvent, pet: PetImage, index: number) => {
    e.preventDefault(); // Prevent default behavior
    
    if (!touchStartPos) return; // Safeguard
    
    // Calculate touch movement distance
    const touch = e.changedTouches[0];
    const touchEndPos = { x: touch.clientX, y: touch.clientY };
    const distanceX = Math.abs(touchEndPos.x - touchStartPos.x);
    const distanceY = Math.abs(touchEndPos.y - touchStartPos.y);
    const timeElapsed = Date.now() - clickStartTime;
    
    // Clear touch tracking state
    setTouchStartPos(null);
    
    // Only treat as a tap if:
    // 1. Movement was minimal (less than 10px in any direction)
    // 2. Touch duration was short (less than 300ms)
    const isDeliberateTap = distanceX < 10 && distanceY < 10 && timeElapsed < 300;
    
    if (isDeliberateTap) {
      console.log('Deliberate tap detected on image:', pet.id, 'at index:', index);
      handleImageClick(pet, index);
    } else {
      console.log('Scroll motion detected, ignoring tap');
    }
  }

  // Modified click handler for desktop devices with similar detection
  const handleClick = (e: React.MouseEvent, pet: PetImage, index: number) => {
    // For desktop, we'll just check if it was a quick click
    // This helps avoid accidental clicks when trying to select text or perform other actions
    const timeElapsed = Date.now() - clickStartTime;
    const isDeliberateClick = timeElapsed < 300; // Clicks typically very fast
    
    if (isDeliberateClick) {
      console.log('Deliberate click detected on image:', pet.id, 'at index:', index);
      e.preventDefault(); // Prevent default only for deliberate clicks
      handleImageClick(pet, index);
    } else {
      console.log('Slow/accidental click detected, ignoring');
    }
  }

  // Add mouse down handler to track click start time (for desktop)
  const handleMouseDown = () => {
    setClickStartTime(Date.now());
  }

  // --- Navigation Functions ---
  const navigateImage = (direction: 'next' | 'prev') => {
    if (selectedImageIndex === null || petImages.length <= 1) return;

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (selectedImageIndex + 1) % petImages.length;
    } else {
      nextIndex = (selectedImageIndex - 1 + petImages.length) % petImages.length;
    }

    const nextImage = petImages[nextIndex];
    console.log(`Navigating ${direction} to index ${nextIndex}, image ID: ${nextImage.id}`);
    setSelectedImage(nextImage);
    setSelectedImageIndex(nextIndex);
    // Optional: Increment view count on navigation?
    // handleImageClick(nextImage, nextIndex); 
  };

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Pet Rank</h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {isLoading && petImages.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-lg text-gray-600">Loading images...</p>
        </div>
      )}

      {petImages.length > 0 && petImages[0] && (
        <div className="mb-8">
          <div 
            className="relative bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105 mx-auto max-w-4xl"
            onClick={(e) => handleClick(e, petImages[0], 0)}
            onMouseDown={handleMouseDown}
            onTouchStart={(e) => handleTouchStart(e, petImages[0])}
            onTouchEnd={(e) => handleTouchEnd(e, petImages[0], 0)}
            onTouchCancel={() => setTouchStartPos(null)}
          >
            {petImages[0].image_url ? (
              <div className="relative">
                <div className="relative w-full h-[400px]">
                  <Image
                    src={petImages[0].image_url}
                    alt={petImages[0].pet_name}
                    fill
                    unoptimized={true}
                    sizes="(max-width: 768px) 100vw, 1200px"
                    priority={true}
                    loading="eager"
                    className="object-cover"
                    onError={async () => {
                      if (petImages[0].file_path) {
                        // Refresh the URL if it fails to load
                        const newUrl = await getCachedImageUrl(petImages[0].file_path, petImages[0].id, 1) // Short cache time for error case
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
                </div>
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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {petImages.slice(1).map((pet, idx) => {
              const originalIndex = idx + 1;
              return (
                <div 
                  key={pet.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                  onClick={(e) => handleClick(e, pet, originalIndex)}
                  onMouseDown={handleMouseDown}
                  onTouchStart={(e) => handleTouchStart(e, pet)}
                  onTouchEnd={(e) => handleTouchEnd(e, pet, originalIndex)}
                  onTouchCancel={() => setTouchStartPos(null)}
                >
                  {pet.image_url ? (
                    <div className="relative">
                      <div className="relative w-full h-40">
                        <Image
                          src={pet.image_url}
                          alt={pet.pet_name}
                          fill
                          unoptimized={true}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          loading="lazy"
                          className="object-cover"
                          onError={async () => {
                            if (pet.file_path) {
                              const newUrl = await getCachedImageUrl(pet.file_path, pet.id, 1)
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
                      </div>
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 text-sm rounded-full">
                        👁 {pet.view_count || 0}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900">{pet.pet_name}</h3>
                        <p className="text-sm text-gray-500">{pet.age} • {pet.gender}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="h-40 bg-gray-200 flex items-center justify-center">
                        <span className="text-sm text-gray-500">Image not available</span>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900">{pet.pet_name}</h3>
                        <p className="text-sm text-gray-500">{pet.age} • {pet.gender}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreImages}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg text-white font-medium ${
                  isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Loading...
                  </span>
                ) : (
                  'Load More Images'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        !petImages[0] && !isLoading && (
          <p className="text-center text-gray-500">
            {error ? 'Error loading images' : 'No approved pet images yet.'}
          </p>
        )
      )}

      {/* Image Preview Modal - also updated to use Next.js Image */}
      {selectedImage && selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedImage(null);
            setSelectedImageIndex(null); 
          }}
        >
          {/* --- Previous Button --- */}
          {petImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('prev');
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 focus:outline-none text-xl font-bold"
              aria-label="Previous image"
            >
              &lt;
            </button>
          )}

          <div 
            className="bg-white rounded-lg max-w-4xl w-full overflow-hidden relative mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Force a complete rerender of the entire modal content when image changes */}
            <div key={`modal-content-${selectedImage.id}`} className="modal-content">
              <div className="relative">
                <div className="relative w-full h-[80vh] max-h-[80vh] bg-black">
                  {selectedImage.image_url && (
                    <Image
                      key={selectedImage.id}
                      src={selectedImage.image_url}
                      alt={selectedImage.pet_name}
                      fill
                      unoptimized={true}
                      sizes="80vw"
                      loading="eager"
                      className="object-contain"
                      onError={async () => {
                        if (selectedImage.file_path) {
                          const newUrl = await getCachedImageUrl(selectedImage.file_path, selectedImage.id, 1)
                          if (newUrl) {
                            setSelectedImage(prev => prev ? { ...prev, image_url: newUrl } : null)
                          }
                        }
                      }}
                    />
                  )}
                </div>
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                  👁 {selectedImage.view_count || 0} views
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">{selectedImage.pet_name}</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p key={`age-${selectedImage.id}`} className="text-gray-600">Age: {selectedImage.age}</p>
                    <p key={`gender-${selectedImage.id}`} className="text-gray-600">Gender: {selectedImage.gender}</p>
                  </div>
                  {selectedImage.social_media_link && (
                    <div key={`social-${selectedImage.id}`} className="text-right">
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
                  onClick={() => { setSelectedImage(null); setSelectedImageIndex(null); }}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded mt-4"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* --- Next Button --- */}
          {petImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage('next');
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 focus:outline-none text-xl font-bold"
              aria-label="Next image"
            >
              &gt;
            </button>
          )}
        </div>
      )}

      {isModalOpen && currentFile && (
        <UploadModal
          onClose={handleModalClose}
          file={currentFile}
          onSuccess={() => setShowUploadSuccessNotification(true)}
        />
      )}

      {showNotification && (
        <Notification
          message="Your pet's image is waiting approval" 
          subMessage="We'll review your submission shortly."
          onClose={() => setShowNotification(false)}
        />
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = (array: any[]) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
} 