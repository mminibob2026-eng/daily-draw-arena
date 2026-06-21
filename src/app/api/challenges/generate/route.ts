import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getChallengeDate } from '@/lib/utils'
import { getOrCreateDailyChallenges, getDailyChallenges } from '@/lib/daily-challenges'

async function isDevAccount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_dev_account')
    .eq('id', userId)
    .single()
  return profile?.is_dev_account === true
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

    const { date } = await request.json().catch(() => ({}))
    const targetDate = date || getChallengeDate()

    const challenges = await getOrCreateDailyChallenges(targetDate)

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges,
      count: challenges.length,
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

    const result = []
    const today = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      // Pre-create if missing so the admin schedule always shows real data.
      const challenges = i === 0
        ? await getOrCreateDailyChallenges(dateStr)
        : await getDailyChallenges(dateStr)

      result.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        isToday: i === 0,
        challenges,
      })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentChallenges } = await supabase
      .from('daily_challenges')
      .select('title')
      .gte('challenge_date', thirtyDaysAgoStr)

    const usedTitles = new Set(
      (recentChallenges || []).map((c: { title: string }) => c.title)
    )

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
