import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 1x1 transparent GIF pixel - this is the actual image data
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: Request) {
  // Extract the pet ID from the URL query parameter
  const url = new URL(request.url);
  const petId = url.searchParams.get('id');
  
  // Log the request
  console.log(`Received pixel view ping for pet ID: ${petId || 'undefined'}`);
  
  // If no pet ID was provided, just return the tracking pixel
  if (!petId) {
    console.warn('No pet ID provided in ping-view, returning pixel only');
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
  
  try {
    // Create Supabase client inside the handler using the ANON key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use Anon key
    
    if (!supabaseUrl || !supabaseAnonKey) { // Check for Anon key
      console.error('Missing Supabase URL or anon key in ping-view'); // Update error message
      // Still return the pixel even if we can't update the count
      return new NextResponse(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey); // Use Anon key
    
    console.log(`Processing ping view increment for pet ID: ${petId} (using anon key)`);
    
    // Simplest approach: Get current value then increment
    try {
      // First get current value
      const { data: pet, error: fetchError } = await supabase
        .from('pet_uploads')
        .select('view_count')
        .eq('id', petId)
        .single();
      
      if (fetchError) {
        // Log the error but don't throw, as we still need to return the pixel
        console.error(`Error fetching pet ${petId} for view count update (ping):`, fetchError);
        // Don't proceed with update if pet not found or error fetching
      } else {
        // Then update with incremented value
        const currentCount = pet?.view_count || 0;
        const newCount = currentCount + 1;
        
        const { error: updateError } = await supabase
          .from('pet_uploads')
          .update({ view_count: newCount })
          .eq('id', petId);
        
        if (updateError) {
          // Log the error but don't throw
          console.error(`Error updating view count for pet ${petId} (ping):`, updateError);
        } else {
          console.log(`Successfully incremented view count via ping for pet ${petId}: ${currentCount} → ${newCount}`);
        }
      }
    } catch (error) {
      // Catch any unexpected error during the DB operation
      console.error('Unexpected error during view count update in ping-view:', error);
      // Don't throw, just log and proceed to return the pixel
    }
  } catch (error) {
    // Catch errors like URL parsing
    console.error('Unexpected error in ping-view API handler:', error);
    // Don't throw, just log and proceed to return the pixel
  }
  
  // Always return a transparent GIF image with no-cache headers
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
} 