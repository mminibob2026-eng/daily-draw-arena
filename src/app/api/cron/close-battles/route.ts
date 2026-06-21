import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev_secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date().toISOString()

    // Find all battles past their end time
    const { data: expiredBattles, error } = await supabase
      .from('ai_battles')
      .select('id, human_votes, ai_votes')
      .lt('ends_at', now)
      .eq('status', 'voting')

    if (error) {
      console.error('Battle fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!expiredBattles || expiredBattles.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No expired battles' })
    }

    const results = []

    for (const battle of expiredBattles) {
      let winner: 'human' | 'ai' | 'tie'

      if (battle.human_votes > battle.ai_votes) {
        winner = 'human'
      } else if (battle.ai_votes > battle.human_votes) {
        winner = 'ai'
      } else {
        winner = 'tie'
      }

      const { error: updateError } = await supabase
        .from('ai_battles')
        .update({
          status: 'completed',
          winner,
        })
        .eq('id', battle.id)

      if (updateError) {
        console.error(`Failed to close battle ${battle.id}:`, updateError)
        results.push({ id: battle.id, status: 'error', error: updateError.message })
      } else {
        results.push({ id: battle.id, status: 'completed', winner })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error: unknown) {
    console.error('Close battles error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}