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

    const { submissionId, challengeId } = await request.json()

    if (!submissionId || !challengeId) {
      return NextResponse.json({ error: 'Missing submissionId or challengeId' }, { status: 400 })
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('*, daily_challenges(*)')
      .eq('id', submissionId)
      .single()

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
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
        strengths: scores.strengths.join(', '),
        weaknesses: scores.weaknesses.join(', '),
        improvements: scores.improvements.join(', '),
      })

    if (evalError) {
      console.error('Evaluation insert error:', evalError)
      return NextResponse.json({ error: 'Failed to save evaluation' }, { status: 500 })
    }

    await supabase
      .from('profiles')
      .update({ total_score: supabase.rpc('increment', { x: Math.round(finalScore) }) })
      .eq('id', user.id)

    const { data: allEvals } = await supabase
      .from('evaluations')
      .select('final_score')
      .in('submission_id', (
        await supabase.from('submissions').select('id').eq('user_id', user.id)
      ).data?.map(s => s.id) || [])

    if (allEvals) {
      const total = allEvals.reduce((sum, e) => sum + (e.final_score || 0), 0)
      await supabase
        .from('profiles')
        .update({ submissions_count: allEvals.length })
        .eq('id', user.id)
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
