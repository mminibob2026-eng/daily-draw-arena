import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const challengeId = searchParams.get('challengeId')
    const dateParam = searchParams.get('date')
    const date = dateParam || getChallengeDate()

    let challengeIds: string[] = []

    if (challengeId) {
      challengeIds = [challengeId]
    } else {
      // Get ALL challenges for the date (all 3 slots)
      const { data: challenges } = await supabase
        .from('daily_challenges')
        .select('id, slot, title, description')
        .eq('challenge_date', date)
        .order('slot')

      if (!challenges || challenges.length === 0) {
        return NextResponse.json({
          leaderboard: [],
          date,
          challenges: [],
          message: 'No challenges for this date',
        })
      }

      challengeIds = challenges.map(c => c.id)
    }

    // Fetch leaderboard entries for all challenges
    const { data: leaderboard, error } = await supabase
      .from('leaderboard')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url,
          is_premium
        ),
        challenges:challenge_id (
          id,
          title,
          slot
        )
      `)
      .in('challenge_id', challengeIds)
      .order('rank')
      .limit(150)

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    // Group by challenge slot for per-slot view
    const bySlot: Record<number, any[]> = {}
    leaderboard?.forEach(entry => {
      const slot = entry.challenges?.slot || 1
      if (!bySlot[slot]) bySlot[slot] = []
      bySlot[slot].push(entry)
    })

    // Also compute overall combined ranking (per user, best score across all slots)
    const userBestMap: Record<string, any> = {}
    leaderboard?.forEach(entry => {
      const userId = entry.user_id
      if (!userBestMap[userId] || entry.final_score > userBestMap[userId].final_score) {
        userBestMap[userId] = entry
      }
    })

    const overall = Object.values(userBestMap)
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 50)

    return NextResponse.json({
      leaderboard: leaderboard || [],
      bySlot,
      overall,
      date,
      challengeCount: challengeIds.length,
    })
  } catch (error: unknown) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}