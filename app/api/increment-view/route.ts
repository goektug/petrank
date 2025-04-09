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
    
    // Create Supabase client inside the handler
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase URL or service key');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`Processing view increment for pet ID: ${pet_id}`);
    
    // Directly update the database using a simple UPDATE query
    // This is more reliable than RPC functions which might have permission issues
    const { data, error } = await supabase
      .from('pet_uploads')
      .update({ 
        view_count: supabase.rpc('increment_view_count_expression', { row_id: pet_id }) 
      })
      .eq('id', pet_id);
    
    if (error) {
      console.error('Error incrementing view count:', error);
      
      // Fallback to direct increment if the function call fails
      try {
        console.log('Attempting fallback direct increment...');
        // First get current value
        const { data: pet, error: fetchError } = await supabase
          .from('pet_uploads')
          .select('view_count')
          .eq('id', pet_id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Then update with incremented value
        const currentCount = pet?.view_count || 0;
        const { error: updateError } = await supabase
          .from('pet_uploads')
          .update({ view_count: currentCount + 1 })
          .eq('id', pet_id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Successfully incremented view count using fallback method: ${currentCount} → ${currentCount + 1}`);
      } catch (fallbackError) {
        console.error('Fallback increment also failed:', fallbackError);
        return NextResponse.json(
          { success: false, error: 'Database operation failed', details: error.message },
          { status: 500 }
        );
      }
    }
    
    // Get the updated count
    const { data: updatedPet, error: fetchError } = await supabase
      .from('pet_uploads')
      .select('view_count')
      .eq('id', pet_id)
      .single();
    
    const updatedCount = updatedPet?.view_count || 0;
    
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