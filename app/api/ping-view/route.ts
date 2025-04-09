import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a basic client that doesn't rely on cookies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple GET endpoint that directly increments the view count
export async function GET(request: Request) {
  // Extract the ID from the URL parameters
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    // Return a 1x1 transparent GIF
    return new Response(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), 
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
  
  try {
    // Try to directly update the database
    await supabase
      .from('pet_uploads')
      .update({ 
        view_count: supabase.rpc('increment_pet_view_count_expression', { row_id: id }) 
      })
      .eq('id', id);
    
    // We don't care about the result, just that we tried
    
    // Return a 1x1 transparent GIF
    return new Response(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), 
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Failed to update view count:', error);
    
    // Still return the 1x1 GIF even if there's an error
    return new Response(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'), 
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 