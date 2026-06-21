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

    // Server-side validation: file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Server-side validation: file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }

    // Get user profile for premium status and streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, is_dev_account, streak_count, last_submission_date')
      .eq('id', user.id)
      .single()

    // Check if user already submitted to this challenge
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

    // For free users: enforce 1 submission per day across all challenges
    // Premium and dev accounts: unlimited
    if (!profile?.is_premium && !profile?.is_dev_account) {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      const { count: todaySubmissions } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', `${todayStr}T00:00:00Z`)

      if ((todaySubmissions || 0) > 0) {
        return NextResponse.json({
          error: 'Free users can only submit 1 drawing per day. Upgrade to Premium for unlimited submissions.',
          code: 'FREE_DAILY_LIMIT',
        }, { status: 403 })
      }
    }

    // Validate challenge exists
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('id, challenge_date')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop() || 'jpg'
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

    // Insert submission with race-safe unique constraint
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
      // Clean up uploaded file on any failure
      await supabase.storage.from('submissions').remove([fileName])
      if (submissionError.code === '23505') {
        return NextResponse.json({
          error: 'You have already submitted to this challenge',
        }, { status: 409 })
      }
      return NextResponse.json({ error: submissionError.message }, { status: 500 })
    }

    // Create a pending evaluation row immediately (async pattern)
    // This way the AI processing happens in background, and client polls for status
    await supabase
      .from('evaluations')
      .insert({
        submission_id: submission.id,
        evaluation_status: 'pending',
        creativity: 0,
        storytelling: 0,
        composition: 0,
        effort: 0,
        originality: 0,
        final_score: 0,
        strengths: '[]',
        weaknesses: '[]',
        improvements: '[]',
      })

    // Trigger evaluation processing in the background.
    // Vercel Hobby does not support sub-daily crons, so we drive the queue
    // on-demand after each submission instead of relying on /api/cron/process-evaluations.
    triggerEvaluationProcessing(request)

    // Update submission count and streak
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (profile) {
      let newStreak = 1
      if (profile.last_submission_date === yesterday) {
        newStreak = (profile.streak_count || 0) + 1
      } else if (profile.last_submission_date === today) {
        newStreak = profile.streak_count || 1
      }

      await supabase
        .from('profiles')
        .update({
          submissions_count: (profile as any).submissions_count ? (profile as any).submissions_count + 1 : 1,
          last_submission_date: today,
          streak_count: newStreak,
        })
        .eq('id', user.id)
    }

    return NextResponse.json({ submission })
  } catch (error: unknown) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

/**
 * Fire-and-forget trigger for the background evaluation processor.
 * Never blocks the submission response.
 */
function triggerEvaluationProcessing(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin
    const cronSecret = process.env.CRON_SECRET || 'dev_secret'

    fetch(`${origin}/api/cron/process-evaluations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    }).catch((err) => {
      console.error('Failed to trigger evaluation processing:', err)
    })
  } catch (e) {
    console.error('Failed to trigger evaluation processing:', e)
  }
}