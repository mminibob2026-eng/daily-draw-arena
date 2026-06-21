import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const submissionId = searchParams.get('submissionId')

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    // Verify ownership
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, user_id')
      .eq('id', submissionId)
      .single()

    if (!submission || submission.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('submission_id', submissionId)
      .single()

    if (!evaluation) {
      return NextResponse.json({ status: 'pending' })
    }

    if (evaluation.evaluation_status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        evaluation: {
          creativity: evaluation.creativity,
          storytelling: evaluation.storytelling,
          composition: evaluation.composition,
          effort: evaluation.effort,
          originality: evaluation.originality,
          finalScore: evaluation.final_score,
          strengths: JSON.parse(evaluation.strengths || '[]'),
          weaknesses: JSON.parse(evaluation.weaknesses || '[]'),
          improvements: JSON.parse(evaluation.improvements || '[]'),
        }
      })
    }

    if (evaluation.evaluation_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        retryCount: evaluation.retry_count,
        lastError: evaluation.last_error,
      })
    }

    return NextResponse.json({
      status: evaluation.evaluation_status,
      retryCount: evaluation.retry_count,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}