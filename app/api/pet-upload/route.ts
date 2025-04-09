import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  let body;
  
  try {
    body = await req.json()
  } catch (error) {
    console.error('Error parsing JSON request:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  // Check required fields
  if (!body.id || !body.pet_name || !body.age || !body.gender || !body.file_path) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required fields (id, pet_name, age, gender, file_path)'
      },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data, error } = await supabase
      .from('pet_uploads')
      .insert({
        id: body.id,
        pet_name: body.pet_name,
        age: body.age,
        gender: body.gender,
        social_media_link: body.social_media_link || null,
        file_path: body.file_path,
        image_url: body.image_url || null
      })
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Server error during pet upload:', error)
    return NextResponse.json(
      { success: false, error: 'Server error processing upload' },
      { status: 500 }
    )
  }
} 