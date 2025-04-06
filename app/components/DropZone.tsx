'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface DropZoneProps {
  onDrop: (files: File[]) => void
}

export default function DropZone({ onDrop }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null)

  const handleDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('Drop event triggered')
    console.log('Accepted files:', acceptedFiles)
    console.log('Rejected files:', rejectedFiles)

    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles[0].errors.map((err: any) => err.message).join(', ')
      setError(`File not accepted: ${errors}`)
      return
    }

    if (acceptedFiles.length > 0) {
      setError(null)
      onDrop(acceptedFiles)
    }
  }, [onDrop])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles)
      const errors = rejectedFiles[0].errors.map(err => err.message).join(', ')
      setError(`File not accepted: ${errors}`)
    },
    onError: (err) => {
      console.error('Dropzone error:', err)
      setError('Error processing file')
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    noClick: true // Disable click handling in the root element
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">Drop the image here...</p>
        ) : (
          <div>
            <p className="text-gray-600">Drag and drop a pet photo here</p>
            <button
              type="button"
              onClick={open}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Select File
            </button>
            <p className="text-sm text-gray-500 mt-2">Maximum file size: 5MB</p>
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  )
} 