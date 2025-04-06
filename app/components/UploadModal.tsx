'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UploadModalProps {
  isOpen?: boolean
  onClose: () => void
  initialFile?: File | null
  file?: File | null
}

interface PetUpload {
  pet_name: string
  age: string
  gender: string
  social_media_link: string | null
  image_url: string
  file_path: string
  status: 'pending' | 'approved' | 'rejected'
}

export default function UploadModal({ isOpen = true, onClose, initialFile, file }: UploadModalProps) {
  const [petName, setPetName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [socialMediaLink, setSocialMediaLink] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Handle both possible prop names for the file
    const fileToUse = file || initialFile
    if (fileToUse) {
      setSelectedFile(fileToUse)
    }
  }, [initialFile, file])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFile = e.target.files?.[0]
    if (newFile) {
      // Check file type
      if (!newFile.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      // Check file size (5MB limit)
      if (newFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        return
      }
      setSelectedFile(newFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !petName.trim()) {
      setError('Please provide both a pet name and an image')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      console.log('Starting upload process...')
      
      // Create the bucket if it doesn't exist
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets()

      if (bucketsError) {
        throw new Error(`Failed to list buckets: ${bucketsError.message}`)
      }

      const petImagesBucket = buckets.find(b => b.name === 'pet-images')
      
      if (!petImagesBucket) {
        console.log('Creating pet-images bucket...')
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('pet-images', {
            public: false,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
          })

        if (createBucketError) {
          throw new Error(`Failed to create bucket: ${createBucketError.message}`)
        }
        console.log('Bucket created successfully')
      }

      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName
      
      console.log('Uploading file:', filePath)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pet-images')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Storage error: ${uploadError.message}`)
      }

      console.log('File uploaded successfully:', uploadData)

      // Try to get signed URL
      console.log('Getting signed URL for:', filePath)
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from('pet-images')
        .createSignedUrl(filePath, 24 * 60 * 60) // 24 hours in seconds

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError)
        throw new Error(`Failed to get signed URL: ${signedUrlError.message}`)
      }

      if (!urlData?.signedUrl) {
        throw new Error('No signed URL returned')
      }

      console.log('Got signed URL:', urlData.signedUrl)

      // Create database entry
      const { error: dbError } = await supabase
        .from('pet_uploads')
        .insert({
          pet_name: petName.trim(),
          age: age.trim(),
          gender: gender.trim(),
          social_media_link: socialMediaLink.trim() || null,
          image_url: urlData.signedUrl,
          file_path: filePath,
          status: 'pending'
        } as PetUpload)

      if (dbError) {
        console.error('Database error:', dbError)
        // If database insert fails, try to delete the uploaded file
        await supabase.storage
          .from('pet-images')
          .remove([filePath])
        throw new Error(`Database error: ${dbError.message}`)
      }

      console.log('Database entry created successfully')

      // Success
      onClose()
      setPetName('')
      setAge('')
      setGender('')
      setSocialMediaLink('')
      setSelectedFile(null)
      setUploadProgress(100)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload. Please try again.')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-semibold mb-4">Upload Pet Photo</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Pet Name *</label>
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={50}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Age *</label>
            <input
              type="text"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="e.g., 2 years"
              maxLength={20}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Gender *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Social Media Link</label>
            <input
              type="url"
              value={socialMediaLink}
              onChange={(e) => setSocialMediaLink(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://..."
            />
          </div>

          {!initialFile && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
            </div>
          )}

          {error && (
            <p className="text-red-500 mb-4 text-sm">{error}</p>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 