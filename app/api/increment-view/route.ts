import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a basic client that doesn't rely on cookies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    // Parse request body
    let pet_id: string;
    try {
      const body = await request.json();
      pet_id = body.pet_id;
      
      if (!pet_id) {
        return NextResponse.json(
          { success: false, error: 'Missing pet_id parameter' },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    // Simple single-query approach
    // Use the SQL to directly increment by 1 in a single query
    const { data, error } = await supabase.rpc('increment_pet_view_count', { 
      pet_id_param: pet_id 
    });
    
    if (error) {
      console.error('Error incrementing view count:', error);
      return NextResponse.json(
        { success: false, error: 'Database operation failed', details: error.message },
        { status: 500 }
      );
    }
    
    // Get the updated count (if available)
    const { data: updatedPet, error: fetchError } = await supabase
      .from('pet_uploads')
      .select('view_count')
      .eq('id', pet_id)
      .single();
    
    const updatedCount = updatedPet?.view_count || null;
    
    return NextResponse.json(
      { 
        success: true, 
        view_count: updatedCount,
        message: 'View count updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error in increment-view API:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
} 