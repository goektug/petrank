import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 1x1 transparent GIF pixel - this is the actual image data
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Create a client that uses the service role key for admin-level database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  // Extract the pet ID from the URL query parameter
  const url = new URL(request.url);
  const petId = url.searchParams.get('id');
  
  // Log the request
  console.log(`Received pixel view ping for pet ID: ${petId || 'undefined'}`);
  
  // If no pet ID was provided, just return the tracking pixel
  if (!petId) {
    console.log('No pet ID provided, returning pixel only');
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
    // Attempt to update the view count in the database
    // Using the simplest, most reliable approach
    const { data, error } = await supabase
      .from('pet_uploads')
      .update({ 
        view_count: supabase.rpc('increment_view_count_expression', { row_id: petId }) 
      })
      .eq('id', petId);
    
    if (error) {
      console.error('Error incrementing view count:', error);
      
      // Fallback to direct increment if the function call fails
      try {
        // Get current value
        const { data: pet, error: fetchError } = await supabase
          .from('pet_uploads')
          .select('view_count')
          .eq('id', petId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Update with incremented value
        const currentCount = pet?.view_count || 0;
        const { error: updateError } = await supabase
          .from('pet_uploads')
          .update({ view_count: currentCount + 1 })
          .eq('id', petId);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Successfully incremented view count using fallback method: ${currentCount} → ${currentCount + 1}`);
      } catch (fallbackError) {
        console.error('Fallback increment failed:', fallbackError);
      }
    } else {
      console.log(`Successfully incremented view count for pet ID: ${petId}`);
    }
  } catch (error) {
    console.error('Unexpected error in ping-view API:', error);
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