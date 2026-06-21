import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeDrawing } from '@/lib/agnes'

const MAX_RETRIES = 3

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev_secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Fetch all pending evaluations (up to 10 at a time to avoid timeouts)
    const { data: pendingEvals, error } = await supabase
      .from('evaluations')
      .select(`
        id,
        submission_id,
        retry_count,
        submissions!inner (
          id,
          image_url,
          challenge_id,
          daily_challenges!inner (
            title,
            description
          )
        )
      `)
      .eq('evaluation_status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .limit(10)

    if (error) {
      console.error('Fetch pending evals error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pendingEvals || pendingEvals.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending evaluations' })
    }

    const results = []

    for (const evalRow of pendingEvals) {
      const submission = (evalRow as any).submissions
      const challenge = submission?.daily_challenges

      if (!submission || !challenge) {
        // Mark as failed - missing data
        await supabase
          .from('evaluations')
          .update({
            evaluation_status: 'failed',
            last_error: 'Missing submission or challenge data',
          })
          .eq('id', evalRow.id)
        results.push({ id: evalRow.id, status: 'failed', reason: 'missing_data' })
        continue
      }

      // Mark as processing
      await supabase
        .from('evaluations')
        .update({ evaluation_status: 'processing' })
        .eq('id', evalRow.id)

      try {
        // Call Agnes AI with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI evaluation timeout (60s)')), 60000)
        )

        const aiPromise = analyzeDrawing(
          submission.image_url,
          challenge.title,
          challenge.description || ''
        )

        const { scores, finalScore } = await Promise.race([aiPromise, timeoutPromise]) as any

        // Update evaluation with results
        const { error: updateError } = await supabase
          .from('evaluations')
          .update({
            evaluation_status: 'completed',
            creativity: scores.creativity,
            storytelling: scores.storytelling,
            composition: scores.composition,
            effort: scores.effort,
            originality: scores.originality,
            final_score: finalScore,
            strengths: JSON.stringify(scores.strengths || []),
            weaknesses: JSON.stringify(scores.weaknesses || []),
            improvements: JSON.stringify(scores.improvements || []),
          })
          .eq('id', evalRow.id)

        if (updateError) throw updateError

        // Update user profile total_score
        const { data: submissionData } = await supabase
          .from('submissions')
          .select('user_id')
          .eq('id', submission.id)
          .single()

        if (submissionData) {
          const { data: userSubmissions } = await supabase
            .from('submissions')
            .select('id')
            .eq('user_id', submissionData.user_id)

          const submissionIds = userSubmissions?.map(s => s.id) || []
          const { data: allEvals } = await supabase
            .from('evaluations')
            .select('final_score')
            .eq('evaluation_status', 'completed')
            .in('submission_id', submissionIds)

          const totalScore = allEvals?.reduce((sum, e) => sum + (e.final_score || 0), 0) || 0

          await supabase
            .from('profiles')
            .update({ total_score: totalScore })
            .eq('id', submissionData.user_id)

          // Update leaderboard for this challenge
          await updateLeaderboard(supabase, submission.challenge_id)
        }

        results.push({ id: evalRow.id, status: 'completed', finalScore })
      } catch (evalError: any) {
        console.error(`Eval ${evalRow.id} failed:`, evalError)

        const newRetryCount = (evalRow.retry_count || 0) + 1
        const isFinalFailure = newRetryCount >= MAX_RETRIES

        await supabase
          .from('evaluations')
          .update({
            evaluation_status: isFinalFailure ? 'failed' : 'pending',
            retry_count: newRetryCount,
            last_error: evalError.message || 'Unknown error',
          })
          .eq('id', evalRow.id)

        results.push({
          id: evalRow.id,
          status: isFinalFailure ? 'failed' : 'retry_scheduled',
          retryCount: newRetryCount,
          error: evalError.message,
        })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error: unknown) {
    console.error('Process evaluations error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

async function updateLeaderboard(supabase: any, challengeId: string) {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      user_id,
      evaluations!inner (
        final_score,
        evaluation_status
      )
    `)
    .eq('challenge_id', challengeId)
    .eq('is_ai_battle', false)
    .eq('evaluations.evaluation_status', 'completed')

  if (!submissions) return

  const ranked = submissions
    .filter((s: any) => s.evaluations?.final_score != null)
    .sort((a: any, b: any) => (b.evaluations?.final_score || 0) - (a.evaluations?.final_score || 0))

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