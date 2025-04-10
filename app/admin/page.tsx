'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCachedImageUrl } from '../utils/imageCache'

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
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if we need to refresh the data
    const shouldRefresh = searchParams.get('refresh') === 'true'
    
    fetchPendingUploads()
    
    // If refresh parameter exists, remove it from the URL to prevent constant refreshing
    if (shouldRefresh) {
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('refresh')
      window.history.replaceState({}, '', newUrl)
    }
  }, [searchParams])

  const fetchPendingUploads = async () => {
    console.log('Fetching uploads for admin...'); // Log start
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
          console.error('Admin: No active session found!', sessionError);
          setError('Not authenticated');
          setLoading(false);
          return;
      }
      console.log('Admin: User session retrieved.');

      // Explicitly fetch ALL statuses for debugging
      const { data: uploads, error: fetchError } = await supabase
        .from('pet_uploads')
        .select('id, pet_name, status, created_at, file_path') // Select specific columns
        .order('created_at', { ascending: false });

      // Log the raw response from Supabase
      console.log('Admin: Raw data fetched from Supabase:', uploads);
      console.error('Admin: Fetch error (if any):', fetchError);

      if (fetchError) throw fetchError;

      if (!uploads) {
        console.log('Admin: No uploads data returned.');
        setPendingUploads([]);
        setLoading(false);
        return;
      }
      
      console.log(`Admin: Fetched ${uploads.length} total uploads. Processing...`);

      // Keep all fetched uploads for now, don't filter client-side yet
      const updatedUploads = await Promise.all(uploads.map(async (upload) => {
        if (!upload.file_path) {
          return upload;
        }
        // Ensure image_url is added even if not selected initially
        const signedUrl = await getCachedImageUrl(upload.file_path, upload.id);
        return {
          ...upload,
          image_url: signedUrl || '' // Add image_url field
        };
      }));

      console.log('Admin: Processed uploads with URLs:', updatedUploads);
      setPendingUploads(updatedUploads as PetUpload[]); // Cast to expected type

    } catch (err) {
      console.error('Admin: Error in fetchPendingUploads:', err);
      setError('Failed to load uploads');
    } finally {
      setLoading(false);
      console.log('Admin: Fetching complete.');
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    console.log(`%c[handleAction] Start: Action='${action}', ID='${id}'`, 'color: blue; font-weight: bold;');
    setError(null);
    const targetElement = document.querySelector(`[data-pet-id='${id}'] button`); // Find the button related to this pet
    if (targetElement) (targetElement as HTMLButtonElement).disabled = true; // Disable button

    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      console.log(`[handleAction] Preparing to update status to: '${newStatus}'`);

      const { data, error } = await supabase
        .from('pet_uploads')
        .update({ status: newStatus })
        .eq('id', id)
        .select(); // Important: Select to see the result

      // Log the raw result
      console.log('[handleAction] Supabase update response:', { data, error });

      if (error) {
        console.error('%c[handleAction] Supabase Update Error:', 'color: red; font-weight: bold;', error);
        // Attempt to parse Supabase error details
        let errorMessage = `Failed to ${action} upload.`;
        if (error.message) errorMessage += ` Message: ${error.message}`;
        if (error.details) errorMessage += ` Details: ${error.details}`;
        if (error.hint) errorMessage += ` Hint: ${error.hint}`;
        setError(errorMessage);
        // Re-enable button on error
        if (targetElement) (targetElement as HTMLButtonElement).disabled = false;
        return; // Stop execution if there was an error
      }

      console.log(`%c[handleAction] Update successful for ID='${id}'. Data:`, 'color: green;', data);
      
      // Refresh the list *after* successful update
      console.log('[handleAction] Refreshing list...');
      await fetchPendingUploads();
      console.log('[handleAction] List refreshed.');

    } catch (err) {
      // Catch any other unexpected errors
      console.error('%c[handleAction] Unexpected Error:', 'color: red; font-weight: bold;', err);
      setError(`An unexpected error occurred during ${action}.`);
      // Re-enable button on error
      if (targetElement) (targetElement as HTMLButtonElement).disabled = false;
    }
    // Note: Button remains disabled on success until list refresh potentially removes it
  };

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
              <div key={upload.id} className="border rounded-lg p-4" data-pet-id={upload.id}>
                {upload.image_url ? (
                  <div className="relative w-full h-48 mb-4">
                    <Image 
                      src={upload.image_url} 
                      alt={upload.pet_name} 
                      fill
                      unoptimized={true}
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover rounded-lg"
                      onError={async () => {
                        if (upload.file_path) {
                          const newUrl = await getCachedImageUrl(upload.file_path, upload.id, 1)
                          if (newUrl) {
                            setPendingUploads(uploads => 
                              uploads.map(u => 
                                u.id === upload.id ? { ...u, image_url: newUrl } : u
                              )
                            )
                          }
                        }
                      }}
                    />
                  </div>
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
                      <div className="mt-4 text-center">
                        <a 
                          href={upload.social_media_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Social Media
                        </a>
                      </div>
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

// Add a loading component for Suspense fallback
function AdminLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading admin panel...</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminDashboard />
    </Suspense>
  )
} 