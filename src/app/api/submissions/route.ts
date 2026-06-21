import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const challengeId = formData.get('challengeId') as string

    if (!file || !challengeId) {
      return NextResponse.json({ error: 'File and challengeId are required' }, { status: 400 })
    }

    // Server-side check for existing submission (race-safe via unique constraint)
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: 'You have already submitted to this challenge',
        submissionId: existing.id,
      }, { status: 409 })
    }

    // Validate challenge exists and is for today
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('id, challenge_date')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${challengeId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(fileName)

    // Insert submission - unique constraint will catch race conditions
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        image_url: publicUrl,
        image_storage_path: `submissions/${fileName}`,
      })
      .select()
      .single()

    if (submissionError) {
      // Handle unique constraint violation (race condition caught)
      if (submissionError.code === '23505') {
        // Clean up uploaded file
        await supabase.storage.from('submissions').remove([fileName])
        return NextResponse.json({ 
          error: 'You have already submitted to this challenge',
        }, { status: 409 })
      }
      return NextResponse.json({ error: submissionError.message }, { status: 500 })
    }

    return NextResponse.json({ submission })
  } catch (error: unknown) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}