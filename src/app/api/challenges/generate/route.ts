import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'

async function isDevAccount(supabase: any, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_dev_account')
    .eq('id', userId)
    .single()
  return profile?.is_dev_account === true
}

function getAvailableChallenges(thirtyDaysAgoStr: string, usedTitles: Set<string>) {
  let available = CHALLENGE_BANK.filter(c => !usedTitles.has(c.title))
  if (available.length < 3) {
    available = [...CHALLENGE_BANK]
  }
  return available
}

function selectChallenges(available: typeof CHALLENGE_BANK, targetDate: string, count: number = 3) {
  const seed = targetDate.split('-').reduce((acc: number, val: string) => acc + parseInt(val), 0)
  const shuffled = [...available].sort((a, b) => {
    const seedA = (seed * a.title.length) % available.length
    const seedB = (seed * b.title.length) % available.length
    return seedA - seedB
  })
  return shuffled.slice(0, count)
}

async function generateChallengesForDate(supabase: any, targetDate: string, userId?: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: recentHistory } = await supabase
    .from('user_challenge_history')
    .select('challenge_title')
    .gte('shown_at', thirtyDaysAgoStr)

  const recentTitles = recentHistory?.map((h: { challenge_title: string }) => h.challenge_title) || []
  const usedTitles: Set<string> = new Set(recentTitles)
  const availableChallenges = getAvailableChallenges(thirtyDaysAgoStr, usedTitles)
  const selectedChallenges = selectChallenges(availableChallenges, targetDate)

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

  return insertedChallenges
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const authHeader = request.headers.get('authorization')
    
    const isDev = user ? await isDevAccount(supabase, user.id) : false
    const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET || 'dev_secret'}`
    
    if (!isCronAuth && !isDev) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, userId } = await request.json()
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

    const insertedChallenges = await generateChallengesForDate(supabase, targetDate, userId)

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges: insertedChallenges,
    })
  } catch (error: unknown) {
    console.error('Challenge generation error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await isDevAccount(supabase, user.id)) {
      return NextResponse.json({ error: 'Dev account only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const today = new Date()
    const result = []

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const { data: challenges } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', dateStr)
        .order('slot')

      result.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        isToday: i === 0,
        challenges: challenges || []
      })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentHistory } = await supabase
      .from('user_challenge_history')
      .select('challenge_title')
      .gte('shown_at', thirtyDaysAgoStr)

    const usedTitles = new Set(recentHistory?.map(h => h.challenge_title) || [])
    const availableChallenges = CHALLENGE_BANK.filter(c => !usedTitles.has(c.title))

    return NextResponse.json({
      schedule: result,
      availableChallenges: availableChallenges.length,
      totalChallenges: CHALLENGE_BANK.length,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
