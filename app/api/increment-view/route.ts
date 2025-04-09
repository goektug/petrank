import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { pet_id } = body
  
  if (!pet_id) {
    return NextResponse.json({ error: 'Missing pet_id parameter' }, { status: 400 })
  }
  
  // Create a service role client that bypasses RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  try {
    // Update view count using admin client
    const { data, error } = await supabaseAdmin
      .from('pet_uploads')
      .update({ 
        view_count: supabaseAdmin.rpc('increment_view_count_expression', { row_id: pet_id })
      })
      .eq('id', pet_id)
      .select('view_count')
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      view_count: data && data[0] ? data[0].view_count : null 
    }, { status: 200 })
  } catch (error) {
    console.error('Error incrementing view count:', error)
    return NextResponse.json(
      { error: 'Failed to increment view count', details: error },
      { status: 500 }
    )
  }
} 