import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { id, pet_name, age, gender, social_media_link, file_path, image_url } = body
  
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
    // Insert using the admin client that bypasses RLS
    const { data, error } = await supabaseAdmin
      .from('pet_uploads')
      .insert({
        id,
        pet_name,
        age, 
        gender,
        social_media_link: social_media_link || null,
        file_path,
        image_url,
        status: 'pending',
        view_count: 0
      })
      .select()
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('Error inserting pet upload:', error)
    return NextResponse.json(
      { error: 'Failed to add pet upload', details: error },
      { status: 500 }
    )
  }
} 