import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const challengeId = searchParams.get('challengeId')
    const date = searchParams.get('date') || getChallengeDate()

    let query = supabase
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
          title
        )
      `)
      .order('rank')

    if (challengeId) {
      query = query.eq('challenge_id', challengeId)
    } else {
      const { data: challenges } = await supabase
        .from('daily_challenges')
        .select('id')
        .eq('challenge_date', date)

      if (challenges?.length) {
        query = query.eq('challenge_id', challenges[0].id)
      }
    }

    const { data: leaderboard, error } = await query.limit(50)

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    return NextResponse.json({ leaderboard: leaderboard || [] })
  } catch (error: any) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
