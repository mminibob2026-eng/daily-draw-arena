import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'

// Generate MYT (UTC+8) date string
function getMYTDate(): string {
  const now = new Date()
  const utcTime = now.getTime()
  const mytOffset = 8 * 60 * 60 * 1000
  const mytDate = new Date(utcTime + mytOffset)
  return mytDate.toISOString().split('T')[0]
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

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - Vercel cron jobs send this header
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev_secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const targetDate = getMYTDate()

    // Check if challenges already exist for today
    const { data: existing } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', targetDate)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Challenges already exist for ${targetDate}`,
        skipped: true,
      })
    }

    // Get all challenges used in the last 30 days (globally, not per-user)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentChallenges } = await supabase
      .from('daily_challenges')
      .select('title')
      .gte('challenge_date', thirtyDaysAgoStr)

    const usedTitles = new Set(recentChallenges?.map(c => c.title) || [])

    // Get enabled challenges from database
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
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      challenges: insertedChallenges,
      count: insertedChallenges.length,
    })
  } catch (error: unknown) {
    console.error('Cron generate error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}