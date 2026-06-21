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

interface BankChallenge {
  id: string
  title: string
  description: string
  is_enabled: boolean
}

function selectChallenges(available: BankChallenge[], targetDate: string, count: number = 3): BankChallenge[] {
  const seed = targetDate.split('-').reduce((acc: number, val: string) => acc + parseInt(val), 0)
  const shuffled = [...available].sort((a, b) => {
    const seedA = (seed * a.title.length) % available.length
    const seedB = (seed * b.title.length) % available.length
    return seedA - seedB
  })
  return shuffled.slice(0, count)
}

async function getEnabledChallenges(supabase: any): Promise<BankChallenge[]> {
  const { data, error } = await supabase
    .from('challenge_bank')
    .select('id, title, description, is_enabled')
    .eq('is_enabled', true)

  if (error || !data || data.length === 0) {
    console.warn('No enabled challenges in database, falling back to static CHALLENGE_BANK')
    return CHALLENGE_BANK.map((c, i) => ({
      id: `static-${i}`,
      title: c.title,
      description: c.description,
      is_enabled: true,
    }))
  }

  return data
}

async function generateChallengesForDate(supabase: any, targetDate: string, userId?: string) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // Use daily_challenges (global) as the source of truth for 30-day history
  // This ensures 30-day rule is enforced across ALL users, not just per-user
  const { data: recentChallenges } = await supabase
    .from('daily_challenges')
    .select('title')
    .gte('challenge_date', thirtyDaysAgoStr)

  const usedTitles: Set<string> = new Set(
    (recentChallenges || []).map((c: { title: string }) => c.title)
  )

  // Use challenge_bank database table as source of truth
  const allEnabledChallenges = await getEnabledChallenges(supabase)

  let availableChallenges = allEnabledChallenges.filter(c => !usedTitles.has(c.title))
  if (availableChallenges.length < 3) {
    availableChallenges = allEnabledChallenges
  }

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

    // Also write to user_challenge_history for per-user tracking if userId provided
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

    // Use daily_challenges (global) for 30-day history
    const { data: recentChallenges } = await supabase
      .from('daily_challenges')
      .select('title')
      .gte('challenge_date', thirtyDaysAgoStr)

    const usedTitles = new Set(
      (recentChallenges || []).map((c: { title: string }) => c.title)
    )

    // Count from database, not static array
    const { count: totalEnabled } = await supabase
      .from('challenge_bank')
      .select('*', { count: 'exact', head: true })
      .eq('is_enabled', true)

    const { data: allEnabled } = await supabase
      .from('challenge_bank')
      .select('title')
      .eq('is_enabled', true)

    const availableCount = allEnabled?.filter(c => !usedTitles.has(c.title)).length || 0

    return NextResponse.json({
      schedule: result,
      availableChallenges: availableCount,
      totalChallenges: totalEnabled || 0,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
