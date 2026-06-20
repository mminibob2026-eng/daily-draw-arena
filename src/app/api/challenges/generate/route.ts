import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authHeader = request.headers.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev_secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, date } = await request.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    const existingChallenges = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', targetDate)

    if (existingChallenges.data?.length) {
      return NextResponse.json({ 
        error: 'Challenges already exist for this date',
        challenges: existingChallenges.data 
      }, { status: 409 })
    }

    let availableChallenges = [...CHALLENGE_BANK]

    if (userId) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: recentHistory } = await supabase
        .from('user_challenge_history')
        .select('challenge_title')
        .eq('user_id', userId)
        .gte('shown_at', thirtyDaysAgoStr)

      const recentTitles = new Set(recentHistory?.map(h => h.challenge_title) || [])
      availableChallenges = availableChallenges.filter(c => !recentTitles.has(c.title))
    }

    if (availableChallenges.length < 3) {
      availableChallenges = [...CHALLENGE_BANK]
    }

    const seed = targetDate.split('-').reduce((acc: number, val: string) => acc + parseInt(val), 0)
    const shuffled = availableChallenges.sort((a, b) => {
      const seedA = (seed * a.title.length) % availableChallenges.length
      const seedB = (seed * b.title.length) % availableChallenges.length
      return seedA - seedB
    })

    const selectedChallenges = shuffled.slice(0, 3)
    const insertedChallenges = []

    for (let i = 0; i < selectedChallenges.length; i++) {
      const { data, error } = await supabase
        .from('daily_challenges')
        .insert({
          title: selectedChallenges[i].title,
          description: selectedChallenges[i].description,
          challenge_date: targetDate,
          slot: i + 1,
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to insert challenge ${i + 1}:`, error)
        continue
      }

      insertedChallenges.push(data)

      if (userId) {
        await supabase
          .from('user_challenge_history')
          .upsert({
            user_id: userId,
            challenge_title: selectedChallenges[i].title,
            shown_at: targetDate,
          }, {
            onConflict: 'user_id,challenge_title'
          })
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges: insertedChallenges,
    })
  } catch (error: any) {
    console.error('Challenge generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to generate challenges',
    totalAvailable: CHALLENGE_BANK.length,
    example: {
      userId: 'optional-user-uuid',
      date: '2026-06-20',
    }
  })
}
