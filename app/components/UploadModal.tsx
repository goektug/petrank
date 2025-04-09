'use client'

import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

interface UploadModalProps {
  onClose: () => void
  file: File
  onSuccess?: () => void
}

export default function UploadModal({ onClose, file, onSuccess }: UploadModalProps) {
  const [petName, setPetName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [socialMediaLink, setSocialMediaLink] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClientComponentClient()
  const router = useRouter()

  // Function to resize an image to reduce file size
  const resizeImage = async (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        // Calculate the new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * maxHeight / height);
            height = maxHeight;
          }
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => {
        reject(new Error("Image loading failed"));
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!petName || !age || !gender) {
      setError('Please fill in all required fields')
      return
    }
    
    // Add validation for social media link if provided
    if (socialMediaLink) {
      try {
        // Attempt to create a URL object to validate format
        new URL(socialMediaLink);
      } catch (e) {
        setError('Please enter a valid URL for social media link (include https://)')
        return
      }
    }
    
    try {
      setIsUploading(true)
      setError(null)
      
      // Create a unique ID for the upload
      const id = uuidv4()

      // Resize the image before uploading to reduce size
      console.log('Original image size:', Math.round(file.size / 1024), 'KB')
      const resizedImage = await resizeImage(file, 1200, 1200, 0.85)
      console.log('Resized image size:', Math.round(resizedImage.size / 1024), 'KB')
      
      // Create a new file with the resized image
      const resizedFile = new File([resizedImage], file.name, { 
        type: file.type,
        lastModified: file.lastModified 
      })
      
      // Generate a path for the file
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}.${fileExt}`
      const filePath = `uploads/${fileName}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('pet-images')
        .upload(filePath, resizedFile)
        
      if (uploadError) {
        throw uploadError
      }
      
      // Get a public URL for the uploaded image
      const { data: publicUrlData } = await supabase.storage
        .from('pet-images')
        .getPublicUrl(filePath)
        
      const imageUrl = publicUrlData?.publicUrl
      
      if (!imageUrl) {
        throw new Error('Failed to generate public URL for the image')
      }
      
      // Instead of direct insert, use our server API endpoint
      const response = await fetch('/api/pet-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          pet_name: petName,
          age,
          gender,
          social_media_link: socialMediaLink || null,
          file_path: filePath,
          image_url: imageUrl
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to upload pet';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          // If JSON parsing fails, use status text or a default message
          errorMessage = response.statusText || 'Error processing response from server';
          console.error('JSON parsing error:', jsonError);
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing response:', jsonError);
        setError('Server returned an invalid response. Please try again.');
        setIsUploading(false);
        return;
      }

      if (!result.success) {
        setError(result.error || 'Upload failed with an unknown error');
        setIsUploading(false);
        return;
      }

      const petId = result.data?.[0]?.id || id;
      router.push(`/p/${petId}`);
      
      setSuccess(true);
      if (onSuccess) onSuccess();
      
      // Auto close after success
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Upload Your Pet</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {success ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-5xl mb-3">✓</div>
            <p className="text-lg font-medium">Upload Successful!</p>
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
              <p className="text-blue-700 font-medium">Your pet's image is waiting approval</p>
              <p className="text-blue-600 text-sm mt-1">We'll review your submission shortly.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">{file.name}</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Pet Name *
                </label>
                <input 
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Age *
                </label>
                <input 
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 2 years"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Social Media Link (Optional)
                </label>
                <input 
                  type="url"
                  value={socialMediaLink}
                  onChange={(e) => setSocialMediaLink(e.target.value)}
                  placeholder="e.g. https://instagram.com/pet"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to your pet's social media profile
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md mr-2"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 bg-blue-500 text-white rounded-md ${
                    isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
                  }`}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
} 