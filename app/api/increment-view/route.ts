import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.json()
  const { pet_id } = body
  
  if (!pet_id) {
    return NextResponse.json({ error: 'Missing pet_id parameter' }, { status: 400 })
  }
  
  // Create a regular Supabase client (no service role)
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the current view count
    const { data: currentData, error: fetchError } = await supabase
      .from('pet_uploads')
      .select('view_count')
      .eq('id', pet_id)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current view count:', fetchError)
      throw fetchError
    }
    
    // Calculate the new view count
    const currentCount = currentData?.view_count || 0
    const newCount = currentCount + 1
    
    // Directly update with the new count
    const { data, error } = await supabase
      .from('pet_uploads')
      .update({ view_count: newCount })
      .eq('id', pet_id)
      .select('view_count')
    
    if (error) {
      console.error('Error updating view count:', error)
      throw error
    }
    
    return NextResponse.json({ 
      success: true, 
      view_count: data && data[0] ? data[0].view_count : newCount 
    }, { status: 200 })
  } catch (error) {
    console.error('Error incrementing view count:', error)
    return NextResponse.json(
      { error: 'Failed to increment view count', details: error },
      { status: 500 }
    )
  }
} 