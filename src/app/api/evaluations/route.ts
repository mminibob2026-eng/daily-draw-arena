import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeDrawing } from '@/lib/agnes'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('*, daily_challenges(*)')
      .eq('id', submissionId)
      .eq('user_id', user.id)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { data: existingEval } = await supabase
      .from('evaluations')
      .select('id')
      .eq('submission_id', submissionId)
      .single()

    if (existingEval) {
      return NextResponse.json({ error: 'Already evaluated' }, { status: 409 })
    }

    const challenge = submission.daily_challenges

    const { scores, finalScore } = await analyzeDrawing(
      submission.image_url,
      challenge.title,
      challenge.description || ''
    )

    const { error: evalError } = await supabase
      .from('evaluations')
      .insert({
        submission_id: submissionId,
        creativity: scores.creativity,
        storytelling: scores.storytelling,
        composition: scores.composition,
        effort: scores.effort,
        originality: scores.originality,
        final_score: finalScore,
        strengths: JSON.stringify(scores.strengths),
        weaknesses: JSON.stringify(scores.weaknesses),
        improvements: JSON.stringify(scores.improvements),
      })

    if (evalError) {
      console.error('Evaluation insert error:', evalError)
      return NextResponse.json({ error: 'Failed to save evaluation' }, { status: 500 })
    }

    const { data: allSubmissions } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', user.id)

    const submissionIds = allSubmissions?.map(s => s.id) || []

    const { data: allEvals } = await supabase
      .from('evaluations')
      .select('final_score')
      .in('submission_id', submissionIds)

    const totalScore = allEvals?.reduce((sum, e) => sum + (e.final_score || 0), 0) || 0

    await supabase
      .from('profiles')
      .update({
        total_score: totalScore,
        submissions_count: allEvals?.length || 0
      })
      .eq('id', user.id)

    const challengeId = submission.challenge_id
    if (challengeId) {
      await updateLeaderboard(supabase, challengeId)
    }

    return NextResponse.json({
      success: true,
      evaluation: { scores, finalScore }
    })
  } catch (error: any) {
    console.error('Evaluation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function updateLeaderboard(supabase: any, challengeId: string) {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      user_id,
      evaluations (final_score)
    `)
    .eq('challenge_id', challengeId)
    .eq('is_ai_battle', false)

  if (!submissions) return

  const ranked = submissions
    .filter((s: { evaluations?: { final_score?: number } | null }) => s.evaluations?.final_score != null)
    .sort((a: { evaluations?: { final_score?: number } | null }, b: { evaluations?: { final_score?: number } | null }) => (b.evaluations?.final_score || 0) - (a.evaluations?.final_score || 0))

  for (let i = 0; i < ranked.length; i++) {
    const entry = ranked[i]
    await supabase
      .from('leaderboard')
      .upsert({
        challenge_id: challengeId,
        user_id: entry.user_id,
        rank: i + 1,
        final_score: entry.evaluations?.final_score,
        recorded_at: new Date().toISOString(),
      }, {
        onConflict: 'challenge_id,user_id'
      })
  }
}
