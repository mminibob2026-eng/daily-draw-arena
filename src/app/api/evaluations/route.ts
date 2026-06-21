import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint is now a no-op - evaluations are processed async via cron
// The submission API creates a "pending" evaluation row which the cron job picks up.
// Clients should poll /api/evaluations/status for the result.
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

    // Check if evaluation already exists
    const { data: existingEval } = await supabase
      .from('evaluations')
      .select('*')
      .eq('submission_id', submissionId)
      .maybeSingle()

    if (existingEval) {
      return NextResponse.json({
        success: true,
        status: existingEval.evaluation_status,
        evaluation: existingEval.evaluation_status === 'completed' ? {
          creativity: existingEval.creativity,
          storytelling: existingEval.storytelling,
          composition: existingEval.composition,
          effort: existingEval.effort,
          originality: existingEval.originality,
          finalScore: existingEval.final_score,
          strengths: JSON.parse(existingEval.strengths || '[]'),
          weaknesses: JSON.parse(existingEval.weaknesses || '[]'),
          improvements: JSON.parse(existingEval.improvements || '[]'),
        } : null,
        retryCount: existingEval.retry_count,
      })
    }

    // No evaluation exists - the submission API should have created a pending one
    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Evaluation queued. Poll /api/evaluations/status for updates.',
    })
  } catch (error: unknown) {
    console.error('Evaluation status error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}