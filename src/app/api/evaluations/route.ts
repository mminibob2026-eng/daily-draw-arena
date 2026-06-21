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

    // Pre-check for existing evaluation (fast path, not race-safe)
    const { data: existingEval } = await supabase
      .from('evaluations')
      .select('id, creativity, storytelling, composition, effort, originality, final_score, strengths, weaknesses, improvements')
      .eq('submission_id', submissionId)
      .maybeSingle()

    if (existingEval) {
      return NextResponse.json({
        success: true,
        evaluation: {
          creativity: existingEval.creativity,
          storytelling: existingEval.storytelling,
          composition: existingEval.composition,
          effort: existingEval.effort,
          originality: existingEval.originality,
          finalScore: existingEval.final_score,
          strengths: JSON.parse(existingEval.strengths || '[]'),
          weaknesses: JSON.parse(existingEval.weaknesses || '[]'),
          improvements: JSON.parse(existingEval.improvements || '[]'),
        },
        cached: true,
      })
    }

    const challenge = submission.daily_challenges

    // Analyze drawing BEFORE inserting (to avoid duplicate AI calls on race)
    const { scores, finalScore } = await analyzeDrawing(
      submission.image_url,
      challenge.title,
      challenge.description || ''
    )

    // Insert with race-safe unique constraint on submission_id
    const { data: evalData, error: evalError } = await supabase
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
      .select()
      .single()

    if (evalError) {
      // Race condition caught - another request already inserted
      if (evalError.code === '23505') {
        const { data: raceEval } = await supabase
          .from('evaluations')
          .select('creativity, storytelling, composition, effort, originality, final_score, strengths, weaknesses, improvements')
          .eq('submission_id', submissionId)
          .single()

        if (raceEval) {
          return NextResponse.json({
            success: true,
            evaluation: {
              creativity: raceEval.creativity,
              storytelling: raceEval.storytelling,
              composition: raceEval.composition,
              effort: raceEval.effort,
              originality: raceEval.originality,
              finalScore: raceEval.final_score,
              strengths: JSON.parse(raceEval.strengths || '[]'),
              weaknesses: JSON.parse(raceEval.weaknesses || '[]'),
              improvements: JSON.parse(raceEval.improvements || '[]'),
            },
            cached: true,
          })
        }
      }
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
      evaluation: { scores, finalScore, ...evalData },
    })
  } catch (error: unknown) {
    console.error('Evaluation error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
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
