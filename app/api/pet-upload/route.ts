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

  // Use the public anon key - requires appropriate RLS policy for insert
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
  )

  try {
    // Add default status 'pending' if not provided by client
    const insertData = {
      id: body.id,
      pet_name: body.pet_name,
      age: body.age,
      gender: body.gender,
      social_media_link: body.social_media_link || null,
      file_path: body.file_path,
      image_url: body.image_url || null,
      status: body.status || 'pending' // Set default status
    };

    console.log('Attempting insert with anon key:', insertData);

    const { data, error } = await supabase
      .from('pet_uploads')
      .insert(insertData)
      .select()

    if (error) {
      console.error('Supabase insert error (using anon key):', error)
      // Provide more specific error message if RLS might be the issue
      const errorMessage = error.message.includes('security violation') 
        ? 'Row Level Security policy might be preventing the insert. Please check RLS settings.' 
        : error.message;
      return NextResponse.json(
        { success: false, error: errorMessage, details: error }, // Include full error details
        { status: 500 }
      )
    }

    console.log('Insert successful (using anon key):', data);
    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Server error during pet upload (using anon key):', error)
    return NextResponse.json(
      { success: false, error: 'Server error processing upload' },
      { status: 500 }
    )
  }
} 