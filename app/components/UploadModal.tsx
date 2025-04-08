'use client'

import React, { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { v4 as uuidv4 } from 'uuid'

interface UploadModalProps {
  onClose: () => void
  file: File
}

export default function UploadModal({ onClose, file }: UploadModalProps) {
  const [petName, setPetName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('Male')
  const [socialMediaLink, setSocialMediaLink] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClientComponentClient()

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
      
      // Insert metadata into database
      const { error: insertError } = await supabase
        .from('pet_uploads')
        .insert({
          id,
          pet_name: petName,
          age,
          gender,
          social_media_link: socialMediaLink || null,
          file_path: filePath,
          image_url: imageUrl,
          status: 'pending',
          view_count: 0
        })
        
      if (insertError) {
        throw insertError
      }
      
      setSuccess(true)
      setTimeout(onClose, 2000)
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'An error occurred during upload')
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
            <p className="text-gray-500 mt-1">Your pet photo is being reviewed.</p>
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