import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_BANK } from '@/lib/challenges'

// Public endpoint to generate today's challenges if they don't exist
// This is meant as a fallback when the cron job hasn't run yet
// Only allows generation for TODAY's date (no future or past)

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

function getMYTDate(): string {
  const now = new Date()
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
  const mytTime = new Date(utcTime + 8 * 60 * 60 * 1000)
  return mytTime.toISOString().split('T')[0]
}

export async function POST() {
  try {
    const supabase = await createClient()
    const today = getMYTDate()

    // Check if already exist
    const { data: existing } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('challenge_date', today)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Challenges already exist for today',
        date: today,
        alreadyExists: true,
      })
    }

    // Get enabled challenges from bank
    const { data: allEnabled } = await supabase
      .from('challenge_bank')
      .select('id, title, description, is_enabled')
      .eq('is_enabled', true)

    let availableChallenges: BankChallenge[] = (allEnabled && allEnabled.length > 0)
      ? allEnabled
      : CHALLENGE_BANK.map((c, i) => ({
          id: `static-${i}`,
          title: c.title,
          description: c.description,
          is_enabled: true,
        }))

    // 30-day filter
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

    let filtered = availableChallenges.filter(c => !usedTitles.has(c.title))
    if (filtered.length < 3) {
      filtered = availableChallenges
    }

    const selected = selectChallenges(filtered, today)
    const inserted = []

    for (let i = 0; i < selected.length; i++) {
      const { data, error } = await supabase
        .from('daily_challenges')
        .insert({
          title: selected[i].title,
          description: selected[i].description,
          challenge_date: today,
          slot: i + 1,
        })
        .select()
        .single()

      if (error) {
        console.error(`Failed to insert challenge ${i + 1}:`, error)
        continue
      }
      inserted.push(data)
    }

    return NextResponse.json({
      success: true,
      date: today,
      challenges: inserted,
      count: inserted.length,
    })
  } catch (error: unknown) {
    console.error('Public generate error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}