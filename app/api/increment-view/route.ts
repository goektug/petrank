import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    
    // Create Supabase client inside the handler using the ANON key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use Anon key
    
    if (!supabaseUrl || !supabaseAnonKey) { // Check for Anon key
      console.error('Missing Supabase URL or anon key'); // Update error message
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey); // Use Anon key
    
    console.log(`Processing view increment for pet ID: ${pet_id} (using anon key)`);
    
    // Simplest approach: Get current value then increment
    try {
      // First get current value
      const { data: pet, error: fetchError } = await supabase
        .from('pet_uploads')
        .select('view_count')
        .eq('id', pet_id)
        .single();
      
      if (fetchError) {
        // If the pet doesn't exist, we can't increment, log and return error
        console.error(`Error fetching pet ${pet_id} for view count update:`, fetchError);
        return NextResponse.json(
          { success: false, error: 'Pet not found or database error fetching count', details: String(fetchError) },
          { status: 404 } // Use 404 if pet not found is likely
        );
      }
      
      // Then update with incremented value
      const currentCount = pet?.view_count || 0;
      const newCount = currentCount + 1;
      
      const { error: updateError } = await supabase
        .from('pet_uploads')
        .update({ view_count: newCount })
        .eq('id', pet_id);
      
      if (updateError) {
        // Log the specific update error
        console.error(`Error updating view count for pet ${pet_id}:`, updateError);
        throw updateError; // Let the outer catch handle the response
      }
      
      console.log(`Successfully incremented view count for pet ${pet_id}: ${currentCount} → ${newCount}`);
      
      return NextResponse.json(
        { 
          success: true, 
          view_count: newCount,
          message: 'View count updated successfully'
        },
        { status: 200 }
      );
    } catch (error) {
      // This catches errors from fetchError or updateError being thrown
      console.error('Error during view count update database operation:', error);
      return NextResponse.json(
        { success: false, error: 'Database operation failed', details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    // This catches errors like JSON parsing or unexpected issues
    console.error('Unexpected error in increment-view API handler:', error);
    return NextResponse.json(
      { success: false, error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
} 