import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Constants for the 1x1 transparent GIF response
const gifData = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const gifHeaders = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

let supabase: any; // Declare supabase client outside

function initializeSupabase() {
  if (supabase) return; // Already initialized

  // Ensure environment variables are loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Missing Supabase URL or Anon Key in API environment.')
    // Cannot create client, requests will fail later
    supabase = null;
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized for ping-view.");
  }
}

// Initialize Supabase client when the module loads
initializeSupabase();

export async function GET(request: Request) {
  // Check if Supabase client failed to initialize
  if (!supabase) {
    console.error('Supabase client not available in GET /api/ping-view');
    return new Response(gifData, { headers: gifHeaders });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    console.warn('ping-view called without ID');
    return new Response(gifData, { headers: gifHeaders });
  }

  try {
    // Directly call the RPC function to increment the count
    console.log(`Attempting to increment view count for pet ${id}`); // Add log
    const { error } = await supabase.rpc('increment_pet_view_count_void', { 
      pet_id_param: id 
    });

    if (error) {
      // Log the error clearly
      console.error(`DB Error incrementing view count for pet ${id}:`, error.message, error.details, error.hint);
      // Still return the GIF to avoid breaking the image load
      return new Response(gifData, { headers: gifHeaders });
    }

    // Log success 
    console.log(`Successfully triggered view count increment for pet ${id}`);

    // Return the 1x1 transparent GIF
    return new Response(gifData, { headers: gifHeaders });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error(`Unexpected API error in ping-view for pet ${id}:`, error);
    // Still return the GIF
    return new Response(gifData, { headers: gifHeaders });
  }
} 